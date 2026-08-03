import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ResolucaoView } from '../types/database'
import { useQuestoesFilter } from './useQuestoesFilter'

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
  alternativas: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
  resolucao_professor: null,
  alternativa: null,
  acertou: false,
  tempo_segundos: 0,
  data_resolucao: '2024-01-01T00:00:00Z',
  ...overrides,
})

const resolucoes: ResolucaoView[] = [
  mockQuestao(1, { materia: 'Direito Constitucional', assunto: 'Direitos e Garantias' }),
  mockQuestao(2, { materia: 'Direito Constitucional', assunto: 'Organização do Estado' }),
  mockQuestao(3, { materia: 'Direito Administrativo', assunto: 'Atos Administrativos' }),
]

describe('useQuestoesFilter', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('filtra por matéria selecionada', () => {
    const { result } = renderHook(() => useQuestoesFilter(resolucoes, null))
    act(() => { result.current.handleToggleMateria('Direito Constitucional') })
    expect(result.current.filteredQuestions.map(q => q.questao_id)).toEqual([1, 2])
  })

  it('filtra por assunto selecionado SEM matéria', () => {
    const { result } = renderHook(() => useQuestoesFilter(resolucoes, null))
    act(() => { result.current.handleToggleAssunto('Atos Administrativos') })
    expect(result.current.filteredQuestions.map(q => q.questao_id)).toEqual([3])
  })

  it('filtra por matéria + assunto combinados', () => {
    const { result } = renderHook(() => useQuestoesFilter(resolucoes, null))
    act(() => { result.current.handleToggleMateria('Direito Constitucional') })
    act(() => { result.current.handleToggleAssunto('Organização do Estado') })
    expect(result.current.filteredQuestions.map(q => q.questao_id)).toEqual([2])
  })

  it('filtra por banca', () => {
    const { result } = renderHook(() => useQuestoesFilter(resolucoes, null))
    act(() => { result.current.handleToggleBanca('CESPE') })
    expect(result.current.filteredQuestions).toHaveLength(3)
  })

  it('retorna todas quando sem filtros', () => {
    const { result } = renderHook(() => useQuestoesFilter(resolucoes, null))
    expect(result.current.filteredQuestions).toHaveLength(3)
  })
})
