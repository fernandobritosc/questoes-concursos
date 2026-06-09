import { Search, Filter, ChevronDown } from 'lucide-react'

type Ordenacao = 'mais_erros' | 'mais_recentes' | 'alfabetica'

interface RevisaoFilterBarProps {
  busca: string
  onBuscaChange: (value: string) => void
  ordenacao: Ordenacao
  onOrdenacaoChange: (value: Ordenacao) => void
}

export function RevisaoFilterBar({ busca, onBuscaChange, ordenacao, onOrdenacaoChange }: RevisaoFilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por assunto, banca, ID..."
          value={busca}
          onChange={e => onBuscaChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-card border border-border hover:border-border/80 focus:border-violet-500 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none font-medium dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:border-white/[0.15]"
        />
      </div>

      <div className="relative w-full sm:w-auto shrink-0 flex items-center gap-2 self-end sm:self-auto">
        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider whitespace-nowrap">Ordenar por:</span>
        <div className="relative">
          <Filter className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={ordenacao}
            onChange={e => onOrdenacaoChange(e.target.value as Ordenacao)}
            className="pl-8 pr-8 py-2 bg-card border border-border hover:border-border/80 focus:border-violet-500 rounded-xl text-xs text-foreground transition-colors focus:outline-none font-medium appearance-none cursor-pointer dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:border-white/[0.15]"
          >
            <option value="mais_erros" className="bg-card text-foreground">Mais erros</option>
            <option value="mais_recentes" className="bg-card text-foreground">Mais recentes</option>
            <option value="alfabetica" className="bg-card text-foreground">Matéria A-Z</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-3 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
