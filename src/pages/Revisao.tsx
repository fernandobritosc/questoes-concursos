import { useState, useMemo, useEffect } from 'react'
import { useRevisao } from '../hooks/useRevisao'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Button } from '../components/ui/Button'
import { MarkdownAI } from '../components/ui/MarkdownAI'
import { cleanHtmlText } from '../lib/cleanHtml'
import { BookOpen, CheckCircle2, XCircle, ArrowRight, BrainCircuit, ExternalLink, Search, Filter, BookOpenCheck, Book, Pencil, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { updateResolucaoProfessor } from '../services/supabase.service'

export function Revisao() {
  const {
    loading,
    erros,
    questaoAtual,
    questaoAtualIndex,
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

  // Estados locais de Filtro, Busca e Ordenação
  const [busca, setBusca] = useState('')
  const [materiaFiltro, setMateriaFiltro] = useState('')
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
    if (questaoAtual) {
      setResolucaoText(questaoAtual.resolucao_professor || '')
      setEditingResolucao(false)
      if (revelado) {
        setResolucaoExpanded(!!questaoAtual.resolucao_professor)
      } else {
        setResolucaoExpanded(false)
      }
    }
  }, [questaoAtual, revelado])

  const handleSaveResolucao = async () => {
    if (!questaoAtual || !questaoAtual.questao_id) return
    setSavingResolucao(true)
    try {
      // Atualiza a resolução do professor na tabela 'questoes'
      await updateResolucaoProfessor(questaoAtual.questao_id, resolucaoText)
      // Atualiza no cache local da sessão
      questaoAtual.resolucao_professor = resolucaoText
      setEditingResolucao(false)
    } catch (err: any) {
      console.error('Erro ao salvar resolução:', err)
      alert('Erro ao salvar a resolução do professor. Verifique sua conexão.')
    } finally {
      setSavingResolucao(false)
    }
  }

  // Lista dinâmica de matérias com erros para o dropdown
  const materiasComErros = useMemo(() => {
    const setMaterias = new Set<string>()
    erros.forEach(e => {
      if (e.materia) setMaterias.add(e.materia)
    })
    return Array.from(setMaterias).sort()
  }, [erros])

  // Filtragem dos erros
  const errosFiltrados = useMemo(() => {
    return erros.filter(e => {
      const matchesMateria = !materiaFiltro || e.materia === materiaFiltro
      
      const textoBusca = busca.toLowerCase().trim()
      const matchesTexto = !textoBusca || 
        (e.enunciado && e.enunciado.toLowerCase().includes(textoBusca)) ||
        (e.questao_tec_id && String(e.questao_tec_id).includes(textoBusca)) ||
        (e.assunto && e.assunto.toLowerCase().includes(textoBusca)) ||
        (e.banca_texto && e.banca_texto.toLowerCase().includes(textoBusca))

      return matchesMateria && matchesTexto
    })
  }, [erros, busca, materiaFiltro])

  // Se a questão atual não está na lista filtrada, ajusta o índice para focar no primeiro item disponível
  useEffect(() => {
    if (errosFiltrados.length > 0) {
      // Verifica se a questão atual está na lista filtrada
      const questaoAtivaNaLista = errosFiltrados.some(e => e.questao_tec_id === questaoAtual?.questao_tec_id)
      if (!questaoAtivaNaLista) {
        // Encontra o index real do primeiro item filtrado no array original de erros
        const realIndex = erros.findIndex(e => e.questao_tec_id === errosFiltrados[0].questao_tec_id)
        if (realIndex !== -1) {
          setQuestaoAtualIndex(realIndex)
        }
      }
    }
  }, [errosFiltrados, questaoAtual, erros, setQuestaoAtualIndex])

  // Agrupamento dos erros filtrados por matéria
  const errosAgrupados = useMemo(() => {
    // 1. Agrupar os erros filtrados por matéria
    const grupos: Record<string, typeof erros> = {}
    errosFiltrados.forEach(e => {
      const mat = e.materia || 'Sem Matéria'
      if (!grupos[mat]) grupos[mat] = []
      grupos[mat].push(e)
    })

    // 2. Criar uma lista de grupos com metadados para ordenação
    const listaGrupos = Object.entries(grupos).map(([materia, lista]) => {
      // Data mais recente
      const maisRecente = lista.reduce((latest, curr) => {
        const d = curr.data_resolucao ? new Date(curr.data_resolucao).getTime() : 0
        return d > latest ? d : latest
      }, 0)

      return {
        materia,
        lista,
        quantidade: lista.length,
        maisRecente
      }
    })

    // 3. Ordenar a lista de grupos conforme o critério selecionado
    listaGrupos.sort((a, b) => {
      if (ordenacao === 'mais_erros') {
        return b.quantidade - a.quantidade // Maior quantidade primeiro
      }
      if (ordenacao === 'mais_recentes') {
        return b.maisRecente - a.maisRecente // Mais recente primeiro
      }
      // 'alfabetica'
      return a.materia.localeCompare(b.materia)
    })

    return listaGrupos
  }, [errosFiltrados, ordenacao])

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

  const alternativas = questaoAtual
    ? Object.entries(questaoAtual.alternativas || {}).sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    : []

  return (
    <div className="flex flex-col gap-4 h-full min-h-0 flex-1">
      
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
          <span>{errosFiltrados.length === totalErros ? `${totalErros} erros` : `${errosFiltrados.length} de ${totalErros} erros`}</span>
        </div>
      </div>

      {/* Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        
        {/* COLUNA ESQUERDA: Navegador de Erros */}
        <div className="glass-card p-4 flex flex-col gap-3 h-full min-h-0 lg:col-span-1">
          <div className="space-y-2 shrink-0">
            {/* Input de Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por ID, assunto, banca..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] focus:border-violet-500 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 transition-colors focus:outline-none font-medium"
              />
            </div>

            {/* Grid com Filtro de Matéria e Ordenação Lado a Lado */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={materiaFiltro}
                  onChange={e => setMateriaFiltro(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] focus:border-violet-500 rounded-xl text-[10px] text-foreground transition-colors focus:outline-none font-medium appearance-none cursor-pointer"
                >
                  <option value="" className="bg-card text-foreground">Todas Matérias</option>
                  {materiasComErros.map(m => (
                    <option key={m} value={m} className="bg-card text-foreground">{m}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Filter className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground rotate-90" />
                <select
                  value={ordenacao}
                  onChange={e => setOrdenacao(e.target.value as any)}
                  className="w-full pl-8 pr-2 py-2 bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.15] focus:border-violet-500 rounded-xl text-[10px] text-foreground transition-colors focus:outline-none font-medium appearance-none cursor-pointer"
                >
                  <option value="mais_erros" className="bg-card text-foreground">Mais erros</option>
                  <option value="mais_recentes" className="bg-card text-foreground">Mais recentes</option>
                  <option value="alfabetica" className="bg-card text-foreground">Matéria A-Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Cartões de Questão Agrupados por Matéria */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3">
            {errosAgrupados.map((grupo) => {
              const isCollapsed = !!collapsedMaterias[grupo.materia]
              const totalOriginal = initialCounts[grupo.materia] || grupo.quantidade
              const revisadasCount = Math.max(0, totalOriginal - grupo.quantidade)
              const progress = Math.round((revisadasCount / totalOriginal) * 100)

              return (
                <div key={grupo.materia} className="space-y-1.5">
                  {/* Cabeçalho da Matéria */}
                  <button
                    onClick={() => toggleMateriaCollapse(grupo.materia)}
                    className="w-full text-left p-3 rounded-xl bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08] transition-all flex flex-col shrink-0 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-[12px] font-extrabold text-foreground leading-tight truncate">
                          {grupo.materia}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-bold">
                          {grupo.quantidade} {grupo.quantidade === 1 ? 'erro' : 'erros'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {progress > 0 && (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black">
                            {progress}%
                          </span>
                        )}
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
                        )}
                      </div>
                    </div>

                    {/* Thin progress bar */}
                    <div className="w-full bg-white/[0.04] rounded-full h-1 mt-2.5 overflow-hidden border border-white/[0.02]">
                      <div 
                        className="bg-gradient-to-r from-violet-500 to-indigo-650 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </button>

                  {/* Lista de erros do grupo se não colapsada */}
                  {!isCollapsed && (
                    <div className="pl-2 space-y-1.5 border-l border-white/[0.03] ml-3.5 py-1">
                      {grupo.lista.map((item) => {
                        const isActive = questaoAtual?.questao_tec_id === item.questao_tec_id
                        const realIndex = erros.findIndex(e => e.questao_tec_id === item.questao_tec_id)

                        return (
                          <button
                            key={item.questao_tec_id}
                            onClick={() => {
                              if (realIndex !== -1) {
                                setQuestaoAtualIndex(realIndex)
                                setAlternativaSelecionada(null)
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                              isActive 
                                ? 'bg-gradient-to-r from-violet-600/15 to-indigo-650/15 border-violet-500 text-foreground ring-1 ring-violet-500/30' 
                                : 'bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-black tracking-wide ${isActive ? 'text-violet-400' : 'text-foreground'}`}>
                                Q{item.questao_tec_id}
                              </span>
                              <span className="text-[9px] opacity-60 font-bold">{item.banca_texto}</span>
                            </div>
                            <p className="text-[12px] font-bold text-foreground leading-snug truncate">
                              {item.assunto || 'Assunto Desconhecido'}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {errosFiltrados.length === 0 && (
              <div className="h-full flex items-center justify-center text-center p-6 text-muted-foreground text-xs italic flex-col gap-1">
                <span>Nenhum erro encontrado</span>
                <span className="opacity-60">com a busca atual.</span>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Workspace de Foco e Resolução */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-h-0 h-full">
          {questaoAtual ? (
            <div className="glass-card flex flex-col flex-1 min-h-0 overflow-hidden">
              
              {/* Cabeçalho da Questão */}
              <div className="p-4 border-b border-white/[0.05] bg-white/[0.01] flex items-center justify-between gap-3 shrink-0 flex-wrap text-[11px] font-black">
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
                  <span className="bg-white/[0.04] px-2 py-0.5 rounded-lg text-muted-foreground border border-white/[0.05] truncate max-w-[150px]">
                    {questaoAtual.banca_texto}
                  </span>
                  <span className="bg-white/[0.04] px-2 py-0.5 rounded-lg text-muted-foreground border border-white/[0.05]">
                    {questaoAtual.ano}
                  </span>
                </div>

                <div className="px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                  {questaoAtualIndex + 1} de {totalErros}
                </div>
              </div>

              {/* Corpo de Conteúdo (Scrollable) */}
              <div className="flex-1 overflow-y-auto min-h-0 p-5 md:p-6 space-y-6">
                
                {/* Metadados adicionais */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/[0.01] border border-white/[0.04]">
                  <p className="text-xs text-muted-foreground font-bold">
                    Materia: <span className="text-foreground font-extrabold">{questaoAtual.materia}</span>
                  </p>
                  <p className="text-xs text-muted-foreground font-bold leading-tight">
                    Assunto: <span className="text-foreground font-extrabold">{questaoAtual.assunto}</span>
                  </p>
                </div>

                {/* Enunciado */}
                <p className="text-foreground leading-relaxed text-sm font-medium whitespace-pre-line bg-card/40 rounded-xl select-text">
                  {cleanHtmlText(questaoAtual.enunciado)}
                </p>

                {/* Alternativas */}
                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {alternativas.map(([letra, texto]) => {
                    const isSelected = alternativaSelecionada === letra
                    const isCorrect = questaoAtual.gabarito === letra

                    let barStyles = "border-white/[0.05] hover:border-white/[0.1] bg-white/[0.01]"
                    let circleStyles = "bg-white/[0.04] text-muted-foreground font-bold border border-white/[0.06]"
                    
                    if (revelado) {
                      if (isCorrect) {
                        barStyles = "border-emerald-500 bg-emerald-500/10 text-emerald-300 font-bold"
                        circleStyles = "bg-emerald-500 text-white font-extrabold border border-emerald-600 animate-pulse"
                      } else if (isSelected && !isCorrect) {
                        barStyles = "border-red-500 bg-red-500/10 text-red-300"
                        circleStyles = "bg-red-500 text-white font-extrabold border border-red-650"
                      } else {
                        barStyles = "border-white/[0.03] opacity-40 bg-white/[0.01]"
                        circleStyles = "bg-white/[0.02] text-muted-foreground font-semibold border border-white/[0.03]"
                      }
                    } else if (isSelected) {
                      barStyles = "border-violet-500 bg-violet-600/10 font-bold ring-1 ring-violet-500/30"
                      circleStyles = "bg-violet-600 text-white font-black border border-violet-500"
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
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden flex flex-col mt-4">
                  {/* Header */}
                  <div 
                    onClick={() => setResolucaoExpanded(!resolucaoExpanded)}
                    className="px-5 py-3.5 bg-white/[0.01] border-b border-white/[0.05] flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.03] transition-colors"
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
                          className="p-1 px-2 text-muted-foreground hover:text-amber-400 hover:bg-white/[0.05] rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
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
                            className="w-full min-h-[150px] p-3 text-xs border border-white/[0.08] rounded-xl focus:border-violet-500 bg-white/[0.01] font-medium text-foreground shadow-inner resize-y leading-relaxed focus:outline-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setResolucaoText(questaoAtual.resolucao_professor || '')
                                setEditingResolucao(false)
                              }}
                              disabled={savingResolucao}
                              className="px-3 py-1.5 border border-white/[0.08] hover:bg-white/[0.05] text-foreground rounded-lg text-xxs font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
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
                            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2 border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01]">
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

              {/* Rodapé e Ações */}
              <div className="p-4 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between shrink-0 gap-4 flex-wrap sm:flex-nowrap">
                <div>
                  {revelado && (
                    <div className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      {alternativaSelecionada === questaoAtual.gabarito ? (
                        <>
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                          <span className="text-emerald-400">Você acertou!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4.5 h-4.5 text-red-400" />
                          <span className="text-red-400">Você errou novamente.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
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
          ) : (
            <div className="glass-card flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-sm italic">
              Selecione uma questão no painel esquerdo para praticar.
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
