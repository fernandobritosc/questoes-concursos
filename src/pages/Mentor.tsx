import { useMentor } from '../hooks/useMentor'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Button } from '../components/ui/Button'
import { BrainCircuit, Sparkles } from 'lucide-react'

export function Mentor() {
  const { loading, fraquezas, plano, gerandoPlano, handleGerarPlano } = useMentor()

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Mentor IA</h1>
        <p className="text-muted-foreground mt-1">Seu treinador pessoal focado em eliminar suas fraquezas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-primary" />
              Suas Fraquezas
            </h3>
            
            {fraquezas.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Detectamos {fraquezas.length} pontos de atenção (taxa de acerto inferior a 70%).
                </p>
                <ul className="space-y-3">
                  {fraquezas.slice(0, 5).map((f, i) => (
                    <li key={i} className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <p className="text-sm font-medium text-foreground">{f.assunto}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-muted-foreground">{f.materia}</span>
                        <span className="text-xs font-bold text-destructive">{f.taxa}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={handleGerarPlano}
                  loading={gerandoPlano}
                  icon={<Sparkles className="w-5 h-5" />}
                  className="w-full mt-4"
                >
                  Gerar Plano Tático
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você não possui dados suficientes de erros repetidos para gerarmos um alerta de fraqueza no momento.
              </p>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-card border border-border rounded-xl shadow-sm min-h-[400px] flex flex-col">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold text-foreground">Plano de Estudos Semanal</h3>
            </div>
            
            <div className="p-6 flex-1">
              {!plano && !gerandoPlano && (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-60">
                  <Sparkles className="w-12 h-12 mb-3" />
                  <p>Clique em "Gerar Plano Tático" para a IA analisar seus erros<br/>e montar um cronograma exclusivo para você.</p>
                </div>
              )}

              {gerandoPlano && (
                <div className="h-full flex flex-col items-center justify-center text-center text-primary">
                  <LoadingSpinner size="md" text="A IA está processando seu histórico de erros..." />
                </div>
              )}

              {plano && !gerandoPlano && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap">
                  {plano}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
