import { Loader2 } from 'lucide-react'

type LoadingStep = 'loading_engine' | 'reading_pages' | 'parsing' | 'checking_existing' | 'saving'

interface ImportPdfLoadingStepProps {
  step: LoadingStep
  progress: number
  total: number
}

const stepMessages: Record<LoadingStep, string> = {
  loading_engine: 'Inicializando motor de inteligência do PDF...',
  reading_pages: 'Extraindo textos e analisando páginas...',
  parsing: 'Mapeando gabarito e estruturando as questões...',
  checking_existing: 'Evitando duplicidade: verificando registros existentes no Supabase...',
  saving: 'Gravando novas questões exclusivas no seu Banco de Dados...',
}

export function ImportPdfLoadingStep({ step, progress, total }: ImportPdfLoadingStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <h4 className="text-xs font-black text-foreground">
        {stepMessages[step]}
      </h4>
      {step === 'reading_pages' && (
        <div className="w-full max-w-xs bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-200"
            style={{ width: `${(progress / (total || 1)) * 100}%` }}
          />
        </div>
      )}
      <p className="text-[10px] text-muted-foreground font-bold">
        {step === 'reading_pages' && `Lendo página ${progress} de ${total}...`}
        {step === 'saving' && `Gravando item ${progress} de ${total}...`}
      </p>
    </div>
  )
}
