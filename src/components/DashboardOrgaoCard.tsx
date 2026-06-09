import { Building2 } from 'lucide-react'
import { useState } from 'react'

interface OrgaoStat {
  orgao: string
  categoria: string
  acertos: number
  total: number
  taxa: number
}

function OrgaoBar({ orgao, taxa, acertos, total, index }: { orgao: string; taxa: number; acertos: number; total: number; index: number }) {
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
    <div className="group animate-fade-in-up" style={{ animationDelay: `${index * 60 + 100}ms` }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] font-medium text-foreground/90 truncate max-w-[55%]">{orgao}</span>
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
            animationDelay: `${index * 60 + 200}ms`,
          }}
        />
      </div>
    </div>
  )
}

const CATEGORIA_CORES: Record<string, string> = {
  Tribunais: 'text-amber-400',
  'Ministérios Públicos': 'text-emerald-400',
  Executivo: 'text-sky-400',
  Legislativo: 'text-violet-400',
  Controle: 'text-rose-400',
}

const CATEGORIA_ORDEM = ['Tribunais', 'Ministérios Públicos', 'Executivo', 'Legislativo', 'Controle']

export function DashboardOrgaoCard({ orgaos }: { orgaos: OrgaoStat[] }) {
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const toggle = (cat: string) => {
    setExpandidas(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  if (!orgaos?.length) {
    return (
      <div className="glass-card p-5 flex flex-col animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <Building2 className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-bold text-foreground">Desempenho por Órgão</h3>
        </div>
        <div className="flex items-center justify-center text-muted-foreground text-sm text-center py-4">
          <span>Nenhum órgão identificado</span>
        </div>
      </div>
    )
  }

  const grupos = CATEGORIA_ORDEM
    .map(cat => ({
      categoria: cat,
      cor: CATEGORIA_CORES[cat],
      itens: orgaos.filter(o => o.categoria === cat),
    }))
    .filter(g => g.itens.length > 0)

  return (
    <div className="glass-card p-5 flex flex-col animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <Building2 className="w-4 h-4 text-sky-400" />
        <h3 className="text-sm font-bold text-foreground">Desempenho por Órgão</h3>
      </div>
      <div className="space-y-5 flex-1 overflow-y-auto min-h-0 pr-1">
        {grupos.map(grupo => {
          const expandida = expandidas.has(grupo.categoria)
          const exibidos = expandida ? grupo.itens : grupo.itens.slice(0, 4)
          const restantes = grupo.itens.length - 4

          return (
            <div key={grupo.categoria}>
              <div className={`flex items-center justify-between mb-2`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${grupo.cor}`}>
                  {grupo.categoria}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">{grupo.itens.length} orgãos</span>
              </div>
              <div className="space-y-2.5">
                {exibidos.map((item, i) => (
                  <OrgaoBar
                    key={item.orgao}
                    orgao={item.orgao}
                    taxa={item.taxa}
                    acertos={item.acertos}
                    total={item.total}
                    index={i}
                  />
                ))}
                {restantes > 0 && (
                  <button
                    onClick={() => toggle(grupo.categoria)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {expandida ? `▲ recolher (${restantes} ocultos)` : `+ ${restantes} mais`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
