import { Landmark } from 'lucide-react'

interface BancaStat {
  banca: string
  acertos: number
  total: number
  taxa: number
}

function BancaBar({ banca, taxa, acertos, total, index }: { banca: string; taxa: number; acertos: number; total: number; index: number }) {
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
        <span className="text-[13px] font-medium text-foreground/90 truncate max-w-[55%]">{banca}</span>
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

export function DashboardBancaCard({ bancas }: { bancas: BancaStat[] }) {
  return (
    <div className="glass-card p-5 flex flex-col animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Landmark className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-foreground">Desempenho por Banca</h3>
      </div>
      <div className="space-y-4 flex-1 overflow-y-auto min-h-0 pr-1">
        {(bancas?.length ?? 0) > 0 ? (
          bancas.slice(0, 10).map((item, i) => (
            <BancaBar
              key={item.banca}
              banca={item.banca}
              taxa={item.taxa}
              acertos={item.acertos}
              total={item.total}
              index={i}
            />
          ))
        ) : (
          <div className="flex items-center justify-center text-muted-foreground text-sm flex-1 text-center py-4 flex-col gap-1">
            <span>Nenhuma banca identificada</span>
            <span className="text-xs opacity-60">responda questões para ver estatísticas por banca.</span>
          </div>
        )}
      </div>
    </div>
  )
}
