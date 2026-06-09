import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRevisao } from '../hooks/useRevisao'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { 
  BookOpen, 
  CheckCircle2,
  Play,
  Layers,
  BookOpenCheck, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react'
import { RevisaoStatsCards } from '../components/RevisaoStatsCards'
import { RevisaoFilterBar } from '../components/RevisaoFilterBar'
import { RevisaoFocusView } from '../components/RevisaoFocusView'
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

    return (
      <RevisaoFocusView
        questaoAtual={questaoAtual}
        materiaParam={materiaParam}
        assuntoParam={assuntoParam}
        activeInFilterIndex={activeInFilterIndex}
        totalFiltrados={errosFiltrados.length}
        alternativaSelecionada={alternativaSelecionada}
        onSelectAlternativa={setAlternativaSelecionada}
        revelado={revelado}
        resolucaoExpanded={resolucaoExpanded}
        onToggleResolucao={() => setResolucaoExpanded(!resolucaoExpanded)}
        editingResolucao={editingResolucao}
        onStartEditResolucao={() => setEditingResolucao(true)}
        onCancelEditResolucao={() => {
          setResolucaoText(questaoAtual?.resolucao_professor || '')
          setEditingResolucao(false)
        }}
        resolucaoText={resolucaoText}
        onResolucaoTextChange={setResolucaoText}
        onSaveResolucao={handleSaveResolucao}
        savingResolucao={savingResolucao}
        explicacaoAtual={explicacaoAtual}
        onExplicacaoIA={handleExplicacaoIA}
        loadingExplicacao={loadingExplicacao}
        onVoltar={() => setSearchParams({})}
        onAnterior={() => {
          const prev = errosFiltrados[activeInFilterIndex - 1]
          const idx = erros.findIndex(e => e.questao_tec_id === prev.questao_tec_id)
          if (idx !== -1) { setQuestaoAtualIndex(idx); setAlternativaSelecionada(null) }
        }}
        onProxima={() => {
          const next = errosFiltrados[activeInFilterIndex + 1]
          const idx = erros.findIndex(e => e.questao_tec_id === next.questao_tec_id)
          if (idx !== -1) { setQuestaoAtualIndex(idx); setAlternativaSelecionada(null) }
        }}
        onResponder={() => handleConfirmarResposta(0)}
        podeAnterior={activeInFilterIndex > 0}
        podeProxima={activeInFilterIndex < errosFiltrados.length - 1}
        salvandoResposta={salvandoResposta}
        onClassificar={handleClassificar}
        obterPrazos={obterPrazosEstimados}
      />
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

      <RevisaoStatsCards
        totalPendentes={stats.totalPendentes}
        totalMaterias={stats.totalMaterias}
        totalAssuntos={stats.totalAssuntos}
      />

      <RevisaoFilterBar
        busca={busca}
        onBuscaChange={setBusca}
        ordenacao={ordenacao}
        onOrdenacaoChange={setOrdenacao}
      />

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
