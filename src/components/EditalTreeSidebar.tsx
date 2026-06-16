import { ChevronRight, GraduationCap, Search } from 'lucide-react'
import { useState } from 'react'
import type { Edital, ResolucaoView } from '../types/database'

interface EditalTreeSidebarProps {
  edital: Edital
  selectedCargoId: string | null
  onSelectCargo: (cargoId: string) => void
  selectedMateriaId: string | null
  onSelectMateria: (materiaId: string) => void
  resolucoes: ResolucaoView[]
}

export function EditalTreeSidebar({
  edital,
  selectedCargoId,
  onSelectCargo,
  selectedMateriaId,
  onSelectMateria,
  resolucoes,
}: EditalTreeSidebarProps) {
  const [search, setSearch] = useState('')

  const currentCargoId = selectedCargoId ?? edital.cargos[0]?.id ?? null
  const currentCargo = edital.cargos.find(c => c.id === currentCargoId) ?? null

  const getQuestaoCount = (materiaNome: string) =>
    resolucoes.filter(r => r.materia === materiaNome).length

  const filteredMaterias = currentCargo
    ? currentCargo.materias.filter(m =>
        m.nome.toLowerCase().includes(search.toLowerCase())
      )
    : []

  return (
    <div className="w-full md:w-80 border-r border-border bg-card flex flex-col h-full shrink-0">
      {/* Cargo Selector */}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <span className="text-xs font-black text-foreground uppercase tracking-wide">{edital.sigla} {edital.ano}</span>
          <span className="text-[9px] text-muted-foreground font-semibold ml-auto">{edital.banca}</span>
        </div>

        <select
          value={currentCargoId ?? ''}
          onChange={(e) => {
            onSelectCargo(e.target.value)
          }}
          className="w-full px-3 py-2 border border-border rounded-lg bg-card text-xs font-bold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer"
        >
          <option value="" disabled>Selecione o cargo</option>
          {edital.cargos.map(cargo => (
            <option key={cargo.id} value={cargo.id}>
              {cargo.nome} ({cargo.nivel})
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar matéria..."
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-card text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          />
        </div>
      </div>

      {/* Materias List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!currentCargo ? (
          <div className="text-center py-8 text-muted-foreground text-xs font-semibold italic">
            Selecione um cargo para ver as matérias do edital.
          </div>
        ) : filteredMaterias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs font-semibold italic">
            Nenhuma matéria encontrada.
          </div>
        ) : (
          filteredMaterias.map(materia => {
            const isActive = selectedMateriaId === materia.id
            const qCount = getQuestaoCount(materia.nome)
            return (
              <button
                key={materia.id}
                onClick={() => onSelectMateria(materia.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-bold transition-all group cursor-pointer ${
                  isActive
                    ? 'border-primary/20 bg-primary/5 text-primary'
                    : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="truncate block">{materia.nome}</span>
                  {qCount > 0 ? (
                    <div className="text-[10px] opacity-60 font-semibold mt-0.5">
                      {qCount} {qCount === 1 ? 'questão' : 'questões'}
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-500/60 font-semibold mt-0.5">
                      Sem questões
                    </div>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? 'translate-x-1 text-primary' : 'text-muted-foreground/45 group-hover:text-foreground'
                }`} />
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
