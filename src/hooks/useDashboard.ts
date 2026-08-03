import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchAllResolucoesLeves, clearQuestoesCache } from '../services/supabase.service'
import type { ResolucaoView } from '../types/database'

// O Dashboard consome o histórico de tentativas (historico_resolucoes com JOIN)
type Resolucao = ResolucaoView

interface MateriaStat {
  materia: string
  acertos: number
  total: number
  taxa: number
}

interface BancaStat {
  banca: string
  acertos: number
  total: number
  taxa: number
}

interface OrgaoStat {
  orgao: string
  categoria: string
  acertos: number
  total: number
  taxa: number
}

function categorizarOrgao(orgao: string): string {
  const nome = orgao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/^(?:stf|stj|tst|tse|stm|trf|trt|tre|tj|tjm|tam|tjdf)/.test(nome)) return 'Tribunais'
  if (/^tribunal/.test(nome) && !/contas/.test(nome)) return 'Tribunais'
  if (/^(?:mpu|mp[ft]|mp[etm]|mp|dpe)/.test(nome) || /ministerio publico|defensoria/.test(nome)) return 'Ministérios Públicos'
  if (/^(?:tcu|tce|tcm|cgu|cge|cgm)/.test(nome) || /tribunal de contas|controladoria/.test(nome)) return 'Controle'
  if (/^(?:cam|senado|sen|sem|ale|cm\b)/.test(nome) || /assembleia/.test(nome)) return 'Legislativo'
  return 'Executivo'
}

export interface DiaEvolucao {
  data: string
  resolvidas: number
  acertos: number
  taxa: number
}

export interface StatsPeriodo {
  totalQuestoes: number
  totalAcertos: number
  taxaAcerto: number
  tempoMedio: number
  tempoFormatado: string
  resolucoes: ResolucaoView[]
  chartData: MateriaStat[]
  porBanca: BancaStat[]
  porOrgao: OrgaoStat[]
  evolucaoDiaria: DiaEvolucao[]
}

export interface Microtrend {
  value: number
  isImprovement: boolean
  label: string
}

interface DashboardStats {
  totalQuestoes: number
  totalAcertos: number
  taxaAcerto: number
  tempoMedio: number
  tempoFormatado: string
  errosPendentes: number
  chartData: MateriaStat[]
  porBanca: BancaStat[]
  porOrgao: OrgaoStat[]
  ultimasResolucoes: ResolucaoView[]
  saudacao: string
  dataFormatada: string
  stats24h: StatsPeriodo
  stats7d: StatsPeriodo
  stats30d: StatsPeriodo
  revisoesHoje: number
  evolucaoDiaria: DiaEvolucao[]
  trends: {
    taxa: Microtrend
    resolvidas: Microtrend
    tempo: Microtrend
    erros: Microtrend
  }
}

/**
 * Converte segundos em formato humano legível.
 * Ex: 2147 → "35min 47s", 45 → "45s", 3661 → "1h 1min"
 */
