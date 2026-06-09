import * as React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ResolucaoView } from '../types/database'
import type { Microtrend, DiaEvolucao } from '../hooks/useDashboard'

const mockResolucao: ResolucaoView = {
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
  caderno_nome: '',
  enunciado: 'Qual o artigo?',
  gabarito: 'A',
  alternativas: { A: 'Art. 5º', B: 'Art. 6º', C: 'Art. 7º', D: 'Art. 8º', E: 'Art. 9º' },
  resolucao_professor: '',
  alternativa: 'A',
  acertou: true,
  tempo_segundos: 120,
  data_resolucao: '2024-01-01T00:00:00Z',
}

interface MateriaStat {
  materia: string
  acertos: number
  total: number
  taxa: number
}

interface Stats24h {
  totalQuestoes: number
  totalAcertos: number
  taxaAcerto: number
  tempoMedio: number
  tempoFormatado: string
  resolucoes: ResolucaoView[]
  chartData: MateriaStat[]
  porBanca: { banca: string; acertos: number; total: number; taxa: number }[]
  porOrgao: { orgao: string; categoria: string; acertos: number; total: number; taxa: number }[]
  evolucaoDiaria: DiaEvolucao[]
}

interface DashboardStats {
  totalQuestoes: number
  totalAcertos: number
  taxaAcerto: number
  tempoMedio: number
  tempoFormatado: string
  errosPendentes: number
  chartData: MateriaStat[]
  porBanca: { banca: string; acertos: number; total: number; taxa: number }[]
  porOrgao: { orgao: string; categoria: string; acertos: number; total: number; taxa: number }[]
  ultimasResolucoes: ResolucaoView[]
  saudacao: string
  dataFormatada: string
  stats24h: Stats24h
  stats7d: Stats24h
  stats30d: Stats24h
  revisoesHoje: number
  evolucaoDiaria: DiaEvolucao[]
  trends: {
    taxa: Microtrend
    resolvidas: Microtrend
    tempo: Microtrend
    erros: Microtrend
  }
}

function makeDefaultTrend(overrides: Partial<Microtrend> = {}): Microtrend {
  return { value: 0, isImprovement: true, label: 'sem mudança', ...overrides }
}

function makeStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    totalQuestoes: 50,
    totalAcertos: 35,
    taxaAcerto: 70,
    tempoMedio: 120,
    tempoFormatado: '2min 0s',
    errosPendentes: 15,
    chartData: [
      { materia: 'Direito Constitucional', acertos: 20, total: 30, taxa: 67 },
    ],
    porBanca: [
      { banca: 'CESPE', acertos: 15, total: 20, taxa: 75 },
      { banca: 'FCC', acertos: 20, total: 30, taxa: 67 },
    ],
    porOrgao: [
      { orgao: 'STF', categoria: 'Tribunais', acertos: 10, total: 15, taxa: 67 },
      { orgao: 'STJ', categoria: 'Tribunais', acertos: 25, total: 35, taxa: 71 },
    ],
    ultimasResolucoes: [mockResolucao],
    saudacao: 'Bom dia!',

    dataFormatada: 'Segunda-feira',
    stats24h: {
      totalQuestoes: 5,
      totalAcertos: 3,
      taxaAcerto: 60,
      tempoMedio: 90,
      tempoFormatado: '1min 30s',
      resolucoes: [mockResolucao],
      chartData: [],
      porBanca: [],
      porOrgao: [],
      evolucaoDiaria: [],
    },
    stats7d: {
      totalQuestoes: 20,
      totalAcertos: 14,
      taxaAcerto: 70,
      tempoMedio: 100,
      tempoFormatado: '1min 40s',
      resolucoes: [mockResolucao],
      chartData: [],
      porBanca: [],
      porOrgao: [],
      evolucaoDiaria: [],
    },
    stats30d: {
      totalQuestoes: 40,
      totalAcertos: 28,
      taxaAcerto: 70,
      tempoMedio: 110,
      tempoFormatado: '1min 50s',
      resolucoes: [mockResolucao],
      chartData: [],
      porBanca: [],
      porOrgao: [],
      evolucaoDiaria: [],
    },
    revisoesHoje: 3,
    evolucaoDiaria: [
      { data: '01/01', resolvidas: 10, acertos: 7, taxa: 70 },
    ],
    trends: {
      taxa: makeDefaultTrend({ value: 5, isImprovement: true, label: '+5%' }),
      resolvidas: makeDefaultTrend({ value: 2, isImprovement: true, label: '+2' }),
      tempo: makeDefaultTrend({ value: 0, isImprovement: true, label: '0s' }),
      erros: makeDefaultTrend({ value: 3, isImprovement: false, label: '+3' }),
    },
    ...overrides,
  }
}

