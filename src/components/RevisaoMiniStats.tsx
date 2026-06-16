import { BookOpen, Layers, Book, BrainCircuit } from 'lucide-react'

interface RevisaoMiniStatsProps {
  totalPendentes: number
  totalMaterias: number
  totalAssuntos: number
}

export function RevisaoMiniStats({ totalPendentes, totalMaterias, totalAssuntos }: RevisaoMiniStatsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <StatPill
        icon={<BookOpen className="w-3 h-3" />}
        value={totalPendentes}
        label="pendentes"
        color="red"
      />
      <StatPill
        icon={<Layers className="w-3 h-3" />}
        value={totalMaterias}
        label="matérias"
        color="violet"
      />
      <StatPill
        icon={<Book className="w-3 h-3" />}
        value={totalAssuntos}
        label="assuntos"
        color="amber"
      />
      <StatPill
        icon={<BrainCircuit className="w-3 h-3" />}
        value="SM-2"
        label="ativo"
        color="sky"
      />
    </div>
  )
}

interface StatPillProps {
  icon: React.ReactNode
  value: number | string
  label: string
  color: 'red' | 'violet' | 'amber' | 'sky'
}

const COLOR_MAP = {
  red: 'bg-red-500/10 border-red-500/20 text-red-400',
  violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  sky: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
}

function StatPill({ icon, value, label, color }: StatPillProps) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black tracking-tight ${COLOR_MAP[color]}`}>
      {icon}
      <span>{value}</span>
      <span className="opacity-70 font-bold">{label}</span>
    </div>
  )
}
