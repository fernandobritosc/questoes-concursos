import { CheckCircle2, XCircle, ExternalLink, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatarTempo } from '../hooks/useDashboard'
import type { ResolucaoView } from '../types/database'

/* ──────────────── Custom Tooltip Recharts ──────────────── */

export interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; color: string; value: number }>
  label?: string
}

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-border/60 text-left text-xs shadow-xl">
        <p className="font-black text-violet-400 mb-1">{label}</p>
        {payload.map((pld) => (
          <p key={pld.name} className="font-semibold text-foreground flex items-center justify-between gap-4 mt-0.5">
            <span className="opacity-85">{pld.name}:</span>
            <span className="font-bold text-right" style={{ color: pld.color || 'var(--foreground)' }}>
              {pld.value}{pld.name === 'Taxa de Acerto' || pld.name === 'Aproveitamento' ? '%' : ''}
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

/* ──────────────── DashboardResolucaoItem ──────────────── */

interface DashboardResolucaoItemProps {
  res: ResolucaoView
  index: number
}

export function DashboardResolucaoItem({ res, index }: DashboardResolucaoItemProps) {
  const tempoDisplay = formatarTempo(res.tempo_segundos)
  const dataFormatada = new Date(res.data_resolucao).toLocaleDateString('pt-BR')

  return (
    <div
      className="group animate-fade-in-up"
      style={{ animationDelay: `${index * 60 + 200}ms` }}
    >
      <div className={`relative rounded-xl border bg-card transition-all duration-200 hover:shadow-md overflow-hidden ${
        res.acertou
          ? 'border-emerald-500/20 hover:border-emerald-500/40'
          : 'border-red-500/20 hover:border-red-500/40'
      }`}>
        {/* Colored left stripe indicator */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          res.acertou ? 'bg-emerald-500' : 'bg-red-500'
        }`} />

        <Link
          to={`/app/questoes?id=${res.questao_tec_id}`}
          className="block pl-4 pr-3 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            {/* Left: icon + info */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                res.acertou
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-red-500/15 text-red-600'
              }`}>
                {res.acertou ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                    {res.assunto || 'Assunto Desconhecido'}
                  </p>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    res.acertou
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 border border-red-500/20'
                  }`}>
                    {res.acertou ? 'Acertou' : 'Errou'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-violet-500 shrink-0">
                    Q{res.questao_tec_id}
                  </span>
                  <span className="text-muted-foreground/30">&middot;</span>
                  <span className="truncate">{res.materia}</span>
                  {res.banca_texto && (
                    <>
                      <span className="text-muted-foreground/30">&middot;</span>
                      <span className="shrink-0">{res.banca_texto}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: time + date */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground tabular-nums justify-end">
                  <Clock className="w-3 h-3 text-muted-foreground/60" />
                  {tempoDisplay}
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {dataFormatada}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`https://www.tecconcursos.com.br/questoes/${res.questao_tec_id}`, '_blank', 'noopener')
                }}
                className="text-muted-foreground/40 hover:text-foreground p-1 transition-colors rounded-lg hover:bg-muted cursor-pointer"
                title="Abrir no site oficial do TEC"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
