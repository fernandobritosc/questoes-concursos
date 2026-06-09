import { Check } from 'lucide-react'

interface ImportPdfSuccessStateProps {
  total: number
  importedCount: number | undefined
  onClose: () => void
}

export function ImportPdfSuccessState({ total, importedCount, onClose }: ImportPdfSuccessStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full animate-bounce">
        <Check className="w-10 h-10" />
      </div>
      <h3 className="text-sm font-black text-foreground">Importação concluída com sucesso!</h3>
      <p className="text-xs text-muted-foreground max-w-sm font-semibold">
        Foram processadas com sucesso {total} questões.{' '}
        Dessas, **{importedCount} novas questões exclusivas** foram gravadas no banco e as duplicadas existentes foram filtradas.
      </p>
      <button
        onClick={onClose}
        className="px-6 py-2.5 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
      >
        Concluir e Fechar
      </button>
    </div>
  )
}
