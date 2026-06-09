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
  BrainCircuit,
  CheckCircle2,
  XCircle,
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
} from 'lucide-react'
import { SimuladoSetup } from '../components/SimuladoSetup'
import { SimuladoHistorico } from '../components/SimuladoHistorico'
import { SimuladoExamView } from '../components/SimuladoExamView'

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
