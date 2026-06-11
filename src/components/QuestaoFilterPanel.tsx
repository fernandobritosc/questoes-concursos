import { Search, X, ChevronDown, ChevronUp, Filter, Folder, FolderOpen, FileText, Circle } from 'lucide-react'
import type { FilterTab, ObjetivoFilter } from '../hooks/useQuestoesFilter'

interface QuestaoFilterPanelProps {
  isExpanded: boolean
  onToggle: () => void
  objetivo: ObjetivoFilter
  setObjetivo: (v: ObjetivoFilter) => void
  activeCategory: FilterTab
  setActiveCategory: (v: FilterTab) => void
  searchTerm: string
  onSearchChange: (v: string) => void
  questaoTecId: string
  onQuestaoTecIdChange: (v: string) => void
  materias: string[]
  materiasComAssuntos: Record<string, Set<string>>
  bancas: string[]
  anos: number[]
  orgaos: string[]
  concursos: string[]
  selectedMaterias: string[]
  selectedAssuntos: string[]
  selectedBancas: string[]
  selectedAnos: number[]
  selectedOrgaos: string[]
  selectedConcursos: string[]
  selectedCarreiras: string[]
  selectedEscolaridades: string[]
  selectedFormacoes: string[]
  selectedRegioes: string[]
  selectedFavoritas: string[]
  selectedEnunciados: string[]
  onToggleMateria: (v: string) => void
  onToggleAssunto: (v: string) => void
  onToggleBanca: (v: string) => void
  onToggleAno: (v: number) => void
  onToggleOrgao: (v: string) => void
  onToggleConcurso: (v: string) => void
  onToggleCarreira: (v: string) => void
  onToggleEscolaridade: (v: string) => void
  onToggleFormacao: (v: string) => void
  onToggleRegiao: (v: string) => void
  onToggleFavorita: (v: string) => void
  onToggleEnunciado: (v: string) => void
  onResetFilters: () => void
  totalFiltrosAtivos: number
  filteredCount: number
  expandedMateriaFolder: string | null
  setExpandedMateriaFolder: (v: string | null) => void
  carreiras: string[]
  escolaridades: string[]
  formacoes: string[]
  regioes: string[]
  favoritas: string[]
  enunciados: string[]
}

const CATEGORIES: { key: FilterTab; label: string; always: boolean }[] = [
  { key: 'materia', label: 'Matéria e assunto', always: true },
  { key: 'banca', label: 'Banca', always: true },
  { key: 'orgao', label: 'Órgão e cargo', always: false },
  { key: 'ano', label: 'Ano', always: true },
  { key: 'carreira', label: 'Área (Carreira)', always: true },
  { key: 'escolaridade', label: 'Escolaridade', always: true },
  { key: 'formacao', label: 'Formação', always: true },
  { key: 'regiao', label: 'Região', always: true },
  { key: 'favoritas', label: 'Favoritas', always: true },
  { key: 'enunciados', label: 'Enunciados', always: true },
  { key: 'opcoes', label: 'Opções', always: true },
]

