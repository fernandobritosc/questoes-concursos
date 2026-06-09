import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
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
      <div className="glass-card p-3 border border-border/60 dark:border-white/10 text-left text-xs shadow-xl">
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

  return (
    <div
      className="relative group animate-slide-in-right"
      style={{ animationDelay: `${index * 60 + 200}ms` }}
    >
      {/* Background link that makes the entire card clickable */}
      <Link
        to={`/app/questoes?id=${res.questao_tec_id}`}
        className={`absolute inset-0 rounded-lg bg-card border border-border ${
          res.acertou ? 'res-correct' : 'res-wrong'
        } transition-all duration-200 hover:bg-muted/40 dark:bg-white/[0.02] dark:border-transparent dark:hover:bg-white/[0.05] z-0`}
      />

      {/* Visual content overlay with pointer-events-none so click passes through to the background Link, except interactive elements */}
      <div className="relative z-10 flex items-center justify-between gap-2.5 px-3 py-2.5 pointer-events-none w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Icon status */}
          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
            res.acertou ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-650 dark:text-red-400'
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
              <span className="text-muted-foreground/40">&bull;</span>
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
            className="text-muted-foreground/50 hover:text-foreground p-1 transition-colors rounded-lg hover:bg-muted dark:hover:bg-white/10 relative z-20"
            title="Abrir no site oficial do TEC"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  )
}
