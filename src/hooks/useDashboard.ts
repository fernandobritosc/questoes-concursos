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
 * Calcula a streak de dias consecutivos de estudo.
 */
function calcularStreak(resolucoes: Resolucao[]): number {
  if (resolucoes.length === 0) return 0

  const diasUnicos = new Set(
    resolucoes
      .filter(r => r.data_resolucao)
      .map(r => new Date(r.data_resolucao).toISOString().split('T')[0])
  )

  const diasOrdenados = Array.from(diasUnicos).sort().reverse()
  if (diasOrdenados.length === 0) return 0

  // Verifica se estudou hoje ou ontem
  const hoje = new Date().toISOString().split('T')[0]
  const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (diasOrdenados[0] !== hoje && diasOrdenados[0] !== ontem) return 0

  let streak = 1
  for (let i = 1; i < diasOrdenados.length; i++) {
    const diaAtual = new Date(diasOrdenados[i - 1])
    const diaAnterior = new Date(diasOrdenados[i])
    const diff = (diaAtual.getTime() - diaAnterior.getTime()) / 86400000

    if (diff === 1) {
      streak++
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
    const d = new Date(curr.data_resolucao)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const displayDate = `${day}/${month}`
    const fullDate = d.toISOString().split('T')[0]

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
    .map(([_, val]) => ({
      data: val.display,
      resolvidas: val.resolvidas,
      acertos: val.acertos,
      taxa: val.resolvidas > 0 ? Math.round((val.acertos / val.resolvidas) * 100) : 0,
    }))

  // Cálculo das estatísticas das últimas 24 horas (Horário de Brasília)
  const agoraMs = Date.now()
  const umDiaAtrasMs = agoraMs - 24 * 60 * 60 * 1000

  const respondidas24h = respondidas.filter(r => {
    if (!r.data_resolucao) return false
    const dataMs = new Date(r.data_resolucao).getTime()
    return dataMs >= umDiaAtrasMs
  })

  const totalQuestoes24h = respondidas24h.length
  const totalAcertos24h = respondidas24h.filter(r => r.acertou).length
  const taxaAcerto24h = totalQuestoes24h > 0 ? Math.round((totalAcertos24h / totalQuestoes24h) * 100) : 0
  const tempoMedio24h =
    totalQuestoes24h > 0
      ? Math.round(respondidas24h.reduce((acc, curr) => acc + curr.tempo_segundos, 0) / totalQuestoes24h)
      : 0

  // Estatísticas de matéria das últimas 24 horas
  const porMateria24h = respondidas24h.reduce(
    (acc, curr) => {
      const mat = curr.materia || 'Sem Matéria'
      if (!acc[mat]) acc[mat] = { materia: mat, acertos: 0, total: 0, taxa: 0 }
      acc[mat].total += 1
      if (curr.acertou) acc[mat].acertos += 1
      return acc
    },
    {} as Record<string, MateriaStat>
  )

  const chartData24h = Object.values(porMateria24h)
    .map(d => ({ ...d, taxa: Math.round((d.acertos / d.total) * 100) }))
    .sort((a, b) => b.total - a.total)

  // Agrupamento por hora para as últimas 24h
  const porHora24h = respondidas24h.reduce((acc, curr) => {
    if (!curr.data_resolucao) return acc
    const d = new Date(curr.data_resolucao)
    const hour = String(d.getHours()).padStart(2, '0') + 'h'
    const timestamp = d.getTime()
    const hourKey = d.toISOString().substring(0, 13)

    if (!acc[hourKey]) {
      acc[hourKey] = { display: hour, resolvidas: 0, acertos: 0, timestamp }
    }
    acc[hourKey].resolvidas += 1
    if (curr.acertou) acc[hourKey].acertos += 1
    return acc
  }, {} as Record<string, { display: string; resolvidas: number; acertos: number; timestamp: number }>)

  const evolucaoDiaria24h = Object.entries(porHora24h)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .slice(-10)
    .map(([_, val]) => ({
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
      totalQuestoes: totalQuestoes24h,
      totalAcertos: totalAcertos24h,
      taxaAcerto: taxaAcerto24h,
      tempoMedio: tempoMedio24h,
      tempoFormatado: formatarTempo(tempoMedio24h),
      resolucoes: respondidas24h,
      chartData: chartData24h,
      evolucaoDiaria: evolucaoDiaria24h
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
      } catch (err: any) {
        console.error('Erro ao buscar resoluções:', err)
        setError(err.message || 'Erro ao carregar dados.')
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
