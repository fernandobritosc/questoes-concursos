import { cleanHtmlText } from '../lib/cleanHtml'
import { Button } from './ui/Button'
import type { ResolucaoView } from '../types/database'
import {
  Timer,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
} from 'lucide-react'

// Helper privado — formatar contagem regressiva em MM:SS
function formatCountdown(segundos: number): string {
  const mins = Math.floor(segundos / 60)
  const secs = segundos % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

interface SimuladoExamViewProps {
  questoes: ResolucaoView[]
  questaoAtualIndex: number
  onSetQuestaoAtualIndex: (index: number | ((prev: number) => number)) => void
  respostasMarcadas: Record<number, string>
  onMarcarResposta: (questaoId: number, letra: string) => void
  tempoRestante: number
  onFinalizarSimulado: () => void
}

export function SimuladoExamView({
  questoes,
  questaoAtualIndex,
  onSetQuestaoAtualIndex,
  respostasMarcadas,
  onMarcarResposta,
  tempoRestante,
  onFinalizarSimulado,
}: SimuladoExamViewProps) {
  const qAtual = questoes[questaoAtualIndex]
  const totalQ = questoes.length
  const respondidasCount = Object.keys(respostasMarcadas).length
  const isAlertTime = tempoRestante <= 120

  return (
    <div className="flex flex-col gap-4 flex-1 h-full min-h-0 animate-fade-in-up">
      {/* Barra Superior Foco */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Simulado Inteligente IA
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                Questão {questaoAtualIndex + 1} de {totalQ}
              </span>
              <span className="text-xs text-muted-foreground/60">•</span>
              <span className="text-xs text-muted-foreground">{respondidasCount} respondidas</span>
            </div>
          </div>
        </div>

        {/* Cronômetro */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${
              isAlertTime
                ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse ring-1 ring-red-500/20'
                : 'bg-card border border-border dark:bg-white/[0.03] dark:border-white/[0.08] text-foreground'
            }`}
          >
            <Timer className="w-4 h-4 shrink-0" />
            <span className="font-mono font-bold tracking-widest text-sm">
              {formatCountdown(tempoRestante)}
            </span>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={onFinalizarSimulado}
            className="font-bold py-2 rounded-xl text-xs cursor-pointer"
          >
            Finalizar Simulado
          </Button>
        </div>
      </div>

      {/* Layout Duas Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        {/* Coluna Esquerda: Enunciado e Alternativas */}
        <div className="lg:col-span-3 glass-card p-5 flex flex-col gap-4 overflow-y-auto h-full min-h-0">
          {/* Meta-dados */}
          {qAtual && (
            <div className="flex flex-wrap gap-2 items-center text-xs border-b border-border/50 pb-3 shrink-0">
              <span className="px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-300 font-bold border border-violet-500/10">
                {qAtual.materia}
              </span>
              {qAtual.assunto && (
                <span className="px-2.5 py-1 rounded-md bg-muted/30 text-muted-foreground border border-border/50">
                  {qAtual.assunto}
                </span>
              )}
              <span className="text-muted-foreground/60 ml-auto">
                {qAtual.banca_texto} • {qAtual.ano}
              </span>
            </div>
          )}

          {/* Enunciado */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="p-4 rounded-xl bg-muted/30 border border-border text-foreground/90 font-medium text-sm leading-relaxed whitespace-pre-wrap select-text">
              {cleanHtmlText(qAtual?.enunciado)}
            </div>

            {/* Alternativas */}
            <div className="mt-5 space-y-2.5">
              {qAtual &&
                Object.entries(qAtual.alternativas || {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([letra, texto]) => {
                    const id = qAtual.questao_id || qAtual.id!
                    const isSelected = respostasMarcadas[id] === letra

                    return (
                      <button
                        key={letra}
                        type="button"
                        onClick={() => onMarcarResposta(id, letra)}
                        className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-violet-600/10 to-indigo-650/10 border-violet-500 text-foreground ring-1 ring-violet-500/30'
                            : 'bg-card border border-border hover:bg-muted hover:border-border text-foreground'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-violet-600 border-violet-400 text-white'
                              : 'border-border/60 text-muted-foreground'
                          }`}
                        >
                          {letra}
                        </span>
                        <span className="text-xs pt-0.5 leading-relaxed">
                          {cleanHtmlText(String(texto))}
                        </span>
                      </button>
                    )
                  })}
            </div>
          </div>

          {/* Rodapé Navegação */}
          <div className="flex items-center justify-between border-t border-border/50 pt-3 shrink-0">
            <Button
              variant="ghost"
              onClick={() => onSetQuestaoAtualIndex(prev => Math.max(0, prev - 1))}
              disabled={questaoAtualIndex === 0}
              className="flex items-center gap-1.5 py-2 px-3 text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>

            <span className="text-xs text-muted-foreground/60">
              Questão {questaoAtualIndex + 1} de {totalQ}
            </span>

            {questaoAtualIndex < totalQ - 1 ? (
              <Button
                variant="outline"
                onClick={() => onSetQuestaoAtualIndex(prev => prev + 1)}
                className="flex items-center gap-1.5 py-2 px-3 text-xs"
              >
                Próxima <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={onFinalizarSimulado}
                className="flex items-center gap-1.5 py-2 px-4 text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white cursor-pointer"
              >
                Finalizar Simulado
              </Button>
            )}
          </div>
        </div>

        {/* Coluna Direita: Grade de Navegação */}
        <div className="glass-card p-4 flex flex-col gap-4 h-full min-h-0 lg:col-span-1">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <ClipboardList className="w-3.5 h-3.5 text-violet-400" />
            Gabarito do Simulado
          </h3>

          {/* Grid de números */}
          <div className="flex-1 overflow-y-auto pr-1 min-h-0">
            <div className="grid grid-cols-5 gap-2">
              {questoes.map((q, idx) => {
                const id = q.questao_id || q.id!
                const isCurrent = idx === questaoAtualIndex
                const isAnswered = !!respostasMarcadas[id]

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSetQuestaoAtualIndex(idx)}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center font-bold text-xs transition-all duration-200 cursor-pointer ${
                      isCurrent
                        ? 'border-violet-500 text-white bg-violet-650/40 ring-1 ring-violet-500/40'
                        : isAnswered
                          ? 'bg-violet-600/10 border-violet-550/25 text-violet-300'
                          : 'bg-muted/10 border-border/60 text-muted-foreground/60 hover:bg-muted/30'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isAnswered && (
                      <span className="text-[9px] font-mono leading-none mt-0.5 text-violet-400">
                        {respostasMarcadas[id]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dica */}
          <div className="p-3 rounded-xl bg-muted/10 border border-border/50 text-[10px] text-muted-foreground/80 leading-relaxed shrink-0">
            Ao encerrar ou zerar o tempo, as tentativas serão inseridas na base
            de dados, impactando suas estatísticas no Dashboard.
          </div>
        </div>
      </div>
    </div>
  )
}
