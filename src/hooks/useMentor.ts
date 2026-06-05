import { useEffect, useState } from 'react'
import { fetchAllResolucoes, fetchMentorPlano, updateMentorPlano } from '../services/supabase.service'
import { gerarPlanoEstudos, gerarMentoriaAssunto, type FraquezaItem } from '../services/gemini.service'
import { trackEvent } from '../services/hermesTracker'
import type { Resolucao } from '../types/database'

const FRAQUEZA_MIN_QUESTOES = 3
const FRAQUEZA_MAX_TAXA = 70

export interface CronogramaItem {
  dia: string
  materia: string
  topicos: string[]
  carga: 'Leve' | 'Moderada' | 'Intensa' | string
  questoes_sugeridas: number
  meta_estudo: string
}

export interface PlanoEstruturado {
  diagnostico: string
  cronograma: CronogramaItem[]
  dica_ouro: string
}

function detectarFraquezas(resolucoes: Resolucao[]): FraquezaItem[] {
  const porAssunto = resolucoes.reduce(
    (acc, curr) => {
      const key = `${curr.materia} - ${curr.assunto}`
      if (!acc[key]) acc[key] = { assunto: curr.assunto || 'N/A', materia: curr.materia || 'N/A', acertos: 0, total: 0 }
      acc[key].total += 1
      if (curr.acertou) acc[key].acertos += 1
      return acc
    },
    {} as Record<string, { assunto: string; materia: string; acertos: number; total: number }>
  )

  return Object.values(porAssunto)
    .map(d => ({ ...d, taxa: Math.round((d.acertos / d.total) * 100) }))
    .filter(d => d.taxa < FRAQUEZA_MAX_TAXA && d.total >= FRAQUEZA_MIN_QUESTOES)
    .sort((a, b) => a.taxa - b.taxa)
}

/**
 * Tenta fazer o parse de JSON retornado pela IA de forma resiliente.
 */
export function tentarParsearPlano(texto: string): PlanoEstruturado | null {
  try {
    let cleanText = texto.trim()
    
    // Encontra a primeira chave '{' e a última chave '}'
    const startIdx = cleanText.indexOf('{')
    const endIdx = cleanText.lastIndexOf('}')
    
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleanText = cleanText.slice(startIdx, endIdx + 1)
    }

    const parsed = JSON.parse(cleanText)
    if (parsed && typeof parsed === 'object') {
      const diagnostico = parsed.diagnostico || parsed.diagnóstico || "Plano de estudos tático gerado."
      const cronograma = Array.isArray(parsed.cronograma) ? parsed.cronograma : []
      const dica_ouro = parsed.dica_ouro || parsed.dicaOuro || parsed.dica_de_ouro || ""

      if (cronograma.length > 0) {
        const cronogramaNormalizado = cronograma.map((item: Record<string, unknown>) => {
          const rawCarga = item.carga || "Moderada"
          let carga = "Moderada"
          if (typeof rawCarga === 'string') {
            const lowerCarga = rawCarga.toLowerCase()
            if (lowerCarga.includes('leve')) {
              carga = 'Leve'
            } else if (lowerCarga.includes('intensa') || lowerCarga.includes('intenso')) {
              carga = 'Intensa'
            } else if (lowerCarga.includes('moderada') || lowerCarga.includes('moderado')) {
              carga = 'Moderada'
            }
          }

          return {
            dia: item.dia || "Dia",
            materia: item.materia || "Matéria",
            topicos: Array.isArray(item.topicos) ? item.topicos : (item.subtopicos && Array.isArray(item.subtopicos) ? item.subtopicos : []),
            carga,
            questoes_sugeridas: typeof item.questoes_sugeridas === 'number' 
              ? item.questoes_sugeridas 
              : (typeof item.questoesSugeridas === 'number' ? item.questoesSugeridas : 10),
            meta_estudo: item.meta_estudo || item.metaEstudo || item.meta || "Revisar teoria e praticar questões."
          }
        })

        return {
          diagnostico,
          cronograma: cronogramaNormalizado,
          dica_ouro
        }
      }
    }
    return null
  } catch (err) {
    console.error("Erro no tentarParsearPlano:", err)
    return null
  }
}

/**
 * Hook para o Mentor IA.
 * Analisa o histórico de resoluções, detecta fraquezas, seleciona o assunto ativo e gera planos personalizados.
 * Inclui persistência automática no localStorage para evitar chamadas de API repetidas e manter o progresso.
 */
