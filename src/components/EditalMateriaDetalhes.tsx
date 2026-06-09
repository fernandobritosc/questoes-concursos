import { ChevronLeft, Award, Search, Plus, ClipboardList } from 'lucide-react'
import type { ReactNode } from 'react'

interface EditalMateriaDetalhesProps {
  selectedMateria: string | null
  onVoltar: () => void
  assuntosCount: number
  totalQuestoes: number
  taxaAcerto: number
  resolvidosCount: number
  assuntoSearch: string
  onAssuntoSearchChange: (value: string) => void
  newAssuntoName: string
  onNewAssuntoNameChange: (value: string) => void
  onAddAssunto: () => void
  statusFiltro: 'todos' | 'criticos' | 'nao_iniciados'
  onStatusFiltroChange: (filtro: 'todos' | 'criticos' | 'nao_iniciados') => void
  children: ReactNode
}

export function EditalMateriaDetalhes({
  selectedMateria,
  onVoltar,
  assuntosCount,
  totalQuestoes,
  taxaAcerto,
  resolvidosCount,
  assuntoSearch,
  onAssuntoSearchChange,
  newAssuntoName,
  onNewAssuntoNameChange,
  onAddAssunto,
  statusFiltro,
  onStatusFiltroChange,
  children,
}: EditalMateriaDetalhesProps) {
  return (
    <div className={`flex-1 bg-muted/10 flex flex-col h-full overflow-hidden ${!selectedMateria ? 'hidden md:flex' : 'flex'}`}>
      {selectedMateria ? (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header de Detalhes da Matéria */}
          <div className="p-5 bg-card border-b border-border shrink-0 flex flex-col items-start justify-between gap-4">
            {/* Botão de Voltar para Mobile */}
            <button
              onClick={onVoltar}
              className="md:hidden flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-400 hover:text-violet-300 border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 rounded-xl cursor-pointer transition-all mb-2"
            >
              <ChevronLeft className="w-4 h-4 animate-pulse" />
              <span>Voltar para Matérias</span>
            </button>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wide">{selectedMateria}</h3>
              <p className="text-[10px] text-muted-foreground font-semibold">
                {assuntosCount} {assuntosCount === 1 ? 'assunto catalogado' : 'assuntos catalogados'} • {totalQuestoes} {totalQuestoes === 1 ? 'questão real' : 'questões reais'}
              </p>
            </div>

            {/* Métricas de Desempenho */}
            <div className="flex items-center gap-3.5 flex-wrap">
              <div className="px-3.5 py-2 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  {/* Pequeno Círculo SVG de progresso */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="16" cy="16" r="12" className="text-border" strokeWidth="3" fill="transparent" stroke="currentColor" />
                    <circle
                      cx="16" cy="16" r="12"
                      className="text-emerald-500"
                      strokeWidth="3"
                      strokeDasharray={2 * Math.PI * 12}
                      strokeDashoffset={2 * Math.PI * 12 - (assuntosCount > 0 ? (resolvidosCount / assuntosCount) : 0) * (2 * Math.PI * 12)}
                      fill="transparent" stroke="currentColor" strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[8px] font-black text-foreground">
                    {assuntosCount > 0 ? Math.round((resolvidosCount / assuntosCount) * 100) : 0}%
                  </span>
                </div>
                <div className="text-xxs">
                  <div className="font-extrabold text-foreground">Syllabus Concluído</div>
                  <div className="text-muted-foreground font-semibold mt-0.5">{resolvidosCount} de {assuntosCount} tópicos</div>
                </div>
              </div>

              <div className="px-3.5 py-2 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
                <Award className="w-5 h-5 text-amber-500" />
                <div className="text-xxs">
                  <div className="font-extrabold text-foreground">Taxa de Acerto</div>
                  <div className={`font-black mt-0.5 ${taxaAcerto >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {taxaAcerto}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar e Entrada de Assuntos */}
          <div className="p-4 bg-card border-b border-border flex flex-col md:flex-row items-center gap-3 shrink-0">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={assuntoSearch}
                onChange={(e) => onAssuntoSearchChange(e.target.value)}
                placeholder="Filtrar assuntos..."
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-muted/10 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                value={newAssuntoName}
                onChange={(e) => onNewAssuntoNameChange(e.target.value)}
                placeholder="Novo assunto..."
                className="flex-1 md:w-72 px-3 py-2 border border-border rounded-lg bg-card text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
              <button
                onClick={onAddAssunto}
                className="px-4 py-2.5 bg-primary hover:bg-[#1565c0] text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* Filtros Rápidos de Status */}
          <div className="px-5 py-2.5 bg-muted/30 border-b border-border flex flex-wrap items-center gap-2 shrink-0 animate-fade-in">
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mr-1">Filtrar Status:</span>
            <button
              onClick={() => onStatusFiltroChange('todos')}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
                statusFiltro === 'todos'
                  ? 'bg-primary/10 border-primary/30 text-primary shadow-xs'
                  : 'bg-card border-border/80 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => onStatusFiltroChange('criticos')}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
                statusFiltro === 'criticos'
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-400 shadow-xs'
                  : 'bg-card border-border/80 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              Críticos (&lt; 60%)
            </button>
            <button
              onClick={() => onStatusFiltroChange('nao_iniciados')}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
                statusFiltro === 'nao_iniciados'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-500 shadow-xs'
                  : 'bg-card border-border/80 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              Não iniciados
            </button>
          </div>

          {/* Lista dos Assuntos estruturada */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2.5">
            {children}
          </div>

        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground gap-3">
          <ClipboardList className="w-12 h-12 text-muted-foreground/35" />
          <h3 className="text-xs font-bold text-foreground">Nenhuma matéria selecionada</h3>
          <p className="text-xxs text-muted-foreground max-w-sm text-center">Selecione uma matéria na coluna da esquerda ou crie uma nova para catalogar os seus assuntos.</p>
        </div>
      )}
    </div>
  )
}
