import { BookOpen, Layers, Book, BookOpenCheck } from 'lucide-react'

interface RevisaoStatsCardsProps {
  totalPendentes: number
  totalMaterias: number
  totalAssuntos: number
}

export function RevisaoStatsCards({ totalPendentes, totalMaterias, totalAssuntos }: RevisaoStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">

      <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
        <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <BookOpen className="w-5.5 h-5.5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Erros Pendentes</span>
          <h3 className="text-xl font-black text-foreground mt-0.5">{totalPendentes}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Repetição Espaçada Ativa</p>
        </div>
      </div>

      <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
        <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
          <Layers className="w-5.5 h-5.5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Matérias</span>
          <h3 className="text-xl font-black text-foreground mt-0.5">{totalMaterias}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Com erros no histórico</p>
        </div>
      </div>

      <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
        <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Book className="w-5.5 h-5.5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Tópicos com Erro</span>
          <h3 className="text-xl font-black text-foreground mt-0.5">{totalAssuntos}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Assuntos distintos</p>
        </div>
      </div>

      <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
        <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <BookOpenCheck className="w-5.5 h-5.5" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Método de Estudo</span>
          <h3 className="text-xs font-black text-foreground mt-1 truncate">Algoritmo SM-2</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Revisão inteligente (Anki)</p>
        </div>
      </div>

    </div>
  )
}
