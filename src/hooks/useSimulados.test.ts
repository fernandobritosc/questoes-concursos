import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ResolucaoView } from '../types/database'

const mockQuestao = (id: number, overrides: Partial<ResolucaoView> = {}): ResolucaoView => ({
  id,
  questao_id: id,
  questao_tec_id: 10000 + id,
  materia: 'Direito Constitucional',
  assunto: 'Direitos e Garantias',
  banca_texto: 'CESPE',
  orgao: 'STF',
  concurso: 'STF',
  prova: 'STF / 2023',
  ano: 2023,
  caderno_nome: 'Caderno',
  enunciado: `Questão ${id}`,
  gabarito: 'A',
  alternativas: { A: 'Alt A', B: 'Alt B', C: 'Alt C', D: 'Alt D', E: 'Alt E' },
  resolucao_professor: null,
  alternativa: null,
  acertou: false,
  tempo_segundos: 0,
  data_resolucao: '2024-01-01T00:00:00Z',
  ...overrides,
})

const mockQuestoes: ResolucaoView[] = Array.from({ length: 20 }, (_, i) =>
  mockQuestao(i + 1, {
    assunto: i < 10 ? 'Assunto Fraco' : 'Assunto Forte',
    materia: i < 15 ? 'Matéria Fraca' : 'Matéria Forte',
    alternativa: i < 5 ? (i % 2 === 0 ? 'A' : 'B') : null,
    acertou: i < 5 ? i % 2 === 0 : false,
  })
)

const mockQuestoesValidas = mockQuestoes.map(q => ({
  ...q,
  alternativas: Object.keys(q.alternativas).length >= 2 ? q.alternativas : { A: 'Sim', B: 'Não' },
}))

const mockRef = vi.hoisted(() => ({
  fetchAllQuestoes: vi.fn(),
  insertHistoricoResolucao: vi.fn(),
  gerarFeedbackSimulado: vi.fn(),
  trackEvent: vi.fn(),
}))

vi.mock('../services/supabase.service', () => ({
  fetchAllQuestoes: () => mockRef.fetchAllQuestoes(),
  insertHistoricoResolucao: (payload: unknown) => mockRef.insertHistoricoResolucao(payload),
}))

vi.mock('../services/gemini.service', () => ({
  gerarFeedbackSimulado: () => mockRef.gerarFeedbackSimulado(),
}))

vi.mock('../services/hermesTracker', () => ({
  trackEvent: (...args: unknown[]) => mockRef.trackEvent(...args),
}))

import { useSimulados } from './useSimulados'

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  mockRef.fetchAllQuestoes.mockResolvedValue(mockQuestoesValidas)
  mockRef.insertHistoricoResolucao.mockResolvedValue({})
  mockRef.gerarFeedbackSimulado.mockResolvedValue('# Diagnóstico OK')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSimulados', () => {
  it('starts in setup etapa', async () => {
    const { result } = renderHook(() => useSimulados())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.etapa).toBe('setup')
  })

  it('shows loading initially', () => {
    const { result } = renderHook(() => useSimulados())
    expect(result.current.loading).toBe(true)
  })

  it('sets error when fetch fails', async () => {
    mockRef.fetchAllQuestoes.mockRejectedValue(new Error('Falha na rede'))
    const { result } = renderHook(() => useSimulados())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Falha na rede')
  })

  it('inicia simulado with handleIniciarSimulado', async () => {
    const { result } = renderHook(() => useSimulados())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.handleIniciarSimulado(5, 10) })

    expect(result.current.etapa).toBe('active')
    expect(result.current.questoesSelected.length).toBe(5)
    expect(result.current.tempoRestante).toBe(600)
    expect(result.current.tempoGasto).toBe(0)
  })

  it('starts timer when etapa becomes active', async () => {
    const { result } = renderHook(() => useSimulados())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.handleIniciarSimulado(5, 1) })
    expect(result.current.tempoRestante).toBe(60)

    act(() => { vi.advanceTimersByTime(2000) })

    expect(result.current.tempoRestante).toBe(58)
    expect(result.current.tempoGasto).toBe(2)
  })

  it('handleMarcarResposta records answer', async () => {
    const { result } = renderHook(() => useSimulados())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.handleIniciarSimulado(5, 10) })
    const qId = result.current.questoesSelected[0].questao_id

    act(() => { result.current.handleMarcarResposta(qId, 'B') })

    expect(result.current.respostasMarcadas[qId]).toBe('B')
  })

  it('handleResetSimulado resets to setup', async () => {
    const { result } = renderHook(() => useSimulados())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.handleIniciarSimulado(5, 10) })
    expect(result.current.etapa).toBe('active')

    act(() => { result.current.handleResetSimulado() })
    expect(result.current.etapa).toBe('setup')
    expect(result.current.questoesSelected).toEqual([])
    expect(result.current.respostasMarcadas).toEqual({})
  })

  it('handleFinalizarSimulado submits and shows results', async () => {
    const { result } = renderHook(() => useSimulados())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.handleIniciarSimulado(3, 10) })
    const questoes = result.current.questoesSelected

    // Marca todas como corretas
    questoes.forEach(q => {
      act(() => { result.current.handleMarcarResposta(q.questao_id, q.gabarito || 'A') })
    })

    await act(async () => {
      await result.current.handleFinalizarSimulado()
    })

    expect(result.current.etapa).toBe('results')
    expect(result.current.pontuacao).toEqual({ acertos: 3, total: 3, taxa: 100 })
  })

  it('handleLimparHistorico clears localStorage', async () => {
    localStorage.setItem('concursos_simulado_historico', JSON.stringify([{ id: 'sim_1', data: '2024-01-01' }]))

    const { result } = renderHook(() => useSimulados())
    await vi.waitFor(() => expect(result.current.loading).toBe(false))

    // Mock window.confirm to return true
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)

    act(() => { result.current.handleLimparHistorico() })

    expect(localStorage.getItem('concursos_simulado_historico')).toBeNull()
    expect(result.current.historicoSimulados).toEqual([])

    window.confirm = originalConfirm
  })
})
