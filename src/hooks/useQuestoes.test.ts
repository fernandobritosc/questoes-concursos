import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ResolucaoView } from '../types/database'

const mockQuestao = (id: number): ResolucaoView => ({
  id,
  questao_id: id,
  questao_tec_id: 10000 + id,
  materia: 'Direito',
  assunto: 'Garantias',
  banca_texto: 'CESPE',
  orgao: 'STF',
  concurso: 'STF',
  prova: 'STF / 2023',
  ano: 2023,
  caderno_nome: 'Caderno',
  enunciado: `Questão ${id}`,
  gabarito: 'A',
  alternativas: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
  resolucao_professor: null,
  alternativa: null,
  acertou: false,
  tempo_segundos: 0,
  data_resolucao: '2024-01-01T00:00:00Z',
})

const paginatedResult = {
  data: [mockQuestao(1), mockQuestao(2)],
  total: 50,
  totalPages: 25,
  page: 1,
}

const filterOptions = {
  materias: ['Direito'],
  bancas: ['CESPE'],
  anos: [2023],
  orgaos: ['STF'],
  concursos: ['STF'],
}

// Shared mutable refs for sub-hook mocks
const mockRef = vi.hoisted(() => ({
  fetchPaginatedQuestoes: vi.fn(),
  fetchFilterOptions: vi.fn(),
  trackEvent: vi.fn(),

  // Sub-hook return values (mutable — swap per test)
  filterResult: {
    filtros: null as Record<string, string> | null,
    setFiltros: vi.fn(),
    getFilteredQuestions: vi.fn(() => []),
    buildServerFilters: vi.fn(() => ({})),
    selectedMaterias: [] as string[],
    selectedBancas: [] as string[],
    selectedAnos: [] as number[],
    selectedOrgaos: [] as string[],
    selectedConcursos: [] as string[],
    totalFiltrosAtivos: 0,
    // Stubs for abundant properties returned by the filter hook
    objetivo: null,
    setObjetivo: vi.fn(),
    activeTab: 'questoes' as string,
    setActiveTab: vi.fn(),
    searchTerm: '',
    setSearchTerm: vi.fn(),
    showSearchBox: false,
    setShowSearchBox: vi.fn(),
    selectedAssuntos: [],
    setSelectedAssuntos: vi.fn(),
    selectedCarreiras: [],
    selectedEscolaridades: [],
    selectedFormacoes: [],
    selectedRegioes: [],
    selectedFavoritas: [],
    selectedEnunciados: [],
    selectedStatus: [],
    setSelectedStatus: vi.fn(),
    isFilterExpanded: false,
    setIsFilterExpanded: vi.fn(),
    visibleQuestionsCount: 0,
    setVisibleQuestionsCount: vi.fn(),
    expandedMateriaFolder: null,
    setExpandedMateriaFolder: vi.fn(),
    cadernoNome: '',
    setCadernoNome: vi.fn(),
    pastaDestino: '',
    setPastaDestino: vi.fn(),
    gerarEmSerie: false,
    setGerarEmSerie: vi.fn(),
    materiasUnicas: [],
    materiasComAssuntos: [],
    bancasUnicas: [],
    anosUnicos: [],
    orgaosUnicos: [],
    concursosUnicos: [],
    filteredQuestions: [],
    filteredCount: 0,
    handleToggleMateria: vi.fn(),
    handleToggleAssunto: vi.fn(),
    handleToggleBanca: vi.fn(),
    handleToggleAno: vi.fn(),
    handleToggleOrgao: vi.fn(),
    handleToggleConcurso: vi.fn(),
    handleToggleCarreira: vi.fn(),
    handleToggleEscolaridade: vi.fn(),
    handleToggleFormacao: vi.fn(),
    handleToggleRegiao: vi.fn(),
    handleToggleFavorita: vi.fn(),
    handleToggleEnunciado: vi.fn(),
    handleResetFilters: vi.fn(),
  },
  cadernoResult: {
    cadernoQuestoes: [] as ResolucaoView[],
    setCadernoQuestoes: vi.fn(),
    isCadernoActive: false,
    setIsCadernoActive: vi.fn(),
    currentQuestaoIndex: 0,
    setCurrentQuestaoIndex: vi.fn(),
    alternativaSelecionada: null as string | null,
    setAlternativaSelecionada: vi.fn(),
    revelado: false,
    setRevelado: vi.fn(),
    copiedId: null as number | null,
    tempoSegundos: 0,
    setTempoSegundos: vi.fn(),
    salvandoResposta: false,
    historicoQuestaoAtiva: [],
    loadingHistoricoAtivo: false,
    loadHistoricoDaQuestao: vi.fn(),
    setHistoricoQuestaoAtiva: vi.fn(),
    handleGerarCaderno: vi.fn(),
    handleConfirmarResposta: vi.fn(),
    handleEditQuestao: vi.fn(),
    handleCopy: vi.fn(),
  },
  resolucaoResult: {
    explicacoes: {} as Record<number, string>,
    loadingExplicacao: null as number | null,
    copiedId: null as number | null,
    editingResolucao: false,
    setEditingResolucao: vi.fn(),
    resolucaoText: '',
    setResolucaoText: vi.fn(),
    resolucaoExpanded: false,
    setResolucaoExpanded: vi.fn(),
    savingResolucao: false,
    handleExplicacaoIA: vi.fn(),
    handleSaveResolucao: vi.fn(),
  },
}))

