import { useState } from 'react'
import { PieChart, Loader2 } from 'lucide-react'
import type { HistoricoResolucao } from '../types/database'

export function MeuDesempenho({
  historico,
  loading
}: {
  historico: HistoricoResolucao[]
  loading: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const total = historico.length
  const acertos = historico.filter(h => h.acertou).length
  const erros = total - acertos
  const taxaAcerto = total > 0 ? Math.round((acertos / total) * 100) : 0

  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (taxaAcerto / 100) * circumference

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-6 py-4 bg-muted border-b border-border flex items-center justify-between cursor-pointer select-none hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
          <PieChart className="w-5 h-5 text-teal-650 fill-teal-50" />
          <span>Desempenho</span>
        </div>
        <span className="text-muted-foreground text-xs font-bold">
          {isExpanded ? 'Ocultar ▲' : 'Mostrar ▼'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="animate-in fade-in duration-200">
          {total === 0 ? (
            <div className="p-6 flex items-center gap-3 text-muted-foreground text-xs font-semibold">
              <PieChart className="w-5 h-5 text-muted-foreground/50" />
              <span>Você ainda não resolveu esta questão. Sua primeira tentativa será registrada no histórico.</span>
            </div>
          ) : (
            <>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border/60">
                  <div className="relative flex items-center justify-center w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        className="text-border"
                        strokeWidth="6"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        className="text-emerald-500 transition-all duration-500 ease-out"
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                      />
                    </svg>
                    <span className="absolute text-xs font-black text-foreground">{taxaAcerto}%</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-foreground">Taxa de Acerto</h4>
                    <p className="text-xxs text-muted-foreground">
                      {acertos} {acertos === 1 ? 'acerto' : 'acertos'} e {erros} {erros === 1 ? 'erro' : 'erros'} de {total} {total === 1 ? 'resolução' : 'resoluções'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/60 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Resolvida</span>
                    <span className="text-lg font-black text-foreground">{total} {total === 1 ? 'vez' : 'vezes'}</span>
                  </div>
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/60 flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Último Resultado</span>
                    <span className={`text-xs font-black uppercase tracking-wide ${historico[historico.length - 1].acertou ? 'text-emerald-600' : 'text-red-650'}`}>
                      {historico[historico.length - 1].acertou ? 'Acerto (Correto)' : 'Erro (Incorreto)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border bg-card">
                <div className="max-h-[160px] overflow-y-auto divide-y divide-border/60">
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
                      <div key={tentativa.id || idx} className="px-6 py-2.5 flex items-center justify-between text-xxs font-medium hover:bg-muted/10 transition-colors">
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
