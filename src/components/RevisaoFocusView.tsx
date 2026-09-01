import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Book, Pencil, Check, Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { MarkdownAI } from './ui/MarkdownAI'
import { Button } from './ui/Button'
import { cleanHtmlText } from '../lib/cleanHtml'
import type { ResolucaoView } from '../types/database'

interface RevisaoFocusViewProps {
  // Dados
  questaoAtual: ResolucaoView | null
  materiaParam: string | null
  assuntoParam: string | null
  activeInFilterIndex: number
  totalFiltrados: number

  // Estado de resposta
  alternativaSelecionada: string | null
  onSelectAlternativa: (letra: string) => void
  revelado: boolean

  // Resolução do professor
  resolucaoExpanded: boolean
  onToggleResolucao: () => void
  editingResolucao: boolean
  onStartEditResolucao: () => void
  onCancelEditResolucao: () => void
  resolucaoText: string
  onResolucaoTextChange: (text: string) => void
  onSaveResolucao: () => void
  savingResolucao: boolean

  // Explicação IA

  // Ações
  onVoltar: () => void
  onAnterior: () => void
  onProxima: () => void
  onResponder: () => void
  podeAnterior: boolean
  podeProxima: boolean
  salvandoResposta: boolean

  // Classificação SM-2
  onClassificar: (quality: number) => void
  obterPrazos: (questaoId: number) => { dificil: number; bom: number; facil: number }
}