export function QuestaoFilterPanel({
  isExpanded,
  onToggle,
  objetivo,
  setObjetivo,
  activeCategory,
  setActiveCategory,
  searchTerm,
  onSearchChange,
  questaoTecId,
  onQuestaoTecIdChange,
  materias,
  materiasComAssuntos,
  bancas,
  anos,
  orgaos,
  concursos,
  selectedMaterias,
  selectedAssuntos,
  selectedBancas,
  selectedAnos,
  selectedOrgaos,
  selectedConcursos,
  selectedCarreiras,
  selectedEscolaridades,
  selectedFormacoes,
  selectedRegioes,
  selectedFavoritas,
  selectedEnunciados,
  onToggleMateria,
  onToggleAssunto,
  onToggleBanca,
  onToggleAno,
  onToggleOrgao,
  onToggleConcurso,
  onToggleCarreira,
  onToggleEscolaridade,
  onToggleFormacao,
  onToggleRegiao,
  onToggleFavorita,
  onToggleEnunciado,
  onResetFilters,
  totalFiltrosAtivos,
  filteredCount,
  expandedMateriaFolder,
  setExpandedMateriaFolder,
  carreiras,
  escolaridades,
  formacoes,
  regioes,
  favoritas,
  enunciados,
}: QuestaoFilterPanelProps) {

  const filteredMaterias = searchTerm
    ? materias.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase()))
    : materias

  const filteredBancas = searchTerm
    ? bancas.filter(b => b.toLowerCase().includes(searchTerm.toLowerCase()))
    : bancas

  const filteredAnos = searchTerm
    ? anos.filter(a => String(a).includes(searchTerm))
    : anos

  const filteredOrgaos = searchTerm
    ? orgaos.filter(o => o.toLowerCase().includes(searchTerm.toLowerCase()))
    : orgaos

  const filteredConcursos = searchTerm
    ? concursos.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
    : concursos

  const searchPlaceholder: Record<string, string> = {
    materia: 'Buscar matéria...',
    banca: 'Buscar banca...',
    orgao: 'Buscar órgão...',
    ano: 'Buscar ano...',
    concurso: 'Buscar concurso...',
  }

  function activeFilterChips(): { label: string; onRemove?: () => void }[] {
    const chips: { label: string; onRemove?: () => void }[] = []
    selectedMaterias.forEach(m => chips.push({ label: m, onRemove: () => onToggleMateria(m) }))
    selectedAssuntos.forEach(a => chips.push({ label: a, onRemove: () => onToggleAssunto(a) }))
    selectedBancas.forEach(b => chips.push({ label: b, onRemove: () => onToggleBanca(b) }))
    selectedAnos.forEach(a => chips.push({ label: String(a), onRemove: () => onToggleAno(a) }))
    selectedOrgaos.forEach(o => chips.push({ label: o, onRemove: () => onToggleOrgao(o) }))
    selectedConcursos.forEach(c => chips.push({ label: c, onRemove: () => onToggleConcurso(c) }))
    selectedCarreiras.forEach(c => chips.push({ label: c, onRemove: () => onToggleCarreira(c) }))
    selectedEscolaridades.forEach(e => chips.push({ label: e, onRemove: () => onToggleEscolaridade(e) }))
    selectedFormacoes.forEach(f => chips.push({ label: f, onRemove: () => onToggleFormacao(f) }))
    selectedRegioes.forEach(r => chips.push({ label: r, onRemove: () => onToggleRegiao(r) }))
    selectedFavoritas.forEach(f => chips.push({ label: f, onRemove: () => onToggleFavorita(f) }))
    selectedEnunciados.forEach(e => chips.push({ label: e, onRemove: () => onToggleEnunciado(e) }))
    return chips
  }

  const categoryLabel = CATEGORIES.find(c => c.key === activeCategory)?.label ?? 'Matéria e assunto'

  function renderMateriaTree() {
    return (
      <div className="space-y-0.5">
        {filteredMaterias.map(materia => {
          const assuntos = Array.from(materiasComAssuntos[materia] || [])
          const isExpanded = expandedMateriaFolder === materia
          const isMateriaSelected = selectedMaterias.includes(materia)

          const filteredAssuntos = searchTerm
            ? assuntos.filter(a => a.toLowerCase().includes(searchTerm.toLowerCase()))
            : assuntos

          return (
            <div key={materia}>
              <button
                onClick={() => {
                  onToggleMateria(materia)
                  setExpandedMateriaFolder(isExpanded ? null : materia)
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                  isMateriaSelected
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {isExpanded
                  ? <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
                  : <Folder className="w-4 h-4 shrink-0 text-amber-600" />
                }
                <span className="truncate flex-1">{materia}</span>
                <span className="text-[10px] opacity-50">{assuntos.length}</span>
              </button>

              {isExpanded && (
                <div className="ml-5 border-l-2 border-muted pl-2 space-y-0.5 mt-0.5">
                  {filteredAssuntos.length > 0 && (
                    <button
                      onClick={() => {
                        // "Todo o conteúdo" toggle — select all assuntos
                        const allSelected = filteredAssuntos.every(a => selectedAssuntos.includes(a))
                        filteredAssuntos.forEach(a => {
                          if (allSelected && selectedAssuntos.includes(a)) onToggleAssunto(a)
                          else if (!allSelected && !selectedAssuntos.includes(a)) onToggleAssunto(a)
                        })
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer text-left"
                    >
                      <Circle className="w-2.5 h-2.5 shrink-0 text-blue-400 fill-blue-400" />
                      <span>Todo o conteúdo de "{materia}"</span>
                    </button>
                  )}
                  {filteredAssuntos.map(assunto => {
                    const isAssuntoSelected = selectedAssuntos.includes(assunto)
                    return (
                      <button
                        key={assunto}
                        onClick={() => onToggleAssunto(assunto)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer text-left ${
                          isAssuntoSelected
                            ? 'bg-primary/15 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                        }`}
                      >
                        <FileText className={`w-3 h-3 shrink-0 ${isAssuntoSelected ? 'text-primary' : 'text-muted-foreground/50'}`} />
                        <span className="truncate">{assunto}</span>
                      </button>
                    )
                  })}
                  {filteredAssuntos.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/50 px-2 py-1 italic">
                      Nenhum assunto encontrado.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filteredMaterias.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma matéria encontrada.</p>
        )}
      </div>
    )
  }

  function renderGenericList<T extends string | number>({
    items,
    selected,
    onToggle,
    emptyLabel,
  }: {
    items: T[]
    selected: T[]
    onToggle: (v: T) => void
    emptyLabel: string
  }) {
    return (
      <div className="flex flex-col gap-0.5">
        {items.map(item => {
          const isSelected = selected.includes(item)
          return (
            <button
              key={String(item)}
              onClick={() => onToggle(item)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-left ${
                isSelected
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-primary' : 'border border-muted-foreground/30'}`} />
              <span className="truncate">{String(item)}</span>
            </button>
          )
        })}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">{emptyLabel}</p>
        )}
      </div>
    )
  }

  function renderCategoryContent() {
    switch (activeCategory) {
      case 'materia':
        return renderMateriaTree()
      case 'banca':
        return renderGenericList({ items: filteredBancas, selected: selectedBancas, onToggle: onToggleBanca, emptyLabel: 'Nenhuma banca encontrada.' })
      case 'orgao':
        return renderGenericList({ items: filteredOrgaos, selected: selectedOrgaos, onToggle: onToggleOrgao, emptyLabel: 'Nenhum órgão encontrado.' })
      case 'ano':
        return renderGenericList({ items: filteredAnos, selected: selectedAnos, onToggle: onToggleAno as (v: number) => void, emptyLabel: 'Nenhum ano encontrado.' })
      case 'concurso':
        return renderGenericList({ items: filteredConcursos, selected: selectedConcursos, onToggle: onToggleConcurso, emptyLabel: 'Nenhum concurso encontrado.' })
      case 'carreira':
        return renderGenericList({ items: carreiras, selected: selectedCarreiras, onToggle: onToggleCarreira, emptyLabel: 'Nenhuma carreira.' })
      case 'escolaridade':
        return renderGenericList({ items: escolaridades, selected: selectedEscolaridades, onToggle: onToggleEscolaridade, emptyLabel: 'Nenhuma escolaridade.' })
      case 'formacao':
        return renderGenericList({ items: formacoes, selected: selectedFormacoes, onToggle: onToggleFormacao, emptyLabel: 'Nenhuma formação.' })
      case 'regiao':
        return renderGenericList({ items: regioes, selected: selectedRegioes, onToggle: onToggleRegiao, emptyLabel: 'Nenhuma região.' })
      case 'favoritas':
        return renderGenericList({ items: favoritas, selected: selectedFavoritas, onToggle: onToggleFavorita, emptyLabel: 'Nenhuma.' })
      case 'enunciados':
        return renderGenericList({ items: enunciados, selected: selectedEnunciados, onToggle: onToggleEnunciado, emptyLabel: 'Nenhum.' })
      case 'opcoes':
        return <p className="text-xs text-muted-foreground py-4 text-center italic">Opções disponíveis em breve.</p>
      default:
        return null
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span>Filtrar Questões</span>
          {totalFiltrosAtivos > 0 && (
            <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded-full">
              {totalFiltrosAtivos}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalFiltrosAtivos > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onResetFilters() }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              Limpar
            </button>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {/* Radio buttons — objetivo */}
          <div className="flex items-center gap-4 px-4 py-2 bg-muted/10 border-b border-border text-xs">
            <span className="font-bold text-foreground/60">Objetivas</span>
            {(['todos', 'ineditas', 'discursivas'] as const).map(opt => (
              <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="objetivo"
                  checked={objetivo === opt}
                  onChange={() => setObjetivo(opt)}
                  className="accent-primary"
                />
                <span className={`font-medium ${objetivo === opt ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {opt === 'todos' ? 'Todas' : opt === 'ineditas' ? 'Inéditas' : 'Discursivas'}
                </span>
              </label>
            ))}
          </div>

          {/* ID TEC quick search */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <span className="text-[11px] font-bold text-muted-foreground shrink-0">ID TEC:</span>
            <input
              type="text"
              placeholder="Ex: 2736907"
              value={questaoTecId}
              onChange={e => onQuestaoTecIdChange(e.target.value.replace(/\D/g, ''))}
              className="w-28 px-2 py-1 bg-muted/30 border border-border rounded text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors font-mono"
            />
            {questaoTecId && (
              <button
                onClick={() => onQuestaoTecIdChange('')}
                className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Responsive layout: mobile stacked, desktop 3-column */}
          <div className="lg:grid lg:grid-cols-[180px_1fr_220px] max-h-[75vh] overflow-y-auto flex flex-col">
            {/* Column 1: Category sidebar — horizontal pills on mobile, vertical on desktop */}
            <div className="lg:border-r border-border overflow-y-auto bg-muted/5 flex lg:flex-col gap-0.5 lg:p-0 p-1 overflow-x-auto scrollbar-none">
              {CATEGORIES.map(cat => {
                const isActive = activeCategory === cat.key
                return (
                  <button
                    key={cat.key}
                    onClick={() => { setActiveCategory(cat.key); onSearchChange('') }}
                    className={`shrink-0 flex items-center justify-between px-3 py-2 text-xs font-bold transition-all cursor-pointer text-left rounded-lg lg:rounded-none ${
                      isActive
                        ? 'bg-primary/10 text-primary lg:border-r-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span>{cat.label}</span>
                    {isActive && <span className="text-primary hidden lg:inline">◄</span>}
                  </button>
                )
              })}
            </div>

            {/* Column 2: Content panel */}
            <div className="flex flex-col overflow-hidden lg:border-r border-t lg:border-t-0 border-border">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/10 border-b border-border">
                <span className="text-xs font-bold">{categoryLabel}</span>
                {activeCategory !== 'carreira' && activeCategory !== 'escolaridade' && activeCategory !== 'formacao' && activeCategory !== 'regiao' && activeCategory !== 'favoritas' && activeCategory !== 'enunciados' && activeCategory !== 'opcoes' && (
                  <div className="relative w-36 lg:w-48">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={searchPlaceholder[activeCategory] ?? 'Buscar...'}
                      value={searchTerm}
                      onChange={e => onSearchChange(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 bg-muted/30 border border-border rounded text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 max-h-64 lg:max-h-none">
                {renderCategoryContent()}
              </div>
            </div>

            {/* Column 3: Summary panel */}
            <div className="flex flex-col overflow-hidden border-t lg:border-t-0 border-border">
              <div className="px-3 py-2 bg-muted/10 border-b border-border flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">
                  Filtros ativos: <span className="text-foreground">{totalFiltrosAtivos}</span>
                </span>
                <button
                  onClick={onResetFilters}
                  className="text-xs text-primary hover:text-primary/80 font-bold transition-colors cursor-pointer"
                >
                  Carregar
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-32 lg:max-h-none">
                {activeFilterChips().length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/50 text-center py-4 italic">Nenhum filtro ativo</p>
                ) : (
                  activeFilterChips().map((chip, i) => (
                    <div
                      key={`${chip.label}-${i}`}
                      className="flex items-center justify-between gap-1 px-2 py-1 bg-primary/5 border border-primary/10 rounded text-[11px] font-medium text-foreground"
                    >
                      <span className="truncate">{chip.label}</span>
                      <button
                        onClick={chip.onRemove}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border px-3 py-2 text-center">
                <p className="text-lg font-black text-foreground">{filteredCount.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">questões encontradas</p>
              </div>

              <div className="border-t border-border px-3 py-2 space-y-1">
                <button className="w-full text-xs py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded font-bold transition-colors cursor-pointer">
                  Editar quantidades
                </button>
                <button className="w-full text-xs py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded font-bold transition-colors cursor-pointer">
                  Calcular dificuldade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
