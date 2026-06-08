import { useState, useCallback } from 'react'
import { updateResolucaoProfessor } from '../services/supabase.service'
import { gerarResolucaoProfessor } from '../services/gemini.service'
import { trackEvent } from '../services/hermesTracker'
import type { ResolucaoView } from '../types/database'

// Alias de compatibilidade local
type Resolucao = ResolucaoView

// ─── Options Interface ─────────────────────────────────────────────────────────

interface UseQuestoesResolucaoOptions {
  /** Callback disparado após uma explicação IA ser gerada, para sincronizar cadernoQuestoes/resolucoes */
  onQuestoesUpdated?: (targetId: number, updates: Partial<ResolucaoView>) => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useQuestoesResolucao(options?: UseQuestoesResolucaoOptions) {
  const [editingResolucao, setEditingResolucao] = useState(false)
  const [resolucaoText, setResolucaoText] = useState('')
  const [resolucaoExpanded, setResolucaoExpanded] = useState(true)
  const [savingResolucao, setSavingResolucao] = useState(false)
  const [explicacoes, setExplicacoes] = useState<Record<number, string>>({})
  const [loadingExplicacao, setLoadingExplicacao] = useState<number | null>(null)

  const handleSaveResolucao = useCallback(async (questaoId: number, text: string): Promise<boolean> => {
    setSavingResolucao(true)
    try {
      await updateResolucaoProfessor(questaoId, text)
      setEditingResolucao(false)
      return true
    } catch (err: unknown) {
      console.error('Erro ao salvar resolução:', err)
      alert('Erro ao salvar a resolução do professor. Verifique sua conexão ou permissões.')
      return false
    } finally {
      setSavingResolucao(false)
    }
  }, [])

  const handleExplicacaoIA = async (questao: Resolucao) => {
    const targetId = questao.questao_id || questao.id
    if (!targetId || loadingExplicacao === questao.id) return
    if (explicacoes[questao.id!]) return

    setLoadingExplicacao(questao.id!)
    try {
      const texto = await gerarResolucaoProfessor(questao)
      setExplicacoes(prev => ({ ...prev, [questao.id!]: texto }))

      // Salva automaticamente no banco de dados para evitar re-gerações futuras
      await updateResolucaoProfessor(targetId, texto)

      // Atualiza o estado da resolução local
      setResolucaoText(texto)

      // Sincroniza com o orquestrador via callback
      options?.onQuestoesUpdated?.(targetId, { resolucao_professor: texto })

      trackEvent('gerar_explicacao_ia', {
        questao_id: targetId,
        materia: questao.materia,
        assunto: questao.assunto,
      })
    } catch (err: unknown) {
      console.error(err)
      setExplicacoes(prev => ({
        ...prev,
        [questao.id!]: 'Ocorreu um erro ao gerar a explicação da IA. Verifique sua chave de API.'
      }))
    } finally {
      setLoadingExplicacao(null)
    }
  }

  return {
    editingResolucao, setEditingResolucao,
    resolucaoText, setResolucaoText,
    resolucaoExpanded, setResolucaoExpanded,
    savingResolucao,
    explicacoes,
    loadingExplicacao,
    handleSaveResolucao,
    handleExplicacaoIA,
  }
}
