import * as React from 'react'

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

/* ──────────────── Trend WoW Indicator ──────────────── */

function TrendIndicator({ trend }: { trend: { value: number; isImprovement: boolean; label: string } }) {
  if (trend.value === 0) {
    return (
      <span className="text-[10px] font-semibold text-muted-foreground/50 flex items-center gap-0.5 mt-1.5 select-none">
        Sem alteração WoW
      </span>
    )
  }

  const colorClass = trend.isImprovement ? 'text-emerald-400' : 'text-red-400'
  const arrow = trend.isImprovement ? '↑' : '↓'

  return (
    <span className={`text-[10px] font-bold ${colorClass} flex items-center gap-0.5 mt-1.5 select-none`}>
      {arrow} {trend.label} <span className="text-muted-foreground/50 font-normal">vs. semana anterior</span>
    </span>
  )
}

/* ──────────────── DashboardMetricCard ──────────────── */

export interface DashboardMetricCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  gradientClass: string
  sparkColor: string
  stagger?: string
  sizeClass?: string
  trend: { value: number; isImprovement: boolean; label: string }
}

export function DashboardMetricCard({
  title, value, subtitle, icon, gradientClass, sparkColor, stagger = '', sizeClass = 'text-[40px]', trend,
}: DashboardMetricCardProps) {
  return (
    <div className={`glass-card p-4.5 flex flex-col justify-between gap-3 animate-fade-in-up ${stagger}`}>
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${gradientClass} shadow-lg`}>
          {icon}
        </div>
        <Sparkline color={sparkColor} />
      </div>
      <div>
        <h4 className={`${sizeClass} font-black tracking-tight text-foreground leading-none`} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </h4>
        <p className="text-[11px] font-bold text-muted-foreground mt-1.5">{title}</p>
      </div>
      <div className="flex flex-col border-t border-border/50 dark:border-white/[0.04] pt-2">
        <p className="text-[10px] text-muted-foreground/60 leading-none">{subtitle}</p>
        <TrendIndicator trend={trend} />
      </div>
    </div>
  )
}
