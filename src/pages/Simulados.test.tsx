import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

function makeDefaultHook(overrides: Record<string, unknown> = {}) {
  return {
    loading: false,
    error: null,
    etapa: 'setup',
    questoesSelected: [],
    respostasMarcadas: {},
    questaoAtualIndex: 0,
    setQuestaoAtualIndex: vi.fn(),
    tempoRestante: 0,
    tempoGasto: 0,
    loadingFeedback: false,
    diagnosticoIA: null,
    pontuacao: null,
    historicoSimulados: [],
    handleIniciarSimulado: vi.fn(),
    handleMarcarResposta: vi.fn(),
    handleFinalizarSimulado: vi.fn(),
    handleResetSimulado: vi.fn(),
    handleLimparHistorico: vi.fn(),
    ...overrides,
  }
}

const mockRef = vi.hoisted(() => ({ current: makeDefaultHook() }))

vi.mock('../hooks/useSimulados', () => ({
  useSimulados: () => mockRef.current,
}))

import { Simulados } from './Simulados'

beforeEach(() => {
  mockRef.current = makeDefaultHook()
})

describe('Simulados page', () => {
  it('shows loading spinner when loading', () => {
    mockRef.current = makeDefaultHook({ loading: true })
    render(<Simulados />)
    expect(screen.getByText(/Analisando base de erros/)).toBeInTheDocument()
  })

  it('shows error screen when error is set', () => {
    mockRef.current = makeDefaultHook({ error: 'Falha na conexão' })
    render(<Simulados />)
    expect(screen.getByText('Erro de Conexão')).toBeInTheDocument()
    expect(screen.getByText('Falha na conexão')).toBeInTheDocument()
    expect(screen.getByText('Tentar Novamente')).toBeInTheDocument()
  })

  it('shows setup screen when etapa is setup', () => {
    render(<Simulados />)
    expect(screen.getByText('Gerar Simulado Personalizado')).toBeInTheDocument()
  })

  it('shows exam view when etapa is active', () => {
    mockRef.current = makeDefaultHook({ etapa: 'active' })
    render(<Simulados />)
    expect(screen.getAllByText(/Finalizar Simulado/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows submitting screen when etapa is submitting', () => {
    mockRef.current = makeDefaultHook({ etapa: 'submitting' })
    render(<Simulados />)
    expect(screen.getByText('Avaliando Respostas...')).toBeInTheDocument()
  })

  it('shows results screen when etapa is results and pontuacao is set', () => {
    mockRef.current = makeDefaultHook({
      etapa: 'results',
      pontuacao: { acertos: 5, total: 10, taxa: 50 },
    })
    render(<Simulados />)
    expect(screen.getByText('Resultado do Simulado')).toBeInTheDocument()
  })

  it('returns null when etapa is results but no pontuacao', () => {
    mockRef.current = makeDefaultHook({ etapa: 'results', pontuacao: null })
    const { container } = render(<Simulados />)
    expect(container.innerHTML).toBe('')
  })
})
