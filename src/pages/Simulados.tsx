import { useState } from 'react'
import { useSimulados } from '../hooks/useSimulados'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { MarkdownAI } from '../components/ui/MarkdownAI'
import { cleanHtmlText } from '../lib/cleanHtml'
import { formatarTempo } from '../hooks/useDashboard'
import { gerarResolucaoProfessor } from '../services/gemini.service'
import { updateResolucaoProfessor } from '../services/supabase.service'
import type { ResolucaoView } from '../types/database'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import {
  Timer,
  ChevronRight,
  ChevronLeft,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Info,
  Sparkles,
  Clock,
  ClipboardList,
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Loader2,
  ChevronDown,
  ChevronUp,
  History,
  Trash2
} from 'lucide-react'

// Helper para formatar contagem regressiva em MM:SS
function formatCountdown(segundos: number): string {
  const mins = Math.floor(segundos / 60)
  const secs = segundos % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function Simulados() {
  const {
    loading,
    error,
    etapa,
    questoesSelected,
    respostasMarcadas,
    questaoAtualIndex,
    setQuestaoAtualIndex,
    tempoRestante,
    tempoGasto,
    loadingFeedback,
    diagnosticoIA,
    pontuacao,
    historicoSimulados,
    handleIniciarSimulado,
    handleMarcarResposta,
    handleFinalizarSimulado,
    handleResetSimulado,
    handleLimparHistorico,
  } = useSimulados()

  // Estados locais para configuração da prova
  const [selectedQtd, setSelectedQtd] = useState(10)
  const [selectedTempo, setSelectedTempo] = useState(15)

  // Controle do modal de prescrição tática do histórico
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedSimuladoForModal, setSelectedSimuladoForModal] = useState<any | null>(null)

  // Controle de paginação e visualização do histórico
  const [verTodosHistorico, setVerTodosHistorico] = useState(false)
  const [isHistoryExpandedMobile, setIsHistoryExpandedMobile] = useState(false)

  // Controle de acordions de revisão
  const [activeReviewIndex, setActiveReviewIndex] = useState<number | null>(null)
  
  // Resoluções de IA geradas localmente na revisão
  const [explicacoesRevisao, setExplicacoesRevisao] = useState<Record<number, string>>({})
  const [loadingExplicacao, setLoadingExplicacao] = useState<number | null>(null)

  // Solicita explicação da IA para uma questão específica no painel de revisão
  const handleGerarExplicacaoIA = async (q: ResolucaoView) => {
    const id = q.questao_id || q.id
    if (!id || loadingExplicacao === id) return
    setLoadingExplicacao(id)
    try {
      const texto = await gerarResolucaoProfessor(q)
      setExplicacoesRevisao(prev => ({ ...prev, [id]: texto }))
      await updateResolucaoProfessor(id, texto)
    } catch (err) {
      console.error(err)
      setExplicacoesRevisao(prev => ({
        ...prev,
        [id]: 'Não foi possível gerar a explicação. Verifique a chave do Gemini.',
      }))
    } finally {
      setLoadingExplicacao(null)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Analisando base de erros e radar de competências..." />
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-md p-6 glass-card border-red-500/20 text-red-400 space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
          <h2 className="text-xl font-bold">Erro de Conexão</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={handleResetSimulado}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  // ─── 1. TELA DE SETUP (CONFIGURAÇÃO) ──────────────────────────────────────────
  if (etapa === 'setup') {
    // Dados para o gráfico Recharts
    const chartData = [...historicoSimulados]
      .reverse() // Mostra em ordem cronológica no gráfico (mais antigo ao mais recente)
      .slice(-10) // Limita aos últimos 10
      .map((item, idx) => ({
        index: idx + 1,
        Aproveitamento: item.taxa,
        Data: new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      }))

    return (
      <>
        <div className="flex flex-col gap-6 max-w-6xl mx-auto py-6 px-4 animate-fade-in-up w-full">
          {/* Cabeçalho */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase tracking-wider">
              <BrainCircuit className="w-4 h-4" />
              <span>Treinamento de Elite por IA</span>
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Simulados Inteligentes IA</h1>
            <p className="text-sm text-muted-foreground">
              Enfrente a pressão do tempo em um teste feito sob medida com os assuntos em que você é mais fraco.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Card Esquerdo: Configurações */}
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
                        onClick={() => setSelectedQtd(qtd)}
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
                        onClick={() => setSelectedTempo(t)}
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
                    onClick={() => handleIniciarSimulado(selectedQtd, selectedTempo)}
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

            {/* Mobile Accordion Toggle for History */}
            {historicoSimulados.length > 0 && (
              <div className="lg:hidden w-full">
                <button
                  type="button"
                  onClick={() => setIsHistoryExpandedMobile(!isHistoryExpandedMobile)}
                  className="w-full flex items-center justify-between p-4 glass-card text-xs font-bold text-foreground cursor-pointer hover:bg-muted/30 dark:hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <span>Histórico de Simulados ({historicoSimulados.length})</span>
                  </div>
                  {isHistoryExpandedMobile ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            )}

            {/* Coluna Direita: Histórico de Simulados & Gráficos */}
            <div className={`lg:col-span-7 space-y-6 ${isHistoryExpandedMobile ? 'block animate-fade-in-up' : 'hidden lg:block'}`}>
              {historicoSimulados.length > 0 ? (
                <>
                  {/* Lista de Histórico */}
                  <div className="glass-card p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-border/50 dark:border-white/[0.04] pb-3">
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-bold text-foreground">Histórico de Simulados</h3>
                      </div>
                      <button
                        onClick={handleLimparHistorico}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpar Histórico
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                      {(verTodosHistorico ? historicoSimulados : historicoSimulados.slice(0, 5)).map((sim, index) => {
                        const dateObj = new Date(sim.data)
                        const dataFormatada = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        const tempoGastoDisplay = formatarTempo(sim.tempoGasto)
                        const mediaTempoQuestao = formatarTempo(Math.round(sim.tempoGasto / sim.total))
                        
                        let badgeColor = 'bg-red-500/10 border-red-500/20 text-red-400'
                        let badgeText = 'Abaixo da Meta'
                        if (sim.taxa >= 80) {
                          badgeColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                          badgeText = 'Excelente'
                        } else if (sim.taxa >= 70) {
                          badgeColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          badgeText = 'Aprovado'
                        }

                        return (
                          <div
                            key={sim.id || index}
                            className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-border dark:border-white/[0.04] dark:bg-white/[0.01] dark:hover:bg-white/[0.02] dark:hover:border-white/[0.08] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-xs font-bold text-foreground">
                                  {sim.qtdQuestoes} Questões
                                </span>
                                <span className="text-[10px] text-muted-foreground/60">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {dataFormatada}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>Tempo total: <strong>{tempoGastoDisplay}</strong></span>
                                <span>Média: <strong>{mediaTempoQuestao}/q</strong></span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3.5">
                              <div className="text-right">
                                <span className="text-sm font-black text-foreground tabular-nums block">
                                  {sim.acertos} / {sim.total}
                                </span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border inline-block mt-1 ${badgeColor}`}>
                                  {sim.taxa}% - {badgeText}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleIniciarSimulado(sim.qtdQuestoes, sim.tempoMinutos)}
                                  className="px-3 py-2 text-[10px] font-extrabold text-emerald-450 hover:text-emerald-350 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  title="Refazer simulado com as mesmas configurações de questões e tempo"
                                >
                                  Refazer
                                </button>

                                {sim.diagnosticoIA && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSimuladoForModal(sim)}
                                    className="px-3 py-2 text-[10px] font-extrabold text-violet-400 hover:text-violet-300 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/25 hover:border-violet-500/40 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <Sparkles className="w-3 h-3 animate-pulse" />
                                    Ver Prescrição
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {historicoSimulados.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setVerTodosHistorico(!verTodosHistorico)}
                        className="w-full py-2.5 text-center text-xs font-bold text-violet-400 hover:text-violet-300 bg-muted border border-border/60 hover:bg-muted/80 dark:bg-white/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.04] transition-all cursor-pointer mt-2"
                      >
                        {verTodosHistorico ? 'Ver menos' : `Ver todos (${historicoSimulados.length})`}
                      </button>
                    )}
                  </div>

                  {/* Painel de Estatísticas de Evolução (Sparkline) */}
                  <div className="glass-card p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-violet-400" />
                        <h3 className="text-xs font-bold text-foreground">Tendência de Aproveitamento % (Últimas 10 Sessões)</h3>
                      </div>
                    </div>

                    <div className="h-[80px] w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorAproveitamento" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const dataItem = payload[0].payload
                                return (
                                  <div className="glass-card p-2 border border-border/60 dark:border-white/10 text-[10px] shadow-xl">
                                    <p className="font-extrabold text-violet-400">{dataItem.Data}</p>
                                    <p className="font-semibold text-foreground mt-0.5">
                                      Aproveitamento: <span className="font-bold text-emerald-400">{payload[0].value}%</span>
                                    </p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="Aproveitamento"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorAproveitamento)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              ) : (
                /* Estado Vazio */
                <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-4 h-full min-h-[300px]">
                  <div className="w-14 h-14 rounded-full bg-muted/30 border border-border/50 dark:bg-white/[0.02] dark:border-white/[0.04] flex items-center justify-center text-muted-foreground/40 animate-pulse">
                    <ClipboardList className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="text-sm font-bold text-foreground">Nenhum simulado realizado ainda</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Comece o seu treinamento de elite acima para registrar o seu progresso, obter gráficos de evolução de notas e prescrições táticas da IA!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overlay Modal de Prescrição Histórica */}
        {selectedSimuladoForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="glass-card w-full max-w-2xl max-h-[85vh] flex flex-col border-violet-500/30 overflow-hidden shadow-2xl animate-scale-in relative">
              {/* Cabeçalho do Modal */}
              <div className="p-5 border-b border-border/50 flex items-center justify-between shrink-0 bg-muted/10 dark:border-white/[0.05] dark:bg-white/[0.01]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                    <BrainCircuit className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground tracking-tight">Prescrição Tática do Simulado</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Realizado em {new Date(selectedSimuladoForModal.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} • Pontuação: <strong>{selectedSimuladoForModal.acertos}/{selectedSimuladoForModal.total} ({selectedSimuladoForModal.taxa}%)</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSimuladoForModal(null)}
                  className="p-1.5 rounded-lg border border-border/60 hover:bg-muted dark:border-white/[0.08] dark:hover:bg-white/[0.08] text-muted-foreground hover:text-foreground cursor-pointer text-xs font-bold transition-all"
                >
                  Fechar
                </button>
              </div>

              {/* Conteúdo do Modal (Scrollable) */}
              <div className="p-6 overflow-y-auto flex-1 select-text scrollbar-thin">
                <MarkdownAI text={selectedSimuladoForModal.diagnosticoIA} />
              </div>

              {/* Rodapé do Modal */}
              <div className="p-4 border-t border-border/50 bg-muted/10 dark:border-white/[0.05] dark:bg-white/[0.01] shrink-0 text-right">
                <Button
                  size="sm"
                  onClick={() => setSelectedSimuladoForModal(null)}
                  className="py-2 px-4 text-xs font-bold bg-violet-650 text-white cursor-pointer rounded-xl"
                >
                  Entendido, focar nos estudos
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // ─── 2. TELA DE PROVA ATIVA (EXAM VIEW) ────────────────────────────────────────
  if (etapa === 'active') {
    const qAtual = questoesSelected[questaoAtualIndex]
    const totalQ = questoesSelected.length
    const respondidasCount = Object.keys(respostasMarcadas).length
    const isAlertTime = tempoRestante <= 120 // menos de 2 minutos

    return (
      <div className="flex flex-col gap-4 flex-1 h-full min-h-0 animate-fade-in-up">
        {/* Barra Superior Foco */}
        <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Simulado Inteligente IA</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Questão {questaoAtualIndex + 1} de {totalQ}</span>
                <span className="text-xs text-muted-foreground/60">•</span>
                <span className="text-xs text-muted-foreground">{respondidasCount} respondidas</span>
              </div>
            </div>
          </div>

          {/* Cronômetro */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${
              isAlertTime 
                ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse ring-1 ring-red-500/20' 
                : 'bg-card border border-border dark:bg-white/[0.03] dark:border-white/[0.08] text-foreground'
            }`}>
              <Timer className="w-4 h-4 shrink-0" />
              <span className="font-mono font-bold tracking-widest text-sm">{formatCountdown(tempoRestante)}</span>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (window.confirm('Tem certeza de que deseja finalizar o simulado agora? Suas respostas serão submetidas.')) {
                  handleFinalizarSimulado()
                }
              }}
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
                          onClick={() => handleMarcarResposta(id, letra)}
                          className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-violet-600/10 to-indigo-650/10 border-violet-500 text-foreground ring-1 ring-violet-500/30'
                              : 'bg-card border border-border hover:bg-muted hover:border-border text-foreground'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected 
                              ? 'bg-violet-600 border-violet-400 text-white' 
                              : 'border-border/60 text-muted-foreground'
                          }`}>
                            {letra}
                          </span>
                          <span className="text-xs pt-0.5 leading-relaxed">{cleanHtmlText(String(texto))}</span>
                        </button>
                      )
                    })}
              </div>
            </div>

            {/* Rodapé Navegação */}
            <div className="flex items-center justify-between border-t border-border/50 pt-3 shrink-0">
              <Button
                variant="ghost"
                onClick={() => setQuestaoAtualIndex(prev => Math.max(0, prev - 1))}
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
                  onClick={() => setQuestaoAtualIndex(prev => prev + 1)}
                  className="flex items-center gap-1.5 py-2 px-3 text-xs"
                >
                  Próxima <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (window.confirm('Você chegou ao fim do simulado. Deseja submeter as respostas agora?')) {
                      handleFinalizarSimulado()
                    }
                  }}
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
                {questoesSelected.map((q, idx) => {
                  const id = q.questao_id || q.id!
                  const isCurrent = idx === questaoAtualIndex
                  const isAnswered = !!respostasMarcadas[id]

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setQuestaoAtualIndex(idx)}
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
              Ao encerrar ou zerar o tempo, as tentativas serão inseridas na base de dados, impactando suas estatísticas no Dashboard.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── 3. TELA DE CARREGAMENTO PÓS-SUBMISSÃO (IA CALCULATION) ───────────────────
  if (etapa === 'submitting') {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-6 max-w-md mx-auto text-center px-4 animate-fade-in-up">
        <div className="p-4 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 animate-pulse">
          <BrainCircuit className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-foreground">Avaliando Respostas...</h2>
          <p className="text-sm text-muted-foreground">
            O Supabase está salvando sua prova e a Inteligência Artificial do Gemini está formulando o seu plano de ataque estratégico.
          </p>
        </div>
        <div className="flex items-center gap-2.5 text-violet-400 font-bold text-xs uppercase tracking-widest mt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Consultando Mentor IA...</span>
        </div>
      </div>
    )
  }

  // ─── 4. TELA DE RESULTADOS (RESULTS VIEW) ──────────────────────────────────────
  if (etapa === 'results' && pontuacao) {
    const isApproved = pontuacao.taxa >= 70

    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto py-6 px-4 animate-fade-in-up w-full">
        {/* Cabeçalho de Resultados */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/50 pb-5 shrink-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Award className="w-7 h-7 text-violet-450" />
              Resultado do Simulado
            </h1>
            <p className="text-sm text-muted-foreground">
              Exame personalizado focado nas suas fraquezas de aprendizagem finalizado.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleResetSimulado}
            className="flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold border-violet-500/20 hover:border-violet-500/40 text-violet-400 hover:text-violet-300 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Gerar Novo Simulado
          </Button>
        </div>

        {/* Cartões Estatísticos de Desempenho */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Aproveitamento */}
          <div className="glass-card p-5 flex items-center gap-4 relative overflow-hidden bg-gradient-to-r from-violet-550/[0.04] to-indigo-600/[0.04]">
            <div className={`p-3.5 rounded-xl border shrink-0 ${
              isApproved 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            }`}>
              {isApproved ? <CheckCircle2 className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Aproveitamento
              </span>
              <p className="text-2xl font-black text-foreground">{pontuacao.taxa}%</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isApproved ? 'Aproveitamento Meta Atingido!' : 'Abaixo da meta de 70%'}
              </p>
            </div>
          </div>

          {/* Acertos */}
          <div className="glass-card p-5 flex items-center gap-4 bg-gradient-to-r from-violet-550/[0.04] to-indigo-600/[0.04]">
            <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Questões Corretas
              </span>
              <p className="text-2xl font-black text-foreground">
                {pontuacao.acertos} de {pontuacao.total}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pontuacao.total - pontuacao.acertos} erros a revisar
              </p>
            </div>
          </div>

          {/* Tempo Gasto */}
          <div className="glass-card p-5 flex items-center gap-4 bg-gradient-to-r from-violet-550/[0.04] to-indigo-600/[0.04]">
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Clock className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Tempo de Resolução
              </span>
              <p className="text-2xl font-black text-foreground">
                {formatarTempo(tempoGasto)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Média de {formatarTempo(Math.round(tempoGasto / pontuacao.total))} por questão
              </p>
            </div>
          </div>
        </div>

        {/* Diagnóstico Exclusivo do Mentor IA (Gemini) */}
        <div className="glass-card border-violet-500/25 relative overflow-hidden bg-gradient-to-b from-violet-500/[0.05] via-transparent to-transparent">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between shrink-0 bg-muted/10">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-extrabold text-foreground tracking-tight">Prescrição Tática do Mentor IA</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Diagnóstico IA</span>
            </div>
          </div>

          <div className="p-6">
            {loadingFeedback ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                <span className="text-xs text-muted-foreground font-semibold">
                  O Mentor IA está analisando suas respostas erradas para formular a tática semanal...
                </span>
              </div>
            ) : (
              diagnosticoIA && <MarkdownAI text={diagnosticoIA} />
            )}
          </div>
        </div>

        {/* Revisão Detalhada das Questões */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-400" />
            Revisão Questão a Questão
          </h2>

          <div className="space-y-3.5">
            {questoesSelected.map((q, idx) => {
              const id = q.questao_id || q.id!
              const resposta = respostasMarcadas[id] || ''
              const gabarito = q.gabarito || ''
              const acertou = resposta.toUpperCase() === gabarito.toUpperCase()
              const isExpanded = activeReviewIndex === idx

              // Texto explicativo gerado localmente
              const explicacaoLocal = explicacoesRevisao[id] || q.resolucao_professor

              return (
                <div
                  key={id}
                  className={`glass-card overflow-hidden transition-all duration-200 border ${
                    acertou ? 'border-emerald-500/15 hover:border-emerald-500/25' : 'border-red-500/15 hover:border-red-500/25'
                  }`}
                >
                  {/* Cabeçalho Accordion */}
                  <button
                    type="button"
                    onClick={() => setActiveReviewIndex(isExpanded ? null : idx)}
                    className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center border shrink-0 ${
                        acertou
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground">
                            Questão {q.questao_tec_id}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">•</span>
                          <span className="text-[11px] text-muted-foreground">
                            {q.materia} &gt; {q.assunto}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Sua resposta: <strong className={acertou ? 'text-emerald-400' : 'text-red-400'}>{resposta || 'Em Branco'}</strong> | Gabarito: <strong className="text-emerald-400">{gabarito}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border hidden sm:inline-block ${
                        acertou 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {acertou ? 'ACERTOU' : 'ERROU'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Detalhes Accordion */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-border/50 space-y-4 animate-fade-in-up bg-muted/5">
                      {/* Enunciado */}
                      <div className="space-y-1.5 mt-2">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Enunciado</span>
                        <div className="p-4 rounded-xl bg-muted/15 border border-border/50 text-foreground/90 font-medium text-xs leading-relaxed whitespace-pre-wrap select-text">
                          {cleanHtmlText(q.enunciado)}
                        </div>
                      </div>

                      {/* Alternativas de revisão */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Alternativas</span>
                        <div className="space-y-1.5">
                          {Object.entries(q.alternativas || {})
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([letra, texto]) => {
                              const isCorrectOption = letra.toUpperCase() === gabarito.toUpperCase()
                              const isSelectedOption = letra.toUpperCase() === resposta.toUpperCase()

                              let borderStyle = 'border-border/40 bg-muted/5'
                              let badgeIcon = null

                              if (isCorrectOption) {
                                borderStyle = 'border-emerald-500/35 bg-emerald-500/[0.03] text-foreground'
                                badgeIcon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              } else if (isSelectedOption && !acertou) {
                                borderStyle = 'border-red-500/35 bg-red-500/[0.03] text-foreground'
                                badgeIcon = <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                              }

                              return (
                                <div
                                  key={letra}
                                  className={`p-3 rounded-lg border text-xs flex items-start gap-3 text-muted-foreground ${borderStyle}`}
                                >
                                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                    isCorrectOption
                                      ? 'bg-emerald-600 border-emerald-400 text-white'
                                      : isSelectedOption
                                      ? 'bg-red-600 border-red-400 text-white'
                                      : 'border-border/60'
                                  }`}>
                                    {letra}
                                  </span>
                                  <p className="flex-1 leading-relaxed pt-0.5">{cleanHtmlText(String(texto))}</p>
                                  {badgeIcon}
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      {/* Explicações/Resoluções */}
                      <div className="space-y-2 border-t border-border/40 dark:border-white/[0.03] pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                            Resolução do Professor
                          </span>

                          {!explicacaoLocal && (
                            <Button
                              variant="outline"
                              size="sm"
                              loading={loadingExplicacao === id}
                              onClick={() => handleGerarExplicacaoIA(q)}
                              className="text-[10px] font-extrabold py-1 px-2.5 rounded-lg border-violet-500/10 hover:border-violet-500/25 text-violet-400 flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3 h-3" />
                              Gerar Resolução com IA
                            </Button>
                          )}
                        </div>

                        {explicacaoLocal ? (
                          <div className="p-4 rounded-xl bg-violet-500/[0.02] border border-violet-500/10 select-text">
                            <MarkdownAI text={explicacaoLocal} />
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-muted/5 border border-dashed border-border dark:bg-white/[0.005] dark:border-white/[0.08] text-center text-xs text-muted-foreground/50 py-6">
                            Nenhuma resolução cadastrada para esta questão no momento. Clique acima para gerar uma com Inteligência Artificial!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return null
}
