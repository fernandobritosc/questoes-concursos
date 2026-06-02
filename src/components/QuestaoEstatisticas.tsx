import { Layers, PieChart, Loader2 } from 'lucide-react'
import type { ResolucaoView, HistoricoResolucao } from '../types/database'

interface QuestaoEstatisticasProps {
  questao: ResolucaoView
  historico: HistoricoResolucao[]
  loading: boolean
  totalQuestoes: number
  onVoltar: () => void
}

export function QuestaoEstatisticas({ questao, historico, loading, totalQuestoes, onVoltar }: QuestaoEstatisticasProps) {
  if (totalQuestoes === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-xl shadow-sm">
          <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma questão disponível</h2>
          <p className="text-sm text-muted-foreground">Importe um PDF para ver as estatísticas.</p>
        </div>
      </div>
    )
  }

  const statsTotal = historico?.length || 0
  const statsAcertos = historico?.filter(h => h.acertou).length || 0
  const statsErros = statsTotal - statsAcertos
  const statsTaxaAcerto = statsTotal > 0 ? Math.round((statsAcertos / statsTotal) * 100) : 0
  const statsRadius = 28
  const statsCircumference = 2 * Math.PI * statsRadius
  const statsStrokeDashoffset = statsCircumference - (statsTaxaAcerto / 100) * statsCircumference

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="space-y-6 pb-12">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xxs font-black text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-1 rounded-md">Questão Ativa</span>
            <h4 className="text-sm font-black text-foreground mt-3">
              Q{questao?.questao_tec_id} — {questao?.banca_texto} ({questao?.ano})
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

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-muted border-b border-border flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
            <PieChart className="w-5 h-5 text-teal-500 fill-teal-50" />
            <span>Desempenho nesta Questão</span>
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : statsTotal === 0 ? (
            <div className="p-8 flex items-center gap-3 text-muted-foreground text-xs font-semibold justify-center">
              <PieChart className="w-5 h-5 text-muted-foreground/50" />
              <span>Você ainda não resolveu esta questão. Sua primeira tentativa será registrada no histórico.</span>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border/60">
                  <div className="relative flex items-center justify-center w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r={statsRadius}
                        className="text-border"
                        strokeWidth="7"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r={statsRadius}
                        className="text-emerald-500 transition-all duration-500 ease-out"
                        strokeWidth="7"
                        strokeDasharray={statsCircumference}
                        strokeDashoffset={statsStrokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute text-sm font-black text-foreground">{statsTaxaAcerto}%</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-foreground">Taxa de Acerto</h4>
                    <p className="text-xxs text-muted-foreground">
                      {statsAcertos} {statsAcertos === 1 ? 'acerto' : 'acertos'} e {statsErros} {statsErros === 1 ? 'erro' : 'erros'} de {statsTotal} {statsTotal === 1 ? 'tentativa' : 'tentativas'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/60 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Vezes Resolvida</span>
                    <span className="text-xl font-black text-foreground">{statsTotal} {statsTotal === 1 ? 'vez' : 'vezes'}</span>
                  </div>
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/60 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Último Resultado</span>
                    <span className={`text-xs font-black uppercase tracking-wide ${historico[historico.length - 1]?.acertou ? 'text-emerald-600' : 'text-red-650'}`}>
                      {historico[historico.length - 1]?.acertou ? 'Acertou (Correto)' : 'Errou (Incorreto)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="px-5 py-3.5 bg-muted/30 border-b border-border text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Histórico de Tentativas
                </div>
                <div className="max-h-[250px] overflow-y-auto divide-y divide-border/60">
                  {historico.slice().reverse().map((tentativa, idx) => {
                    const data = new Date(tentativa.data_resolucao).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    const tempo = tentativa.tempo_segundos
                      ? `${Math.floor(tentativa.tempo_segundos / 60)}m ${tentativa.tempo_segundos % 60}s`
                      : 'N/D'

                    return (
                      <div key={tentativa.id || idx} className="px-6 py-3 flex items-center justify-between text-xxs font-semibold hover:bg-muted/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{data}</span>
                          <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded text-[9px] ${
                            tentativa.acertou 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {tentativa.acertou ? 'Acertou' : 'Errou'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <span>Opção: <strong className="text-foreground">{tentativa.alternativa || 'N/A'}</strong></span>
                          <span>Tempo: <strong className="text-foreground">{tempo}</strong></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