export function useMentor() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fraquezas, setFraquezas] = useState<FraquezaItem[]>([])
  
  // Plano Geral Semanal (pode ser o JSON estruturado ou string legada)
  const [plano, setPlano] = useState<PlanoEstruturado | string | null>(null)
  const [gerandoPlano, setGerandoPlano] = useState(false)
  const [tarefasConcluidas, setTarefasConcluidas] = useState<Record<number, boolean>>({})

  // Mentoria Individualizada por Assunto
  const [selectedFraqueza, setSelectedFraqueza] = useState<FraquezaItem | null>(null)
  const [planosAssuntos, setPlanosAssuntos] = useState<Record<string, string>>({})
  const [gerandoMentoria, setGerandoMentoria] = useState(false)

  // Status de Sincronização com o Banco Supabase (Alerta se colunas não existirem)
  const [dbSyncError, setDbSyncError] = useState(false)

  // Carrega dados iniciais e restaura cache do localStorage e Supabase
  useEffect(() => {
    async function load() {
      try {
        const resolucoes = await fetchAllResolucoes()
        const detected = detectarFraquezas(resolucoes)
        setFraquezas(detected)

        // 1. Tenta carregar do Supabase (prioridade)
        let loadedPlano: PlanoEstruturado | string | null = null
        let loadedTarefas: Record<number, boolean> = {}

        try {
          const dbData = await fetchMentorPlano()
          if (dbData) {
            if (dbData.mentor_plano) {
              const parsed = typeof dbData.mentor_plano === 'string'
                ? tentarParsearPlano(dbData.mentor_plano)
                : dbData.mentor_plano
              loadedPlano = parsed || dbData.mentor_plano
            }
            if (dbData.mentor_tarefas) {
              loadedTarefas = typeof dbData.mentor_tarefas === 'string'
                ? JSON.parse(dbData.mentor_tarefas)
                : dbData.mentor_tarefas
            }
          }
        } catch (dbErr: unknown) {
          console.warn('Colunas do mentor no Supabase ausentes ou inacessíveis, usando localStorage fallback:', dbErr instanceof Error ? dbErr.message : String(dbErr))
          setDbSyncError(true)
        }

        // 2. Fallback para localStorage se não carregou do Supabase
        if (loadedPlano) {
          setPlano(loadedPlano)
        } else {
          const cachedPlano = localStorage.getItem('mentor_plano_geral')
          if (cachedPlano) {
            const parsed = tentarParsearPlano(cachedPlano)
            setPlano(parsed || cachedPlano)
          }
        }

        if (Object.keys(loadedTarefas).length > 0) {
          setTarefasConcluidas(loadedTarefas)
        } else {
          const cachedTarefas = localStorage.getItem('mentor_tarefas_concluidas')
          if (cachedTarefas) {
            setTarefasConcluidas(JSON.parse(cachedTarefas))
          }
        }

        // Restaura as mentorias por assunto (localStorage)
        const cachedMentorias = localStorage.getItem('mentor_planos_assuntos')
        if (cachedMentorias) {
          setPlanosAssuntos(JSON.parse(cachedMentorias))
        }
      } catch (err: unknown) {
        console.error('Erro ao analisar desempenho:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleGerarPlano = async () => {
    if (fraquezas.length === 0) return
    setGerandoPlano(true)
    try {
      const texto = await gerarPlanoEstudos(fraquezas)
      localStorage.setItem('mentor_plano_geral', texto)
      
      const parsed = tentarParsearPlano(texto)
      const novoPlano = parsed || texto
      setPlano(novoPlano)
      
      trackEvent('gerar_plano_estudos', { fraquezas: fraquezas.length })

      // Reseta o progresso das tarefas para o novo plano
      setTarefasConcluidas({})
      localStorage.removeItem('mentor_tarefas_concluidas')

      // Sincroniza com Supabase
      try {
        await updateMentorPlano(novoPlano, {})
      } catch (dbErr) {
        console.warn('Erro ao salvar plano no Supabase:', dbErr)
        setDbSyncError(true)
      }
    } catch (err: unknown) {
      console.error('Erro ao gerar plano:', err)
      setPlano('Houve um erro ao gerar o plano. Tente novamente mais tarde.')
    } finally {
      setGerandoPlano(false)
    }
  }

  const handleToggleTarefa = async (index: number) => {
    const novaConcluida = !tarefasConcluidas[index]
    const novasTarefas = { ...tarefasConcluidas, [index]: novaConcluida }
    setTarefasConcluidas(novasTarefas)

    trackEvent('alternar_tarefa', { index, concluida: novaConcluida })
    localStorage.setItem('mentor_tarefas_concluidas', JSON.stringify(novasTarefas))

    // Sincroniza com Supabase
    try {
      await updateMentorPlano(plano, novasTarefas)
    } catch (dbErr) {
      console.warn('Erro ao salvar tarefas no Supabase:', dbErr)
      setDbSyncError(true)
    }
  }

  const handleLimparPlano = async () => {
    setPlano(null)
    setTarefasConcluidas({})
    localStorage.removeItem('mentor_plano_geral')
    localStorage.removeItem('mentor_tarefas_concluidas')

    // Sincroniza com Supabase
    try {
      await updateMentorPlano(null, {})
    } catch (dbErr) {
      console.warn('Erro ao limpar plano no Supabase:', dbErr)
      setDbSyncError(true)
    }
  }

  const handleGerarMentoria = async (fraqueza: FraquezaItem) => {
    const key = `${fraqueza.materia} - ${fraqueza.assunto}`
    if (planosAssuntos[key]) return // Retorna se já gerado
    
    setGerandoMentoria(true)
    try {
      const texto = await gerarMentoriaAssunto(fraqueza)
      const novasMentorias = { ...planosAssuntos, [key]: texto }
      setPlanosAssuntos(novasMentorias)

      trackEvent('gerar_mentoria', { materia: fraqueza.materia, assunto: fraqueza.assunto })
      localStorage.setItem('mentor_planos_assuntos', JSON.stringify(novasMentorias))
    } catch (err: unknown) {
      console.error('Erro ao gerar mentoria de assunto:', err)
    } finally {
      setGerandoMentoria(false)
    }
  }

  return {
    loading,
    error,
    fraquezas,
    plano,
    gerandoPlano,
    handleGerarPlano,
    selectedFraqueza,
    setSelectedFraqueza,
    planosAssuntos,
    gerandoMentoria,
    handleGerarMentoria,
    tarefasConcluidas,
    handleToggleTarefa,
    handleLimparPlano,
    dbSyncError
  }
}
