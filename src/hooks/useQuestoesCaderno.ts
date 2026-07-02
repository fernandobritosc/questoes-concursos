import { useState, useCallback } from 'react'
import {
  insertHistoricoResolucao,
  fetchHistoricoByQuestao,
  updateQuestao,
} from '../services/supabase.service'
import type { ResolucaoView, HistoricoResolucao } from '../types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseQuestoesCadernoParams {
  /** Função do filter hook que retorna questões filtradas (usada em handleGerarCaderno) */
  getFilteredQuestions: () => ResolucaoView[]
  /** Lista total de resoluções (do orquestrador) — usada para sync em handleConfirmarResposta e handleEditQuestao */
  resolucoes: ResolucaoView[]
  /** Setter de resolucoes (do orquestrador) */
  setResolucoes: React.Dispatch<React.SetStateAction<ResolucaoView[]>>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useQuestoesCaderno(params: UseQuestoesCadernoParams) {
  // ── Estado do Caderno ────────────────────────────────────────────────────────
  const [cadernoQuestoes, setCadernoQuestoes] = useState<ResolucaoView[]>([])
  const [isCadernoActive, setIsCadernoActive] = useState(false)
  const [currentQuestaoIndex, setCurrentQuestaoIndex] = useState(0)
  const [alternativaSelecionada, setAlternativaSelecionada] = useState<string | null>(null)
  const [revelado, setRevelado] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // ── Timer e Histórico (valores puros — effects no orquestrador) ────────────
  const [tempoSegundos, setTempoSegundos] = useState(0)
  const [salvandoResposta, setSalvandoResposta] = useState(false)
  const [historicoQuestaoAtiva, setHistoricoQuestaoAtiva] = useState<HistoricoResolucao[]>([])
  const [loadingHistoricoAtivo, setLoadingHistoricoAtivo] = useState(false)

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleGerarCaderno = useCallback(() => {
    const questoesFiltradas = params.getFilteredQuestions()
    if (questoesFiltradas.length === 0) return
    setCadernoQuestoes(questoesFiltradas)
    setCurrentQuestaoIndex(0)
    setAlternativaSelecionada(null)
    setRevelado(false)
    setIsCadernoActive(true)
    return questoesFiltradas.length
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.getFilteredQuestions])

  const handleCopy = (id: number) => {
    navigator.clipboard.writeText(id.toString())
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleConfirmarResposta = async (questao: ResolucaoView) => {
    if (revelado || !alternativaSelecionada) return
    const targetId = questao.questao_id || questao.id
    if (!targetId) return

    const acertou = alternativaSelecionada.toUpperCase() === (questao.gabarito || '').toUpperCase()

    setSalvandoResposta(true)
    try {
      await insertHistoricoResolucao({
        questao_id: targetId,
        questao_tec_id: questao.questao_tec_id,
        alternativa: alternativaSelecionada,
        acertou,
        tempo_segundos: tempoSegundos,
      })

      const resolucaoData = {
        alternativa: alternativaSelecionada,
        acertou,
        tempo_segundos: tempoSegundos,
        data_resolucao: new Date().toISOString(),
      }

      // Atualiza no caderno local
      setCadernoQuestoes(prev => prev.map(q =>
        (q.questao_id === targetId || q.id === targetId) ? { ...q, ...resolucaoData } : q
      ))

      // Atualiza na lista total de resoluções
      params.setResolucoes(prev => prev.map(r =>
        (r.questao_id === targetId || r.id === targetId) ? { ...r, ...resolucaoData } : r
      ))

      setRevelado(true)

      // Recarrega o histórico específico desta questão
      await loadHistoricoDaQuestao(targetId)
    } catch (err: unknown) {
      console.error('Erro ao salvar tentativa de resolução:', err)
      alert('Erro ao registrar resposta no banco de dados.')
    } finally {
      setSalvandoResposta(false)
    }
  }

  const handleEditQuestao = async (questao: ResolucaoView, updatedFields: Partial<ResolucaoView>): Promise<boolean> => {
    const targetId = questao.questao_id || questao.id
    if (!targetId) return false

    try {
      // Monta payload com campos da tabela 'questoes'
      const payload: Record<string, unknown> = {}
      if (updatedFields.enunciado !== undefined) payload.enunciado = updatedFields.enunciado
      if (updatedFields.alternativas !== undefined) payload.alternativas = updatedFields.alternativas
      if (updatedFields.materia !== undefined) payload.materia = updatedFields.materia
      if (updatedFields.assunto !== undefined) payload.assunto = updatedFields.assunto
      if (updatedFields.banca_texto !== undefined) payload.banca_texto = updatedFields.banca_texto
      if (updatedFields.orgao !== undefined) payload.orgao = updatedFields.orgao
      if (updatedFields.concurso !== undefined) payload.concurso = updatedFields.concurso
      if (updatedFields.prova !== undefined) payload.prova = updatedFields.prova
      if (updatedFields.ano !== undefined) payload.ano = updatedFields.ano
      if (updatedFields.gabarito !== undefined) payload.gabarito = updatedFields.gabarito

      await updateQuestao(targetId, payload)

      const updateLocal = (q: ResolucaoView) => {
        if (q.questao_id === targetId || q.id === targetId) {
          return { ...q, ...updatedFields }
        }
        return q
      }

      setCadernoQuestoes(prev => prev.map(updateLocal))
      params.setResolucoes(prev => prev.map(updateLocal))

      return true
    } catch (err: unknown) {
      console.error('Erro ao editar questão:', err)
      alert('Erro ao salvar alterações da questão. Verifique sua conexão.')
      return false
    }
  }

  const loadHistoricoDaQuestao = async (questaoId: number) => {
    setLoadingHistoricoAtivo(true)
    try {
      const hist = await fetchHistoricoByQuestao(questaoId)
      setHistoricoQuestaoAtiva(hist)
    } catch (err: unknown) {
      console.error('Erro ao carregar histórico da questão ativa:', err)
    } finally {
      setLoadingHistoricoAtivo(false)
    }
  }

  return {
    // ── Estado do caderno ─────────────────────────────────────────────────
    cadernoQuestoes, setCadernoQuestoes,
    isCadernoActive, setIsCadernoActive,
    currentQuestaoIndex, setCurrentQuestaoIndex,
    alternativaSelecionada, setAlternativaSelecionada,
    revelado, setRevelado,
    copiedId,

    // ── Timer e histórico (valores puros — effects no orquestrador) ──────
    tempoSegundos, setTempoSegundos,
    salvandoResposta,
    historicoQuestaoAtiva, setHistoricoQuestaoAtiva,
    loadingHistoricoAtivo,

    // ── Actions ──────────────────────────────────────────────────────────
    handleGerarCaderno,
    handleConfirmarResposta,
    handleEditQuestao,
    handleCopy,
    loadHistoricoDaQuestao,
  }
}
