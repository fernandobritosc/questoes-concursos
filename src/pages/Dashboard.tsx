import { useState } from 'react'
import { useDashboard } from '../hooks/useDashboard'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { DashboardMetricCard } from '../components/DashboardMetricCard'
import { DashboardResolucaoItem, CustomTooltip } from '../components/DashboardResolucaoItem'
import { DashboardStudyHeatmap } from '../components/DashboardStudyHeatmap'
import { Clock, BookOpen, Flame, Target, TrendingUp, Activity, Trophy } from 'lucide-react'
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
            <XAxis dataKey="materia" stroke="var(--muted-foreground)" opacity={0.8} fontSize={9} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" opacity={0.8} fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.1 }} />
            <Bar dataKey="Aproveitamento" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
          <PolarGrid stroke="var(--border)" opacity={0.4} />
          <PolarAngleAxis
            dataKey="materia"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 9, fontWeight: 700 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: 'var(--muted-foreground)', opacity: 0.8, fontSize: 8 }}
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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} vertical={false} />
          <XAxis
            dataKey="data"
            stroke="var(--muted-foreground)"
            opacity={0.8}
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
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
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
          <div className="flex items-center gap-1 p-0.5 bg-muted/30 border border-border/60 dark:bg-white/[0.04] dark:border-white/[0.06] rounded-xl shrink-0">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <DashboardMetricCard
          title="Taxa de Acerto"
          value={`${taxaAcerto}%`}
          subtitle={is24h ? "Aproveitamento de hoje" : `${totalAcertos}/${totalQuestoes} corretas`}
          icon={<Trophy className="w-4.5 h-4.5 text-white" />}
          gradientClass="gradient-emerald"
          sparkColor="#10b981"
          stagger="stagger-1"
          sizeClass="text-[64px]"
          trend={stats.trends.taxa}
        />

        <DashboardMetricCard
          title="Questões Resolvidas"
          value={totalQuestoes}
          subtitle={is24h ? "Hoje (Brasília)" : "Total acumulado"}
          icon={<BookOpen className="w-4 h-4 text-white" />}
          gradientClass="gradient-violet"
          sparkColor="#8b5cf6"
          stagger="stagger-2"
          sizeClass="text-[40px]"
          trend={stats.trends.resolvidas}
        />

        <DashboardMetricCard
          title="Tempo Médio"
          value={tempoFormatado}
          subtitle={is24h ? "Hoje (Brasília)" : "Por questão"}
          icon={<Clock className="w-4 h-4 text-white" />}
          gradientClass="gradient-amber"
          sparkColor="#f59e0b"
          stagger="stagger-3"
          sizeClass="text-[40px]"
          trend={stats.trends.tempo}
        />

        <DashboardMetricCard
          title="Erros para Revisar"
          value={errosPendentes}
          subtitle={is24h ? "Gerados hoje" : "Aguardando revisão"}
          icon={<Target className="w-4 h-4 text-white" />}
          gradientClass="gradient-rose"
          sparkColor="#f43f5e"
          stagger="stagger-4"
          sizeClass="text-[28px]"
          trend={stats.trends.erros}
        />
      </div>

      {/* ── Calendário de Contribuição (Heatmap) ── */}
      <DashboardStudyHeatmap resolucoes={resolucoes} />

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
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
              <DashboardResolucaoItem key={res.id || `res-${i}`} res={res} index={i} />
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
