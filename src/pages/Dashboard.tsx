import { useState, useMemo } from 'react'
import { useDashboard, formatarTempo } from '../hooks/useDashboard'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { CheckCircle2, XCircle, Clock, BookOpen, Flame, Target, TrendingUp, ExternalLink, Activity, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts'

/* ──────────────── Gauge SVG Animado ──────────────── */

function GaugeChart({ value, size = 120 }: { value: number; size?: number }) {
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  const getColor = (v: number) => {
    if (v >= 80) return { stroke: 'url(#gaugeGreen)', glow: 'rgba(16, 185, 129, 0.25)' }
    if (v >= 70) return { stroke: 'url(#gaugeAmber)', glow: 'rgba(245, 158, 11, 0.25)' }
    return { stroke: 'url(#gaugeRed)', glow: 'rgba(239, 68, 68, 0.25)' }
  }

  const { stroke, glow } = getColor(value)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="gaugeGreen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <linearGradient id="gaugeAmber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="gaugeRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={stroke} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            filter: `drop-shadow(0 0 8px ${glow})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tracking-tight text-foreground">{value}%</span>
        <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Taxa de Acerto</span>
      </div>
    </div>
  )
}

/* ──────────────── Sparkline SVG ──────────────── */

function Sparkline({ color = '#8b5cf6' }: { color?: string }) {
  const points = [4, 6, 3, 8, 5, 9, 7, 10, 8, 12]
  const max = Math.max(...points)
  const min = Math.min(...points)
  const w = 64
  const h = 20
  const stepX = w / (points.length - 1)

  const pathData = points
    .map((p, i) => {
      const x = i * stepX
      const y = h - ((p - min) / (max - min)) * h
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} className="opacity-60">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathData + ` L${w},${h} L0,${h} Z`} fill={`url(#spark-${color.replace('#', '')})`} />
      <path d={pathData} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ──────────────── Compact Metric Card ──────────────── */

function MetricCard({
  title, value, subtitle, icon, gradientClass, sparkColor, stagger,
}: {
  title: string; value: string | number; subtitle: string
  icon: React.ReactNode; gradientClass: string; sparkColor: string; stagger: string
}) {
  return (
    <div className={`glass-card p-4 flex flex-col justify-between gap-3 animate-fade-in-up ${stagger}`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${gradientClass} shadow-lg`}>
          {icon}
        </div>
        <Sparkline color={sparkColor} />
      </div>
      <div>
        <h4 className="text-2xl font-black tracking-tight text-foreground leading-none">{value}</h4>
        <p className="text-[11px] font-medium text-muted-foreground mt-1">{title}</p>
      </div>
      <p className="text-[10px] text-muted-foreground/60">{subtitle}</p>
    </div>
  )
}

/* ──────────────── Progress Bar Matéria ──────────────── */

function MateriaBar({ materia, taxa, acertos, total, index }: { materia: string; taxa: number; acertos: number; total: number; index: number }) {
  const getGradient = (v: number) => {
    if (v >= 80) return 'linear-gradient(90deg, #059669, #34d399)'
    if (v >= 70) return 'linear-gradient(90deg, #d97706, #fbbf24)'
    return 'linear-gradient(90deg, #dc2626, #f87171)'
  }

  const getTextColor = (v: number) => {
    if (v >= 80) return 'text-emerald-400'
    if (v >= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="group animate-fade-in-up" style={{ animationDelay: `${index * 80 + 150}ms` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-foreground/90 truncate max-w-[55%]">{materia}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground tabular-nums">{acertos}/{total}</span>
          <span className={`text-[13px] font-bold ${getTextColor(taxa)} tabular-nums`}>{taxa}%</span>
        </div>
      </div>
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{
            width: `${taxa}%`,
            background: getGradient(taxa),
            animationDelay: `${index * 80 + 300}ms`,
          }}
        />
      </div>
    </div>
  )
}

/* ──────────────── Resolução Item ──────────────── */

function ResolucaoItem({ res, index }: { res: any; index: number }) {
  const tempoDisplay = formatarTempo(res.tempo_segundos)

  return (
    <div
      className="relative group animate-slide-in-right"
      style={{ animationDelay: `${index * 60 + 200}ms` }}
    >
      {/* Background link that makes the entire card clickable */}
      <Link
        to={`/app/questoes?id=${res.questao_tec_id}`}
        className={`absolute inset-0 rounded-lg bg-white/[0.02] ${
          res.acertou ? 'res-correct' : 'res-wrong'
        } transition-all duration-200 hover:bg-white/[0.05] z-0`}
      />

      {/* Visual content overlay with pointer-events-none so click passes through to the background Link, except interactive elements */}
      <div className="relative z-10 flex items-center justify-between gap-2.5 px-3 py-2.5 pointer-events-none w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Icon status */}
          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
            res.acertou ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          }`}>
            {res.acertou ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate leading-tight">
              {res.assunto || 'Assunto Desconhecido'}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <span className="text-violet-400 font-semibold">
                Q{res.questao_tec_id}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="truncate">{res.materia}</span>
            </p>
          </div>
        </div>

        {/* Time and external link */}
        <div className="text-right flex-shrink-0 flex items-center gap-2 pointer-events-auto">
          <div>
            <p className="text-[13px] font-semibold text-foreground tabular-nums leading-tight">{tempoDisplay}</p>
            <p className="text-[10px] text-muted-foreground/60">
              {new Date(res.data_resolucao).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <a
            href={`https://www.tecconcursos.com.br/questoes/${res.questao_tec_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/50 hover:text-foreground p-1 transition-colors rounded-lg hover:bg-white/10 relative z-20"
            title="Abrir no site oficial do TEC"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}

/* ──────────────── Custom Tooltip Recharts ──────────────── */

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-white/10 text-left text-xs shadow-xl">
        <p className="font-black text-violet-400 mb-1">{label}</p>
        {payload.map((pld: any) => (
          <p key={pld.name} className="font-semibold text-foreground flex items-center justify-between gap-4 mt-0.5">
            <span className="opacity-85">{pld.name}:</span>
            <span className="font-bold text-right" style={{ color: pld.color || '#fff' }}>
              {pld.value}{pld.name === 'Taxa de Acerto' || pld.name === 'Aproveitamento' ? '%' : ''}
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

/* ──────────────── Componente StudyHeatmap (GitHub-style) ──────────────── */

interface StudyHeatmapProps {
  resolucoes: any[]
}

function StudyHeatmap({ resolucoes }: StudyHeatmapProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  // 1. Agrupar resoluções válidas por dia (formato local AAAA-MM-DD)
  const porDia = useMemo(() => {
    const map = new Map<string, number>()
    resolucoes.forEach(r => {
      if (r.alternativa && r.alternativa !== '' && r.data_resolucao) {
        const d = new Date(r.data_resolucao)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const dateKey = `${year}-${month}-${day}`
        map.set(dateKey, (map.get(dateKey) || 0) + 1)
      }
    })
    return map
  }, [resolucoes])

  // 2. Calcular o intervalo de 365 dias terminando hoje e alinhando no domingo inicial
  const { diasGrid, mesesRotulos } = useMemo(() => {
    const hoje = new Date()
    // Data de 364 dias atrás
    const dataInicial = new Date(hoje)
    dataInicial.setDate(hoje.getDate() - 364)

    // Retroceder até o domingo anterior da data inicial para alinhar o grid vertical
    const diaSemanaInicial = dataInicial.getDay()
    dataInicial.setDate(dataInicial.getDate() - diaSemanaInicial)

    const dias = []
    const mesesMap = new Map<number, { label: string; index: number }>()

    const temp = new Date(dataInicial)
    let indexColuna = 0

    while (temp <= hoje) {
      const year = temp.getFullYear()
      const month = temp.getMonth()
      const monthStr = temp.toLocaleString('pt-BR', { month: 'short' })
      const day = String(temp.getDate()).padStart(2, '0')
      const formattedMonth = String(month + 1).padStart(2, '0')
      const dateKey = `${year}-${formattedMonth}-${day}`
      const count = porDia.get(dateKey) || 0

      // Registrar meses para rótulos na primeira linha (Domingo) da coluna
      if (temp.getDay() === 0) {
        if (!mesesMap.has(month) || temp.getDate() <= 7) {
          mesesMap.set(month, { label: monthStr.charAt(0).toUpperCase() + monthStr.slice(1, 3), index: indexColuna })
        }
      }

      dias.push({
        dataKey: dateKey,
        dataObj: new Date(temp),
        count,
        level: getContributionLevel(count)
      })

      if (temp.getDay() === 6) {
        indexColuna++
      }

      temp.setDate(temp.getDate() + 1)
    }

    return {
      diasGrid: dias,
      mesesRotulos: Array.from(mesesMap.values()).sort((a, b) => a.index - b.index)
    }
  }, [porDia])

  // 3. Determinar o nível de cor baseado na quantidade de questões
  function getContributionLevel(count: number): number {
    if (count === 0) return 0
    if (count < 5) return 1
    if (count < 10) return 2
    if (count < 20) return 3
    return 4
  }

  // Cores do tema Violeta Premium
  const levelClasses = [
    'bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.08]',
    'bg-violet-900/35 border border-violet-500/10 hover:bg-violet-900/50',
    'bg-violet-700/55 border border-violet-500/30 hover:bg-violet-700/70',
    'bg-violet-50/15 dark:bg-violet-500/75 border border-violet-400/50 hover:bg-violet-500/90',
    'bg-violet-400 border border-violet-300 hover:brightness-110 shadow-[0_0_8px_rgba(167,139,250,0.3)]'
  ]

  // Agrupar dias em colunas (semanas) de 7 elementos
  const colunasSemanas = useMemo(() => {
    const colunas = []
    for (let i = 0; i < diasGrid.length; i += 7) {
      colunas.push(diasGrid.slice(i, i + 7))
    }
    return colunas
  }, [diasGrid])

  return (
    <div className="glass-card flex flex-col animate-fade-in-up col-span-full transition-all duration-300">
      {/* Header bar - Clickable to toggle collapse */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-5 flex items-center justify-between shrink-0 flex-wrap gap-3 cursor-pointer select-none ${
          isExpanded ? 'border-b border-white/[0.04]' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-foreground">Consistência e Frequência de Estudos</h3>
          <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full shrink-0 ml-1.5">
            Últimos 365 Dias
          </span>
        </div>

        <div className="flex items-center gap-4 text-xxs text-muted-foreground">
          {/* Legenda de Níveis - Apenas visível quando expandido */}
          {isExpanded && (
            <div className="flex items-center gap-1.5 animate-scale-in">
              <span>Menos</span>
              {levelClasses.map((cls, idx) => (
                <span key={idx} className={`w-2.5 h-2.5 rounded-xs ${cls.split(' ')[0]} ${cls.split(' ')[1]}`} />
              ))}
              <span>Mais</span>
            </div>
          )}

          {/* Botão Indicador Expandir/Recolher */}
          <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground hover:text-foreground transition-all px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]">
            {isExpanded ? (
              <>
                <span className="uppercase tracking-wider">Ocultar</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span className="uppercase tracking-wider">Visualizar</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Grid - Visível apenas quando expandido */}
      {isExpanded && (
        <div className="p-5 flex flex-1 overflow-x-auto min-h-0 py-4 scrollbar-thin select-none animate-fade-in-up">
          <div className="flex gap-1.5 flex-1 min-w-max">
            {/* Rótulos dos Dias da Semana */}
            <div className="grid grid-rows-7 text-[9px] text-muted-foreground/60 font-bold w-7 pt-4 pr-1 shrink-0 select-none">
              <span className="row-start-2 leading-none">Ter</span>
              <span className="row-start-4 leading-none">Qui</span>
              <span className="row-start-6 leading-none">Sáb</span>
            </div>

            {/* Grid Principal do Heatmap */}
            <div className="flex flex-col flex-1">
              {/* Rótulos dos Meses */}
              <div className="relative h-4 text-[9px] text-muted-foreground/60 font-extrabold select-none mb-1">
                {mesesRotulos.map((m, idx) => (
                  <span
                    key={idx}
                    className="absolute"
                    style={{ left: `${m.index * 13}px` }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>

              {/* Grid de Quadradinhos agrupados em Colunas (Semanas) */}
              <div className="flex gap-1">
                {colunasSemanas.map((semana, colIdx) => (
                  <div key={colIdx} className="grid grid-rows-7 gap-1">
                    {semana.map((dia) => {
                      const dataFormatada = dia.dataObj.toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })
                      const qDesc = dia.count === 1 ? 'questão' : 'questões'
                      const tooltipText = `${dia.count} ${qDesc} em ${dataFormatada}`

                      return (
                        <div
                          key={dia.dataKey}
                          className={`w-2.5 h-2.5 rounded-xs transition-colors duration-150 relative group cursor-pointer ${levelClasses[dia.level]}`}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-slate-950/95 backdrop-blur-md border border-white/10 text-white font-extrabold text-[9px] px-2 py-1 rounded shadow-xl whitespace-nowrap">
                              {tooltipText}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════ DASHBOARD PRINCIPAL ═══════════════════ */

export function Dashboard() {
  const { loading, stats, resolucoes } = useDashboard()
  const [periodo, setPeriodo] = useState<'geral' | '24h'>('geral')

  if (loading) return <LoadingSpinner />

  const is24h = periodo === '24h'

  const totalQuestoes = is24h ? stats.stats24h.totalQuestoes : stats.totalQuestoes
  const totalAcertos = is24h ? stats.stats24h.totalAcertos : stats.totalAcertos
  const taxaAcerto = is24h ? stats.stats24h.taxaAcerto : stats.taxaAcerto
  const tempoFormatado = is24h ? stats.stats24h.tempoFormatado : stats.tempoFormatado
  const errosPendentes = is24h ? (stats.stats24h.totalQuestoes - stats.stats24h.totalAcertos) : stats.errosPendentes
  const ultimasResolucoes = is24h ? stats.stats24h.resolucoes : stats.ultimasResolucoes
  const chartData = is24h ? stats.stats24h.chartData : stats.chartData

  const {
    saudacao,
    streak,
    dataFormatada,
  } = stats

  const evolucaoDiaria = is24h ? stats.stats24h.evolucaoDiaria : stats.evolucaoDiaria

  const radarData = chartData.map(item => ({
    materia: item.materia.length > 18 ? item.materia.substring(0, 16) + '...' : item.materia,
    Aproveitamento: item.taxa,
    total: item.total
  }))

  const renderRadarChart = () => {
    if (radarData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-10 px-4 w-full">
          <Trophy className="w-10 h-10 mb-2 text-muted-foreground/30" />
          <p className="text-xs font-semibold">Sem dados de competências</p>
          <p className="text-[10px] opacity-60 mt-0.5 max-w-[200px]">Resolva questões para mapear seu desempenho por matéria.</p>
        </div>
      )
    }

    if (radarData.length < 3) {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={radarData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="materia" stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="Aproveitamento" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
          <PolarGrid stroke="rgba(255,255,255,0.05)" />
          <PolarAngleAxis
            dataKey="materia"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8 }}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name="Aproveitamento"
            dataKey="Aproveitamento"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.15}
          />
        </RadarChart>
      </ResponsiveContainer>
    )
  }

  const renderEvolucaoChart = () => {
    if (evolucaoDiaria.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-10 px-4 w-full">
          <Activity className="w-10 h-10 mb-2 text-muted-foreground/30" />
          <p className="text-xs font-semibold">Sem dados de evolução</p>
          <p className="text-[10px] opacity-60 mt-0.5 max-w-[200px]">Seu progresso diário aparecerá aqui conforme você responder questões.</p>
        </div>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={evolucaoDiaria} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorResolvidas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTaxa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
          <XAxis
            dataKey="data"
            stroke="rgba(255,255,255,0.4)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            yAxisId="left"
            stroke="#8b5cf6"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            stroke="#10b981"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="resolvidas"
            name="Resolvidas"
            stroke="#8b5cf6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorResolvidas)"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="taxa"
            name="Taxa de Acerto"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTaxa)"
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full min-h-0 flex-1">
      {/* ── Header compacto inline ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 animate-fade-in-up">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-black text-foreground tracking-tight">{saudacao}</h1>
          <span className="text-sm text-muted-foreground hidden sm:inline">{dataFormatada}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center gap-1 p-0.5 bg-white/[0.04] border border-white/[0.06] rounded-xl shrink-0">
            <button
              onClick={() => setPeriodo('geral')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodo === 'geral'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Geral
            </button>
            <button
              onClick={() => setPeriodo('24h')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1`}
              style={{
                background: periodo === '24h' ? 'var(--color-primary)' : 'transparent',
                color: periodo === '24h' ? '#ffffff' : 'var(--color-muted-foreground)',
              }}
            >
              <span>Hoje</span>
              <span className="text-[9px] opacity-75 font-normal">(Brasília)</span>
            </button>
          </div>

          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 animate-scale-in">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-bold text-orange-300">{streak} dia{streak > 1 ? 's' : ''} seguido{streak > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Métricas: gauge + 3 cards numa faixa horizontal compacta ── */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        {/* Gauge Card */}
        <div className="glass-card p-4 flex items-center gap-5 animate-fade-in-up stagger-1">
          <GaugeChart value={taxaAcerto} size={110} />
          <div>
            <p className="text-sm font-bold text-foreground">{totalAcertos}/{totalQuestoes}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">questões corretas</p>
          </div>
        </div>

        <MetricCard
          title="Questões Resolvidas"
          value={totalQuestoes}
          subtitle={is24h ? "Hoje (Brasília)" : "Total acumulado"}
          icon={<BookOpen className="w-4 h-4 text-white" />}
          gradientClass="gradient-violet"
          sparkColor="#8b5cf6"
          stagger="stagger-2"
        />

        <MetricCard
          title="Tempo Médio"
          value={tempoFormatado}
          subtitle={is24h ? "Hoje (Brasília)" : "Por questão"}
          icon={<Clock className="w-4 h-4 text-white" />}
          gradientClass="gradient-amber"
          sparkColor="#f59e0b"
          stagger="stagger-3"
        />

        <MetricCard
          title="Erros para Revisar"
          value={errosPendentes}
          subtitle={is24h ? "Gerados hoje" : "Aguardando revisão"}
          icon={<Target className="w-4 h-4 text-white" />}
          gradientClass="gradient-rose"
          sparkColor="#f43f5e"
          stagger="stagger-4"
        />
      </div>

      {/* ── Calendário de Contribuição (Heatmap) ── */}
      <StudyHeatmap resolucoes={resolucoes} />

      {/* ── Seção de Análise Visual Avançada (Recharts) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        {/* Painel 1: Evolução Diária */}
        <div className="glass-card p-5 flex flex-col animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-foreground">
                {is24h ? 'Desempenho por Hora (Hoje)' : 'Evolução de Estudos (Últimos Dias)'}
              </h3>
            </div>
            <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              {is24h ? 'Fluxo de Hoje' : 'Fluxo Diário'}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            {renderEvolucaoChart()}
          </div>
        </div>

        {/* Painel 2: Radar de Competências */}
        <div className="glass-card p-5 flex flex-col animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-foreground">Radar de Competências</h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              RPG Skill Graph
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            {renderRadarChart()}
          </div>
        </div>
      </div>

      {/* ── Painéis inferiores — crescem para preencher todo o espaço restante ── */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Matérias Estudadas */}
        <div className="glass-card p-5 flex flex-col animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-foreground">Matérias Estudadas</h3>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto min-h-0 pr-1">
            {chartData.length > 0 ? (
              chartData.map((item, i) => (
                <MateriaBar
                  key={item.materia}
                  materia={item.materia}
                  taxa={item.taxa}
                  acertos={item.acertos}
                  total={item.total}
                  index={i}
                />
              ))
            ) : (
              <div className="flex items-center justify-center text-muted-foreground text-sm flex-1 text-center py-4 flex-col gap-1">
                <span>Nenhuma matéria estudada</span>
                <span className="text-xs opacity-60 mt-0.5">{is24h ? 'hoje.' : 'ainda.'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Últimas Resoluções */}
        <div className="glass-card p-5 flex flex-col animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-foreground">
                {is24h ? 'Resoluções de Hoje' : 'Últimas Resoluções'}
              </h3>
            </div>
            {is24h && (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Horário de Brasília
              </span>
            )}
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto min-h-0 pr-1">
            {ultimasResolucoes.map((res, i) => (
              <ResolucaoItem key={res.id || Math.random()} res={res} index={i} />
            ))}
            {ultimasResolucoes.length === 0 && (
              <div className="flex flex-col items-center justify-center text-muted-foreground text-sm flex-1 text-center py-4 flex-col gap-1">
                <span>Nenhuma questão resolvida</span>
                <span className="text-xs opacity-60 mt-0.5">{is24h ? 'hoje.' : 'ainda.'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
