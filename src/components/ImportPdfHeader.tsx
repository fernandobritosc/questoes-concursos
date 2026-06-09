import { X, Upload } from 'lucide-react'

interface ImportPdfHeaderProps {
  step: string
  tempQuestionsLength: number
  onClose: () => void
  disabled: boolean
}

export function ImportPdfHeader({ step, tempQuestionsLength, onClose, disabled }: ImportPdfHeaderProps) {
  return (
    <div className="px-6 py-4 bg-muted border-b border-border flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-primary/20 rounded-lg text-primary">
          <Upload className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-foreground">
            {step === 'review' ? 'Revisão Interativa do Caderno' : 'Importar PDF do TEC Concursos'}
          </h3>
          <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
            {step === 'review'
              ? `Revise e edite as ${tempQuestionsLength} questões detectadas`
              : 'Ingestão client-side ultra-rápida'}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        disabled={disabled}
        className="text-muted-foreground hover:text-muted-foreground p-1.5 hover:bg-muted rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