vi.mock('../services/supabase.service', () => ({
  fetchPaginatedQuestoes: (...args: unknown[]) => mockRef.fetchPaginatedQuestoes(...args),
  fetchFilterOptions: () => mockRef.fetchFilterOptions(),
}))

vi.mock('../services/hermesTracker', () => ({
  trackEvent: (...args: unknown[]) => mockRef.trackEvent(...args),
}))

vi.mock('./useQuestoesFilter', () => ({
  useQuestoesFilter: () => mockRef.filterResult,
}))

vi.mock('./useQuestoesCaderno', () => ({
  useQuestoesCaderno: () => mockRef.cadernoResult,
}))

vi.mock('./useQuestoesResolucao', () => ({
  useQuestoesResolucao: () => mockRef.resolucaoResult,
}))

import { useQuestoes } from './useQuestoes'

beforeEach(() => {
  // Reset all mocks to defaults
  mockRef.fetchPaginatedQuestoes.mockResolvedValue(paginatedResult)
  mockRef.fetchFilterOptions.mockResolvedValue(filterOptions)
  mockRef.filterResult = { ...mockRef.filterResult, filtros: null }
  mockRef.cadernoResult = { ...mockRef.cadernoResult, cadernoQuestoes: [] }
})

describe('useQuestoes', () => {
  it('shows loading initially', () => {
    const { result } = renderHook(() => useQuestoes())
    expect(result.current.loading).toBe(true)
  })

  it('loads data on mount', async () => {
    const { result } = renderHook(() => useQuestoes())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    expect(mockRef.fetchPaginatedQuestoes).toHaveBeenCalled()
    expect(mockRef.fetchPaginatedQuestoes.mock.calls[0][0]).toBe(1)
    expect(mockRef.fetchPaginatedQuestoes.mock.calls[0][1]).toBe(99999)
    expect(mockRef.fetchFilterOptions).toHaveBeenCalled()
    expect(result.current.resolucoes).toHaveLength(2)
    expect(result.current.totalPages).toBe(25)
  })

  it('sets loadingError when fetch fails', async () => {
    mockRef.fetchPaginatedQuestoes.mockRejectedValue(new Error('Timeout'))
    const { result } = renderHook(() => useQuestoes())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.loadingError).toBe('Timeout')
  })

  it('handleNavigatePage calls loadPage', async () => {
    const { result } = renderHook(() => useQuestoes())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.handleNavigatePage(2) })

    expect(mockRef.fetchPaginatedQuestoes).toHaveBeenCalledWith(2, 99999, {}, expect.any(AbortSignal))
  })

  it('handleConfirmarResposta delegates to caderno hook', async () => {
    const questao = mockQuestao(1)
    mockRef.cadernoResult = {
      ...mockRef.cadernoResult,
      cadernoQuestoes: [questao],
    }
    mockRef.filterResult = {
      ...mockRef.filterResult,
      filteredQuestions: [questao],
    }
    mockRef.fetchPaginatedQuestoes.mockResolvedValue({
      data: [questao],
      total: 1,
      totalPages: 1,
      page: 1,
    })

    const { result } = renderHook(() => useQuestoes())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    // Wait for sync effects to settle
    await vi.waitFor(() => {
      expect(mockRef.cadernoResult.setCadernoQuestoes).toHaveBeenCalled()
    })

    act(() => { result.current.handleConfirmarResposta() })

    expect(mockRef.cadernoResult.handleConfirmarResposta).toHaveBeenCalled()
  })

  it('handleSaveResolucao delegates to resolucao hook', async () => {
    const questao = { ...mockQuestao(1), questao_id: 1, id: 1 }
    mockRef.cadernoResult = {
      ...mockRef.cadernoResult,
      cadernoQuestoes: [questao],
    }
    mockRef.filterResult = {
      ...mockRef.filterResult,
      filteredQuestions: [questao],
    }
    mockRef.fetchPaginatedQuestoes.mockResolvedValue({
      data: [questao],
      total: 1,
      totalPages: 1,
      page: 1,
    })

    const { result } = renderHook(() => useQuestoes())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    // Set resolucaoText so there's something to save
    mockRef.resolucaoResult.resolucaoText = 'Nova resolução'

    mockRef.resolucaoResult.handleSaveResolucao.mockResolvedValue(true)

    await act(async () => {
      await result.current.handleSaveResolucao()
    })

    expect(mockRef.resolucaoResult.handleSaveResolucao).toHaveBeenCalledWith(1, 'Nova resolução')
  })
})
