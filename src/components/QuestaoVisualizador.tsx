import { type ResolucaoView } from '../types/database'
import { cleanHtmlText } from '../lib/cleanHtml'
import { MarkdownAI } from './ui/MarkdownAI'
import {
  ChevronRight, ChevronLeft, RotateCcw, Copy, Check, ExternalLink,
  Loader2, GraduationCap, Pencil, X, CheckCircle2, XCircle
} from 'lucide-react'

interface QuestaoVisualizadorProps {
  questao: ResolucaoView
  index: number
  total: number
  alternativaSelecionada: string | null
  onSelectAlternativa: (letra: string) => void
  revelado: boolean
  onReset: () => void
  onConfirmarResposta: () => void
  copiedId: number | null
  onCopyId: (id: number) => void
  tempoSegundos: number
  salvandoResposta: boolean
  onEditar: () => void
  onAnterior: () => void
  onProxima: () => void
  podeAnterior: boolean
  podeProxima: boolean
}

export function QuestaoVisualizador({
  questao, index, total,
  alternativaSelecionada, onSelectAlternativa,
  revelado, onReset,
  onConfirmarResposta,
  copiedId, onCopyId,
  tempoSegundos, salvandoResposta,
  onEditar, onAnterior, onProxima,
  podeAnterior, podeProxima,
}: QuestaoVisualizadorProps) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border bg-card flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-sm font-extrabold text-primary flex items-center gap-2">
          <GraduationCap className="w-5.5 h-5.5 text-primary" />
          Questão {index + 1} de {total}
        </h3>

      </div>

      <div className="bg-muted px-6 py-2.5 border-b border-border flex flex-wrap items-center gap-2 text-xxs font-bold">
        <span className="text-muted-foreground uppercase tracking-wide">Estudo</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-primary hover:underline cursor-pointer">{questao.materia}</span>
        {questao.assunto && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">
              {questao.assunto}
              <button className="text-red-500 hover:text-red-700 p-0.5 ml-1"><X className="w-2.5 h-2.5" /></button>
            </span>
          </>
        )}
      </div>

      <div className="bg-muted mx-6 mt-5 p-3 rounded-lg border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xxs">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground font-bold">
          <button
            onClick={() => onCopyId(questao.questao_tec_id)}
            className="text-primary font-black hover:underline flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded shadow-xxs"
            title="Copiar ID da Questão"
          >
            {copiedId === questao.questao_tec_id ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground" />
            )}
            <span>Q{questao.questao_tec_id}</span>
          </button>

          <a
            href={`https://www.tecconcursos.com.br/questoes/${questao.questao_tec_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary p-1 border-r border-border pr-2"
            title="Abrir diretamente no site oficial do TEC Concursos"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <span className="text-primary uppercase font-black tracking-wide ml-1">{questao.banca_texto}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground font-semibold">{questao.ano}</span>

          {questao.orgao && (
            <><span className="text-muted-foreground">•</span><span className="text-foreground font-extrabold">{questao.orgao}</span></>
          )}
          {questao.concurso && (
            <><span className="text-muted-foreground">•</span><span className="text-muted-foreground font-semibold truncate max-w-[280px]" title={questao.concurso}>{questao.concurso}</span></>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto border-l border-border/80 pl-3">
          <button
            onClick={onEditar}
            className="flex items-center gap-1 px-3 py-1.5 border border-amber-500/30 hover:bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer bg-card mr-2"
            title="Editar dados desta questão (Corrigir erros de digitação/HTML)"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
          <button
            disabled={!podeAnterior}
            onClick={onAnterior}
            className="w-7 h-7 flex items-center justify-center border border-border rounded-lg bg-card hover:bg-muted text-muted-foreground shadow-xxs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={!podeProxima}
            onClick={onProxima}
            className="w-7 h-7 flex items-center justify-center border border-border rounded-lg bg-card hover:bg-muted text-muted-foreground shadow-xxs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-6 py-6 md:p-8 space-y-6">
        <div className="bg-card rounded-lg selection:bg-primary/20">
          <MarkdownAI text={questao.enunciado} />
        </div>

        {questao.alternativas && (
          <div className="grid grid-cols-1 gap-3 pt-2">
            {Object.entries(questao.alternativas)
              .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
              .map(([letra, texto]) => {
                const isSelected = alternativaSelecionada === letra
                const isCorrect = questao.gabarito === letra

                let barStyles = "border-border hover:border-border bg-card"
                let circleStyles = "bg-muted text-muted-foreground font-bold border border-border"

                if (revelado) {
                  if (isCorrect) {
                    barStyles = "border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 font-bold"
                    circleStyles = "bg-emerald-500 text-white font-extrabold border border-emerald-600 animate-pulse"
                  } else if (isSelected && !isCorrect) {
                    barStyles = "border-red-500 bg-red-50/50 hover:bg-red-50"
                    circleStyles = "bg-red-500 text-white font-extrabold border border-red-650"
                  } else {
                    barStyles = "border-border opacity-55 bg-card"
                    circleStyles = "bg-muted text-muted-foreground font-semibold border border-border"
                  }
                } else if (isSelected) {
                  barStyles = "border-[#1976d2] bg-blue-50/30 font-bold shadow-xxs ring-1 ring-[#1976d2]"
                  circleStyles = "bg-primary text-white font-black border border-[#1565c0]"
                }

                return (
                  <button
                    key={letra}
                    disabled={revelado}
                    onClick={() => onSelectAlternativa(letra)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left text-xs transition-all duration-200 leading-relaxed group cursor-pointer ${barStyles}`}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all ${circleStyles}`}>
                      {letra}
                    </span>
                    <span className="flex-1 mt-0.5 text-foreground font-medium group-hover:text-foreground">{cleanHtmlText(String(texto))}</span>
                  </button>
                )
              })
            }
          </div>
        )}
      </div>

      <div className="bg-muted/70 p-5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-wrap">
          {!revelado ? (
            <>
              <button
                disabled={!alternativaSelecionada || salvandoResposta}
                onClick={onConfirmarResposta}
                title="Atalho: Enter ou Espaço"
                className={`px-6 py-2.5 rounded-lg text-xs font-black shadow-sm transition-all uppercase tracking-wider flex items-center gap-2 ${
                  alternativaSelecionada
                    ? 'bg-[#00c853] hover:bg-[#00b0ff] text-white cursor-pointer active:scale-98'
                    : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                }`}
              >
                {salvandoResposta && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                RESOLVER QUESTÃO
              </button>
            </>
          ) : (
            <>
              <span className="text-xs font-black flex items-center gap-1.5 mr-2">
                {alternativaSelecionada === questao.gabarito ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-emerald-600 uppercase tracking-wide">Você acertou!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-650 uppercase tracking-wide">Você errou!</span>
                  </>
                )}
              </span>
              <button
                onClick={onReset}
                title="Atalho: Enter ou Espaço"
                className="flex items-center gap-1.5 bg-primary hover:bg-[#1565c0] text-white font-black px-5 py-2.5 rounded-lg text-xxs transition-all shadow-sm active:scale-98 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tentar Mais uma vez</span>
              </button>
            </>
          )}
        </div>

        <div className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide border shadow-xxs self-start sm:self-auto bg-amber-50 border-amber-200 text-amber-700 flex items-center gap-1.5 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Tempo Gasto: {Math.floor(tempoSegundos / 60)}m {tempoSegundos % 60}s</span>
        </div>
      </div>
    </div>
  )
}
