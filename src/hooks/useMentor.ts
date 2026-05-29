import { useEffect, useState } from 'react'
import { fetchAllResolucoes } from '../services/supabase.service'
import { gerarPlanoEstudos, gerarMentoriaAssunto, type FraquezaItem } from '../services/gemini.service'
import type { Resolucao } from '../types/database'

const FRAQUEZA_MIN_QUESTOES = 3
const FRAQUEZA_MAX_TAXA = 70

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
 * Hook para o Mentor IA.
 * Analisa o histórico de resoluções, detecta fraquezas, seleciona o assunto ativo e gera planos personalizados.
 */
export function useMentor() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fraquezas, setFraquezas] = useState<FraquezaItem[]>([])
  
  // Plano Geral Semanal
  const [plano, setPlano] = useState<string | null>(null)
  const [gerandoPlano, setGerandoPlano] = useState(false)

  // Mentoria Individualizada por Assunto
  const [selectedFraqueza, setSelectedFraqueza] = useState<FraquezaItem | null>(null)
  const [planosAssuntos, setPlanosAssuntos] = useState<Record<string, string>>({})
  const [gerandoMentoria, setGerandoMentoria] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const resolucoes = await fetchAllResolucoes()
        const detected = detectarFraquezas(resolucoes)
        setFraquezas(detected)
      } catch (err: any) {
        console.error('Erro ao analisar desempenho:', err)
        setError(err.message || 'Erro ao carregar dados.')
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
      setPlano(texto)
    } catch (err: any) {
      console.error('Erro ao gerar plano:', err)
      setPlano('Houve um erro ao gerar o plano. Tente novamente mais tarde.')
    } finally {
      setGerandoPlano(false)
    }
  }

  const handleGerarMentoria = async (fraqueza: FraquezaItem) => {
    const key = `${fraqueza.materia} - ${fraqueza.assunto}`
    if (planosAssuntos[key]) return // Retorna se já gerado
    
    setGerandoMentoria(true)
    try {
      const texto = await gerarMentoriaAssunto(fraqueza)
      setPlanosAssuntos(prev => ({ ...prev, [key]: texto }))
    } catch (err: any) {
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
    handleGerarMentoria
  }
}

