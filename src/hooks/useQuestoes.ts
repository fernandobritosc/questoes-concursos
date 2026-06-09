import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import {
  fetchPaginatedQuestoes,
  fetchFilterOptions,
} from '../services/supabase.service'
import { trackEvent } from '../services/hermesTracker'
import { useQuestoesFilter } from './useQuestoesFilter'
import { useQuestoesCaderno } from './useQuestoesCaderno'
import { useQuestoesResolucao } from './useQuestoesResolucao'
import type { ResolucaoView } from '../types/database'

// Re-export types e constantes do sub-hook de filtro
export type { FilterTab, ObjetivoFilter, StatusFilter } from './useQuestoesFilter'
export {
  CARREIRAS_DISPONIVEIS,
  ESCOLARIDADES_DISPONIVEIS,
  FORMACOES_DISPONIVEIS,
  REGIOES_DISPONIVEIS,
  FAVORITAS_OPCOES,
  ENUNCIADOS_OPCOES,
} from './useQuestoesFilter'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface ImportStatus {
  step: 'idle' | 'loading_engine' | 'reading_pages' | 'parsing' | 'review' | 'checking_existing' | 'saving' | 'success' | 'error'
  progress: number
  total: number
  errorMsg?: string
  importedCount?: number
}

// ─── Hook Principal (Orquestrador) ─────────────────────────────────────────────

/**
 * Hook central do Banco de Questões.
 * Orquestra os sub-hooks useQuestoesFilter, useQuestoesCaderno e useQuestoesResolucao.
 * Gerencia: carregamento, paginação, coordenação entre hooks, e bridge questoesExibidas.
 */
