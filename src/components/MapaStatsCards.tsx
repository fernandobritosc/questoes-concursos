import { Layers, CheckCircle2, Percent, TrendingUp } from 'lucide-react'

interface MapaStatsCardsProps {
  totalAssuntos: number
  totalQuestoes: number
  totalResolvidasUnicas: number
  totalTentativas: number
  aproveitamentoGeral: number
  topAssuntoEstudado: string
  subjectsCount: number
}

export function MapaStatsCards({
  totalAssuntos,
  totalQuestoes,
  totalResolvidasUnicas,
  totalTentativas,
  aproveitamentoGeral,
  topAssuntoEstudado,
  subjectsCount
}: MapaStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

      <div className="bg-card/40 border border-border/80 p-5 rounded-2xl flex items-center gap-4 shadow-xxs backdrop-blur-sm">
        <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
          <Layers className="w-5.5 h-5.5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Assuntos Mapeados</span>
          <h3 className="text-xl font-black text-foreground mt-0.5">{totalAssuntos}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Em {subjectsCount} matérias</p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/80 p-5 rounded-2xl flex items-center gap-4 shadow-xxs backdrop-blur-sm">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-5.5 h-5.5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Resolvidas / Totais</span>
          <h3 className="text-xl font-black text-foreground mt-0.5">
            {totalResolvidasUnicas} <span className="text-xs text-muted-foreground font-semibold">/ {totalQuestoes}</span>
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
            {totalQuestoes > 0
              ? `${Math.round((totalResolvidasUnicas / totalQuestoes) * 100)}% de cobertura`
              : '0% de cobertura'}
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/80 p-5 rounded-2xl flex items-center gap-4 shadow-xxs backdrop-blur-sm">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
          aproveitamentoGeral >= 80
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : aproveitamentoGeral >= 50
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <Percent className="w-5.5 h-5.5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Aproveitamento Geral</span>
          <h3 className="text-xl font-black text-foreground mt-0.5">{aproveitamentoGeral}%</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
            De {totalTentativas} tentativas
          </p>
        </div>
      </div>

      <div className="bg-card/40 border border-border/80 p-5 rounded-2xl flex items-center gap-4 shadow-xxs backdrop-blur-sm">
        <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <TrendingUp className="w-5.5 h-5.5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Mais Estudado</span>
          <h3 className="text-xs font-black text-foreground mt-1 truncate" title={topAssuntoEstudado}>
            {topAssuntoEstudado}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
            {totalTentativas > 0
              ? `${totalTentativas} resoluções globais`
              : 'Nenhuma tentativa'}
          </p>
        </div>
      </div>

    </div>
  )
}
