import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ResolucaoView } from '../types/database'

const mockQuestao: ResolucaoView = {
  id: 1,
  questao_id: 100,
  questao_tec_id: 12345,
  materia: 'Direito Constitucional',
  assunto: 'Direitos e Garantias',
  banca_texto: 'CESPE',
  orgao: 'STF',
  concurso: 'STF',
  prova: 'STF / 2023',
  ano: 2023,
  caderno_nome: 'Caderno Teste',
  enunciado: 'Qual o artigo?',
  gabarito: 'A',
  alternativas: { A: 'Art. 5º', B: 'Art. 6º', C: 'Art. 7º', D: 'Art. 8º', E: 'Art. 9º' },
  resolucao_professor: '',
  alternativa: null,
  acertou: false,
  tempo_segundos: 0,
  data_resolucao: '2024-01-01T00:00:00Z',
}

function makeDefaultHook(overrides: Record<string, unknown> = {}) {
  return {
    resolucoes: [],
    setResolucoes: vi.fn(),
    loading: false,
    cadernoQuestoes: [],
    setCadernoQuestoes: vi.fn(),
    currentQuestaoIndex: 0,
    setCurrentQuestaoIndex: vi.fn(),
    alternativaSelecionada: null,
    setAlternativaSelecionada: vi.fn(),
    revelado: false,
    setRevelado: vi.fn(),
    copiedId: null,
    editingResolucao: false,
    setEditingResolucao: vi.fn(),
    resolucaoText: '',
    setResolucaoText: vi.fn(),
    resolucaoExpanded: false,
    setResolucaoExpanded: vi.fn(),
    savingResolucao: false,
    isImportModalOpen: false,
    setIsImportModalOpen: vi.fn(),
    handleCopy: vi.fn(),
    handleSaveResolucao: vi.fn(),
    tempoSegundos: 0,
    salvandoResposta: false,
    historicoQuestaoAtiva: [],
    loadingHistoricoAtivo: false,
    handleConfirmarResposta: vi.fn(),
    filtros: null,
    setFiltros: vi.fn(),
    questoesExibidas: [],
    handleEditQuestao: vi.fn(),
    loadingError: null,
    pageLoading: false,
    pageLoadingError: null,
    page: 1,
    totalPages: 1,
    handleNavigatePage: vi.fn(),
    questaoTecId: '',
    objetivo: 'todos',
    selectedAssuntos: [],
    totalFiltrosAtivos: 0,
    handleResetFilters: vi.fn(),
    ...overrides,
  }
}

const mockRef = vi.hoisted(() => ({ current: makeDefaultHook() }))

const searchParamsMock = vi.hoisted(() => ({
  params: new URLSearchParams(),
  setParams: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(() => [searchParamsMock.params, searchParamsMock.setParams]),
}))

vi.mock('../hooks/useQuestoes', () => ({
  useQuestoes: () => mockRef.current,
}))

import { Questoes } from './Questoes'

beforeEach(() => {
  mockRef.current = makeDefaultHook()
  searchParamsMock.params = new URLSearchParams()
  searchParamsMock.setParams = vi.fn()
})

describe('Questoes page', () => {
  it('shows loading spinner when loading', () => {
    mockRef.current = makeDefaultHook({ loading: true })
    render(<Questoes />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows error screen when loadingError is set', () => {
    mockRef.current = makeDefaultHook({ loadingError: 'Erro de conexão' })
    render(<Questoes />)
    expect(screen.getByText('Erro ao carregar questões')).toBeInTheDocument()
    expect(screen.getByText('Erro de conexão')).toBeInTheDocument()
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('shows empty state when no questions available', () => {
    render(<Questoes />)
    expect(screen.getByText('Nenhuma questão disponível')).toBeInTheDocument()
    expect(screen.getByText('Importar PDF do TEC')).toBeInTheDocument()
  })

  it('shows QuestaoVisualizador when questions exist', () => {
    mockRef.current = makeDefaultHook({
      cadernoQuestoes: [mockQuestao],
      questoesExibidas: [mockQuestao],
    })
    render(<Questoes />)
    expect(screen.getByText(/Questão 1 de 1/)).toBeInTheDocument()
  })

  it('shows page loading error banner', () => {
    mockRef.current = makeDefaultHook({
      cadernoQuestoes: [mockQuestao],
      questoesExibidas: [mockQuestao],
      pageLoadingError: 'Erro na página 2',
    })
    render(<Questoes />)
    expect(screen.getByText('Erro na página 2')).toBeInTheDocument()
  })

  it('shows skeleton when pageLoading', () => {
    mockRef.current = makeDefaultHook({
      cadernoQuestoes: [mockQuestao],
      questoesExibidas: [mockQuestao],
      pageLoading: true,
    })
    render(<Questoes />)
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('opens the clicked question from ?id= deep link', () => {
    const outra: ResolucaoView = {
      ...mockQuestao,
      id: 2,
      questao_id: 101,
      questao_tec_id: 99999,
      enunciado: 'Outra questão',
    }
    searchParamsMock.params = new URLSearchParams({ id: '99999' })
    const setCurrentQuestaoIndex = vi.fn()
    mockRef.current = makeDefaultHook({
      cadernoQuestoes: [mockQuestao, outra],
      questoesExibidas: [mockQuestao, outra],
      setCurrentQuestaoIndex,
    })
    render(<Questoes />)
    expect(setCurrentQuestaoIndex).toHaveBeenCalledWith(1)
    expect(searchParamsMock.setParams).toHaveBeenCalledWith({}, { replace: true })
  })

  it('resets filters when deep-linked question is hidden by filters', () => {
    searchParamsMock.params = new URLSearchParams({ id: '12345' })
    const handleResetFilters = vi.fn()
    mockRef.current = makeDefaultHook({
      cadernoQuestoes: [mockQuestao],
      questoesExibidas: [],
      totalFiltrosAtivos: 2,
      handleResetFilters,
      setCurrentQuestaoIndex: vi.fn(),
    })
    render(<Questoes />)
    expect(handleResetFilters).toHaveBeenCalled()
    expect(searchParamsMock.setParams).not.toHaveBeenCalled()
  })
})
