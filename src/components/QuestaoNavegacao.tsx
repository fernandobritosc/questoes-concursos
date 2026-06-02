import { ChevronLeft, ChevronRight, Shuffle, RotateCcw } from 'lucide-react'

interface QuestaoNavegacaoProps {
  onAnterior: () => void
  onProxima: () => void
  onAleatorio: () => void
  onLimpar: () => void
  podeAnterior: boolean
  podeProxima: boolean
}

export function QuestaoNavegacao({
  onAnterior, onProxima, onAleatorio, onLimpar,
  podeAnterior, podeProxima,
}: QuestaoNavegacaoProps) {
  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      <div className="flex items-center gap-2">
        <button
          disabled={!podeAnterior}
          onClick={onAnterior}
          className="px-4 py-2 bg-card border border-border text-foreground hover:bg-muted text-xxs font-black transition-colors rounded-lg shadow-xxs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 uppercase tracking-wider"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Anterior
        </button>
        
        <button
          disabled={!podeProxima}
          onClick={onProxima}
          title="Atalho: Enter ou Espaço"
          className="px-4 py-2 bg-card border border-border text-foreground hover:bg-muted text-xxs font-black transition-colors rounded-lg shadow-xxs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 uppercase tracking-wider"
        >
          Próxima
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onAleatorio}
          className="p-2 bg-card border border-border hover:bg-muted text-muted-foreground rounded-lg shadow-xxs flex items-center gap-1 text-xxs font-black uppercase tracking-wide"
          title="Ir para uma questão aleatória do caderno"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Aleatório</span>
        </button>
        
        <button 
          onClick={onLimpar}
          className="p-2 bg-card border border-border hover:bg-red-50 text-muted-foreground hover:text-red-600 rounded-lg shadow-xxs flex items-center gap-1 text-xxs font-black uppercase tracking-wide"
          title="Limpar resolução atual"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpar</span>
        </button>
      </div>
    </div>
  )
}