export function useQuestoes() {
  // ── Dados Principais ──────────────────────────────────────────────────────────
  const [resolucoes, setResolucoes] = useState<ResolucaoView[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  // ── Paginação ─────────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [pageLoading, setPageLoading] = useState(false)
  const [pageLoadingError, setPageLoadingError] = useState<string | null>(null)
  const [filterOptions, setFilterOptions] = useState<{
    materias: string[]
    bancas: string[]
    anos: number[]
    orgaos: string[]
    concursos: string[]
  } | null>(null)

  // ── Sub-hooks ─────────────────────────────────────────────────────────────────
  const filter = useQuestoesFilter(resolucoes, filterOptions)

  const caderno = useQuestoesCaderno({
    getFilteredQuestions: filter.getFilteredQuestions,
    resolucoes,
    setResolucoes,
  })

  // Callback para sincronizar cadernoQuestoes/resolucoes após alteração via hook de resolução
  const onQuestoesUpdated = useCallback(
    (targetId: number, updates: Partial<ResolucaoView>) => {
      if (updates.resolucao_professor !== undefined) {
        caderno.setCadernoQuestoes((prev) =>
          prev.map((q) =>
            q.questao_id === targetId || q.id === targetId
              ? { ...q, ...updates }
              : q,
          ),
        )
        setResolucoes((prev) =>
          prev.map((r) =>
            r.questao_id === targetId || r.id === targetId
              ? { ...r, ...updates }
              : r,
          ),
        )
      }
    },
    // setCadernoQuestoes e setResolucoes são estáveis — caderno omitido intencionalmente
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caderno.setCadernoQuestoes, setResolucoes],
  )

  const resolucao = useQuestoesResolucao({ onQuestoesUpdated })

  // ── Importação PDF ────────────────────────────────────────────────────────────
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // ── Paginação e Filtros Server-Side ──────────────────────────────────────────
  const abortControllerRef = useRef<AbortController | null>(null)

  const PAGE_SIZE = 200

  function buildServerFilters(): Record<string, string[]> {
    return filter.buildServerFilters()
  }

  const loadPage = useCallback(async (targetPage: number, replace: boolean = false) => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Don't set pageLoading for the initial load (loading === true already covers it)
    if (!loading) setPageLoading(true)
    setPageLoadingError(null)

    try {
      const serverFilters = buildServerFilters()
      const result = await fetchPaginatedQuestoes(targetPage, PAGE_SIZE, serverFilters, controller.signal)

      if (controller.signal.aborted) return  // Stale response — discard

      if (replace) {
        // Replace all data (new filter set or first load)
        setResolucoes(result.data)
        caderno.setCadernoQuestoes(result.data)
      } else {
        // Append data (same filter set, new page)
        setResolucoes(prev => {
          const updated = [...prev]
          const start = (targetPage - 1) * PAGE_SIZE
          result.data.forEach((item, i) => { updated[start + i] = item })
          return updated
        })
        caderno.setCadernoQuestoes(prev => {
          const updated = [...prev]
          const start = (targetPage - 1) * PAGE_SIZE
          result.data.forEach((item, i) => { updated[start + i] = item })
          return updated
        })
      }

      setPage(targetPage)
      setTotalPages(result.totalPages)
      setTotalCount(result.total)
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return  // Silently ignore cancelled requests
      if (!controller.signal.aborted) {
        setPageLoadingError(err instanceof Error ? err.message : 'Erro ao carregar página.')
      }
    } finally {
      if (!controller.signal.aborted) {
        setPageLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, filter.selectedMaterias, filter.selectedBancas, filter.selectedAnos, filter.selectedOrgaos, filter.selectedConcursos])

  const handleNavigatePage = useCallback(async (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) return
    await loadPage(targetPage, false)
  }, [totalPages, page, loadPage])

  // ─── Bridge Computed ──────────────────────────────────────────────────────────

  const questoesExibidas = useMemo(() => {
    const f = filter.filtros
    if (!f) return caderno.cadernoQuestoes
    return caderno.cadernoQuestoes.filter(q => {
      for (const [key, val] of Object.entries(f)) {
        if (String((q as unknown as Record<string, unknown>)[key] || `Sem ${key}`) !== val) return false;
      }
      return true;
    })
  }, [caderno.cadernoQuestoes, filter.filtros])

  // ─── Effects de Coordenação ──────────────────────────────────────────────────

  // Sync resolucaoText + cancel editing ao navegar entre questões
  useEffect(() => {
    const questoes = questoesExibidas
    if (questoes.length > 0 && questoes[caderno.currentQuestaoIndex]) {
      const q = questoes[caderno.currentQuestaoIndex]
      resolucao.setResolucaoText(q.resolucao_professor || '')
      resolucao.setEditingResolucao(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caderno.currentQuestaoIndex, resolucao.setResolucaoText, resolucao.setEditingResolucao])

  // ─── Effects: Carga Inicial ───────────────────────────────────────────────────

  // Initial load — fetch page 1 and filter options
  useEffect(() => {
    let cancelled = false
    async function load() {
      console.log('[LOG useQuestoes] Iniciando carga paginada...')
      setLoadingError(null)
      try {
        // Fetch filter options in parallel with page 1
        const serverFilters = buildServerFilters()
        const [paginatedResult, filterOpts] = await Promise.race([
          Promise.all([
            fetchPaginatedQuestoes(1, PAGE_SIZE, serverFilters),
            fetchFilterOptions(),
          ]),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout ao conectar com o banco de dados. Verifique sua conexão.')), 30000)
          ),
        ])

        if (cancelled) {
          console.log('[LOG useQuestoes] Componente desmontado durante carga.')
          return
        }

        const result = paginatedResult
        const opts = filterOpts
        console.log(`[LOG useQuestoes] Dados carregados: ${result.data.length} questões (página 1 de ${result.totalPages}, total=${result.total})`)

        if (result.data.length > 0) {
          const q0 = result.data[0]
          console.log(`[LOG useQuestoes] 1ª questão: id=${q0.questao_tec_id}, enunciado=${(q0.enunciado || '').length}chars`)
        }

        setResolucoes(result.data)
        caderno.setCadernoQuestoes(result.data)
        setPage(1)
        setTotalPages(result.totalPages)
        setTotalCount(result.total)
        setFilterOptions(opts)
      } catch (err: unknown) {
        console.error('[LOG useQuestoes] Erro na carga inicial:', err)
        if (!cancelled) {
          setLoadingError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar questões.')
        }
      } finally {
        if (!cancelled) {
          console.log('[LOG useQuestoes] setLoading(false)')
          setLoading(false)
        }
      }
    }
    console.log('[LOG useQuestoes] useEffect disparado, chamando load()')
    load()
    return () => {
      console.log('[LOG useQuestoes] Cleanup: cancelando carga')
      cancelled = true
      abortControllerRef.current?.abort()
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // When filters change, reset to page 1 and reload
  useEffect(() => {
    // Skip the initial render — initial load handles page 1
    if (loading) return

    async function reloadOnFilterChange() {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      setPageLoading(true)
      setPageLoadingError(null)

      try {
        const serverFilters = buildServerFilters()
        const result = await fetchPaginatedQuestoes(1, PAGE_SIZE, serverFilters, controller.signal)
        if (controller.signal.aborted) return

        setResolucoes(result.data)
        caderno.setCadernoQuestoes(result.data)
        setPage(1)
        setTotalPages(result.totalPages)
        setTotalCount(result.total)
        caderno.setCurrentQuestaoIndex(0)
        caderno.setAlternativaSelecionada(null)
        caderno.setRevelado(false)
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return
        if (!controller.signal.aborted) {
          setPageLoadingError(err instanceof Error ? err.message : 'Erro ao carregar página.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setPageLoading(false)
        }
      }
    }

    reloadOnFilterChange()
    return () => { abortControllerRef.current?.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filter.selectedMaterias, filter.selectedBancas, filter.selectedAnos,
    filter.selectedOrgaos, filter.selectedConcursos,
  ])

  // ─── Relational Timer & History Loading Effects ──────────────────────────────

  // Timer: incrementa segundos se a questão ainda não foi respondida
  useEffect(() => {
    if (caderno.revelado || questoesExibidas.length === 0) return
    const timer = setInterval(() => {
      caderno.setTempoSegundos((prev: number) => prev + 1)
    }, 1000)
    return () => { clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caderno.revelado, caderno.currentQuestaoIndex, questoesExibidas, caderno.setTempoSegundos])

  // Reset timer on navigating questions
  useEffect(() => {
    caderno.setTempoSegundos(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caderno.currentQuestaoIndex, caderno.setTempoSegundos])

  // Load history of active question when navigating to a new question
  useEffect(() => {
    const questoes = questoesExibidas
    if (questoes.length > 0 && questoes[caderno.currentQuestaoIndex]) {
      const q = questoes[caderno.currentQuestaoIndex]
      const targetId = q.questao_id || q.id
      if (targetId) {
        caderno.loadHistoricoDaQuestao(targetId)
      } else {
        caderno.setHistoricoQuestaoAtiva([])
      }
    } else {
      caderno.setHistoricoQuestaoAtiva([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caderno.currentQuestaoIndex])

  // ─── Wrapper Actions ──────────────────────────────────────────────────────────

  const handleGerarCaderno = useCallback(() => {
    const total = caderno.handleGerarCaderno()
    if (total && total > 0) {
      trackEvent('gerar_caderno', {
        quantidade: total,
        total_filtros: filter.totalFiltrosAtivos,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caderno.handleGerarCaderno, filter.totalFiltrosAtivos])

  const handleConfirmarResposta = useCallback(async () => {
    if (questoesExibidas.length === 0 || !questoesExibidas[caderno.currentQuestaoIndex]) return
    return caderno.handleConfirmarResposta(questoesExibidas[caderno.currentQuestaoIndex])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questoesExibidas, caderno.currentQuestaoIndex, caderno.handleConfirmarResposta])

  const handleEditQuestao = useCallback(async (updatedFields: Partial<ResolucaoView>) => {
    if (questoesExibidas.length === 0 || !questoesExibidas[caderno.currentQuestaoIndex]) return false
    return caderno.handleEditQuestao(questoesExibidas[caderno.currentQuestaoIndex], updatedFields)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questoesExibidas, caderno.currentQuestaoIndex, caderno.handleEditQuestao])

  const handleSaveResolucao = useCallback(async () => {
    if (questoesExibidas.length === 0 || !questoesExibidas[caderno.currentQuestaoIndex]) return
    const questao = questoesExibidas[caderno.currentQuestaoIndex]
    const targetId = questao.questao_id || questao.id
    if (!targetId) return

    const success = await resolucao.handleSaveResolucao(targetId, resolucao.resolucaoText)
    if (success) {
      caderno.setCadernoQuestoes(prev => prev.map(q =>
        (q.questao_id === targetId || q.id === targetId) ? { ...q, resolucao_professor: resolucao.resolucaoText } : q
      ))
      setResolucoes(prev => prev.map(r =>
        (r.questao_id === targetId || r.id === targetId) ? { ...r, resolucao_professor: resolucao.resolucaoText } : r
      ))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questoesExibidas, caderno.currentQuestaoIndex, resolucao.handleSaveResolucao, resolucao.resolucaoText, caderno.setCadernoQuestoes, setResolucoes])

  // ─── Return ───────────────────────────────────────────────────────────────────

  return {
    // ── State ──────────────────────────────────────────────────────────────
    resolucoes,
    setResolucoes,
    loading,
    loadingError,
    page,
    totalPages,
    totalCount,
    pageLoading,
    pageLoadingError,
    handleNavigatePage,
    PAGE_SIZE,
    cadernoQuestoes: caderno.cadernoQuestoes,
    setCadernoQuestoes: caderno.setCadernoQuestoes,
    isCadernoActive: caderno.isCadernoActive,
    setIsCadernoActive: caderno.setIsCadernoActive,
    currentQuestaoIndex: caderno.currentQuestaoIndex,
    setCurrentQuestaoIndex: caderno.setCurrentQuestaoIndex,
    alternativaSelecionada: caderno.alternativaSelecionada,
    setAlternativaSelecionada: caderno.setAlternativaSelecionada,
    revelado: caderno.revelado,
    setRevelado: caderno.setRevelado,
    explicacoes: resolucao.explicacoes,
    loadingExplicacao: resolucao.loadingExplicacao,
    copiedId: caderno.copiedId,
    editingResolucao: resolucao.editingResolucao,
    setEditingResolucao: resolucao.setEditingResolucao,
    resolucaoText: resolucao.resolucaoText,
    setResolucaoText: resolucao.setResolucaoText,
    resolucaoExpanded: resolucao.resolucaoExpanded,
    setResolucaoExpanded: resolucao.setResolucaoExpanded,
    savingResolucao: resolucao.savingResolucao,
    tempoSegundos: caderno.tempoSegundos,
    salvandoResposta: caderno.salvandoResposta,
    historicoQuestaoAtiva: caderno.historicoQuestaoAtiva,
    loadingHistoricoAtivo: caderno.loadingHistoricoAtivo,

    // ── Filter State ───────────────────────────────────────────────────────
    filtros: filter.filtros,
    setFiltros: filter.setFiltros,
    questoesExibidas,
    objetivo: filter.objetivo,
    setObjetivo: filter.setObjetivo,
    activeTab: filter.activeTab,
    setActiveTab: filter.setActiveTab,
    searchTerm: filter.searchTerm,
    setSearchTerm: filter.setSearchTerm,
    showSearchBox: filter.showSearchBox,
    setShowSearchBox: filter.setShowSearchBox,
    selectedMaterias: filter.selectedMaterias,
    selectedAssuntos: filter.selectedAssuntos,
    setSelectedAssuntos: filter.setSelectedAssuntos,
    selectedBancas: filter.selectedBancas,
    selectedAnos: filter.selectedAnos,
    selectedOrgaos: filter.selectedOrgaos,
    selectedConcursos: filter.selectedConcursos,
    selectedCarreiras: filter.selectedCarreiras,
    selectedEscolaridades: filter.selectedEscolaridades,
    selectedFormacoes: filter.selectedFormacoes,
    selectedRegioes: filter.selectedRegioes,
    selectedFavoritas: filter.selectedFavoritas,
    selectedEnunciados: filter.selectedEnunciados,
    selectedStatus: filter.selectedStatus,
    setSelectedStatus: filter.setSelectedStatus,
    isFilterExpanded: filter.isFilterExpanded,
    setIsFilterExpanded: filter.setIsFilterExpanded,
    visibleQuestionsCount: filter.visibleQuestionsCount,
    setVisibleQuestionsCount: filter.setVisibleQuestionsCount,
    expandedMateriaFolder: filter.expandedMateriaFolder,
    setExpandedMateriaFolder: filter.setExpandedMateriaFolder,
    cadernoNome: filter.cadernoNome,
    setCadernoNome: filter.setCadernoNome,
    pastaDestino: filter.pastaDestino,
    setPastaDestino: filter.setPastaDestino,
    gerarEmSerie: filter.gerarEmSerie,
    setGerarEmSerie: filter.setGerarEmSerie,

    // ── Import PDF State ───────────────────────────────────────────────────
    isImportModalOpen,
    setIsImportModalOpen,

    // ── Derived / Computed ─────────────────────────────────────────────────
    materiasUnicas: filter.materiasUnicas,
    materiasComAssuntos: filter.materiasComAssuntos,
    bancasUnicas: filter.bancasUnicas,
    anosUnicos: filter.anosUnicos,
    orgaosUnicos: filter.orgaosUnicos,
    concursosUnicos: filter.concursosUnicos,
    filteredQuestions: filter.filteredQuestions,
    filteredCount: filter.filteredCount,
    totalFiltrosAtivos: filter.totalFiltrosAtivos,

    // ── Actions ────────────────────────────────────────────────────────────
    handleToggleMateria: filter.handleToggleMateria,
    handleToggleAssunto: filter.handleToggleAssunto,
    handleToggleBanca: filter.handleToggleBanca,
    handleToggleAno: filter.handleToggleAno,
    handleToggleOrgao: filter.handleToggleOrgao,
    handleToggleConcurso: filter.handleToggleConcurso,
    handleToggleCarreira: filter.handleToggleCarreira,
    handleToggleEscolaridade: filter.handleToggleEscolaridade,
    handleToggleFormacao: filter.handleToggleFormacao,
    handleToggleRegiao: filter.handleToggleRegiao,
    handleToggleFavorita: filter.handleToggleFavorita,
    handleToggleEnunciado: filter.handleToggleEnunciado,
    handleResetFilters: filter.handleResetFilters,
    getFilteredQuestions: filter.getFilteredQuestions,
    handleGerarCaderno,
    handleCopy: caderno.handleCopy,
    handleExplicacaoIA: resolucao.handleExplicacaoIA,
    handleSaveResolucao,
    handleConfirmarResposta,
    loadHistoricoDaQuestao: caderno.loadHistoricoDaQuestao,
    handleEditQuestao,
  }
}
