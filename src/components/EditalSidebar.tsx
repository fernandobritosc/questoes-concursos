import { Search, Plus, ChevronRight, Trash2 } from 'lucide-react'

interface EditalSidebarProps {
  materias: string[]
  selectedMateria: string | null
  onSelectMateria: (materia: string) => void
  materiaSearch: string
  onMateriaSearchChange: (value: string) => void
  showAddMateria: boolean
  onToggleAddMateria: () => void
  newMateriaName: string
  onNewMateriaNameChange: (value: string) => void
  onAddMateria: () => void
  customMaterias: string[]
  onRemoveCustomMateria: (materia: string, e: React.MouseEvent) => void
  getQuestaoCount: (materia: string) => number
}

export function EditalSidebar({
  materias,
  selectedMateria,
  onSelectMateria,
  materiaSearch,
  onMateriaSearchChange,
  showAddMateria,
  onToggleAddMateria,
  newMateriaName,
  onNewMateriaNameChange,
  onAddMateria,
  customMaterias,
  onRemoveCustomMateria,
  getQuestaoCount,
}: EditalSidebarProps) {
  return (
    <div className={`w-full md:w-80 border-r border-border bg-card flex flex-col h-full shrink-0 ${selectedMateria ? 'hidden md:flex' : 'flex'}`}>
      {/* Caixa de Busca de Matérias */}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={materiaSearch}
            onChange={(e) => onMateriaSearchChange(e.target.value)}
            placeholder="Buscar matéria..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-card text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>

        {/* Ação para Adicionar Matéria */}
        {showAddMateria ? (
          <div className="space-y-2 p-2.5 bg-muted/30 border border-border rounded-lg animate-in slide-in-from-top-2 duration-200">
            <input
              type="text"
              value={newMateriaName}
              onChange={(e) => onNewMateriaNameChange(e.target.value)}
              placeholder="Nome da matéria (ex: Direito Administrativo)"
              className="w-full px-2.5 py-1.5 border border-border rounded text-xs font-bold text-foreground bg-card outline-none"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={onToggleAddMateria}
                className="px-2.5 py-1.5 border border-border hover:bg-muted text-[10px] font-black rounded uppercase tracking-wide transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={onAddMateria}
                className="px-2.5 py-1.5 bg-primary hover:bg-[#1565c0] text-white text-[10px] font-black rounded uppercase tracking-wide transition-colors cursor-pointer"
              >
                Adicionar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onToggleAddMateria}
            className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xxs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Matéria</span>
          </button>
        )}
      </div>

      {/* Lista com Rolagem */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {materias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs font-semibold italic">
            Nenhuma matéria encontrada.
          </div>
        ) : (
          materias.map((materia) => {
            const isActive = selectedMateria === materia
            const isCustom = customMaterias.includes(materia)
            const qCount = getQuestaoCount(materia)

            return (
              <button
                key={materia}
                onClick={() => onSelectMateria(materia)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-bold transition-all group cursor-pointer ${
                  isActive
                    ? 'border-primary/20 bg-primary/5 text-primary'
                    : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{materia}</span>
                    {isCustom && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded font-black uppercase">Custom</span>
                    )}
                  </div>
                  <div className="text-[10px] opacity-60 font-semibold mt-0.5">
                    {qCount} {qCount === 1 ? 'questão' : 'questões'}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isCustom && (
                    <button
                      onClick={(e) => onRemoveCustomMateria(materia, e)}
                      className="p-1 hover:text-red-550 hover:bg-muted rounded text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover matéria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-1 text-primary' : 'text-muted-foreground/45 group-hover:text-foreground'}`} />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
