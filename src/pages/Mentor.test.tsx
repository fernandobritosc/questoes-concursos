import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { FraquezaItem } from '../services/gemini.service'
import type { PlanoEstruturado } from '../hooks/useMentor'

const mockFraqueza: FraquezaItem = {
  assunto: 'Direitos e Garantias',
  materia: 'Direito Constitucional',
  taxa: 45,
  total: 8,
}

const mockPlanoEstruturado: PlanoEstruturado = {
  diagnostico: 'Você precisa focar em Direito Constitucional.',
  cronograma: [
    {
      dia: 'Segunda-feira',
      materia: 'Direito Constitucional',
      topicos: ['Direitos e Garantias'],
      carga: 'Moderada',
      questoes_sugeridas: 15,
      meta_estudo: 'Revisar os artigos 5º ao 17 da CF',
    },
  ],
  dica_ouro: 'Pratique questões da CESPE sobre direitos fundamentais.',
}

function makeDefaultHook(overrides: Record<string, unknown> = {}) {
  return {
    loading: false,
    error: null,
    fraquezas: [],
    plano: null,
    gerandoPlano: false,
    handleGerarPlano: vi.fn(),
    selectedFraqueza: null,
    setSelectedFraqueza: vi.fn(),
    planosAssuntos: {},
    gerandoMentoria: false,
    handleGerarMentoria: vi.fn(),
    tarefasConcluidas: {},
    handleToggleTarefa: vi.fn(),
    handleLimparPlano: vi.fn(),
    dbSyncError: false,
    ...overrides,
  }
}

const mockRef = vi.hoisted(() => ({ current: makeDefaultHook() }))

vi.mock('../hooks/useMentor', () => ({
  useMentor: () => mockRef.current,
  tentarParsearPlano: vi.fn(),
  type: {},
}))

import { Mentor } from './Mentor'

beforeEach(() => {
  mockRef.current = makeDefaultHook()
})

describe('Mentor page', () => {
  it('shows loading spinner when loading', () => {
    mockRef.current = makeDefaultHook({ loading: true })
    render(<Mentor />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows empty fraquezas state', () => {
    render(<Mentor />)
    expect(screen.getByText('Mentor IA')).toBeInTheDocument()
    expect(screen.getByText(/Você não possui dados suficientes/)).toBeInTheDocument()
    expect(screen.getByText('Fraquezas Mapeadas')).toBeInTheDocument()
  })

  it('shows fraquezas list and generate button', () => {
    mockRef.current = makeDefaultHook({
      fraquezas: [mockFraqueza],
    })
    render(<Mentor />)
    expect(screen.getByText('Direitos e Garantias')).toBeInTheDocument()
    expect(screen.getByText('45% acerto')).toBeInTheDocument()
    expect(screen.getByText('Gerar Plano Tático Geral')).toBeInTheDocument()
  })

  it('shows generating plano state', () => {
    mockRef.current = makeDefaultHook({
      fraquezas: [mockFraqueza],
      gerandoPlano: true,
    })
    render(<Mentor />)
    expect(screen.getByText(/O Mentor IA está analisando/)).toBeInTheDocument()
  })

  it('shows structured plano when generated', () => {
    mockRef.current = makeDefaultHook({
      fraquezas: [mockFraqueza],
      plano: mockPlanoEstruturado,
    })
    render(<Mentor />)
    expect(screen.getByText('Diagnóstico do Mentor')).toBeInTheDocument()
    expect(screen.getByText('Você precisa focar em Direito Constitucional.')).toBeInTheDocument()
    expect(screen.getByText('Cronograma de Estudos da Semana')).toBeInTheDocument()
    expect(screen.getByText('Segunda-feira')).toBeInTheDocument()
    expect(screen.getByText('Dica de Ouro do Mentor')).toBeInTheDocument()
    expect(screen.getByText(/Pratique questões da CESPE/)).toBeInTheDocument()
    expect(screen.getByText('Limpar e Regenerar Plano')).toBeInTheDocument()
  })

  it('shows string plano when generated', () => {
    mockRef.current = makeDefaultHook({
      fraquezas: [mockFraqueza],
      plano: '## Plano Semanal\n\nEstude Direito Constitucional.',
    })
    render(<Mentor />)
    expect(screen.getByText('Plano Semanal')).toBeInTheDocument()
  })

  it('shows selected fraqueza mentoring view', () => {
    mockRef.current = makeDefaultHook({
      fraquezas: [mockFraqueza],
      selectedFraqueza: mockFraqueza,
    })
    render(<Mentor />)
    expect(screen.getByText(/Mentoria:/)).toBeInTheDocument()
    expect(screen.getByText(/Consultar Mentor IA/)).toBeInTheDocument()
  })

  it('shows generating mentoria state', () => {
    mockRef.current = makeDefaultHook({
      fraquezas: [mockFraqueza],
      selectedFraqueza: mockFraqueza,
      gerandoMentoria: true,
    })
    render(<Mentor />)
    expect(screen.getByText(/O Mentor IA está analisando a matéria/)).toBeInTheDocument()
  })

  it('shows active mentoria text when generated', () => {
    mockRef.current = makeDefaultHook({
      fraquezas: [mockFraqueza],
      selectedFraqueza: mockFraqueza,
      planosAssuntos: {
        'Direito Constitucional - Direitos e Garantias': '## Mentoria\n\nFoque em jurisprudência.',
      },
    })
    render(<Mentor />)
    expect(screen.getByText('Mentoria')).toBeInTheDocument()
    expect(screen.getByText('Foque em jurisprudência.')).toBeInTheDocument()
  })
})
