import { useState } from 'react'
import { Target, Pencil, Check, X } from 'lucide-react'

interface DashboardMetasSemanaisProps {
  metaQuestoes: number
  onSetMeta: (value: number) => void
  progresso: number
  progressoPercentual: number
}

export function DashboardMetasSemanais({
  metaQuestoes,
  onSetMeta,
  progresso,
  progressoPercentual,
}: DashboardMetasSemanaisProps) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(String(metaQuestoes || ''))

  const handleSave = () => {
    const val = parseInt(inputValue, 10)
    if (!isNaN(val) && val > 0) {
      onSetMeta(val)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setInputValue(String(metaQuestoes || ''))
    setEditing(false)
  }

  const hasMeta = metaQuestoes > 0

  return (
    <div className="glass-card p-5 animate-fade-in-up">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-foreground">Meta Semanal</h3>
        </div>
        {!editing && (
          <button
            onClick={() => { setInputValue(String(metaQuestoes || '')); setEditing(true) }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all cursor-pointer"
            title="Editar meta"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="500"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            className="w-24 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-foreground font-bold focus:outline-none focus:border-violet-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="Meta"
            autoFocus
          />
          <span className="text-xs text-muted-foreground">questões/semana</span>
          <button onClick={handleSave} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCancel} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : hasMeta ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-semibold">
              {progresso} de {metaQuestoes} questões
            </span>
            <span className="font-bold text-foreground">{progressoPercentual}%</span>
          </div>
          <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden border border-border/30 dark:bg-white/[0.04] dark:border-white/[0.02]">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-rose-500 to-violet-600"
              style={{ width: `${progressoPercentual}%` }}
            />
          </div>
          {progressoPercentual >= 100 && (
            <p className="text-[10px] text-emerald-400 font-bold mt-1 animate-fade-in">
              Meta concluída! 🎯
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          Defina uma meta semanal de questões para acompanhar seu progresso.
        </p>
      )}
    </div>
  )
}
