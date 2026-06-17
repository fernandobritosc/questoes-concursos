import { Book, Pencil, Check, Loader2 } from 'lucide-react'
import { MarkdownAI } from './ui/MarkdownAI'
import { MarkdownEditor } from './ui/MarkdownEditor'

interface QuestaoResolucaoProfessorProps {
  expanded: boolean
  onToggle: () => void
  editing: boolean
  text: string
  onTextChange: (text: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  saving: boolean
}

export function QuestaoResolucaoProfessor({
  expanded, onToggle,
  editing, text, onTextChange,
  onStartEdit, onCancelEdit, onSave,
  saving,
}: QuestaoResolucaoProfessorProps) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div 
        onClick={onToggle}
        className="px-6 py-4 bg-muted border-b border-border flex items-center justify-between cursor-pointer select-none hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
          <Book className="w-5 h-5 text-amber-500 fill-amber-100" />
          <span>Resolução do Professor</span>
        </div>
        <div className="flex items-center gap-3">
          {expanded && !editing && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStartEdit()
              }}
              className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-muted/60 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
              title="Editar Resolução"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>
          )}
          <span className="text-muted-foreground text-xs font-bold">
            {expanded ? 'Ocultar ▲' : 'Mostrar ▼'}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="p-6 space-y-4">
          {editing ? (
            <div className="space-y-3">
              <MarkdownEditor
                value={text}
                onChange={onTextChange}
                placeholder="Digite a resolução detalhada do professor para esta questão..."
                minHeight="180"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xxs font-black uppercase tracking-wider transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-foreground leading-relaxed text-xs font-semibold">
              {text ? (
                <MarkdownAI text={text} />
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2 border border-dashed border-border rounded-lg bg-muted/30">
                  <Book className="w-8 h-8 text-muted-foreground" />
                  <span className="text-[11px] font-bold">Nenhuma resolução cadastrada para esta questão.</span>
                  <button
                    onClick={onStartEdit}
                    className="mt-1 flex items-center gap-1 px-3 py-1.5 bg-primary/20 hover:bg-primary/20 border border-[#1976d2]/20 text-primary rounded-lg text-xxs font-extrabold transition-all"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Adicionar Resolução</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
