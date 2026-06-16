import { useState } from 'react'
import {
  Plus, Trash2, ChevronRight, ChevronDown, FileText, ClipboardList, Save,
  Pencil, X, Check, ListChecks, GraduationCap, BookOpen,
} from 'lucide-react'
import {
  listEditais, createEdital, updateEdital, deleteEdital,
  addCargo, updateCargo, deleteCargo,
  addMateria, updateMateria, deleteMateria, updateMateriaTopicos,
  reorderCargo, reorderMateria,
} from '../lib/editaisStorage'
import { useToast } from '../contexts/ToastContext'

export function EditaisManager() {
  const toast = useToast()

  const [editais, setEditais] = useState(() => listEditais())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = selectedId ? editais.find(e => e.id === selectedId) ?? null : null

  function refresh() {
    setEditais(listEditais())
  }

  // Edital
  function handleCreate() {
    const e = createEdital('Novo Órgão', 'SIGLA', 'Banca', new Date().getFullYear())
    refresh()
    setSelectedId(e.id)
    toast.success('Edital criado', 'Use os campos abaixo para editar os dados.')
  }

  function handleDeleteEdital(id: string) {
    deleteEdital(id)
    refresh()
    if (selectedId === id) setSelectedId(null)
    toast.success('Edital excluído', '')
  }

  // Cargo
  function handleAddCargo() {
    if (!selectedId) return
    addCargo(selectedId, 'Novo Cargo', 'Médio')
    refresh()
  }

  function handleDeleteCargo(cargoId: string) {
    if (!selectedId) return
    deleteCargo(selectedId, cargoId)
    refresh()
  }

  // Matéria
  function handleAddMateria(cargoId: string) {
    if (!selectedId) return
    addMateria(selectedId, cargoId, 'Nova Matéria')
    refresh()
  }

  function handleDeleteMateria(cargoId: string, materiaId: string) {
    if (!selectedId) return
    deleteMateria(selectedId, cargoId, materiaId)
    refresh()
  }

  function handleSaveTopicos(cargoId: string, materiaId: string, topicos: string[]) {
    if (!selectedId) return
    updateMateriaTopicos(selectedId, cargoId, materiaId, topicos.filter(t => t.trim()))
    refresh()
    toast.success('Tópicos salvos', '')
  }

  // UI state: inline edit
  const [editingField, setEditingField] = useState<{ type: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedCargo, setExpandedCargo] = useState<string | null>(null)
  const [topicosEdit, setTopicosEdit] = useState<string | null>(null)
  const [topicosText, setTopicosText] = useState('')

  // Drag-and-drop state
  const [dragType, setDragType] = useState<'cargo' | 'materia' | null>(null)
  const [dragFromIndex, setDragFromIndex] = useState<number>(-1)
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1)
  const [dragCargoId, setDragCargoId] = useState<string | null>(null)

  function handleDragStart(type: 'cargo' | 'materia', fromIndex: number, cargoId?: string) {
    setDragType(type)
    setDragFromIndex(fromIndex)
    setDragOverIndex(-1)
    setDragCargoId(cargoId ?? null)
  }

  function handleDragOver(e: React.DragEvent, overIndex: number) {
    e.preventDefault()
    if (overIndex !== dragFromIndex || dragType === null) {
      setDragOverIndex(overIndex)
    }
  }

  function handleDrop(dropIndex: number) {
    if (dragType === 'cargo' && selectedId && dragFromIndex >= 0 && dragFromIndex !== dropIndex) {
      reorderCargo(selectedId, dragFromIndex, dropIndex)
      refresh()
    } else if (dragType === 'materia' && selectedId && dragCargoId && dragFromIndex >= 0 && dragFromIndex !== dropIndex) {
      reorderMateria(selectedId, dragCargoId, dragFromIndex, dropIndex)
      refresh()
    }
    setDragType(null)
    setDragFromIndex(-1)
    setDragOverIndex(-1)
    setDragCargoId(null)
  }

  function handleDragEnd() {
    setDragType(null)
    setDragFromIndex(-1)
    setDragOverIndex(-1)
    setDragCargoId(null)
  }

  function renderInlineEdit(
    value: string,
    fieldKey: string,
    onSave: (newValue: string) => void,
    className = 'text-xs font-bold text-foreground',
  ) {
    const isEditing = editingField?.type === fieldKey
    if (isEditing) {
      return (
        <span className="inline-flex items-center gap-1">
          <input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onSave(editValue); setEditingField(null) }
              if (e.key === 'Escape') setEditingField(null)
            }}
            className="w-full px-2 py-1 border border-border rounded text-xs font-bold bg-card outline-none"
            autoFocus
          />
          <button onClick={() => { onSave(editValue); setEditingField(null) }} className="p-1 text-emerald-500 hover:bg-muted rounded cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditingField(null)} className="p-1 text-muted-foreground hover:bg-muted rounded cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 group/edit">
        <span className={className}>{value}</span>
        <button
          onClick={() => { setEditValue(value); setEditingField({ type: fieldKey }) }}
          className="p-0.5 text-muted-foreground/40 hover:text-primary opacity-0 group-hover/edit:opacity-100 transition-opacity cursor-pointer"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </span>
    )
  }

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 md:px-6 flex items-center justify-between shadow-xxs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-black text-foreground uppercase tracking-wide">Gerenciar Editais</h2>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary hover:bg-[#1565c0] text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Edital</span>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: lista de editais */}
        <div className="w-full md:w-72 border-r border-border bg-card flex flex-col h-full shrink-0">
          <div className="p-3 border-b border-border">
            <input
              type="text"
              placeholder="Filtrar editais..."
              className="w-full px-3 py-1.5 border border-border rounded-lg bg-card text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {editais.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs font-semibold italic">
                Nenhum edital cadastrado.
              </div>
            )}
            {editais.map(ed => (
              <div
                key={ed.id}
                className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedId === ed.id
                    ? 'border-primary/20 bg-primary/5 text-primary'
                    : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setSelectedId(ed.id)}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold truncate">{ed.sigla} {ed.ano}</div>
                  <div className="text-[10px] text-muted-foreground font-semibold mt-0.5 truncate">{ed.orgao}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteEdital(ed.id) }}
                  className="p-1.5 text-muted-foreground/40 hover:text-red-500 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Excluir edital"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main: editor do edital */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <ClipboardList className="w-12 h-12 text-muted-foreground/35" />
              <h3 className="text-xs font-bold text-foreground">Nenhum edital selecionado</h3>
              <p className="text-xxs text-muted-foreground max-w-sm text-center">
                Selecione um edital na lista ao lado ou crie um novo.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Dados do Edital */}
              <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Dados do Edital
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Órgão</label>
                    <div className="mt-1">{renderInlineEdit(selected.orgao, `edital-nome-${selected.id}`, v => updateEdital(selected.id, { orgao: v }))}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Sigla</label>
                    <div className="mt-1">{renderInlineEdit(selected.sigla, `edital-sigla-${selected.id}`, v => updateEdital(selected.id, { sigla: v }))}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Banca</label>
                    <div className="mt-1">{renderInlineEdit(selected.banca, `edital-banca-${selected.id}`, v => updateEdital(selected.id, { banca: v }))}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wide">Ano</label>
                    <div className="mt-1">{renderInlineEdit(String(selected.ano), `edital-ano-${selected.id}`, v => updateEdital(selected.id, { ano: Number(v) }))}</div>
                  </div>
                </div>
              </section>

              {/* Cargos */}
              <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Cargos
                  </h3>
                  <button
                    onClick={handleAddCargo}
                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Cargo</span>
                  </button>
                </div>

                {selected.cargos.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs font-semibold italic border border-dashed border-border rounded-xl">
                    Nenhum cargo cadastrado.
                  </div>
                )}

                {selected.cargos.map((cargo, cargoIdx) => (
                  <div key={cargo.id} className={`border rounded-xl overflow-hidden transition-all ${dragType === 'cargo' && dragOverIndex === cargoIdx ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border/80'}`}>
                    {/* Cargo Header */}
                    <div
                      draggable
                      onDragStart={() => handleDragStart('cargo', cargoIdx)}
                      onDragOver={e => handleDragOver(e, cargoIdx)}
                      onDrop={() => handleDrop(cargoIdx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${dragType === 'cargo' && dragFromIndex === cargoIdx ? 'opacity-50' : ''} ${dragType !== 'cargo' ? 'bg-muted/20 hover:bg-muted/40' : dragOverIndex === cargoIdx ? 'bg-muted/20' : 'bg-muted/20'}`}
                      onClick={() => setExpandedCargo(expandedCargo === cargo.id ? null : cargo.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="text-[10px] text-muted-foreground/40 font-mono cursor-grab active:cursor-grabbing">⠿</span>
                        {expandedCargo === cargo.id ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <div className="min-w-0">
                          {renderInlineEdit(cargo.nome, `cargo-${cargo.id}`, v => updateCargo(selected.id, cargo.id, { nome: v }))}
                          <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            {cargo.nivel} • {cargo.materias.length} {cargo.materias.length === 1 ? 'matéria' : 'matérias'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteCargo(cargo.id) }}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted rounded cursor-pointer transition-all"
                        title="Excluir cargo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Matérias (collapsible) */}
                    {expandedCargo === cargo.id && (
                      <div className="border-t border-border/60 p-3 space-y-2">
                        <button
                          onClick={() => handleAddMateria(cargo.id)}
                          className="w-full py-2 border border-dashed border-border/60 rounded-lg text-[10px] font-black text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar Matéria
                        </button>

                        {cargo.materias.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-[10px] font-semibold italic">
                            Nenhuma matéria cadastrada.
                          </div>
                        )}

                        {cargo.materias.map((materia, matIdx) => (
                          <div
                            key={materia.id}
                            draggable
                            onDragStart={() => handleDragStart('materia', matIdx, cargo.id)}
                            onDragOver={e => handleDragOver(e, matIdx)}
                            onDrop={() => handleDrop(matIdx)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-start gap-2 p-2.5 rounded-lg border transition-all group/mat ${dragType === 'materia' && dragFromIndex === matIdx && dragCargoId === cargo.id ? 'opacity-40' : ''} ${dragType === 'materia' && dragOverIndex === matIdx && dragCargoId === cargo.id ? 'border-primary/40 bg-primary/[0.02] ring-1 ring-primary/20' : 'border-border/40 bg-card'}`}
                          >
                            <span className="text-[10px] text-muted-foreground/30 mt-1 font-mono cursor-grab active:cursor-grabbing shrink-0">⠿</span>
                            <div className="flex-1 min-w-0">
                              {renderInlineEdit(materia.nome, `materia-${materia.id}`, v => updateMateria(selected.id, cargo.id, materia.id, v))}
                              <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                                {materia.topicos.length} {materia.topicos.length === 1 ? 'tópico' : 'tópicos'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setTopicosEdit(materia.id)
                                  setTopicosText(materia.topicos.join('\n'))
                                }}
                                className="p-1.5 text-muted-foreground hover:text-teal-500 hover:bg-muted rounded cursor-pointer transition-all opacity-0 group-hover/mat:opacity-100"
                                title="Editar tópicos"
                              >
                                <ListChecks className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMateria(cargo.id, materia.id)}
                                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted rounded cursor-pointer transition-all opacity-0 group-hover/mat:opacity-100"
                                title="Excluir matéria"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edição de tópicos */}
      {topicosEdit && selected && (() => {
        for (const c of selected.cargos) {
          for (const mat of c.materias) {
            if (mat.id === topicosEdit) {
              return (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setTopicosEdit(null)}>
                  <div className="bg-card border border-border rounded-2xl shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                      <h3 className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-primary" />
                        Tópicos — {mat.nome}
                      </h3>
                      <button onClick={() => setTopicosEdit(null)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold mb-2">Tópicos (um por linha):</p>
                        <textarea
                          value={topicosText}
                          onChange={e => setTopicosText(e.target.value)}
                          className="w-full h-[250px] px-3 py-2 border border-border rounded-lg bg-card text-xs font-semibold text-foreground outline-none resize-none focus:ring-1 focus:ring-primary focus:border-primary"
                          placeholder="Digite um tópico por linha..."
                        />
                      </div>

                      <details className="group">
                        <summary className="text-[10px] font-black text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none">
                          Colar conteúdo bruto
                        </summary>
                        <div className="mt-2 space-y-2">
                          <textarea
                            id="raw-paste-area"
                            className="w-full h-[150px] px-3 py-2 border border-border rounded-lg bg-card text-xs font-semibold text-foreground outline-none resize-none focus:ring-1 focus:ring-primary focus:border-primary"
                            placeholder="Cole o texto do edital aqui..."
                          />
                          <button
                            onClick={() => {
                              const raw = (document.getElementById('raw-paste-area') as HTMLTextAreaElement)?.value ?? ''
                              // Normaliza: junta linhas quebradas e remove espaços extras
                              const text = raw.replace(/\s+/g, ' ').trim()
                              if (!text) return

                              let lines: string[]

                              // 1. Tenta quebrar por numeração (1., 2., etc)
                              const numbered = text.match(/\d+[.)]\s*/g)
                              if (numbered && numbered.length > 1) {
                                lines = text.split(/\d+[.)]\s*/).slice(1)
                              } else {
                                // 2. Quebra por ". " seguido de letra maiúscula
                                const parts = text.split(/\.\s+(?=[A-ZÀ-Ú])/).map(l => l.trim()).filter(l => l.length > 0)
                                if (parts.length > 1) {
                                  lines = parts.map((p, i) => i < parts.length - 1 ? p + '.' : p)
                                } else {
                                  lines = [text]
                                }
                              }

                              lines = lines.map(l => l.replace(/^[•\-*]\s*/, '').trim()).filter(l => l.length > 0)
                              if (lines.length > 0) {
                                setTopicosText(lines.join('\n'))
                              }
                            }}
                            className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border text-xs font-black rounded-lg cursor-pointer transition-all"
                          >
                            Processar
                          </button>
                        </div>
                      </details>
                    </div>
                    <div className="p-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
                      <button
                        onClick={() => setTopicosEdit(null)}
                        className="px-4 py-2 border border-border hover:bg-muted text-xs font-black rounded-lg cursor-pointer transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          handleSaveTopicos(c.id, mat.id, topicosText.split('\n'))
                          setTopicosEdit(null)
                        }}
                        className="px-4 py-2 bg-primary hover:bg-[#1565c0] text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Salvar Tópicos
                      </button>
                    </div>
                  </div>
                </div>
              )
            }
          }
        }
        return null
      })()}
    </div>
  )
}
