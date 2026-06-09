import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMentor, tentarParsearPlano } from './useMentor'
import type { ResolucaoView } from '../types/database'

const mockFetchAllResolucoes = vi.fn()
const mockFetchMentorPlano = vi.fn()
const mockUpdateMentorPlano = vi.fn()
const mockGerarPlanoEstudos = vi.fn()
const mockGerarMentoriaAssunto = vi.fn()
const mockTrackEvent = vi.fn()

vi.mock('../services/supabase.service', () => ({
  fetchAllResolucoes: () => mockFetchAllResolucoes(),
  fetchMentorPlano: () => mockFetchMentorPlano(),
  updateMentorPlano: (...args: unknown[]) => mockUpdateMentorPlano(...args),
}))

vi.mock('../services/gemini.service', () => ({
  gerarPlanoEstudos: (...args: unknown[]) => mockGerarPlanoEstudos(...args),
  gerarMentoriaAssunto: (...args: unknown[]) => mockGerarMentoriaAssunto(...args),
}))

vi.mock('../services/hermesTracker', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
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

describe('tentarParsearPlano', () => {
  it('parses valid JSON plano', () => {
    const json = JSON.stringify({
      diagnostico: 'Precisa melhorar',
      cronograma: [{ dia: 'Segunda', materia: 'Matéria', topicos: ['Tópico 1'], carga: 'Moderada', questoes_sugeridas: 10, meta_estudo: 'Estudar' }],
      dica_ouro: 'Foco em revisão',
    })
    const result = tentarParsearPlano(json)
    expect(result).not.toBeNull()
    expect(result!.diagnostico).toBe('Precisa melhorar')
    expect(result!.cronograma).toHaveLength(1)
    expect(result!.dica_ouro).toBe('Foco em revisão')
  })

  it('returns null for invalid JSON', () => {
    expect(tentarParsearPlano('invalid')).toBeNull()
  })

  it('handles JSON embedded in text', () => {
    const text = `Aqui está seu plano:
    {"diagnostico":"OK","cronograma":[{"dia":"Dia 1","materia":"M","topicos":[],"carga":"Leve","questoes_sugeridas":5,"meta_estudo":"m"}],"dica_ouro":"Dica"}`
    const result = tentarParsearPlano(text)
    expect(result).not.toBeNull()
    expect(result!.diagnostico).toBe('OK')
  })

  it('normalizes carga values', () => {
    const json = JSON.stringify({
      diagnostico: 'x',
      cronograma: [
        { dia: 'Dia 1', materia: 'M', topicos: [], carga: 'Leve', questoes_sugeridas: 5, meta_estudo: 'm' },
        { dia: 'Dia 2', materia: 'M', topicos: [], carga: 'Intenso', questoes_sugeridas: 5, meta_estudo: 'm' },
      ],
      dica_ouro: '',
    })
    const result = tentarParsearPlano(json)
    expect(result!.cronograma[0].carga).toBe('Leve')
    expect(result!.cronograma[1].carga).toBe('Intensa')
  })
})

describe('useMentor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockFetchAllResolucoes.mockResolvedValue([])
    mockFetchMentorPlano.mockResolvedValue(null)
  })

  it('starts with loading true, then loads data', async () => {
    const { result } = renderHook(() => useMentor())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.fraquezas).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('detects fraquezas from resolucoes', async () => {
    const questoes = [
      makeResolucao({ questao_tec_id: 101, materia: 'Dir. Constitucional', assunto: 'Direitos', acertou: false }),
      makeResolucao({ questao_tec_id: 102, materia: 'Dir. Constitucional', assunto: 'Direitos', acertou: false }),
      makeResolucao({ questao_tec_id: 103, materia: 'Dir. Constitucional', assunto: 'Direitos', acertou: false }),
      makeResolucao({ questao_tec_id: 104, materia: 'Dir. Constitucional', assunto: 'Direitos', acertou: true }),
      makeResolucao({ questao_tec_id: 105, materia: 'Dir. Administrativo', assunto: 'Licitações', acertou: false }),
      makeResolucao({ questao_tec_id: 106, materia: 'Dir. Administrativo', assunto: 'Licitações', acertou: false }),
      makeResolucao({ questao_tec_id: 107, materia: 'Dir. Administrativo', assunto: 'Licitações', acertou: false }),
    ]
    mockFetchAllResolucoes.mockResolvedValue(questoes)

    const { result } = renderHook(() => useMentor())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Direitos: 1/4 = 25% < 70%, 4 >= 3 → fraqueza
    // Licitações: 0/3 = 0% < 70%, 3 >= 3 → fraqueza
    expect(result.current.fraquezas).toHaveLength(2)
    expect(result.current.fraquezas[0].taxa).toBeLessThanOrEqual(result.current.fraquezas[1].taxa)
  })

  it('sets error when fetch fails', async () => {
    mockFetchAllResolucoes.mockRejectedValue(new Error('Erro ao carregar'))

    const { result } = renderHook(() => useMentor())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Erro ao carregar')
  })

  it('handleGerarPlano generates and saves plano', async () => {
    mockGerarPlanoEstudos.mockResolvedValue(JSON.stringify({
      diagnostico: 'Diagnóstico',
      cronograma: [{ dia: 'Segunda', materia: 'M', topicos: [], carga: 'Moderada', questoes_sugeridas: 10, meta_estudo: 'M' }],
      dica_ouro: 'Dica',
    }))

    const questoes = [
      makeResolucao({ questao_tec_id: 101, materia: 'M', assunto: 'A', acertou: false }),
      makeResolucao({ questao_tec_id: 102, materia: 'M', assunto: 'A', acertou: false }),
      makeResolucao({ questao_tec_id: 103, materia: 'M', assunto: 'A', acertou: false }),
    ]
    mockFetchAllResolucoes.mockResolvedValue(questoes)

    const { result } = renderHook(() => useMentor())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.fraquezas.length).toBeGreaterThan(0)

    await result.current.handleGerarPlano()

    expect(mockGerarPlanoEstudos).toHaveBeenCalled()
    await waitFor(() => {
      expect(result.current.plano).not.toBeNull()
    })
    expect(typeof result.current.plano).not.toBe('string')
    if (result.current.plano && typeof result.current.plano !== 'string') {
      expect(result.current.plano.diagnostico).toBe('Diagnóstico')
    }
  })

  it('restores plano from localStorage', async () => {
    const savedPlano = JSON.stringify({
      diagnostico: 'Cache',
      cronograma: [],
      dica_ouro: 'Dica cache',
    })
    localStorage.setItem('mentor_plano_geral', savedPlano)

    const { result } = renderHook(() => useMentor())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.plano).not.toBeNull()
  })

  it('handleLimparPlano resets plano', async () => {
    localStorage.setItem('mentor_plano_geral', '{"diagnostico":"x","cronograma":[],"dica_ouro":""}')

    const { result } = renderHook(() => useMentor())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.plano).not.toBeNull()

    await result.current.handleLimparPlano()

    await waitFor(() => {
      expect(result.current.plano).toBeNull()
    })
    expect(localStorage.getItem('mentor_plano_geral')).toBeNull()
  })
})
