import { Check, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, Trash2, HelpCircle } from 'lucide-react'

interface EditalAssuntoItemProps {
  assunto: string
  index: number
  total: number
  isStudied: boolean
  onToggleStudied: () => void
  questaoCount: number
  taxaAcerto: number
  onMove: (direction: 'up' | 'down' | 'top' | 'bottom') => void
  onRemove: (e: React.MouseEvent) => void
  canRemove: boolean
}

export function EditalAssuntoItem({
  assunto,
  index,
  total,
  isStudied,
  onToggleStudied,
  questaoCount,
  taxaAcerto,
  onMove,
  onRemove,
  canRemove,
}: EditalAssuntoItemProps) {
  let borderLeftStyle = 'border-l-border'
  if (isStudied) {
    borderLeftStyle = 'border-l-[3px] border-l-[#1a7a52]'
  } else if (questaoCount > 0) {
    if (taxaAcerto < 60) {
      borderLeftStyle = 'border-l-[3px] border-l-[#b33030]'
    } else {
      borderLeftStyle = 'border-l-[3px] border-l-[#9c5f00]'
    }
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border ${borderLeftStyle} rounded-2xl shadow-xxs transition-all gap-4 group ${
        isStudied
          ? 'border-emerald-500/20 bg-emerald-50/[0.02]'
          : 'hover:border-primary/20'
      }`}
    >
      {/* Detalhes do Assunto */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">

        {/* Botão Checkbox de Edital */}
        <button
          onClick={onToggleStudied}
          className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
            isStudied
              ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm shadow-emerald-500/20'
              : 'border-border text-transparent hover:border-emerald-500/50 hover:bg-emerald-50/10'
          }`}
          title={isStudied ? 'Marcar como não estudado' : 'Marcar como concluído'}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </button>

        <div className="min-w-0 pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-shrink-0 text-xxs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
              {index + 1}º
            </span>
            <h4 className={`text-xs font-bold truncate max-w-[180px] sm:max-w-[300px] ${isStudied ? 'text-foreground line-through opacity-65' : 'text-foreground'}`}>
              {assunto}
            </h4>
            {questaoCount > 0 && (
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                taxaAcerto >= 60
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
              }`}>
                {taxaAcerto}% acerto
              </span>
            )}
          </div>

          {/* Detalhes rápidos de questões deste assunto */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold mt-1">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 opacity-60" />
              {questaoCount} {questaoCount === 1 ? 'questão real' : 'questões reais'}
            </span>
            {questaoCount > 0 && (
              <>
                <span>•</span>
                <span className={taxaAcerto >= 70 ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                  Taxa: {taxaAcerto}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controles de Reordenação e Ações */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0">

        {/* Ações de Reordenação */}
        <div className="flex items-center gap-1">
          <button
            disabled={index === 0}
            onClick={() => onMove('top')}
            className="p-1.5 hover:text-primary hover:bg-muted border border-transparent hover:border-border rounded text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Mover para o Topo"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={index === 0}
            onClick={() => onMove('up')}
            className="p-1.5 hover:text-primary hover:bg-muted border border-transparent hover:border-border rounded text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Mover para Cima"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove('down')}
            className="p-1.5 hover:text-primary hover:bg-muted border border-transparent hover:border-border rounded text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Mover para Baixo"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove('bottom')}
            className="p-1.5 hover:text-primary hover:bg-muted border border-transparent hover:border-border rounded text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Mover para o Fim"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-border/80 hidden sm:block" />

        {/* Excluir Assunto (apenas se for assunto customizado sem questões reais) */}
        <button
          onClick={onRemove}
          className="p-1.5 hover:text-red-500 hover:bg-red-50 rounded text-muted-foreground disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
          disabled={!canRemove}
          title="Remover assunto do edital"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