export function RevisaoFocusView({
  questaoAtual,
  materiaParam,
  assuntoParam,
  activeInFilterIndex,
  totalFiltrados,
  alternativaSelecionada,
  onSelectAlternativa,
  revelado,
  resolucaoExpanded,
  onToggleResolucao,
  editingResolucao,
  onStartEditResolucao,
  onCancelEditResolucao,
  resolucaoText,
  onResolucaoTextChange,
  onSaveResolucao,
  savingResolucao,
  onVoltar,
  onAnterior,
  onProxima,
  onResponder,
  podeAnterior,
  podeProxima,
  salvandoResposta,
  onClassificar,
  obterPrazos,
}: RevisaoFocusViewProps) {
  const alternativas = questaoAtual
    ? Object.entries(questaoAtual.alternativas || {}).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    : []

  return (
    <div className="flex flex-col gap-4 h-full min-h-0 flex-1">
      {/* Cabeçalho de Navegação e Foco */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/50 dark:border-white/[0.05] shrink-0 flex-wrap sm:flex-nowrap">
        <button
          onClick={onVoltar}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 border border-border/60 hover:bg-muted/40 hover:border-border text-muted-foreground hover:text-foreground dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:bg-white/[0.06] dark:hover:border-white/[0.15] rounded-lg text-xs font-black transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Caderno
        </button>

        <div className="flex flex-col items-center text-center min-w-0">
          <span className="text-[10px] text-violet-400 font-black uppercase tracking-wider">Modo de Foco</span>
          <h2 className="text-xs text-foreground font-extrabold truncate max-w-[280px] sm:max-w-[450px]" title={`${materiaParam} > ${assuntoParam}`}>
            {materiaParam} &rsaquo; {assuntoParam}
          </h2>
        </div>

        <div className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-black">
          {activeInFilterIndex + 1} de {totalFiltrados}
        </div>
      </div>

      {/* Workspace Centralizado e Ampliado (Largura Foco) */}
      {questaoAtual ? (
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-12">
          <div className="max-w-4xl mx-auto w-full space-y-6 pt-4">

            {/* Card Principal da Questão */}
            <div className="glass-card flex flex-col overflow-hidden">

              {/* Cabeçalho Inline da Questão */}
              <div className="p-4 border-b border-border/50 bg-muted/10 dark:border-white/[0.05] dark:bg-white/[0.01] flex items-center justify-between gap-3 flex-wrap text-[11px] font-black shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-primary font-black">QUESTÃO ATIVA</span>
                  <a
                    href={`https://www.tecconcursos.com.br/questoes/${questaoAtual.questao_tec_id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 px-2 py-0.5 rounded-lg border border-sky-500/20 transition-all cursor-pointer"
                    title="Abrir questão original no TEC Concursos"
                  >
                    Q{questaoAtual.questao_tec_id}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="bg-muted/30 px-2 py-0.5 rounded-lg text-muted-foreground border border-border/50 dark:bg-white/[0.04] dark:border-white/[0.05] truncate max-w-[150px]">
                    {questaoAtual.banca_texto}
                  </span>
                  <span className="bg-muted/30 px-2 py-0.5 rounded-lg text-muted-foreground border border-border/50 dark:bg-white/[0.04] dark:border-white/[0.05]">
                    {questaoAtual.ano}
                  </span>
                </div>

                <div className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                  Q{questaoAtual.questao_tec_id}
                </div>
              </div>

              {/* Corpo do Conteúdo */}
              <div className="p-6 md:p-8 space-y-6">

                {/* Enunciado */}
                <div className="bg-card/40 rounded-xl select-text">
                  <MarkdownAI text={questaoAtual.enunciado} />
                </div>

                {/* Alternativas */}
                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {alternativas.map(([letra, texto]) => {
                    const isSelected = alternativaSelecionada === letra
                    const isCorrect = questaoAtual.gabarito === letra

                    let barStyles = "border-border hover:border-border/80 bg-card dark:border-white/[0.05] dark:hover:border-white/[0.1] dark:bg-white/[0.01]"
                    let circleStyles = "bg-muted text-muted-foreground font-bold border border-border dark:bg-white/[0.04] dark:border-white/[0.06]"

                    if (revelado) {
                      if (isCorrect) {
                        barStyles = "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold"
                        circleStyles = "bg-emerald-500 text-white font-extrabold border border-emerald-600 animate-pulse"
                      } else if (isSelected && !isCorrect) {
                        barStyles = "border-red-500 bg-red-500/10 dark:bg-red-500/15 text-red-700 dark:text-red-300"
                        circleStyles = "bg-red-500 text-white font-extrabold border border-red-650"
                      } else {
                        barStyles = "border-border/30 opacity-40 bg-muted/10 dark:border-white/[0.03] dark:bg-white/[0.01]"
                        circleStyles = "bg-muted/20 text-muted-foreground/60 font-semibold border border-border/30 dark:bg-white/[0.02] dark:text-muted-foreground dark:border-white/[0.03]"
                      }
                    } else if (isSelected) {
                      barStyles = "border-violet-500 bg-violet-650/15 font-bold ring-1 ring-violet-500/30"
                      circleStyles = "bg-violet-650 text-white font-black border border-violet-500"
                    }

                    return (
                      <button
                        key={letra}
                        disabled={revelado}
                        onClick={() => onSelectAlternativa(letra)}
                        className={`w-full flex items-start gap-4 p-3.5 rounded-xl border text-left text-xs transition-all duration-200 leading-relaxed group cursor-pointer ${barStyles}`}
                      >
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all ${circleStyles}`}>
                          {letra}
                        </span>
                        <span className="flex-1 mt-0.5 text-foreground font-medium group-hover:text-foreground">
                          {cleanHtmlText(String(texto))}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Card de Resolução do Professor */}
                <div className="bg-muted/10 border border-border/60 dark:bg-white/[0.02] dark:border-white/[0.05] rounded-xl overflow-hidden flex flex-col mt-4">
                  {/* Header */}
                  <div
                    onClick={onToggleResolucao}
                    className="px-5 py-3.5 bg-muted/5 border-b border-border/60 dark:bg-white/[0.01] dark:border-b dark:border-white/[0.05] flex items-center justify-between cursor-pointer select-none hover:bg-muted/20 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                      <Book className="w-4.5 h-4.5 text-amber-500 fill-amber-500/10" />
                      <span>Resolução do Professor</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {resolucaoExpanded && !editingResolucao && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartEditResolucao()
                          }}
                          className="p-1 px-2 text-muted-foreground hover:text-amber-400 hover:bg-muted/30 dark:hover:bg-white/[0.05] rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                          title="Editar Resolução"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      )}
                      <span className="text-muted-foreground text-xs font-bold">
                        {resolucaoExpanded ? 'Ocultar ▲' : 'Mostrar ▼'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  {resolucaoExpanded && (
                    <div className="p-5 space-y-4 animate-in fade-in duration-200">
                      {editingResolucao ? (
                        <div className="space-y-3">
                          <textarea
                            value={resolucaoText}
                            onChange={(e) => onResolucaoTextChange(e.target.value)}
                            placeholder="Digite a resolução detalhada do professor para esta questão..."
                            className="w-full min-h-[150px] p-3 text-xs border border-border/80 focus:border-primary bg-card dark:border-white/[0.08] dark:bg-white/[0.01] font-medium text-foreground shadow-inner resize-y leading-relaxed focus:outline-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={onCancelEditResolucao}
                              disabled={savingResolucao}
                              className="px-3 py-1.5 border border-border/80 hover:bg-muted/30 dark:border-white/[0.08] dark:hover:bg-white/[0.05] text-foreground rounded-lg text-xxs font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={onSaveResolucao}
                              disabled={savingResolucao}
                              className="px-3 py-1.5 bg-violet-650 hover:bg-violet-700 text-white rounded-lg text-xxs font-black uppercase tracking-wider transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer font-bold"
                            >
                              {savingResolucao ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Salvando...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Salvar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-foreground leading-relaxed text-xs font-semibold select-text">
                          {resolucaoText ? (
                            <MarkdownAI text={resolucaoText} />
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2 border border-dashed border-border rounded-xl bg-muted/10 dark:border-white/[0.08] dark:bg-white/[0.01]">
                              <Book className="w-8 h-8 text-muted-foreground/50" />
                              <span className="text-[11px] font-bold">Nenhuma resolução cadastrada para esta questão.</span>
                              <button
                                onClick={onStartEditResolucao}
                                className="mt-1 flex items-center gap-1 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 rounded-lg text-xxs font-extrabold transition-all cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Adicionar Resolução</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Rodapé do Card e Ações */}
              <div className="p-4 bg-muted/20 border-t border-border/50 dark:bg-white/[0.02] dark:border-t dark:border-white/[0.05] flex items-center justify-between shrink-0 gap-4 flex-wrap sm:flex-nowrap">
                <div>
                  {revelado && (
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      {alternativaSelecionada === questaoAtual.gabarito ? (
                        <>
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400">Você acertou!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4.5 h-4.5 text-red-500 dark:text-red-400" />
                          <span className="text-red-650 dark:text-red-400">Você errou novamente.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
                  {/* Navegação Manual (Chevron) */}
                  <div className="flex items-center gap-1.5 border-r border-border/50 dark:border-white/[0.08] pr-3 mr-1">
                    <button
                      disabled={!podeAnterior}
                      onClick={onAnterior}
                      className="p-1.5 border border-border/80 hover:bg-muted/30 dark:border-white/[0.08] dark:hover:bg-white/[0.05] text-muted-foreground hover:text-foreground rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="Questão Anterior"
                    >
                      <ChevronLeft className="w-4.5 h-4.5" />
                    </button>
                    <button
                      disabled={!podeProxima}
                      onClick={onProxima}
                      className="p-1.5 border border-border/80 hover:bg-muted/30 dark:border-white/[0.08] dark:hover:bg-white/[0.05] text-muted-foreground hover:text-foreground rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="Próxima Questão"
                    >
                      <ChevronRight className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {!revelado ? (
                    <Button
                      onClick={onResponder}
                      disabled={!alternativaSelecionada || salvandoResposta}
                      loading={salvandoResposta}
                    >
                      Responder
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {alternativaSelecionada === questaoAtual.gabarito ? (
                        <>
                          {/* Classificações SM-2 estilo Anki */}
                          {(() => {
                            const prazos = obterPrazos(questaoAtual.questao_id || questaoAtual.id)
                            return (
                              <>
                                <button
                                  onClick={() => onClassificar(2)}
                                  className="px-3.5 py-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer"
                                >
                                  Difícil ({prazos.dificil}d)
                                </button>
                                <button
                                  onClick={() => onClassificar(4)}
                                  className="px-3.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer"
                                >
                                  Bom ({prazos.bom}d)
                                </button>
                                <button
                                  onClick={() => onClassificar(5)}
                                  className="px-3.5 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                >
                                  Fácil ({prazos.facil}d)
                                </button>
                              </>
                            )
                          })()}
                        </>
                      ) : (
                        <button
                          onClick={() => onClassificar(2)}
                          className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/10 transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
                        >
                          Rever amanhã (1d)
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        <div className="glass-card flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-sm italic">
          Questão não localizada.
        </div>
      )}
    </div>
  )
}
