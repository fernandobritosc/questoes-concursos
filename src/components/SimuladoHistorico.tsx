import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  History,
  Trash2,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react'
import { formatarTempo } from '../hooks/useDashboard'

interface HistoricoItem {
  id?: string
  data: string
  qtdQuestoes: number
  acertos: number
  total: number
  taxa: number
  tempoGasto: number
  tempoMinutos: number
  diagnosticoIA?: string | null
}

interface SimuladoHistoricoProps {
  historico: HistoricoItem[]
  verTodos: boolean
  onToggleVerTodos: () => void
  isHistoryExpandedMobile: boolean
  onToggleHistoryMobile: () => void
  onRefazer: (qtd: number, tempoMin: number) => void
  onVerPrescricao: (item: HistoricoItem) => void
  onLimparHistorico: () => void
}

export function SimuladoHistorico({
  historico,
  verTodos,
  onToggleVerTodos,
  isHistoryExpandedMobile,
  onToggleHistoryMobile,
  onRefazer,
  onVerPrescricao,
  onLimparHistorico,
}: SimuladoHistoricoProps) {
  // Dados para o gráfico Recharts — últimos 10 em ordem cronológica
  const chartData = useMemo(() => {
    return [...historico]
      .reverse()
      .slice(-10)
      .map((item, idx) => ({
        index: idx + 1,
        Aproveitamento: item.taxa,
        Data: new Date(item.data).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
      }))
  }, [historico])

  return (
    <>
      {/* Mobile Accordion Toggle for History */}
      {historico.length > 0 && (
        <div className="lg:hidden w-full">
          <button
            type="button"
            onClick={onToggleHistoryMobile}
            className="w-full flex items-center justify-between p-4 glass-card text-xs font-bold text-foreground cursor-pointer hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-all"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <span>Histórico de Simulados ({historico.length})</span>
            </div>
            {isHistoryExpandedMobile ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      )}

      {/* Coluna Direita: Histórico de Simulados & Gráficos */}
      <div
        className={`lg:col-span-7 space-y-6 ${
          isHistoryExpandedMobile
            ? 'block animate-fade-in-up'
            : 'hidden lg:block'
        }`}
      >
        {historico.length > 0 ? (
          <>
            {/* Lista de Histórico */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 dark:border-white/[0.04] pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-foreground">Histórico de Simulados</h3>
                </div>
                <button
                  onClick={onLimparHistorico}
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Histórico
                </button>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                {(verTodos ? historico : historico.slice(0, 5)).map((sim, index) => {
                  const dateObj = new Date(sim.data)
                  const dataFormatada = dateObj.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const tempoGastoDisplay = formatarTempo(sim.tempoGasto)
                  const mediaTempoQuestao = formatarTempo(
                    Math.round(sim.tempoGasto / sim.total)
                  )

                  let badgeColor =
                    'bg-red-500/10 border-red-500/20 text-red-400'
                  let badgeText = 'Abaixo da Meta'
                  if (sim.taxa >= 80) {
                    badgeColor =
                      'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                    badgeText = 'Excelente'
                  } else if (sim.taxa >= 70) {
                    badgeColor =
                      'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    badgeText = 'Aprovado'
                  }

                  return (
                    <div
                      key={sim.id || index}
                      className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-border dark:border-white/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.02] dark:hover:border-white/[0.08] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-xs font-bold text-foreground">
                            {sim.qtdQuestoes} Questões
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {dataFormatada}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span>
                            Tempo total: <strong>{tempoGastoDisplay}</strong>
                          </span>
                          <span>
                            Média: <strong>{mediaTempoQuestao}/q</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3.5">
                        <div className="text-right">
                          <span className="text-sm font-black text-foreground tabular-nums block">
                            {sim.acertos} / {sim.total}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block mt-1 ${badgeColor}`}
                          >
                            {sim.taxa}% - {badgeText}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onRefazer(sim.qtdQuestoes, sim.tempoMinutos)
                            }
                            className="px-3 py-2 text-[10px] font-extrabold text-emerald-450 hover:text-emerald-350 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            title="Refazer simulado com as mesmas configurações de questões e tempo"
                          >
                            Refazer
                          </button>

                          {sim.diagnosticoIA && (
                            <button
                              type="button"
                              onClick={() => onVerPrescricao(sim)}
                              className="px-3 py-2 text-[10px] font-extrabold text-violet-400 hover:text-violet-300 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/25 hover:border-violet-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Sparkles className="w-3 h-3 animate-pulse" />
                              Ver Prescrição
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {historico.length > 5 && (
                <button
                  type="button"
                  onClick={onToggleVerTodos}
                  className="w-full py-2.5 text-center text-xs font-bold text-violet-400 hover:text-violet-300 bg-muted border border-border/60 hover:bg-muted/80 dark:bg-white/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.04] transition-all cursor-pointer mt-2"
                >
                  {verTodos
                    ? 'Ver menos'
                    : `Ver todos (${historico.length})`}
                </button>
              )}
            </div>

            {/* Painel de Estatísticas de Evolução (Sparkline) */}
            <div className="glass-card p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-violet-400" />
                  <h3 className="text-xs font-bold text-foreground">
                    Tendência de Aproveitamento % (Últimas 10 Sessões)
                  </h3>
                </div>
              </div>

              <div className="h-[80px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorAproveitamento"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataItem = payload[0].payload
                          return (
                            <div className="glass-card p-2 border border-border/60 dark:border-white/10 text-[10px] shadow-xl">
                              <p className="font-extrabold text-violet-400">
                                {dataItem.Data}
                              </p>
                              <p className="font-semibold text-foreground mt-0.5">
                                Aproveitamento:{' '}
                                <span className="font-bold text-emerald-400">
                                  {payload[0].value}%
                                </span>
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Aproveitamento"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAproveitamento)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          /* Estado Vazio */
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-4 h-full min-h-[300px]">
            <div className="w-14 h-14 rounded-full bg-muted/30 border border-border/50 dark:bg-white/[0.02] dark:border-white/[0.04] flex items-center justify-center text-muted-foreground/40 animate-pulse">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-sm font-bold text-foreground">
                Nenhum simulado realizado ainda
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comece o seu treinamento de elite acima para registrar o seu
                progresso, obter gráficos de evolução de notas e prescrições
                táticas da IA!
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
