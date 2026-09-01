import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useRevisao } from './useRevisao'
import type { ResolucaoView } from '../types/database'

const mockFetchAllResolucoes = vi.fn()
const mockInsertHistoricoResolucao = vi.fn()

vi.mock('../services/supabase.service', () => ({
  fetchAllResolucoes: () => mockFetchAllResolucoes(),
  insertHistoricoResolucao: (...args: unknown[]) => mockInsertHistoricoResolucao(...args),
}))

function makeResolucao(overrides: Partial<ResolucaoView> & { questao_tec_id: number }): ResolucaoView {
  return {
    id: overrides.questao_tec_id,
    questao_id: overrides.questao_tec_id,
    materia: 'Matéria', assunto: 'Assunto', banca_texto: 'CESPE',
    orgao: 'Órgão', concurso: 'Concurso', prova: 'Órgão / 2024',
    ano: 2024, caderno_nome: 'Caderno',
    enunciado: 'Enunciado com mais de 10 caracteres', gabarito: 'A',
    alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' },
    resolucao_professor: null, alternativa: null, acertou: false,
    tempo_segundos: 0, data_resolucao: '1970-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('useRevisao', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockFetchAllResolucoes.mockResolvedValue([])
  })

  it('starts with loading true, then loads erros', async () => {
    const questoes = [
      makeResolucao({ questao_tec_id: 101, acertou: false }),
      makeResolucao({ questao_tec_id: 102, acertou: false }),
    ]
    mockFetchAllResolucoes.mockResolvedValue(questoes)

    const { result } = renderHook(() => useRevisao())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.erros).toHaveLength(2)
    expect(result.current.totalErros).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('filters out correct answers', async () => {
    const questoes = [
      makeResolucao({ questao_tec_id: 101, acertou: false }),
      makeResolucao({ questao_tec_id: 102, acertou: true }),
      makeResolucao({ questao_tec_id: 103, acertou: false }),
    ]
    mockFetchAllResolucoes.mockResolvedValue(questoes)

    const { result } = renderHook(() => useRevisao())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.erros).toHaveLength(2)
    expect(result.current.erros[0].questao_tec_id).toBe(101)
    expect(result.current.erros[1].questao_tec_id).toBe(103)
  })

  it('sets error when fetch fails', async () => {
    mockFetchAllResolucoes.mockRejectedValue(new Error('Erro de conexão'))

    const { result } = renderHook(() => useRevisao())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Erro de conexão')
    expect(result.current.erros).toHaveLength(0)
  })

  it('sets questaoAtual to the first error', async () => {
    const questoes = [
      makeResolucao({ questao_tec_id: 101, acertou: false }),
      makeResolucao({ questao_tec_id: 102, acertou: false }),
    ]
    mockFetchAllResolucoes.mockResolvedValue(questoes)

    const { result } = renderHook(() => useRevisao())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.questaoAtual).not.toBeNull()
    expect(result.current.questaoAtual!.questao_tec_id).toBe(101)
  })

  it('handleConfirmarResposta records attempt and reveals', async () => {
    const questoes = [
      makeResolucao({ questao_tec_id: 101, gabarito: 'A', acertou: false }),
    ]
    mockFetchAllResolucoes.mockResolvedValue(questoes)

    const { result } = renderHook(() => useRevisao())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => { result.current.setAlternativaSelecionada('A') })
    await waitFor(() => {
      expect(result.current.alternativaSelecionada).toBe('A')
    })
    await result.current.handleConfirmarResposta(30)

    await waitFor(() => {
      expect(mockInsertHistoricoResolucao).toHaveBeenCalledWith(
        expect.objectContaining({
          questao_tec_id: 101,
          alternativa: 'A',
          acertou: true,
          tempo_segundos: 30,
        })
      )
    })
    })

  it('handleClassificar applies SM-2 and removes question', async () => {
    const questoes = [
      makeResolucao({ questao_tec_id: 101, acertou: false }),
    ]
    mockFetchAllResolucoes.mockResolvedValue(questoes)

    const { result } = renderHook(() => useRevisao())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.totalErros).toBe(1)

    await result.current.handleClassificar(4)

    await waitFor(() => {
      expect(result.current.totalErros).toBe(0)
    })
    const schedule = JSON.parse(localStorage.getItem('concursos_spaced_repetition') || '{}')
    expect(schedule[String(101)]).toBeDefined()
    expect(schedule[String(101)].n).toBe(1)
  })
})
