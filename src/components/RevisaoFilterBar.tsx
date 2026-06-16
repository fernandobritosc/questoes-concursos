import { Search } from 'lucide-react'

interface RevisaoFilterBarProps {
  busca: string
  onBuscaChange: (value: string) => void
}

export function RevisaoFilterBar({ busca, onBuscaChange }: RevisaoFilterBarProps) {
  return (
    <div className="relative w-full sm:max-w-xs shrink-0">
      <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Buscar matéria, assunto, banca, ID..."
        value={busca}
        onChange={e => onBuscaChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2 bg-card border border-border hover:border-border/80 focus:border-violet-500 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none font-medium dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:border-white/[0.15]"
      />
    </div>
  )
}
