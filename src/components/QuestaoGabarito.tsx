import { Layers, GraduationCap } from 'lucide-react'
import { MarkdownAI } from './ui/MarkdownAI'
import type { ResolucaoView } from '../types/database'

interface QuestaoGabaritoProps {
  questao: ResolucaoView
  totalQuestoes: number
  onVoltar: () => void
}

export function QuestaoGabarito({ questao, totalQuestoes, onVoltar }: QuestaoGabaritoProps) {
  if (totalQuestoes === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-xl shadow-sm">
          <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma questão disponível</h2>
          <p className="text-sm text-muted-foreground">Importe um PDF para ver o gabarito.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="space-y-6 pb-12">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xxs font-black text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded-md">Gabarito Oficial</span>
            <h4 className="text-sm font-black text-foreground mt-3">
              Questão Q{questao?.questao_tec_id}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 font-semibold">
              {questao?.materia} {questao?.assunto && `> ${questao?.assunto}`}
            </p>
          </div>
          <button
            onClick={onVoltar}
            className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg text-xxs font-black uppercase tracking-wider transition-all shadow-xxs active:scale-95 duration-100 cursor-pointer"
          >
            Voltar para a Questão
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-lg flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-3xl font-black text-emerald-500 shadow-lg shadow-emerald-500/10 animate-bounce">
            {questao?.gabarito}
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground">Alternativa Correta</h3>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Veja abaixo o texto completo da opção oficial recomendada:</p>
          </div>
          
          <div className="w-full max-w-2xl bg-emerald-500/[0.03] border border-emerald-500/20 p-5 rounded-xl text-left leading-relaxed text-xs text-foreground font-semibold mt-4">
            {questao?.gabarito ? (questao?.alternativas?.[questao?.gabarito as string] || 'Texto da alternativa não disponível.') : 'Texto da alternativa não disponível.'}
          </div>
        </div>

        {questao?.resolucao_professor && (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="w-4.5 h-4.5 text-primary" /> Explicação e Resolução
            </h3>
            
            <div className="space-y-1">
              <h4 className="text-xxs font-black uppercase text-amber-600">Comentário do Professor</h4>
              <div className="text-xs text-foreground leading-relaxed mt-2">
                <MarkdownAI text={questao?.resolucao_professor} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