function formatarTempo(segundos: number): string {
  if (segundos < 60) return `${segundos}s`
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  const segs = segundos % 60
  if (horas > 0) {
    return minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`
  }
  return segs > 0 ? `${minutos}min ${segs}s` : `${minutos}min`
}

/**
 * Retorna saudação contextual baseada no horário.
 */
function getSaudacao(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia! ☀️'
  if (hora < 18) return 'Boa tarde! 🌤️'
  return 'Boa noite! 🌙'
}

/**
 * Helper para formatar data no fuso de Brasília (YYYY-MM-DD)
 */
function getBrasiliaDateString(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

function calcularStats(resolucoes: Resolucao[]): DashboardStats {
  const respondidas = resolucoes.filter(r => r.alternativa && r.alternativa !== '')
  const totalQuestoes = respondidas.length
  const totalAcertos = respondidas.filter(r => r.acertou).length
  const taxaAcerto = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0
  const tempoMedio =
    totalQuestoes > 0
      ? Math.round(respondidas.reduce((acc, curr) => acc + curr.tempo_segundos, 0) / totalQuestoes)
      : 0

  // ─── CÁLCULO DE TRENDS SEMANAIS (WEEK-OVER-WEEK) ───────────────────────────
  const agora = Date.now()
  const umDia = 24 * 60 * 60 * 1000
  const seteDias = 7 * umDia
  const quatorzeDias = 14 * umDia

  const resolucoesEstaSemana = respondidas.filter(r => {
    if (!r.data_resolucao) return false
    const diff = agora - new Date(r.data_resolucao).getTime()
    return diff <= seteDias
  })

  const resolucoesSemanaAnterior = respondidas.filter(r => {
    if (!r.data_resolucao) return false
    const diff = agora - new Date(r.data_resolucao).getTime()
    return diff > seteDias && diff <= quatorzeDias
  })

  // 1. Taxa de Acerto WoW
  const totalEstaSemana = resolucoesEstaSemana.length
  const acertosEstaSemana = resolucoesEstaSemana.filter(r => r.acertou).length
  const taxaEstaSemana = totalEstaSemana > 0 ? Math.round((acertosEstaSemana / totalEstaSemana) * 100) : 0

  const totalSemanaAnterior = resolucoesSemanaAnterior.length
  const acertosSemanaAnterior = resolucoesSemanaAnterior.filter(r => r.acertou).length
  const taxaSemanaAnterior = totalSemanaAnterior > 0 ? Math.round((acertosSemanaAnterior / totalSemanaAnterior) * 100) : 0

  const diffTaxa = taxaEstaSemana - taxaSemanaAnterior
  const trendTaxa = {
    value: diffTaxa,
    isImprovement: diffTaxa >= 0,
    label: diffTaxa >= 0 ? `+${diffTaxa}%` : `${diffTaxa}%`
  }

  // 2. Questões Resolvidas WoW
  const diffResolvidas = totalEstaSemana - totalSemanaAnterior
  const trendResolvidas = {
    value: diffResolvidas,
    isImprovement: diffResolvidas >= 0,
    label: diffResolvidas >= 0 ? `+${diffResolvidas}` : `${diffResolvidas}`
  }

  // 3. Tempo Médio WoW
  const tempoEstaSemana = totalEstaSemana > 0 ? Math.round(resolucoesEstaSemana.reduce((acc, curr) => acc + curr.tempo_segundos, 0) / totalEstaSemana) : 0
  const tempoSemanaAnterior = totalSemanaAnterior > 0 ? Math.round(resolucoesSemanaAnterior.reduce((acc, curr) => acc + curr.tempo_segundos, 0) / totalSemanaAnterior) : 0
  const diffTempo = tempoEstaSemana - tempoSemanaAnterior
  const trendTempo = {
    value: diffTempo,
    isImprovement: diffTempo <= 0,
    label: diffTempo <= 0 ? `-${Math.abs(diffTempo)}s` : `+${diffTempo}s`
  }

  // 4. Erros para Revisar WoW (delta absoluto de erros acumulados)
  const errosEstaSemana = totalEstaSemana - acertosEstaSemana
  const errosSemanaAnterior = totalSemanaAnterior - acertosSemanaAnterior
  const diffErros = errosEstaSemana - errosSemanaAnterior
  const trendErros = {
    value: diffErros,
    isImprovement: diffErros <= 0,
    label: diffErros <= 0 ? `-${Math.abs(diffErros)}` : `+${diffErros}`
  }

  const porMateria = respondidas.reduce(
    (acc, curr) => {
      const mat = curr.materia || 'Sem Matéria'
      if (!acc[mat]) acc[mat] = { materia: mat, acertos: 0, total: 0, taxa: 0 }
      acc[mat].total += 1
      if (curr.acertou) acc[mat].acertos += 1
      return acc
    },
    {} as Record<string, MateriaStat>
  )

  const chartData = Object.values(porMateria)
    .map(d => ({ ...d, taxa: Math.round((d.acertos / d.total) * 100) }))
    .sort((a, b) => b.total - a.total)

  const porBanca = Object.values(
    respondidas.reduce(
      (acc, curr) => {
        const banca = curr.banca_texto || 'Sem Banca'
        if (!acc[banca]) acc[banca] = { banca, acertos: 0, total: 0, taxa: 0 }
        acc[banca].total += 1
        if (curr.acertou) acc[banca].acertos += 1
        return acc
      },
      {} as Record<string, BancaStat>
    )
  )
    .map(d => ({ ...d, taxa: Math.round((d.acertos / d.total) * 100) }))
    .sort((a, b) => b.total - a.total)

  const porOrgao = Object.values(
    respondidas.reduce(
      (acc, curr) => {
        const orgao = curr.orgao || 'Sem Órgão'
        if (!acc[orgao]) acc[orgao] = { orgao, categoria: categorizarOrgao(orgao), acertos: 0, total: 0, taxa: 0 }
        acc[orgao].total += 1
        if (curr.acertou) acc[orgao].acertos += 1
        return acc
      },
      {} as Record<string, OrgaoStat>
    )
  )
    .map(d => ({ ...d, taxa: Math.round((d.acertos / d.total) * 100) }))
    .sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria)
      return b.total - a.total
    })

  const dataAtual = new Date()
  const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Agrupamento temporal por dia para Evolução Diária (últimos 10 dias ativos)
  const porDia = respondidas.reduce((acc, curr) => {
    if (!curr.data_resolucao) return acc
    const fullDate = getBrasiliaDateString(new Date(curr.data_resolucao))
    const [, month, day] = fullDate.split('-')
    const displayDate = `${day}/${month}`

    if (!acc[fullDate]) {
      acc[fullDate] = { display: displayDate, resolvidas: 0, acertos: 0 }
    }
    acc[fullDate].resolvidas += 1
    if (curr.acertou) acc[fullDate].acertos += 1
    return acc
  }, {} as Record<string, { display: string; resolvidas: number; acertos: number }>)

  const evolucaoDiaria = Object.entries(porDia)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-10)
    .map(([, val]) => ({
      data: val.display,
      resolvidas: val.resolvidas,
      acertos: val.acertos,
      taxa: val.resolvidas > 0 ? Math.round((val.acertos / val.resolvidas) * 100) : 0,
    }))



  // Helper to get date string and hour in Brasília timezone
  const getBrasiliaDateAndHour = (dateStr: string) => {
    const d = new Date(dateStr)
    const dateString = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d)

    const hour = Number(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      hour12: false
    }).format(d)) % 24

    return { dateString, hour }
  }

  const hojeSP = getBrasiliaDateString(new Date())

  const respondidasHoje = respondidas.filter(r => {
    if (!r.data_resolucao) return false
    const { dateString } = getBrasiliaDateAndHour(r.data_resolucao)
    return dateString === hojeSP
  })

  // ─── CALCULAR REVISÕES PENDENTES HOJE (SM-2 do localStorage) ───────────
  const revisoesHoje = (() => {
    try {
      const schedule = JSON.parse(localStorage.getItem('concursos_spaced_repetition') || '{}')
      const now = new Date()
      const latestMap = new Map<number, Resolucao>()
      respondidas.forEach(r => {
        if (r.questao_tec_id && !latestMap.has(r.questao_tec_id)) {
          latestMap.set(r.questao_tec_id, r)
        }
      })
      return Array.from(latestMap.values()).filter(item => {
        if (!item.acertou) return true
        const meta = schedule[String(item.questao_tec_id || item.questao_id)]
        if (meta?.proximaRevisao) return new Date(meta.proximaRevisao) <= now
        return false
      }).length
    } catch {
      return 0
    }
  })()

  // ─── PERIOD STATS HELPER ──────────────────────────────────────────────
  function calcularStatsPeriodo(
    filtradas: Resolucao[],
    isHourly: boolean
  ): StatsPeriodo {
    const total = filtradas.length
    const acertos = filtradas.filter(r => r.acertou).length
    const taxa = total > 0 ? Math.round((acertos / total) * 100) : 0
    const tempo = total > 0
      ? Math.round(filtradas.reduce((acc, curr) => acc + curr.tempo_segundos, 0) / total)
      : 0

    const porMateria = filtradas.reduce(
      (acc, curr) => {
        const mat = curr.materia || 'Sem Matéria'
        if (!acc[mat]) acc[mat] = { materia: mat, acertos: 0, total: 0, taxa: 0 }
        acc[mat].total += 1
        if (curr.acertou) acc[mat].acertos += 1
        return acc
      },
      {} as Record<string, MateriaStat>
    )
    const chart = Object.values(porMateria)
      .map(d => ({ ...d, taxa: Math.round((d.acertos / d.total) * 100) }))
      .sort((a, b) => b.total - a.total)

    const evol = (() => {
      if (isHourly) {
        const porHora = filtradas.reduce((acc, curr) => {
          if (!curr.data_resolucao) return acc
          const { hour } = getBrasiliaDateAndHour(curr.data_resolucao)
          if (!acc[hour]) acc[hour] = { display: `${hour}h`, resolvidas: 0, acertos: 0, hour }
          acc[hour].resolvidas += 1
          if (curr.acertou) acc[hour].acertos += 1
          return acc
        }, {} as Record<number, { display: string; resolvidas: number; acertos: number; hour: number }>)
        return Object.values(porHora).sort((a, b) => a.hour - b.hour).map(v => ({
          data: v.display, resolvidas: v.resolvidas, acertos: v.acertos,
          taxa: v.resolvidas > 0 ? Math.round((v.acertos / v.resolvidas) * 100) : 0,
        }))
      }
      const porDia = filtradas.reduce((acc, curr) => {
        if (!curr.data_resolucao) return acc
        const full = getBrasiliaDateString(new Date(curr.data_resolucao))
        const [, m, d] = full.split('-')
        const disp = `${d}/${m}`
        if (!acc[full]) acc[full] = { display: disp, resolvidas: 0, acertos: 0 }
        acc[full].resolvidas += 1
        if (curr.acertou) acc[full].acertos += 1
        return acc
      }, {} as Record<string, { display: string; resolvidas: number; acertos: number }>)
      return Object.entries(porDia)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-10)
        .map(([, v]) => ({
          data: v.display, resolvidas: v.resolvidas, acertos: v.acertos,
          taxa: v.resolvidas > 0 ? Math.round((v.acertos / v.resolvidas) * 100) : 0,
        }))
    })()

    const porBanca = Object.values(
      filtradas.reduce(
        (acc, curr) => {
          const banca = curr.banca_texto || 'Sem Banca'
          if (!acc[banca]) acc[banca] = { banca, acertos: 0, total: 0, taxa: 0 }
          acc[banca].total += 1
          if (curr.acertou) acc[banca].acertos += 1
          return acc
        },
        {} as Record<string, BancaStat>
      )
    )
      .map(d => ({ ...d, taxa: Math.round((d.acertos / d.total) * 100) }))
      .sort((a, b) => b.total - a.total)

    const porOrgao = Object.values(
      filtradas.reduce(
        (acc, curr) => {
          const orgao = curr.orgao || 'Sem Órgão'
          if (!acc[orgao]) acc[orgao] = { orgao, categoria: categorizarOrgao(orgao), acertos: 0, total: 0, taxa: 0 }
          acc[orgao].total += 1
          if (curr.acertou) acc[orgao].acertos += 1
          return acc
        },
        {} as Record<string, OrgaoStat>
      )
    )
      .map(d => ({ ...d, taxa: Math.round((d.acertos / d.total) * 100) }))
      .sort((a, b) => {
        if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria)
        return b.total - a.total
      })

    return {
      totalQuestoes: total,
      totalAcertos: acertos,
      taxaAcerto: taxa,
      tempoMedio: tempo,
      tempoFormatado: formatarTempo(tempo),
      resolucoes: filtradas,
      chartData: chart,
      porBanca,
      porOrgao,
      evolucaoDiaria: evol,
    }
  }

  const stats24h = calcularStatsPeriodo(respondidasHoje, true)

  // 7 dias
  const seteDiasAtras = new Date(agora - 7 * umDia)
  const respondidas7d = respondidas.filter(r => r.data_resolucao && new Date(r.data_resolucao) >= seteDiasAtras)
  const stats7d = calcularStatsPeriodo(respondidas7d, false)

  // 30 dias
  const trintaDiasAtras = new Date(agora - 30 * umDia)
  const respondidas30d = respondidas.filter(r => r.data_resolucao && new Date(r.data_resolucao) >= trintaDiasAtras)
  const stats30d = calcularStatsPeriodo(respondidas30d, false)

  // Calcula erros pendentes da mesma forma que o Caderno de Erros (última tentativa incorreta)
  const latestAttemptsMap = new Map<number, Resolucao>()
  respondidas.forEach(r => {
    if (r.questao_tec_id && !latestAttemptsMap.has(r.questao_tec_id)) {
      latestAttemptsMap.set(r.questao_tec_id, r)
    }
  })
  const errosPendentes = Array.from(latestAttemptsMap.values()).filter(item => !item.acertou).length

  return {
    totalQuestoes,
    totalAcertos,
    taxaAcerto,
    tempoMedio,
    tempoFormatado: formatarTempo(tempoMedio),
    errosPendentes,
    chartData,
    porBanca,
    porOrgao,
    ultimasResolucoes: respondidas.slice(0, 8),
    saudacao: getSaudacao(),
    dataFormatada: dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1),
    evolucaoDiaria,
    stats24h,
    stats7d,
    stats30d,
    revisoesHoje,
    trends: {
      taxa: trendTaxa,
      resolvidas: trendResolvidas,
      tempo: trendTempo,
      erros: trendErros
    }
  }
}

const POLL_INTERVAL_MS = 30000

/**
 * Hook para o Dashboard.
 * Carrega as resoluções, calcula as métricas e atualiza automaticamente.
 */
export function useDashboard() {
  const [resolucoes, setResolucoes] = useState<ResolucaoView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    try {
      clearQuestoesCache()
        const data = await fetchAllResolucoesLeves()
      if (mountedRef.current) {
        setResolucoes(data)
        setLastUpdated(new Date())
        setError(null)
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        console.error('Erro ao buscar resoluções:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    async function load() {
      try {
        const data = await fetchAllResolucoesLeves()
        if (mountedRef.current) {
          setResolucoes(data)
          setLastUpdated(new Date())
        }
      } catch (err: unknown) {
        if (mountedRef.current) {
          console.error('Erro ao buscar resoluções:', err)
          setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
        }
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }
    load()

    const interval = setInterval(() => refetch(), POLL_INTERVAL_MS)

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') refetch()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [refetch])

  const stats = calcularStats(resolucoes)

  return { loading, error, resolucoes, stats, refetch, lastUpdated }
}

/** Re-export para uso externo */
export { formatarTempo }
