import { cleanHtmlText } from '../lib/cleanHtml'
import { MarkdownAI } from './ui/MarkdownAI'
import type { ResolucaoView } from '../types/database'

interface QuestaoPrintViewProps {
  questao: ResolucaoView
  alternativaSelecionada: string | null
}

export function QuestaoPrintView({ questao, alternativaSelecionada }: QuestaoPrintViewProps) {
  if (!questao) return null

  const hasProf = !!questao.resolucao_professor

  return (
    <div className="hidden print:block w-full max-w-4xl mx-auto p-8 bg-white text-black text-sm leading-relaxed space-y-6">
      
      <div className="border-b-2 border-black pb-4">
        <div className="flex justify-between items-start text-xs font-bold uppercase tracking-wider text-neutral-600">
          <div>
            <span>Questão Q{questao?.questao_tec_id}</span>
            <span className="mx-2">•</span>
            <span className="text-neutral-900">{questao?.banca_texto} ({questao?.ano})</span>
          </div>
          <div>
            <span>TEC Concursos</span>
          </div>
        </div>
        
        <h1 className="text-lg font-extrabold text-neutral-900 mt-3">
          {questao?.materia}
          {questao?.assunto && (
            <span className="text-neutral-500 font-normal"> &gt; {questao?.assunto}</span>
          )}
        </h1>
        
        {questao?.orgao && (
          <div className="text-xs text-neutral-500 mt-1 font-semibold">
            Órgão: <span className="text-neutral-800 font-bold">{questao?.orgao}</span>
            {questao?.concurso && (
              <>
                <span className="mx-2">•</span>
                Concurso: <span className="text-neutral-800 font-bold">{questao?.concurso}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 print:break-inside-avoid">
        <div className="bg-neutral-50 p-4 rounded border border-neutral-200">
          <MarkdownAI text={questao?.enunciado} />
        </div>
      </div>

      {questao?.alternativas && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Alternativas:</h3>
          {Object.entries(questao?.alternativas)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([letra, texto]) => {
              const isCorrect = questao?.gabarito === letra
              const isSelected = alternativaSelecionada === letra

              let printBorder = "border-neutral-200"
              let printBg = "bg-white"
              let label = ""

              if (isCorrect && isSelected) {
                printBorder = "border-emerald-600 border-2"
                printBg = "bg-emerald-50/70 font-semibold"
                label = " [GABARITO OFICIAL - SUA RESPOSTA]"
              } else if (isCorrect) {
                printBorder = "border-emerald-500 border-2"
                printBg = "bg-emerald-50/50"
                label = " [GABARITO OFICIAL]"
              } else if (isSelected) {
                printBorder = "border-red-500 border-2"
                printBg = "bg-red-50/50"
                label = " [SUA RESPOSTA - INCORRETA]"
              }

              return (
                <div 
                  key={letra} 
                  className={`p-3 rounded border text-xs leading-relaxed flex items-start gap-3 print:break-inside-avoid ${printBorder} ${printBg}`}
                >
                  <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-800 font-bold flex items-center justify-center flex-shrink-0 text-xxs border border-neutral-300">
                    {letra}
                  </span>
                  <div className="flex-1 mt-0.5 text-neutral-900 font-medium">
                    {cleanHtmlText(String(texto))}
                    {label && <span className="ml-2 text-xxs font-black text-emerald-700 tracking-wider">{label}</span>}
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      {hasProf && (
        <div className="border-t-2 border-black pt-6 space-y-6">
          <div className="space-y-2 print:break-inside-avoid">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-amber-800 flex items-center gap-1">
              Comentário do Professor:
            </h3>
            <div className="text-neutral-800 text-xs bg-amber-50/20 p-4 rounded border border-amber-200">
              <MarkdownAI text={questao.resolucao_professor!} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
