import { useState, useCallback } from 'react'
import { updateResolucaoProfessor } from '../services/supabase.service'
import type { ResolucaoView } from '../types/database'

// ─── Options Interface ─────────────────────────────────────────────────────────

interface UseQuestoesResolucaoOptions {
  /** Callback disparado após a resolução ser salva/editada, para sincronizar cadernoQuestoes/resolucoes */
  onQuestoesUpdated?: (targetId: number, updates: Partial<ResolucaoView>) => void
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useQuestoesResolucao(options?: UseQuestoesResolucaoOptions) {
  const [editingResolucao, setEditingResolucao] = useState(false)
  const [resolucaoText, setResolucaoText] = useState('')
  const [resolucaoExpanded, setResolucaoExpanded] = useState(true)
  const [savingResolucao, setSavingResolucao] = useState(false)

  const handleSaveResolucao = useCallback(async (questaoId: number, text: string): Promise<boolean> => {
    setSavingResolucao(true)
    try {
      await updateResolucaoProfessor(questaoId, text)
      setEditingResolucao(false)
      options?.onQuestoesUpdated?.(questaoId, { resolucao_professor: text })
      return true
    } catch (err: unknown) {
      console.error('Erro ao salvar resolução:', err)
      alert('Erro ao salvar a resolução do professor. Verifique sua conexão ou permissões.')
      return false
    } finally {
      setSavingResolucao(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    editingResolucao, setEditingResolucao,
    resolucaoText, setResolucaoText,
    resolucaoExpanded, setResolucaoExpanded,
    savingResolucao,
    handleSaveResolucao,
  }
}
