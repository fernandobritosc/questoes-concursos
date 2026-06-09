import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

interface ImportPdfReviewFooterProps {
  selectedIndex: number
  totalQuestions: number
  hasValidationErrors: boolean
  hasLocalDuplicates: boolean
  onPrevious: () => void
  onNext: () => void
  onDiscard: () => void
  onSave: () => void
}

export function ImportPdfReviewFooter({
  selectedIndex,
  totalQuestions,
  hasValidationErrors,
  hasLocalDuplicates,
  onPrevious,
  onNext,
  onDiscard,
  onSave,
}: ImportPdfReviewFooterProps) {
  const canSave = totalQuestions > 0 && !hasValidationErrors && !hasLocalDuplicates

  return (
    <div className="px-6 py-4 bg-muted border-t border-border flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <button
          disabled={selectedIndex === 0}
          onClick={onPrevious}
          className="flex items-center gap-1 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xxs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-card"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>
        <button
          disabled={selectedIndex === totalQuestions - 1}
          onClick={onNext}
          className="flex items-center gap-1 px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xxs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-card"
        >
          <span>Próxima</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onDiscard}
          className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-colors cursor-pointer"
        >
          Descartar Lote
        </button>
        <button
          onClick={onSave}
          disabled={!canSave}
          className={`px-5 py-2.5 rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 ${
            canSave
              ? 'bg-primary hover:bg-[#1565c0] text-white cursor-pointer active:scale-98'
              : 'bg-muted text-muted-foreground border border-border cursor-not-allowed'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          <span>Confirmar e Gravar ({totalQuestions} questões)</span>
        </button>
      </div>
    </div>
  )
}
