import { Button } from './ui/Button'
import {
  BrainCircuit,
  ClipboardList,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react'

interface SimuladoSetupProps {
  selectedQtd: number
  selectedTempo: number
  onSelectQtd: (qtd: number) => void
  onSelectTempo: (tempo: number) => void
  onIniciarSimulado: () => void
}

export function SimuladoSetup({
  selectedQtd,
  selectedTempo,
  onSelectQtd,
  onSelectTempo,
  onIniciarSimulado,
}: SimuladoSetupProps) {
  return (
    <>
      {/* Cabeçalho — full width (12 columns) when inside grid */}
      <div className="lg:col-span-12 space-y-1">
        <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase tracking-wider">
          <BrainCircuit className="w-4 h-4" />
          <span>Treinamento de Elite por IA</span>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Simulados Inteligentes IA</h1>
        <p className="text-sm text-muted-foreground">
          Enfrente a pressão do tempo em um teste feito sob medida com os assuntos em que você é mais fraco.
        </p>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <div className="glass-card p-6 space-y-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border/60 dark:border-white/[0.04] pb-3">
          <ClipboardList className="w-5 h-5 text-violet-500" />
          Ajustar Parâmetros da Prova
        </h2>

        {/* Quantidade de Questões */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quantidade de Questões
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[10, 15, 20].map(qtd => (
              <button
                key={qtd}
                type="button"
                onClick={() => onSelectQtd(qtd)}
                className={`py-3.5 px-4 rounded-xl border font-bold text-sm transition-all duration-200 cursor-pointer ${
                  selectedQtd === qtd
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-650 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-card border border-border text-foreground hover:bg-muted hover:border-border hover:text-foreground dark:bg-white/[0.02] dark:border-white/[0.05] dark:hover:bg-white/[0.05] dark:hover:border-white/[0.1]'
                }`}
              >
                {qtd} Questões
              </button>
            ))}
          </div>
        </div>

        {/* Tempo Limite */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tempo Limite do Cronômetro
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[15, 20, 30].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => onSelectTempo(t)}
                className={`py-3.5 px-4 rounded-xl border font-bold text-sm transition-all duration-200 cursor-pointer ${
                  selectedTempo === t
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-650 border-violet-500 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-card border border-border text-foreground hover:bg-muted hover:border-border hover:text-foreground dark:bg-white/[0.02] dark:border-white/[0.05] dark:hover:bg-white/[0.05] dark:hover:border-white/[0.1]'
                }`}
              >
                {t} Minutos
              </button>
            ))}
          </div>
        </div>

        {/* Botão Gerar */}
        <div className="pt-2">
          <Button
            onClick={onIniciarSimulado}
            className="w-full py-4 text-base font-bold bg-gradient-to-r from-violet-650 via-indigo-600 to-violet-700 text-white rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer group"
          >
            <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
            Gerar Simulado Personalizado
          </Button>
        </div>
      </div>

      {/* Como funciona */}
      <div className="glass-card p-6 border-violet-500/20 bg-gradient-to-b from-violet-500/[0.03] to-transparent space-y-4">
        <h3 className="text-sm font-bold text-violet-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-violet-400" />
          Como a IA monta a prova?
        </h3>

        <div className="space-y-3.5 text-xs text-muted-foreground leading-relaxed">
          <p>
            O algoritmo analisa todo o seu <strong>banco de dados de resoluções</strong> e o seu <strong>Radar de Competências</strong>.
          </p>
          <p>
            Ele filtra automaticamente os assuntos em que seu aproveitamento teórico de acertos é <strong>inferior a 70%</strong>.
          </p>
          <p>
            Desses tópicos fracos, a IA monta um caderno com questões inéditas e de fixação para te desafiar.
          </p>
          <div className="p-3.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10 text-yellow-350 space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5" /> Foco sob pressão
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Ao contrário do treino livre, o <strong>gabarito não é revelado imediatamente</strong>. Você deve responder tudo e submeter antes do tempo esgotar!
            </p>
          </div>
        </div>
      </div>
    </div>
  </>
  )
}
