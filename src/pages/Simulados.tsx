import { useState } from 'react'
import { useSimulados } from '../hooks/useSimulados'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { MarkdownAI } from '../components/ui/MarkdownAI'
import { gerarResolucaoProfessor } from '../services/gemini.service'
import { updateResolucaoProfessor } from '../services/supabase.service'
import type { ResolucaoView } from '../types/database'
import {
  BrainCircuit,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { SimuladoSetup } from '../components/SimuladoSetup'
import { SimuladoHistorico } from '../components/SimuladoHistorico'
import { SimuladoExamView } from '../components/SimuladoExamView'
import { SimuladoResultados } from '../components/SimuladoResultados'

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
  const [selectedSimuladoForModal, setSelectedSimuladoForModal] = useState<{
    id?: string
    data: string
    acertos: number
    total: number
    taxa: number
    diagnosticoIA?: string | null
  } | null>(null)

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
    } catch (err: unknown) {
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
    return (
      <>
        <div className="flex flex-col gap-6 max-w-6xl mx-auto py-6 px-4 animate-fade-in-up w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <SimuladoSetup
              selectedQtd={selectedQtd}
              selectedTempo={selectedTempo}
              onSelectQtd={setSelectedQtd}
              onSelectTempo={setSelectedTempo}
              onIniciarSimulado={() => handleIniciarSimulado(selectedQtd, selectedTempo)}
            />
            <SimuladoHistorico
              historico={historicoSimulados}
              verTodos={verTodosHistorico}
              onToggleVerTodos={() => setVerTodosHistorico(!verTodosHistorico)}
              isHistoryExpandedMobile={isHistoryExpandedMobile}
              onToggleHistoryMobile={() => setIsHistoryExpandedMobile(!isHistoryExpandedMobile)}
              onRefazer={(qtd, tempoMin) => handleIniciarSimulado(qtd, tempoMin)}
              onVerPrescricao={(item) => setSelectedSimuladoForModal(item)}
              onLimparHistorico={handleLimparHistorico}
            />
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
    return (
      <SimuladoExamView
        questoes={questoesSelected}
        questaoAtualIndex={questaoAtualIndex}
        onSetQuestaoAtualIndex={setQuestaoAtualIndex}
        respostasMarcadas={respostasMarcadas}
        onMarcarResposta={handleMarcarResposta}
        tempoRestante={tempoRestante}
        onFinalizarSimulado={() => {
          if (window.confirm('Tem certeza de que deseja finalizar o simulado agora? Suas respostas serão submetidas.')) {
            handleFinalizarSimulado()
          }
        }}
      />
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
    return (
      <SimuladoResultados
        pontuacao={pontuacao}
        tempoGasto={tempoGasto}
        questoes={questoesSelected}
        respostasMarcadas={respostasMarcadas}
        diagnosticoIA={diagnosticoIA}
        loadingFeedback={loadingFeedback}
        activeReviewIndex={activeReviewIndex}
        onToggleReview={(idx) => setActiveReviewIndex(idx)}
        explicacoesRevisao={explicacoesRevisao}
        loadingExplicacao={loadingExplicacao}
        onGerarExplicacao={handleGerarExplicacaoIA}
        onReset={handleResetSimulado}
      />
    )
  }

  return null
}
