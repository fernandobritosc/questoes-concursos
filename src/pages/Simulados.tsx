import { useState } from 'react'
import { useSimulados } from '../hooks/useSimulados'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { MarkdownAI } from '../components/ui/MarkdownAI'
import { formatarTempo } from '../hooks/useDashboard'
import { gerarResolucaoProfessor } from '../services/gemini.service'
import { updateResolucaoProfessor } from '../services/supabase.service'
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
  ChevronUp
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
    handleIniciarSimulado,
    handleMarcarResposta,
    handleFinalizarSimulado,
    handleResetSimulado,
  } = useSimulados()

  // Estados locais para configuração da prova
  const [selectedQtd, setSelectedQtd] = useState(10)
  const [selectedTempo, setSelectedTempo] = useState(15)

  // Controle de acordions de revisão
  const [activeReviewIndex, setActiveReviewIndex] = useState<number | null>(null)
  
  // Resoluções de IA geradas localmente na revisão
  const [explicacoesRevisao, setExplicacoesRevisao] = useState<Record<number, string>>({})
  const [loadingExplicacao, setLoadingExplicacao] = useState<number | null>(null)

  // Solicita explicação da IA para uma questão específica no painel de revisão
  const handleGerarExplicacaoIA = async (q: any) => {
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
    return (
      <div className="flex flex-col gap-6 max-w-4xl mx-auto py-6 px-4 animate-fade-in-up w-full">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Esquerdo: Configurações */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card p-6 space-y-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
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
                          : 'bg-white/[0.02] border-white/[0.05] text-muted-foreground hover:bg-white/[0.05] hover:border-white/[0.1] hover:text-foreground'
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
                          : 'bg-white/[0.02] border-white/[0.05] text-muted-foreground hover:bg-white/[0.05] hover:border-white/[0.1] hover:text-foreground'
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
          </div>

          {/* Card Direito: Como Funciona */}
          <div className="space-y-6">
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
                  Desses tópicos fracos, a IA monta um caderno com questões misturadas de nível de concurso para te desafiar.
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
        </div>
      </div>
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
                : 'bg-white/[0.03] border-white/[0.08] text-foreground'
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
              <div className="flex flex-wrap gap-2 items-center text-xs border-b border-white/[0.04] pb-3 shrink-0">
                <span className="px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-300 font-bold border border-violet-500/10">
                  {qAtual.materia}
                </span>
                {qAtual.assunto && (
                  <span className="px-2.5 py-1 rounded-md bg-white/[0.04] text-muted-foreground border border-white/[0.05]">
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
              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] text-foreground/90 font-medium text-sm leading-relaxed whitespace-pre-wrap select-text">
                {qAtual?.enunciado}
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
                              : 'bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected 
                              ? 'bg-violet-600 border-violet-400 text-white' 
                              : 'border-white/[0.15] text-muted-foreground'
                          }`}>
                            {letra}
                          </span>
                          <span className="text-xs pt-0.5 leading-relaxed">{texto}</span>
                        </button>
                      )
                    })}
              </div>
            </div>

            {/* Rodapé Navegação */}
            <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 shrink-0">
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
                          : 'bg-white/[0.01] border-white/[0.05] text-muted-foreground/60 hover:bg-white/[0.04]'
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
            <div className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] text-[10px] text-muted-foreground/80 leading-relaxed shrink-0">
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.05] pb-5 shrink-0">
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
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between shrink-0 bg-white/[0.01]">
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
                    className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors cursor-pointer"
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
                    <div className="px-5 pb-5 pt-1 border-t border-white/[0.03] space-y-4 animate-fade-in-up bg-white/[0.005]">
                      {/* Enunciado */}
                      <div className="space-y-1.5 mt-2">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Enunciado</span>
                        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] text-foreground/90 font-medium text-xs leading-relaxed whitespace-pre-wrap select-text">
                          {q.enunciado}
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

                              let borderStyle = 'border-white/[0.04] bg-white/[0.005]'
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
                                      : 'border-white/10'
                                  }`}>
                                    {letra}
                                  </span>
                                  <p className="flex-1 leading-relaxed pt-0.5">{texto}</p>
                                  {badgeIcon}
                                </div>
                              )
                            })}
                        </div>
                      </div>

                      {/* Explicações/Resoluções */}
                      <div className="space-y-2 border-t border-white/[0.03] pt-4">
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
                          <div className="p-4 rounded-xl bg-white/[0.005] border border-dashed border-white/[0.08] text-center text-xs text-muted-foreground/50 py-6">
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
