import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import { useMetasSemanais } from '../hooks/useMetasSemanais'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { DashboardMetricCard } from '../components/DashboardMetricCard'
import { DashboardResolucaoItem, CustomTooltip } from '../components/DashboardResolucaoItem'
import { DashboardStudyHeatmap } from '../components/DashboardStudyHeatmap'
import { DashboardBancaCard } from '../components/DashboardBancaCard'
import { DashboardOrgaoCard } from '../components/DashboardOrgaoCard'
import { DashboardMetasSemanais } from '../components/DashboardMetasSemanais'
import { BookOpen, Target, TrendingUp, Activity, Trophy, RefreshCw } from 'lucide-react'
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
  const [periodo, setPeriodo] = useState<'geral' | '24h' | '7d' | '30d'>('geral')
  const [resExpandidas, setResExpandidas] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setResExpandidas(false) }, [periodo])
  const metas = useMetasSemanais(resolucoes)

  if (loading) return <LoadingSpinner />

  const periodoLabel = (tipo: 'curto' | 'prep' | 'empty'): string => {
    if (periodo === '24h') {
      return tipo === 'curto' ? 'hoje' : tipo === 'prep' ? 'de hoje' : 'hoje.'
    }
    if (periodo === '7d') {
      return tipo === 'curto' ? '7 dias' : tipo === 'prep' ? 'dos últimos 7 dias' : 'nos últimos 7 dias.'
    }
    if (periodo === '30d') {
      return tipo === 'curto' ? '30 dias' : tipo === 'prep' ? 'dos últimos 30 dias' : 'nos últimos 30 dias.'
    }
    return tipo === 'curto' ? 'geral' : tipo === 'prep' ? 'total' : 'ainda.'
  }

  const periodoStats = periodo === '24h' ? stats.stats24h
    : periodo === '7d' ? stats.stats7d
    : periodo === '30d' ? stats.stats30d
    : null

  const totalQuestoes = periodoStats ? periodoStats.totalQuestoes : stats.totalQuestoes
  const totalAcertos = periodoStats ? periodoStats.totalAcertos : stats.totalAcertos
  const taxaAcerto = periodoStats ? periodoStats.taxaAcerto : stats.taxaAcerto
  const errosPendentes = periodoStats && periodo !== 'geral'
    ? (periodoStats.totalQuestoes - periodoStats.totalAcertos)
    : stats.errosPendentes
  const ultimasResolucoes = periodoStats ? periodoStats.resolucoes : stats.ultimasResolucoes
  const chartData = periodoStats ? periodoStats.chartData : stats.chartData
  const evolucaoDiaria = periodoStats ? periodoStats.evolucaoDiaria : stats.evolucaoDiaria
  const porBanca = periodoStats ? periodoStats.porBanca : stats.porBanca
  const porOrgao = periodoStats ? periodoStats.porOrgao : stats.porOrgao

  const {
    saudacao,
    dataFormatada,
    revisoesHoje,
  } = stats

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
            {(['geral', '24h', '7d', '30d'] as const).map(p => {
              const label = p === 'geral' ? 'Geral' : p === '24h' ? 'Hoje' : p === '7d' ? '7 dias' : '30 dias'
              return (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodo === p
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>


        </div>
      </div>

      {/* ── Métricas: gauge + 4 cards numa faixa horizontal compacta ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <DashboardMetricCard
          title="Taxa de Acerto"
          value={`${taxaAcerto}%`}
          subtitle={periodo !== 'geral' ? `Aproveitamento ${periodoLabel('prep')}` : `${totalAcertos}/${totalQuestoes} corretas`}
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
          subtitle={periodo !== 'geral' ? periodoLabel('prep') : "Total acumulado"}
          icon={<BookOpen className="w-4 h-4 text-white" />}
          gradientClass="gradient-violet"
          sparkColor="#8b5cf6"
          stagger="stagger-2"
          sizeClass="text-[40px]"
          trend={stats.trends.resolvidas}
        />

        <DashboardMetricCard
          title="Erros para Revisar"
          value={errosPendentes}
          subtitle={periodo !== 'geral' ? `Gerados ${periodoLabel('prep')}` : "Aguardando revisão"}
          icon={<Target className="w-4 h-4 text-white" />}
          gradientClass="gradient-rose"
          sparkColor="#f43f5e"
          stagger="stagger-4"
          sizeClass="text-[28px]"
          trend={stats.trends.erros}
        />

        <Link
          to="/app/revisao"
          className="glass-card p-4.5 flex flex-col justify-between gap-3 animate-fade-in-up stagger-4 group cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg gradient-amber shadow-lg">
              <RefreshCw className="w-4.5 h-4.5 text-white" />
            </div>
          </div>
          <div>
            <h4 className="text-[40px] font-black tracking-tight text-foreground leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {revisoesHoje}
            </h4>
            <p className="text-[11px] font-bold text-muted-foreground">Revisões Pendentes Hoje</p>
          </div>
        </Link>
      </div>

      {/* ── Meta Semanal ── */}
      <DashboardMetasSemanais
        metaQuestoes={metas.metaQuestoes}
        onSetMeta={metas.setMetaQuestoes}
        progresso={metas.progresso}
        progressoPercentual={metas.progressoPercentual}
      />

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
                {periodo === '24h' ? 'Desempenho por Hora (Hoje)' : 'Evolução de Estudos'}
              </h3>
            </div>
            <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              {periodo === '24h' ? 'Fluxo de Hoje' : `Fluxo (${periodoLabel('curto')})`}
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

      {/* ── Painéis de resumo — Matérias + Últimas Resoluções ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
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
                <span className="text-xs opacity-60 mt-0.5">{periodoLabel('empty')}</span>
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
                {periodo !== 'geral' ? `Resoluções (${periodoLabel('curto')})` : 'Últimas Resoluções'}
              </h3>
            </div>
            {ultimasResolucoes.length > 5 && (
              <button
                onClick={() => setResExpandidas(prev => !prev)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              >
                {resExpandidas ? '▲ recolher' : `+ ${ultimasResolucoes.length - 5} mais`}
              </button>
            )}
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pr-1">
            {(resExpandidas ? ultimasResolucoes : ultimasResolucoes.slice(0, 5)).map((res, i) => (
              <DashboardResolucaoItem key={res.id || `res-${i}`} res={res} index={i} />
            ))}
            {ultimasResolucoes.length === 0 && (
              <div className="flex items-center justify-center text-muted-foreground text-sm flex-1 text-center py-6 flex-col gap-1">
                <span>Nenhuma questão resolvida</span>
                <span className="text-xs opacity-60 mt-0.5">{periodoLabel('empty')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Desempenho por Banca e Órgão ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        <DashboardBancaCard bancas={porBanca} />
        <DashboardOrgaoCard orgaos={porOrgao} />
      </div>
    </div>
  )
}
