import { useEffect, useState, useCallback } from 'react'
import {
  fetchMetasConcurso,
  fetchTarefasDaMeta,
  insertMetaConcurso,
  insertTarefasMetaBatch,
  updateMetaConcurso,
  updateTarefaMeta,
  updateTarefaMetaStatus,
  deleteMetaConcurso,
  deleteTarefaMeta,
} from '../services/supabase.service'
import type { MetaConcurso, TarefaMeta } from '../types/database'

interface UseMetasConcursoReturn {
  metas: MetaConcurso[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  criarMeta: (titulo: string, semanaNumero: number, dataInicio: string | null, dataFim: string | null) => Promise<MetaConcurso>
  excluirMeta: (id: number) => Promise<void>
  carregarTarefas: (metaId: number) => Promise<TarefaMeta[]>
  adicionarTarefas: (metaId: number, tarefas: Omit<TarefaMeta, 'id' | 'created_at'>[]) => Promise<TarefaMeta[]>
  atualizarTarefa: (id: number, payload: Partial<TarefaMeta>) => Promise<void>
  mudarStatusTarefa: (id: number, status: TarefaMeta['status']) => Promise<void>
  excluirTarefa: (id: number) => Promise<void>
}

export function useMetasConcurso(): UseMetasConcursoReturn {
  const [metas, setMetas] = useState<MetaConcurso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchMetasConcurso()
      setMetas(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar metas')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetchMetasConcurso()
      .then(data => { if (mounted) setMetas(data) })
      .catch((err: unknown) => { if (mounted) setError(err instanceof Error ? err.message : 'Erro ao carregar metas') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const criarMeta = useCallback(async (
    titulo: string,
    semanaNumero: number,
    dataInicio: string | null,
    dataFim: string | null
  ): Promise<MetaConcurso> => {
    const nova = await insertMetaConcurso({
      titulo,
      semana_numero: semanaNumero,
      data_inicio: dataInicio,
      data_fim: dataFim,
      total_tarefas: 0,
    })
    setMetas(prev => [nova, ...prev])
    return nova
  }, [])

  const excluirMeta = useCallback(async (id: number) => {
    await deleteMetaConcurso(id)
    setMetas(prev => prev.filter(m => m.id !== id))
  }, [])

  const carregarTarefas = useCallback(async (metaId: number): Promise<TarefaMeta[]> => {
    return fetchTarefasDaMeta(metaId)
  }, [])

  const adicionarTarefas = useCallback(async (
    metaId: number,
    tarefas: Omit<TarefaMeta, 'id' | 'created_at'>[]
  ): Promise<TarefaMeta[]> => {
    const inseridas = await insertTarefasMetaBatch(tarefas)
    await updateMetaConcurso(metaId, { total_tarefas: tarefas.length })
    setMetas(prev => prev.map(m => m.id === metaId ? { ...m, total_tarefas: tarefas.length } : m))
    return inseridas
  }, [])

  const atualizarTarefa = useCallback(async (id: number, payload: Partial<TarefaMeta>) => {
    await updateTarefaMeta(id, payload)
  }, [])

  const mudarStatusTarefa = useCallback(async (id: number, status: TarefaMeta['status']) => {
    await updateTarefaMetaStatus(id, status)
  }, [])

  const excluirTarefa = useCallback(async (id: number) => {
    await deleteTarefaMeta(id)
  }, [])

  return {
    metas,
    loading,
    error,
    refetch,
    criarMeta,
    excluirMeta,
    carregarTarefas,
    adicionarTarefas,
    atualizarTarefa,
    mudarStatusTarefa,
    excluirTarefa,
  }
}
