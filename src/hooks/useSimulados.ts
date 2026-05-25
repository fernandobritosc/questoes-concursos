import { useState, useEffect, useRef } from 'react'
import { fetchAllQuestoes, insertHistoricoResolucao } from '../services/supabase.service'
import { gerarFeedbackSimulado } from '../services/gemini.service'
import type { ResolucaoView } from '../types/database'

export type SimuladoEtapa = 'setup' | 'active' | 'submitting' | 'results'

export interface SimuladoConfig {
  qtdQuestoes: number
  tempoMinutos: number
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function useSimulados() {
  const [allQuestoes, setAllQuestoes] = useState<ResolucaoView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados do simulado ativo
  const [etapa, setEtapa] = useState<SimuladoEtapa>('setup')
  const [config, setConfig] = useState<SimuladoConfig>({ qtdQuestoes: 10, tempoMinutos: 15 })
  const [questoesSelected, setQuestoesSelected] = useState<ResolucaoView[]>([])
  const [respostasMarcadas, setRespostasMarcadas] = useState<Record<number, string>>({})
  const [questaoAtualIndex, setQuestaoAtualIndex] = useState(0)

  // Cronômetro
  const [tempoRestante, setTempoRestante] = useState(0)
  const [tempoGasto, setTempoGasto] = useState(0)

  // Resultados
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [diagnosticoIA, setDiagnosticoIA] = useState<string | null>(null)
  const [pontuacao, setPontuacao] = useState<{ acertos: number; total: number; taxa: number } | null>(null)

  const timerRef = useRef<any>(null)

  // Carrega as questões no início para analisar o perfil do usuário
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllQuestoes()
        setAllQuestoes(data)
      } catch (err: any) {
        console.error('Erro ao carregar questões para simulado:', err)
        setError(err.message || 'Erro ao carregar banco de dados.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Gerencia o cronômetro do simulado ativo
  useEffect(() => {
    if (etapa === 'active') {
      timerRef.current = setInterval(() => {
        setTempoRestante(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            // Auto submete ao zerar o cronômetro
            handleFinalizarSimulado()
            return 0
          }
          return prev - 1
        })
        setTempoGasto(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [etapa, questoesSelected])

  /**
   * Identifica os assuntos ou matérias com aproveitamento abaixo de 70%
   */
  const obterTopicosFracos = () => {
    const weakAssuntos = new Set<string>()
    const weakMaterias = new Set<string>()

    // Pega questões resolvidas recentemente para calcular estatísticas
    const respondidas = allQuestoes.filter(q => q.alternativa && q.alternativa !== '')

    const statsAssunto: Record<string, { total: number; acertos: number }> = {}
    const statsMateria: Record<string, { total: number; acertos: number }> = {}

    respondidas.forEach(q => {
      if (q.assunto) {
        if (!statsAssunto[q.assunto]) statsAssunto[q.assunto] = { total: 0, acertos: 0 }
        statsAssunto[q.assunto].total++
        if (q.acertou) statsAssunto[q.assunto].acertos++
      }
      if (q.materia) {
        if (!statsMateria[q.materia]) statsMateria[q.materia] = { total: 0, acertos: 0 }
        statsMateria[q.materia].total++
        if (q.acertou) statsMateria[q.materia].acertos++
      }
    })

    Object.entries(statsAssunto).forEach(([assunto, s]) => {
      const taxa = (s.acertos / s.total) * 100
      if (taxa < 70) weakAssuntos.add(assunto)
    })

    Object.entries(statsMateria).forEach(([materia, s]) => {
      const taxa = (s.acertos / s.total) * 100
      if (taxa < 70) weakMaterias.add(materia)
    })

    return { weakAssuntos, weakMaterias }
  }

  /**
   * Inicializa o simulado ativo
   */
  const handleIniciarSimulado = (qtd: number, tempoMin: number) => {
    setConfig({ qtdQuestoes: qtd, tempoMinutos: tempoMin })
    setRespostasMarcadas({})
    setQuestaoAtualIndex(0)
    setTempoRestante(tempoMin * 60)
    setTempoGasto(0)
    setDiagnosticoIA(null)
    setPontuacao(null)

    // Filtra questões do banco baseadas nas fraquezas
    const { weakAssuntos, weakMaterias } = obterTopicosFracos()

    // 1. Questões correspondentes a assuntos fracos
    let pool = allQuestoes.filter(q => q.assunto && weakAssuntos.has(q.assunto))

    // 2. Se for pouca questão, adiciona matérias fracas
    if (pool.length < qtd) {
      const materiasPool = allQuestoes.filter(
        q => q.materia && weakMaterias.has(q.materia) && !pool.some(p => p.id === q.id)
      )
      pool = [...pool, ...materiasPool]
    }

    // 3. Se ainda faltar, adiciona questões não resolvidas (ineditas)
    if (pool.length < qtd) {
      const ineditas = allQuestoes.filter(
        q => (!q.alternativa || q.alternativa === '') && !pool.some(p => p.id === q.id)
      )
      pool = [...pool, ...ineditas]
    }

    // 4. Se mesmo assim faltar, pega qualquer questão do banco
    if (pool.length < qtd) {
      const geral = allQuestoes.filter(q => !pool.some(p => p.id === q.id))
      pool = [...pool, ...geral]
    }

    // Mistura e limita à quantidade solicitada
    const selecionadas = shuffleArray(pool).slice(0, qtd)
    setQuestoesSelected(selecionadas)
    setEtapa('active')
  }

  /**
   * Marca uma resposta temporária para a questão
   */
  const handleMarcarResposta = (questaoId: number, alternativa: string) => {
    setRespostasMarcadas(prev => ({
      ...prev,
      [questaoId]: alternativa,
    }))
  }

  /**
   * Submete todas as respostas ao banco de dados e obtém feedback da IA
   */
  const handleFinalizarSimulado = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setEtapa('submitting')

    let acertos = 0
    const total = questoesSelected.length

    // Mapeamento dos erros cometidos neste simulado
    const errosCometidos: { materia: string; assunto: string }[] = []

    // Calcula tempo gasto médio por questão
    const tempoMedioQuestao = total > 0 ? Math.round(tempoGasto / total) : 0

    // Salva cada resposta na tabela historico_resolucoes do Supabase
    const promises = questoesSelected.map(async q => {
      const id = q.questao_id || q.id!
      const resposta = respostasMarcadas[id] || ''
      const acertou = resposta.toUpperCase() === (q.gabarito || '').toUpperCase()

      if (acertou) {
        acertos++
      } else {
        errosCometidos.push({
          materia: q.materia || 'Geral',
          assunto: q.assunto || 'Sem Assunto',
        })
      }

      // Registra a tentativa no Supabase
      try {
        await insertHistoricoResolucao({
          questao_id: id,
          questao_tec_id: q.questao_tec_id,
          alternativa: resposta,
          acertou,
          tempo_segundos: tempoMedioQuestao,
        })
      } catch (err) {
        console.error(`Erro ao salvar histórico do simulado para questão ${id}:`, err)
      }
    })

    await Promise.all(promises)

    const taxa = total > 0 ? Math.round((acertos / total) * 100) : 0
    setPontuacao({ acertos, total, taxa })

    // Busca feedback tático no Gemini
    setLoadingFeedback(true)
    try {
      const feedback = await gerarFeedbackSimulado(errosCometidos, acertos, total)
      setDiagnosticoIA(feedback)
    } catch (err: any) {
      console.error('Erro ao gerar feedback do Gemini:', err)
      setDiagnosticoIA(
        '# Diagnóstico Indisponível\nOcorreu um erro temporário ao conectar-se ao Gemini AI. Verifique sua chave de API nas configurações.'
      )
    } finally {
      setLoadingFeedback(false)
    }

    setEtapa('results')
  }

  /**
   * Reseta o simulado voltando para a tela de Setup
   */
  const handleResetSimulado = () => {
    setEtapa('setup')
    setQuestoesSelected([])
    setRespostasMarcadas({})
    setQuestaoAtualIndex(0)
    setTempoRestante(0)
    setTempoGasto(0)
    setPontuacao(null)
    setDiagnosticoIA(null)
  }

  return {
    loading,
    error,
    etapa,
    config,
    questoesSelected,
    respostasMarcadas,
    questaoAtualIndex,
    setQuestaoAtualIndex,
    tempoRestante,
    tempoGasto,
    loadingFeedback,
    diagnosticoIA,
    pontuacao,
    handleIniciarSimulado,
    handleMarcarResposta,
    handleFinalizarSimulado,
    handleResetSimulado,
  }
}
