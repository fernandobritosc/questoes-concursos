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
    erros: [],
    loading: false,
    error: null,
    questaoAtual: null,
    questaoAtualIndex: 0,
    setQuestaoAtualIndex: vi.fn(),
    totalErros: 0,
    alternativaSelecionada: null,
    setAlternativaSelecionada: vi.fn(),
    revelado: false,
    salvandoResposta: false,
    explicacaoAtual: null,
    loadingExplicacao: false,
    handleResponder: vi.fn(),
    handleConfirmarResposta: vi.fn(),
    handleProxima: vi.fn(),
    handleExplicacaoIA: vi.fn(),
    handleClassificar: vi.fn(),
    obterPrazosEstimados: vi.fn(),
    ...overrides,
  }
}

const mockRef = vi.hoisted(() => ({ current: makeDefaultHook() }))
const mockSearchParamsRef = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(() => [mockSearchParamsRef.current, vi.fn()]),
}))

vi.mock('../hooks/useRevisao', () => ({
  useRevisao: () => mockRef.current,
}))

vi.mock('../services/supabase.service', () => ({
  updateResolucaoProfessor: vi.fn(),
}))

import { Revisao } from './Revisao'

beforeEach(() => {
  mockRef.current = makeDefaultHook()
  mockSearchParamsRef.current = new URLSearchParams()
})

describe('Revisao page', () => {
  it('shows loading spinner when loading', () => {
    mockRef.current = makeDefaultHook({ loading: true })
    render(<Revisao />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows empty state when totalErros is 0', () => {
    render(<Revisao />)
    expect(screen.getByText('Caderno de Erros Vazio')).toBeInTheDocument()
    expect(screen.getByText(/Você não tem erros pendentes/)).toBeInTheDocument()
  })

  it('shows grid view with errors', () => {
    mockRef.current = makeDefaultHook({
      erros: [mockQuestao],
      totalErros: 1,
    })
    render(<Revisao />)
    expect(screen.getByText('Caderno de Erros')).toBeInTheDocument()
    expect(screen.getAllByText(/1 erro pendente/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('pendentes')).toBeInTheDocument()
    expect(screen.getByText('matérias')).toBeInTheDocument()
    expect(screen.getByText('assuntos')).toBeInTheDocument()
    expect(screen.getByText('SM-2')).toBeInTheDocument()
  })

  it('shows focus view when materia/assunto params are set', () => {
    mockRef.current = makeDefaultHook({
      erros: [mockQuestao],
      totalErros: 1,
      questaoAtual: mockQuestao,
    })
    mockSearchParamsRef.current = new URLSearchParams({
      materia: 'Direito Constitucional',
      assunto: 'Direitos e Garantias',
    })
    render(<Revisao />)
    expect(screen.getByText('Modo de Foco')).toBeInTheDocument()
    expect(screen.getByText('Voltar ao Caderno')).toBeInTheDocument()
  })

  it('shows empty focus state when params have no matching errors', () => {
    mockRef.current = makeDefaultHook({
      erros: [mockQuestao],
      totalErros: 1,
    })
    mockSearchParamsRef.current = new URLSearchParams({
      materia: 'Direito Penal',
      assunto: 'Crimes',
    })
    render(<Revisao />)
    expect(screen.getByText('Tópico Concluído!')).toBeInTheDocument()
    expect(screen.getByText(/Todos os erros pendentes/)).toBeInTheDocument()
    expect(screen.getByText('Voltar ao Caderno de Erros')).toBeInTheDocument()
  })

  it('shows filter bar and search input in grid view', () => {
    mockRef.current = makeDefaultHook({
      erros: [mockQuestao],
      totalErros: 1,
    })
    render(<Revisao />)
    expect(screen.getByPlaceholderText('Buscar matéria, assunto, banca, ID...')).toBeInTheDocument()
  })
})