const mockRef = vi.hoisted(() => ({ current: { loading: true, error: null, resolucoes: [] as ResolucaoView[], stats: {} as DashboardStats } }))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('../hooks/useDashboard', () => ({
  useDashboard: () => mockRef.current,
  formatarTempo: vi.fn((s: number) => `${s}s`),
}))

import { Dashboard } from './Dashboard'

beforeEach(() => {
  mockRef.current = {
    loading: false,
    error: null,
    resolucoes: [mockResolucao],
    stats: makeStats(),
  }
})

describe('Dashboard page', () => {
  it('shows loading spinner when loading', () => {
    mockRef.current = { ...mockRef.current, loading: true }
    render(<Dashboard />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows stats with data', () => {
    render(<Dashboard />)
    expect(screen.getByText('Bom dia!')).toBeInTheDocument()
    expect(screen.getByText('Segunda-feira')).toBeInTheDocument()
    expect(screen.getByText('Taxa de Acerto')).toBeInTheDocument()
    expect(screen.getByText('Questões Resolvidas')).toBeInTheDocument()
    expect(screen.getByText('Erros para Revisar')).toBeInTheDocument()
    expect(screen.getAllByText('Direito Constitucional').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Desempenho por Banca')).toBeInTheDocument()
    expect(screen.getByText('Desempenho por Órgão')).toBeInTheDocument()
    expect(screen.getByText('CESPE')).toBeInTheDocument()
    expect(screen.getByText('STF')).toBeInTheDocument()
    expect(screen.getByText('Meta Semanal')).toBeInTheDocument()
    expect(screen.getByText('Revisões Pendentes Hoje')).toBeInTheDocument()
  })

  it('shows empty states when no data', () => {
    mockRef.current = {
      ...mockRef.current,
      stats: makeStats({
        totalQuestoes: 0,
        totalAcertos: 0,
        taxaAcerto: 0,
        tempoFormatado: '0s',
        errosPendentes: 0,
        chartData: [],
        porBanca: [],
        porOrgao: [],
        ultimasResolucoes: [],
        evolucaoDiaria: [],

        stats24h: {
          totalQuestoes: 0,
          totalAcertos: 0,
          taxaAcerto: 0,
          tempoMedio: 0,
          tempoFormatado: '0s',
          resolucoes: [],
          chartData: [],
          porBanca: [],
          porOrgao: [],
          evolucaoDiaria: [],
        },
      }),
    }
    render(<Dashboard />)
    expect(screen.getByText('Bom dia!')).toBeInTheDocument()
    expect(screen.getByText('Sem dados de competências')).toBeInTheDocument()
    expect(screen.getByText('Sem dados de evolução')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma matéria estudada')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma questão resolvida')).toBeInTheDocument()
  })

  it('shows period selector buttons', () => {
    render(<Dashboard />)
    expect(screen.getByText('Geral')).toBeInTheDocument()
    expect(screen.getByText('Hoje')).toBeInTheDocument()
    expect(screen.getByText('7 dias')).toBeInTheDocument()
    expect(screen.getByText('30 dias')).toBeInTheDocument()
  })
})
