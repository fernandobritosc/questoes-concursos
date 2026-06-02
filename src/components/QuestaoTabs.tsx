import { Search, List, PieChart, CheckCircle2, Printer, Upload } from 'lucide-react'

interface QuestaoTabsProps {
  topTab: 'questoes' | 'indice' | 'estatisticas' | 'gabarito'
  onTabChange: (tab: 'questoes' | 'indice' | 'estatisticas' | 'gabarito') => void
  totalQuestoes: number
  onImportClick: () => void
}

const TABS = [
  { key: 'questoes' as const, icon: Search, label: 'Questões' },
  { key: 'indice' as const, icon: List, label: 'Índice' },
  { key: 'estatisticas' as const, icon: PieChart, label: 'Estatísticas' },
  { key: 'gabarito' as const, icon: CheckCircle2, label: 'Gabarito' },
]

export function QuestaoTabs({ topTab, onTabChange, totalQuestoes, onImportClick }: QuestaoTabsProps) {
  return (
    <div className="bg-card border-b border-border px-4 flex items-center justify-between text-xs sm:text-sm font-bold text-muted-foreground select-none shrink-0 shadow-xxs">
      <div className="flex items-center justify-start overflow-x-auto scrollbar-none flex-1">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${topTab === tab.key ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}`}
            >
              <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> {tab.label}
            </button>
          )
        })}
        <button
          onClick={() => window.print()}
          className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap hidden sm:flex cursor-pointer active:scale-95 duration-100"
        >
          <Printer className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Imprimir
        </button>
      </div>
    
      {totalQuestoes > 0 && (
        <button
          onClick={onImportClick}
          className="my-2 ml-4 flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-xxs font-black transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Importar PDF</span>
        </button>
      )}
    </div>
  )
}
