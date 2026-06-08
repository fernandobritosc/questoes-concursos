import { useEffect, useState } from 'react'
import { fetchAllResolucoes } from '../services/supabase.service'
import type { ResolucaoView } from '../types/database'

// O Dashboard consome o histórico de tentativas (historico_resolucoes com JOIN)
type Resolucao = ResolucaoView

interface MateriaStat {
  materia: string
  acertos: number
  total: number
  taxa: number
}

export interface DiaEvolucao {
  data: string
  resolvidas: number
  acertos: number
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
  ultimasResolucoes: ResolucaoView[]
  saudacao: string
  streak: number
  dataFormatada: string
  stats24h: Stats24h
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

/**
 * Calcula a streak de dias consecutivos de estudo.
 */
function calcularStreak(resolucoes: Resolucao[]): number {
  if (resolucoes.length === 0) return 0

  const diasUnicos = new Set(
    resolucoes
      .filter(r => r.data_resolucao)
      .map(r => getBrasiliaDateString(new Date(r.data_resolucao)))
  )

  const hoje = getBrasiliaDateString(new Date())
  const ontem = getBrasiliaDateString(new Date(Date.now() - 86400000))

  // Se não estudou hoje nem ontem, o streak é 0
  if (!diasUnicos.has(hoje) && !diasUnicos.has(ontem)) {
    return 0
  }

  // Começa a verificar a partir da data de estudo mais recente (hoje ou ontem)
  const dataReferencia = diasUnicos.has(hoje) ? new Date() : new Date(Date.now() - 86400000)
  let streak = 0

  while (true) {
    const dataStr = getBrasiliaDateString(dataReferencia)
    if (diasUnicos.has(dataStr)) {
      streak++
      // Subtrai 1 dia
      dataReferencia.setDate(dataReferencia.getDate() - 1)
    } else {
      break
    }
  }

  return streak
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

  // Cálculo das estatísticas de Hoje (Horário de Brasília)
  const hojeSP = getBrasiliaDateString(new Date())

  const respondidasHoje = respondidas.filter(r => {
    if (!r.data_resolucao) return false
    const { dateString } = getBrasiliaDateAndHour(r.data_resolucao)
    return dateString === hojeSP
  })

  const totalQuestoesHoje = respondidasHoje.length
  const totalAcertosHoje = respondidasHoje.filter(r => r.acertou).length
  const taxaAcertoHoje = totalQuestoesHoje > 0 ? Math.round((totalAcertosHoje / totalQuestoesHoje) * 100) : 0
  const tempoMedioHoje =
    totalQuestoesHoje > 0
      ? Math.round(respondidasHoje.reduce((acc, curr) => acc + curr.tempo_segundos, 0) / totalQuestoesHoje)
      : 0

  // Estatísticas de matéria de Hoje
  const porMateriaHoje = respondidasHoje.reduce(
    (acc, curr) => {
      const mat = curr.materia || 'Sem Matéria'
      if (!acc[mat]) acc[mat] = { materia: mat, acertos: 0, total: 0, taxa: 0 }
      acc[mat].total += 1
      if (curr.acertou) acc[mat].acertos += 1
      return acc
    },
    {} as Record<string, MateriaStat>
  )

  const chartDataHoje = Object.values(porMateriaHoje)
    .map(d => ({ ...d, taxa: Math.round((d.acertos / d.total) * 100) }))
    .sort((a, b) => b.total - a.total)

  // Agrupamento por hora (Brasília) para Hoje
  const porHoraHoje = respondidasHoje.reduce((acc, curr) => {
    if (!curr.data_resolucao) return acc
    const { hour } = getBrasiliaDateAndHour(curr.data_resolucao)
    const hourKey = hour
    const display = `${hour}h`

    if (!acc[hourKey]) {
      acc[hourKey] = { display, resolvidas: 0, acertos: 0, hour }
    }
    acc[hourKey].resolvidas += 1
    if (curr.acertou) acc[hourKey].acertos += 1
    return acc
  }, {} as Record<number, { display: string; resolvidas: number; acertos: number; hour: number }>)

  const evolucaoDiariaHoje = Object.values(porHoraHoje)
    .sort((a, b) => a.hour - b.hour)
    .map(val => ({
      data: val.display,
      resolvidas: val.resolvidas,
      acertos: val.acertos,
      taxa: val.resolvidas > 0 ? Math.round((val.acertos / val.resolvidas) * 100) : 0,
    }))

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
    ultimasResolucoes: respondidas.slice(0, 8),
    saudacao: getSaudacao(),
    streak: calcularStreak(respondidas),
    dataFormatada: dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1),
    evolucaoDiaria,
    stats24h: {
      totalQuestoes: totalQuestoesHoje,
      totalAcertos: totalAcertosHoje,
      taxaAcerto: taxaAcertoHoje,
      tempoMedio: tempoMedioHoje,
      tempoFormatado: formatarTempo(tempoMedioHoje),
      resolucoes: respondidasHoje,
      chartData: chartDataHoje,
      evolucaoDiaria: evolucaoDiariaHoje
    },
    trends: {
      taxa: trendTaxa,
      resolvidas: trendResolvidas,
      tempo: trendTempo,
      erros: trendErros
    }
  }
}

/**
 * Hook para o Dashboard.
 * Carrega as resoluções e calcula as métricas de performance.
 */
export function useDashboard() {
  const [resolucoes, setResolucoes] = useState<ResolucaoView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllResolucoes()
        setResolucoes(data)
      } catch (err: unknown) {
        console.error('Erro ao buscar resoluções:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = calcularStats(resolucoes)

  return { loading, error, resolucoes, stats }
}

/** Re-export para uso externo */
export { formatarTempo }
