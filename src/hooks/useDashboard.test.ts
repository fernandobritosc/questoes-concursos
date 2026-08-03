import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDashboard, formatarTempo } from './useDashboard'
import type { ResolucaoView } from '../types/database'

const mockFetchAllResolucoesLeves = vi.fn()

vi.mock('../services/supabase.service', () => ({
  fetchAllResolucoesLeves: () => mockFetchAllResolucoesLeves(),
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
    resolucao_professor: null, alternativa: 'A', acertou: true,
    tempo_segundos: 30, data_resolucao: new Date().toISOString(),
    ...overrides,
  }
}

describe('formatarTempo', () => {
  it('formats seconds only (< 60)', () => {
    expect(formatarTempo(45)).toBe('45s')
  })

  it('formats minutes and seconds', () => {
    expect(formatarTempo(125)).toBe('2min 5s')
  })

  it('formats hours and minutes', () => {
    expect(formatarTempo(3661)).toBe('1h 1min')
  })

  it('formats exact hours', () => {
    expect(formatarTempo(7200)).toBe('2h')
  })
})

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchAllResolucoesLeves.mockResolvedValue([])
  })

  it('starts with loading true, then loads stats', async () => {
    const { result } = renderHook(() => useDashboard())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.resolucoes).toEqual([])
    expect(result.current.stats.totalQuestoes).toBe(0)
    expect(result.current.stats.taxaAcerto).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('calculates stats from resolucoes', async () => {
    const now = new Date()
    const questoes = [
      makeResolucao({ questao_tec_id: 101, alternativa: 'A', acertou: true, tempo_segundos: 30, data_resolucao: now.toISOString() }),
      makeResolucao({ questao_tec_id: 102, alternativa: 'B', acertou: false, tempo_segundos: 45, data_resolucao: now.toISOString() }),
      makeResolucao({ questao_tec_id: 103, alternativa: 'C', acertou: true, tempo_segundos: 60, data_resolucao: now.toISOString() }),
    ]
    mockFetchAllResolucoesLeves.mockResolvedValue(questoes)

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.stats.totalQuestoes).toBe(3)
    expect(result.current.stats.totalAcertos).toBe(2)
    expect(result.current.stats.taxaAcerto).toBe(67)
    expect(result.current.stats.tempoMedio).toBe(45)
  })

  it('calculates stats by materia', async () => {
    const now = new Date()
    const questoes = [
      makeResolucao({ questao_tec_id: 101, materia: 'Dir. Constitucional', alternativa: 'A', acertou: true, data_resolucao: now.toISOString() }),
      makeResolucao({ questao_tec_id: 102, materia: 'Dir. Constitucional', alternativa: 'B', acertou: false, data_resolucao: now.toISOString() }),
      makeResolucao({ questao_tec_id: 103, materia: 'Dir. Administrativo', alternativa: 'A', acertou: true, data_resolucao: now.toISOString() }),
    ]
    mockFetchAllResolucoesLeves.mockResolvedValue(questoes)

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.stats.chartData).toHaveLength(2)
    const constitucional = result.current.stats.chartData.find(d => d.materia === 'Dir. Constitucional')
    expect(constitucional).toBeDefined()
    expect(constitucional!.acertos).toBe(1)
    expect(constitucional!.total).toBe(2)
    expect(constitucional!.taxa).toBe(50)
  })

  it('sets error when fetch fails', async () => {
    mockFetchAllResolucoesLeves.mockRejectedValue(new Error('Erro de rede'))

    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Erro de rede')
  })

  it('handles empty resolucoes', async () => {
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.stats.totalQuestoes).toBe(0)
    expect(result.current.stats.taxaAcerto).toBe(0)
    expect(result.current.stats.errosPendentes).toBe(0)
    expect(result.current.stats.chartData).toEqual([])
  })
})
