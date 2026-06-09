import { AlertTriangle } from 'lucide-react'

interface ImportPdfErrorStateProps {
  errorMsg: string | undefined
  onRetry: () => void
  onClose: () => void
}

export function ImportPdfErrorState({ errorMsg, onRetry, onClose }: ImportPdfErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <h3 className="text-sm font-black text-foreground">Falha na ingestão do PDF</h3>
      <p className="text-xs text-red-500 max-w-sm font-semibold leading-relaxed">
        {errorMsg || 'Erro desconhecido durante o processamento do documento.'}
      </p>
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onRetry}
          className="px-5 py-2.5 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-colors cursor-pointer"
        >
          Tentar Novamente
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer font-bold"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
