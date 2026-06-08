import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRevisao } from '../hooks/useRevisao'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Button } from '../components/ui/Button'
import { MarkdownAI } from '../components/ui/MarkdownAI'
import { cleanHtmlText } from '../lib/cleanHtml'
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ArrowLeft,
  ChevronLeft,
  Play,
  Layers,
  BrainCircuit, 
  ExternalLink, 
  Search, 
  Filter, 
  BookOpenCheck, 
  Book, 
  Pencil, 
  Check, 
  Loader2, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react'
import { updateResolucaoProfessor } from '../services/supabase.service'
import type { ResolucaoView } from '../types/database'

interface AssuntoGrupo {
  nome: string
  quantidade: number
  erros: ResolucaoView[]
}

interface MateriaGrupo {
  materia: string
  assuntos: AssuntoGrupo[]
  quantidadeTotal: number
  maisRecente: number
}



export function Revisao() {
  const {
    loading,
    erros,
    questaoAtual,
    setQuestaoAtualIndex,
    totalErros,
    alternativaSelecionada,
    setAlternativaSelecionada,
    revelado,
    salvandoResposta,
    explicacaoAtual,
    loadingExplicacao,
    handleConfirmarResposta,
    handleExplicacaoIA,
    handleClassificar,
    obterPrazosEstimados,
  } = useRevisao()

  // Parâmetros de busca da URL
  const [searchParams, setSearchParams] = useSearchParams()
  const materiaParam = searchParams.get('materia')
  const assuntoParam = searchParams.get('assunto')

  // Estados locais de Filtro, Busca e Ordenação
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<'mais_erros' | 'mais_recentes' | 'alfabetica'>('mais_erros')
  const [collapsedMaterias, setCollapsedMaterias] = useState<Record<string, boolean>>(() => {
    try {
      const cached = sessionStorage.getItem('revisao_collapsed_materias')
      return cached ? JSON.parse(cached) : {}
    } catch {
      return {}
    }
  })

  // Estado para armazenar a contagem inicial de erros por matéria na sessão atual
  const [initialCounts, setInitialCounts] = useState<Record<string, number>>({})

  // Inicializa o initialCounts apenas uma vez quando o carregamento termina
  useEffect(() => {
    if (!loading && erros.length > 0 && Object.keys(initialCounts).length === 0) {
      const counts: Record<string, number> = {}
      erros.forEach(e => {
        const mat = e.materia || 'Sem Matéria'
        counts[mat] = (counts[mat] || 0) + 1
      })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialCounts(counts)
    }
  }, [loading, erros, initialCounts])

  const toggleMateriaCollapse = (materia: string) => {
    setCollapsedMaterias(prev => {
      const updated = { ...prev, [materia]: !prev[materia] }
      sessionStorage.setItem('revisao_collapsed_materias', JSON.stringify(updated))
      return updated
    })
  }

  // Estados locais para a Resolução do Professor
  const [resolucaoExpanded, setResolucaoExpanded] = useState(false)
  const [editingResolucao, setEditingResolucao] = useState(false)
  const [resolucaoText, setResolucaoText] = useState('')
  const [savingResolucao, setSavingResolucao] = useState(false)

  // Sincroniza o texto e expansão da resolução ao carregar/navegar questão ou responder
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (questaoAtual) {
      setResolucaoText(questaoAtual.resolucao_professor || '')
      setEditingResolucao(false)
      if (revelado) {
        setResolucaoExpanded(!!questaoAtual.resolucao_professor)
      } else {
        setResolucaoExpanded(false)
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [questaoAtual, revelado])

  const handleSaveResolucao = async () => {
    if (!questaoAtual || !questaoAtual.questao_id) return
    setSavingResolucao(true)
    try {
      await updateResolucaoProfessor(questaoAtual.questao_id, resolucaoText)
      setEditingResolucao(false)
    } catch (err: unknown) {
      console.error('Erro ao salvar resolução:', err)
      alert('Erro ao salvar a resolução do professor. Verifique sua conexão.')
    } finally {
      setSavingResolucao(false)
    }
  }

  // Filtramos os erros com base no parâmetro de matéria e assunto se houver
  const errosFiltrados = useMemo(() => {
    if (materiaParam && assuntoParam) {
      return erros.filter(e => e.materia === materiaParam && e.assunto === assuntoParam)
    }
    return erros
  }, [erros, materiaParam, assuntoParam])

  // Encontra qual é a questão ativa dentro de errosFiltrados
  const activeInFilterIndex = useMemo(() => {
    if (!questaoAtual || errosFiltrados.length === 0) return -1
    return errosFiltrados.findIndex(e => e.questao_tec_id === questaoAtual.questao_tec_id)
  }, [errosFiltrados, questaoAtual])

  // Mantém a questão ativa síncrona com os filtros do modo de foco
  useEffect(() => {
    if (materiaParam && assuntoParam && errosFiltrados.length > 0) {
      const isCurrentInFilter = errosFiltrados.some(e => e.questao_tec_id === questaoAtual?.questao_tec_id)
      if (!isCurrentInFilter) {
        const targetIndex = erros.findIndex(e => e.questao_tec_id === errosFiltrados[0].questao_tec_id)
        if (targetIndex !== -1) {
          setQuestaoAtualIndex(targetIndex)
          setAlternativaSelecionada(null)
        }
      }
    }
  }, [materiaParam, assuntoParam, errosFiltrados, questaoAtual, erros, setQuestaoAtualIndex, setAlternativaSelecionada])

  // Agrupamento dos erros por matéria e assunto para o modo grade
  const errosPorMateriaEAssunto = useMemo(() => {
    const map: Record<string, Record<string, ResolucaoView[]>> = {}
    
    erros.forEach(e => {
      const mat = e.materia || 'Sem Matéria'
      const ass = e.assunto || 'Sem Assunto'
      
      const textoBusca = busca.toLowerCase().trim()
      const matchesTexto = !textoBusca || 
        (e.enunciado && e.enunciado.toLowerCase().includes(textoBusca)) ||
        (e.questao_tec_id && String(e.questao_tec_id).includes(textoBusca)) ||
        (e.assunto && e.assunto.toLowerCase().includes(textoBusca)) ||
        (e.banca_texto && e.banca_texto.toLowerCase().includes(textoBusca))
        
      if (!matchesTexto) return

      if (!map[mat]) map[mat] = {}
      if (!map[mat][ass]) map[mat][ass] = []
      map[mat][ass].push(e)
    })

    const list: MateriaGrupo[] = Object.entries(map).map(([materia, assuntosMap]) => {
      const assuntos: AssuntoGrupo[] = Object.entries(assuntosMap).map(([nome, listaErros]) => ({
        nome,
        quantidade: listaErros.length,
        erros: listaErros
      })).sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome))

      const quantidadeTotal = assuntos.reduce((sum, ass) => sum + ass.quantidade, 0)
      
      const maisRecente = assuntos.reduce((latest: number, ass: AssuntoGrupo) => {
        const d = ass.erros.reduce((latestD: number, curr: ResolucaoView) => {
          const time = curr.data_resolucao ? new Date(curr.data_resolucao).getTime() : 0
          return time > latestD ? time : latestD
        }, 0)
        return d > latest ? d : latest
      }, 0)

      return {
        materia,
        assuntos,
        quantidadeTotal,
        maisRecente
      }
    })

    list.sort((a, b) => {
      if (ordenacao === 'mais_erros') {
        return b.quantidadeTotal - a.quantidadeTotal
      }
      if (ordenacao === 'mais_recentes') {
        return b.maisRecente - a.maisRecente
      }
      return a.materia.localeCompare(b.materia)
    })

    return list
  }, [erros, busca, ordenacao])

  // Estatísticas globais do caderno de erros
  const stats = useMemo(() => {
    const totalPendentes = erros.length
    const totalMaterias = new Set(erros.map(e => e.materia || 'Sem Matéria')).size
    
    const assuntosSet = new Set<string>()
    erros.forEach(e => {
      assuntosSet.add(`${e.materia || 'Sem Matéria'} | ${e.assunto || 'Sem Assunto'}`)
    })
    const totalAssuntos = assuntosSet.size

    return {
      totalPendentes,
      totalMaterias,
      totalAssuntos
    }
  }, [erros])

  if (loading) return <LoadingSpinner />

  if (totalErros === 0) {
    return (
      <div className="space-y-6 animate-fade-in-up flex flex-col h-full items-center justify-center max-w-2xl mx-auto text-center px-4">
        <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2 animate-scale-in">
          <BookOpenCheck className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Caderno de Erros Vazio</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Excelente trabalho! Você não tem erros pendentes para revisar no momento.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
          Continue resolvendo questões no TEC Concursos. Seus futuros erros serão sincronizados aqui de forma automática.
        </p>
      </div>
    )
  }

  // Path A: Modo de Foco (Questão Única Ampliada)
  if (materiaParam && assuntoParam) {
    if (errosFiltrados.length === 0) {
      return (
        <div className="flex flex-col gap-4 h-full min-h-0 flex-1 justify-center items-center">
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4 animate-fade-in-up">
            <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-scale-in">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h2 className="text-xl font-black text-foreground tracking-tight">Tópico Concluído!</h2>
            <p className="text-sm text-muted-foreground">
              Parabéns! Todos os erros pendentes para o assunto <strong className="text-foreground">{assuntoParam}</strong> foram revisados com sucesso.
            </p>
            <button
              onClick={() => setSearchParams({})}
              className="px-6 py-2.5 bg-violet-650 hover:bg-violet-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md cursor-pointer active:scale-95 transition-all font-bold"
            >
              Voltar ao Caderno de Erros
            </button>
          </div>
        </div>
      )
    }

    const alternativas = questaoAtual
      ? Object.entries(questaoAtual.alternativas || {}).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      : []

    return (
      <div className="flex flex-col gap-4 h-full min-h-0 flex-1">
        {/* Cabeçalho de Navegação e Foco */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-border/50 dark:border-white/[0.05] shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/20 border border-border/60 hover:bg-muted/40 hover:border-border text-muted-foreground hover:text-foreground dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:bg-white/[0.06] dark:hover:border-white/[0.15] rounded-lg text-xs font-black transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Caderno
          </button>
          
          <div className="flex flex-col items-center text-center min-w-0">
            <span className="text-[10px] text-violet-400 font-black uppercase tracking-wider">Modo de Foco</span>
            <h2 className="text-xs text-foreground font-extrabold truncate max-w-[280px] sm:max-w-[450px]" title={`${materiaParam} > ${assuntoParam}`}>
              {materiaParam} &rsaquo; {assuntoParam}
            </h2>
          </div>

          <div className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-black">
            {activeInFilterIndex + 1} de {errosFiltrados.length}
          </div>
        </div>

        {/* Workspace Centralizado e Ampliado (Largura Foco) */}
        {questaoAtual ? (
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-12">
            <div className="max-w-4xl mx-auto w-full space-y-6 pt-4">
              
              {/* Card Principal da Questão */}
              <div className="glass-card flex flex-col overflow-hidden">
                
                {/* Cabeçalho Inline da Questão */}
                <div className="p-4 border-b border-border/50 bg-muted/10 dark:border-white/[0.05] dark:bg-white/[0.01] flex items-center justify-between gap-3 flex-wrap text-[11px] font-black shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-primary font-black">QUESTÃO ATIVA</span>
                    <a
                      href={`https://www.tecconcursos.com.br/questoes/${questaoAtual.questao_tec_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 px-2 py-0.5 rounded-lg border border-sky-500/20 transition-all cursor-pointer"
                      title="Abrir questão original no TEC Concursos"
                    >
                      Q{questaoAtual.questao_tec_id}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="bg-muted/30 px-2 py-0.5 rounded-lg text-muted-foreground border border-border/50 dark:bg-white/[0.04] dark:border-white/[0.05] truncate max-w-[150px]">
                      {questaoAtual.banca_texto}
                    </span>
                    <span className="bg-muted/30 px-2 py-0.5 rounded-lg text-muted-foreground border border-border/50 dark:bg-white/[0.04] dark:border-white/[0.05]">
                      {questaoAtual.ano}
                    </span>
                  </div>

                  <div className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                    Q{questaoAtual.questao_tec_id}
                  </div>
                </div>

                {/* Corpo do Conteúdo */}
                <div className="p-6 md:p-8 space-y-6">
                  
                  {/* Enunciado */}
                  <p className="text-foreground leading-relaxed text-sm font-medium whitespace-pre-line bg-card/40 rounded-xl select-text">
                    {cleanHtmlText(questaoAtual.enunciado)}
                  </p>

                  {/* Alternativas */}
                  <div className="grid grid-cols-1 gap-2.5 pt-2">
                    {alternativas.map(([letra, texto]) => {
                      const isSelected = alternativaSelecionada === letra
                      const isCorrect = questaoAtual.gabarito === letra

                      let barStyles = "border-border hover:border-border/80 bg-card dark:border-white/[0.05] dark:hover:border-white/[0.1] dark:bg-white/[0.01]"
                      let circleStyles = "bg-muted text-muted-foreground font-bold border border-border dark:bg-white/[0.04] dark:border-white/[0.06]"
                      
                      if (revelado) {
                        if (isCorrect) {
                          barStyles = "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold"
                          circleStyles = "bg-emerald-500 text-white font-extrabold border border-emerald-600 animate-pulse"
                        } else if (isSelected && !isCorrect) {
                          barStyles = "border-red-500 bg-red-500/10 dark:bg-red-500/15 text-red-700 dark:text-red-300"
                          circleStyles = "bg-red-500 text-white font-extrabold border border-red-650"
                        } else {
                          barStyles = "border-border/30 opacity-40 bg-muted/10 dark:border-white/[0.03] dark:bg-white/[0.01]"
                          circleStyles = "bg-muted/20 text-muted-foreground/60 font-semibold border border-border/30 dark:bg-white/[0.02] dark:text-muted-foreground dark:border-white/[0.03]"
                        }
                      } else if (isSelected) {
                        barStyles = "border-violet-500 bg-violet-650/15 font-bold ring-1 ring-violet-500/30"
                        circleStyles = "bg-violet-650 text-white font-black border border-violet-500"
                      }

                      return (
                        <button
                          key={letra}
                          disabled={revelado}
                          onClick={() => setAlternativaSelecionada(letra)}
                          className={`w-full flex items-start gap-4 p-3.5 rounded-xl border text-left text-xs transition-all duration-200 leading-relaxed group cursor-pointer ${barStyles}`}
                        >
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all ${circleStyles}`}>
                            {letra}
                          </span>
                          <span className="flex-1 mt-0.5 text-foreground font-medium group-hover:text-foreground">
                            {cleanHtmlText(String(texto))}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Card de Resolução do Professor */}
                  <div className="bg-muted/10 border border-border/60 dark:bg-white/[0.02] dark:border-white/[0.05] rounded-xl overflow-hidden flex flex-col mt-4">
                    {/* Header */}
                    <div 
                      onClick={() => setResolucaoExpanded(!resolucaoExpanded)}
                      className="px-5 py-3.5 bg-muted/5 border-b border-border/60 dark:bg-white/[0.01] dark:border-b dark:border-white/[0.05] flex items-center justify-between cursor-pointer select-none hover:bg-muted/20 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                        <Book className="w-4.5 h-4.5 text-amber-500 fill-amber-500/10" />
                        <span>Resolução do Professor</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {resolucaoExpanded && !editingResolucao && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingResolucao(true)
                            }}
                            className="p-1 px-2 text-muted-foreground hover:text-amber-400 hover:bg-muted/30 dark:hover:bg-white/[0.05] rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                            title="Editar Resolução"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        )}
                        <span className="text-muted-foreground text-xs font-bold">
                          {resolucaoExpanded ? 'Ocultar ▲' : 'Mostrar ▼'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    {resolucaoExpanded && (
                      <div className="p-5 space-y-4 animate-in fade-in duration-200">
                        {editingResolucao ? (
                          <div className="space-y-3">
                            <textarea
                              value={resolucaoText}
                              onChange={(e) => setResolucaoText(e.target.value)}
                              placeholder="Digite a resolução detalhada do professor para esta questão..."
                              className="w-full min-h-[150px] p-3 text-xs border border-border/80 focus:border-primary bg-card dark:border-white/[0.08] dark:bg-white/[0.01] font-medium text-foreground shadow-inner resize-y leading-relaxed focus:outline-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setResolucaoText(questaoAtual.resolucao_professor || '')
                                  setEditingResolucao(false)
                                }}
                                disabled={savingResolucao}
                                className="px-3 py-1.5 border border-border/80 hover:bg-muted/30 dark:border-white/[0.08] dark:hover:bg-white/[0.05] text-foreground rounded-lg text-xxs font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSaveResolucao}
                                disabled={savingResolucao}
                                className="px-3 py-1.5 bg-violet-650 hover:bg-violet-700 text-white rounded-lg text-xxs font-black uppercase tracking-wider transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer font-bold"
                              >
                                {savingResolucao ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Salvando...</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Salvar</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-foreground leading-relaxed text-xs font-semibold select-text">
                            {resolucaoText ? (
                              <MarkdownAI text={resolucaoText} />
                            ) : (
                              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2 border border-dashed border-border rounded-xl bg-muted/10 dark:border-white/[0.08] dark:bg-white/[0.01]">
                                <Book className="w-8 h-8 text-muted-foreground/50" />
                                <span className="text-[11px] font-bold">Nenhuma resolução cadastrada para esta questão.</span>
                                <button
                                  onClick={() => setEditingResolucao(true)}
                                  className="mt-1 flex items-center gap-1 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 rounded-lg text-xxs font-extrabold transition-all cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Adicionar Resolução</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Caixa de Explicação IA se carregada */}
                  {explicacaoAtual && explicacaoAtual !== resolucaoText && (
                    <div className="bg-violet-600/[0.05] border border-violet-500/10 rounded-xl p-5 mt-6 animate-in slide-in-from-bottom-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-violet-400 font-black text-xs uppercase shrink-0">
                        <BrainCircuit className="w-5 h-5 text-violet-400 shrink-0" />
                        <span>Explicação do Mentor IA</span>
                      </div>
                      <div className="text-[13px] text-foreground/90 select-text font-medium">
                        <MarkdownAI text={explicacaoAtual} />
                      </div>
                    </div>
                  )}

                </div>

                {/* Rodapé do Card e Ações */}
                <div className="p-4 bg-muted/20 border-t border-border/50 dark:bg-white/[0.02] dark:border-t dark:border-white/[0.05] flex items-center justify-between shrink-0 gap-4 flex-wrap sm:flex-nowrap">
                  <div>
                    {revelado && (
                      <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                        {alternativaSelecionada === questaoAtual.gabarito ? (
                          <>
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400">Você acertou!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4.5 h-4.5 text-red-500 dark:text-red-400" />
                            <span className="text-red-650 dark:text-red-400">Você errou novamente.</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
                    {/* Navegação Manual (Chevron) */}
                    <div className="flex items-center gap-1.5 border-r border-border/50 dark:border-white/[0.08] pr-3 mr-1">
                      <button
                        disabled={activeInFilterIndex === 0}
                        onClick={() => {
                          const prevQuestao = errosFiltrados[activeInFilterIndex - 1]
                          const idx = erros.findIndex(e => e.questao_tec_id === prevQuestao.questao_tec_id)
                          if (idx !== -1) {
                            setQuestaoAtualIndex(idx)
                            setAlternativaSelecionada(null)
                          }
                        }}
                        className="p-1.5 border border-border/80 hover:bg-muted/30 dark:border-white/[0.08] dark:hover:bg-white/[0.05] text-muted-foreground hover:text-foreground rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Questão Anterior"
                      >
                        <ChevronLeft className="w-4.5 h-4.5" />
                      </button>
                      <button
                        disabled={activeInFilterIndex === errosFiltrados.length - 1}
                        onClick={() => {
                          const nextQuestao = errosFiltrados[activeInFilterIndex + 1]
                          const idx = erros.findIndex(e => e.questao_tec_id === nextQuestao.questao_tec_id)
                          if (idx !== -1) {
                            setQuestaoAtualIndex(idx)
                            setAlternativaSelecionada(null)
                          }
                        }}
                        className="p-1.5 border border-border/80 hover:bg-muted/30 dark:border-white/[0.08] dark:hover:bg-white/[0.05] text-muted-foreground hover:text-foreground rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                        title="Próxima Questão"
                      >
                        <ChevronRight className="w-4.5 h-4.5" />
                      </button>
                    </div>

                    {!explicacaoAtual && (
                      <Button 
                        variant="secondary"
                        onClick={handleExplicacaoIA}
                        loading={loadingExplicacao}
                        icon={<BrainCircuit className="w-4.5 h-4.5 text-violet-400" />}
                      >
                        Me Explique (IA)
                      </Button>
                    )}

                    {!revelado ? (
                      <Button
                        onClick={() => handleConfirmarResposta(0)}
                        disabled={!alternativaSelecionada || salvandoResposta}
                        loading={salvandoResposta}
                      >
                        Responder
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {alternativaSelecionada === questaoAtual.gabarito ? (
                          <>
                            {/* Classificações SM-2 estilo Anki */}
                            {(() => {
                              const prazos = obterPrazosEstimados(questaoAtual.questao_id || questaoAtual.id)
                              return (
                                <>
                                  <button
                                    onClick={() => handleClassificar(2)}
                                    className="px-3.5 py-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer"
                                  >
                                    Difícil ({prazos.dificil}d)
                                  </button>
                                  <button
                                    onClick={() => handleClassificar(4)}
                                    className="px-3.5 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer"
                                  >
                                    Bom ({prazos.bom}d)
                                  </button>
                                  <button
                                    onClick={() => handleClassificar(5)}
                                    className="px-3.5 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition-all hover:scale-[1.02] cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                  >
                                    Fácil ({prazos.facil}d)
                                  </button>
                                </>
                              )
                            })()}
                          </>
                        ) : (
                          <button
                            onClick={() => handleClassificar(2)}
                            className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/10 transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
                          >
                            Rever amanhã (1d)
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        ) : (
          <div className="glass-card flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-sm italic">
            Questão não localizada.
          </div>
        )}
      </div>
    )
  }

  // Path B: Visão de Grade Geral
  return (
    <div className="flex flex-col gap-6 h-full min-h-0 flex-1 pb-12">
      
      {/* Header Inline */}
      <div className="flex items-center justify-between shrink-0 animate-fade-in-up">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-black text-foreground tracking-tight">Caderno de Erros</h1>
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Treine seu cérebro nas questões que você falhou
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-350 text-xs font-black animate-scale-in">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{totalErros === 1 ? '1 erro pendente' : `${totalErros} erros pendentes`}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        
        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Erros Pendentes</span>
            <h3 className="text-xl font-black text-foreground mt-0.5">{stats.totalPendentes}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Repetição Espaçada Ativa</p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Layers className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Matérias</span>
            <h3 className="text-xl font-black text-foreground mt-0.5">{stats.totalMaterias}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Com erros no histórico</p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Book className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Tópicos com Erro</span>
            <h3 className="text-xl font-black text-foreground mt-0.5">{stats.totalAssuntos}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Assuntos distintos</p>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <BookOpenCheck className="w-5.5 h-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Método de Estudo</span>
            <h3 className="text-xs font-black text-foreground mt-1 truncate">Algoritmo SM-2</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Revisão inteligente (Anki)</p>
          </div>
        </div>

      </div>

      {/* Barra de Filtro e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por assunto, banca, ID..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border hover:border-border/80 focus:border-violet-500 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none font-medium dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:border-white/[0.15]"
          />
        </div>

        <div className="relative w-full sm:w-auto shrink-0 flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider whitespace-nowrap">Ordenar por:</span>
          <div className="relative">
            <Filter className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={ordenacao}
              onChange={e => setOrdenacao(e.target.value as 'mais_erros' | 'mais_recentes' | 'alfabetica')}
              className="pl-8 pr-8 py-2 bg-card border border-border hover:border-border/80 focus:border-violet-500 rounded-xl text-xs text-foreground transition-colors focus:outline-none font-medium appearance-none cursor-pointer dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:border-white/[0.15]"
            >
              <option value="mais_erros" className="bg-card text-foreground">Mais erros</option>
              <option value="mais_recentes" className="bg-card text-foreground">Mais recentes</option>
              <option value="alfabetica" className="bg-card text-foreground">Matéria A-Z</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid de Matérias (Accordions) */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
        {errosPorMateriaEAssunto.map((grupo) => {
          const isCollapsed = !!collapsedMaterias[grupo.materia]
          const totalOriginal = initialCounts[grupo.materia] || grupo.quantidadeTotal
          const revisadasCount = Math.max(0, totalOriginal - grupo.quantidadeTotal)
          const progress = Math.round((revisadasCount / totalOriginal) * 100)

          return (
            <div key={grupo.materia} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-all">
              
              {/* Accordion Header */}
              <div
                onClick={() => toggleMateriaCollapse(grupo.materia)}
                className={`p-5 flex items-center justify-between cursor-pointer select-none transition-colors hover:bg-card/45 ${
                  !isCollapsed ? 'bg-muted/30 border-b border-border/80' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-extrabold text-foreground truncate max-w-lg">
                      {grupo.materia}
                    </h2>
                    
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                      {grupo.quantidadeTotal} {grupo.quantidadeTotal === 1 ? 'erro pendente' : 'erros pendentes'}
                    </span>

                    {progress > 0 && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Progresso: {progress}%
                      </span>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full max-w-xs bg-muted/40 rounded-full h-1 mt-3 overflow-hidden border border-border/30 dark:bg-white/[0.04] dark:border-white/[0.02]">
                    <div 
                      className="bg-gradient-to-r from-violet-500 to-indigo-650 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="ml-4 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Accordion Content (Grid of Cards) */}
              {!isCollapsed && (
                <div className="p-5 bg-background/50 dark:bg-black/20 border-t border-border animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {grupo.assuntos.map((assunto) => {
                      return (
                        <div
                          key={assunto.nome}
                          className="bg-card border border-border hover:border-violet-500/50 p-4 rounded-xl flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all group min-h-[120px]"
                        >
                          <div className="space-y-2">
                            <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug line-clamp-2" title={assunto.nome}>
                              {assunto.nome}
                            </h3>
                            
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-red-500/10 text-red-400 border-red-500/20 w-fit flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {assunto.quantidade} {assunto.quantidade === 1 ? 'erro' : 'erros'}
                            </span>
                          </div>

                          <button
                            onClick={() => setSearchParams({ materia: grupo.materia, assunto: assunto.nome })}
                            className="w-full py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>Resolver Erros</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          )
        })}

        {errosPorMateriaEAssunto.length === 0 && (
          <div className="h-full flex items-center justify-center text-center p-12 text-muted-foreground text-sm italic flex-col gap-2 border border-dashed border-border rounded-2xl bg-muted/10 dark:border-white/[0.08] dark:bg-white/[0.01]">
            <Layers className="w-12 h-12 text-muted-foreground/30" />
            <span>Nenhum erro encontrado com a busca/filtros atuais.</span>
          </div>
        )}
      </div>

    </div>
  )
}
