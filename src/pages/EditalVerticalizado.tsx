import { useState, useMemo, useEffect } from 'react'
import { 
  ChevronRight, 
  ChevronLeft,
  Plus, 
  Trash2, 
  ChevronsUp, 
  ChevronUp, 
  ChevronDown, 
  ChevronsDown, 
  BookOpen, 
  Award, 
  Search, 
  ClipboardList, 
  Check, 
  Loader2,
  PieChart,
  HelpCircle
} from 'lucide-react'
import { fetchAllQuestoes } from '../services/supabase.service'
import type { ResolucaoView } from '../types/database'

export function EditalVerticalizado() {
  const [resolucoes, setResolucoes] = useState<ResolucaoView[]>([])
  const [loading, setLoading] = useState(true)

  // Estados de Customização / LocalStorage
  const [customOrder, setCustomOrder] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('caderno_materias_assuntos_ordem')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [customMaterias, setCustomMaterias] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('caderno_materias_adicionadas')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [studiedAssuntos, setStudiedAssuntos] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('caderno_assuntos_estudados')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Estados de Controle da UI
  const [selectedMateria, setSelectedMateria] = useState<string | null>(null)
  const [newMateriaName, setNewMateriaName] = useState('')
  const [newAssuntoName, setNewAssuntoName] = useState('')
  const [materiaSearch, setMateriaSearch] = useState('')
  const [assuntoSearch, setAssuntoSearch] = useState('')
  const [showAddMateria, setShowAddMateria] = useState(false)
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'criticos' | 'nao_iniciados'>('todos')

  // Carregar dados iniciais da base
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllQuestoes()
        setResolucoes(data)
      } catch (err) {
        console.error('Erro ao carregar matérias do banco:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Auto-selecionar a primeira matéria ao carregar
  const uniqueMateriasList = useMemo(() => {
    const set = new Set<string>()
    resolucoes.forEach(r => {
      if (r.materia) set.add(r.materia)
    })
    customMaterias.forEach(m => set.add(m))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [resolucoes, customMaterias])

  useEffect(() => {
    // Auto-seleciona apenas em telas grandes (desktop)
    const isMobile = window.innerWidth < 768
    if (!selectedMateria && uniqueMateriasList.length > 0 && !isMobile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedMateria(uniqueMateriasList[0])
    }
  }, [uniqueMateriasList, selectedMateria])

  // Filtragem de matérias
  const materiasFiltradas = useMemo(() => {
    return uniqueMateriasList.filter(m => 
      m.toLowerCase().includes(materiaSearch.toLowerCase())
    )
  }, [uniqueMateriasList, materiaSearch])

  // Processamento dos Assuntos da matéria selecionada
  const assuntosDaMateria = useMemo(() => {
    if (!selectedMateria) return []

    // 1. Extrair assuntos existentes no banco para essa matéria
    const set = new Set<string>()
    resolucoes.forEach(r => {
      if (r.materia === selectedMateria && r.assunto) {
        set.add(r.assunto)
      }
    })

    // 2. Mesclar com assuntos adicionados na ordem personalizada do localStorage
    const savedOrder = customOrder[selectedMateria] || []
    savedOrder.forEach(a => set.add(a))

    const list = Array.from(set)

    // 3. Ordenar os assuntos
    return list.sort((a, b) => {
      let idxA = savedOrder.indexOf(a)
      let idxB = savedOrder.indexOf(b)
      if (idxA === -1) idxA = savedOrder.length
      if (idxB === -1) idxB = savedOrder.length
      if (idxA !== idxB) return idxA - idxB
      return a.localeCompare(b)
    })
  }, [selectedMateria, resolucoes, customOrder])

  // Assuntos filtrados por busca e status
  const assuntosFiltrados = useMemo(() => {
    return assuntosDaMateria.filter(a => {
      const matchesBusca = a.toLowerCase().includes(assuntoSearch.toLowerCase())
      if (!matchesBusca) return false

      // Estatísticas de questões específicas deste assunto
      const questoesDoAssunto = resolucoes.filter(r => r.materia === selectedMateria && r.assunto === a)
      const countQuestoes = questoesDoAssunto.length
      
      const resolvidas = questoesDoAssunto.filter(q => q.alternativa && q.alternativa !== '')
      const acertos = resolvidas.filter(q => q.acertou).length
      const taxaAcerto = resolvidas.length > 0 ? Math.round((acertos / resolvidas.length) * 100) : 0
      
      const isStudied = studiedAssuntos[`${selectedMateria}::${a}`] || false

      if (statusFiltro === 'criticos') {
        return !isStudied && countQuestoes > 0 && taxaAcerto < 60
      }
      if (statusFiltro === 'nao_iniciados') {
        return !isStudied && countQuestoes === 0
      }

      return true
    })
  }, [assuntosDaMateria, assuntoSearch, statusFiltro, resolucoes, selectedMateria, studiedAssuntos])

  // Métricas da matéria selecionada
  const materiaMetrics = useMemo(() => {
    if (!selectedMateria) return { totalQuestoes: 0, taxaAcerto: 0, resolvidosCount: 0 }
    
    const questoesDaMateria = resolucoes.filter(r => r.materia === selectedMateria)
    const totalQuestoes = questoesDaMateria.length
    
    // Tentativas corretas vs totais
    const resolvidas = questoesDaMateria.filter(q => q.alternativa && q.alternativa !== '')
    const acertos = resolvidas.filter(q => q.acertou).length
    const taxaAcerto = resolvidas.length > 0 ? Math.round((acertos / resolvidas.length) * 100) : 0

    // Tópicos estudados/concluídos
    const resolvidosCount = assuntosDaMateria.filter(a => studiedAssuntos[`${selectedMateria}::${a}`]).length

    return { totalQuestoes, taxaAcerto, resolvidosCount }
  }, [selectedMateria, resolucoes, assuntosDaMateria, studiedAssuntos])

  // Lógica de Reordenação
  const moveAssunto = (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
    if (!selectedMateria) return
    const list = [...assuntosDaMateria]
    
    if (direction === 'up' && index > 0) {
      const temp = list[index]
      list[index] = list[index - 1]
      list[index - 1] = temp
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index]
      list[index] = list[index + 1]
      list[index + 1] = temp
    } else if (direction === 'top' && index > 0) {
      const item = list.splice(index, 1)[0]
      list.unshift(item)
    } else if (direction === 'bottom' && index < list.length - 1) {
      const item = list.splice(index, 1)[0]
      list.push(item)
    }

    const updated = {
      ...customOrder,
      [selectedMateria]: list
    }
    setCustomOrder(updated)
    localStorage.setItem('caderno_materias_assuntos_ordem', JSON.stringify(updated))
  }

  // Toggle de Conclusão de Assunto (Edital Verticalizado)
  const toggleAssuntoStudied = (assunto: string) => {
    if (!selectedMateria) return
    const key = `${selectedMateria}::${assunto}`
    const updated = {
      ...studiedAssuntos,
      [key]: !studiedAssuntos[key]
    }
    setStudiedAssuntos(updated)
    localStorage.setItem('caderno_assuntos_estudados', JSON.stringify(updated))
  }

  // Adicionar Nova Matéria Manualmente
  const handleAddMateria = () => {
    const nomeLimpo = newMateriaName.trim()
    if (!nomeLimpo) return
    if (uniqueMateriasList.includes(nomeLimpo)) {
      alert('Esta matéria já existe no seu catálogo!')
      return
    }

    const updated = [...customMaterias, nomeLimpo]
    setCustomMaterias(updated)
    localStorage.setItem('caderno_materias_adicionadas', JSON.stringify(updated))
    setSelectedMateria(nomeLimpo)
    setNewMateriaName('')
    setShowAddMateria(false)
  }

  // Adicionar Novo Assunto Manualmente
  const handleAddAssunto = () => {
    if (!selectedMateria) return
    const nomeLimpo = newAssuntoName.trim()
    if (!nomeLimpo) return
    if (assuntosDaMateria.includes(nomeLimpo)) {
      alert('Este assunto já existe nesta matéria!')
      return
    }

    const updatedList = [...assuntosDaMateria, nomeLimpo]
    const updatedOrder = {
      ...customOrder,
      [selectedMateria]: updatedList
    }
    setCustomOrder(updatedOrder)
    localStorage.setItem('caderno_materias_assuntos_ordem', JSON.stringify(updatedOrder))
    setNewAssuntoName('')
  }

  // Remover Matéria Manualmente (apenas se for matéria customizada)
  const handleRemoveCustomMateria = (materia: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Deseja remover a matéria customizada "${materia}" do seu edital?`)) return

    const updated = customMaterias.filter(m => m !== materia)
    setCustomMaterias(updated)
    localStorage.setItem('caderno_materias_adicionadas', JSON.stringify(updated))
    
    if (selectedMateria === materia) {
      setSelectedMateria(updated[0] || uniqueMateriasList.find(m => m !== materia) || null)
    }
  }

  // Remover Assunto Manualmente (apenas se for assunto customizado sem questões reais)
  const handleRemoveAssunto = (assunto: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedMateria) return

    // Verifica se existem questões reais usando esse assunto
    const temQuestoesNoBanco = resolucoes.some(r => r.materia === selectedMateria && r.assunto === assunto)
    if (temQuestoesNoBanco) {
      alert('Não é possível remover este assunto porque ele possui questões reais importadas no banco de dados.')
      return
    }

    if (!confirm(`Deseja remover o assunto "${assunto}" desta matéria?`)) return

    const updatedList = assuntosDaMateria.filter(a => a !== assunto)
    const updatedOrder = {
      ...customOrder,
      [selectedMateria]: updatedList
    }
    setCustomOrder(updatedOrder)
    localStorage.setItem('caderno_materias_assuntos_ordem', JSON.stringify(updatedOrder))

    // Limpa também o status de estudado
    const key = `${selectedMateria}::${assunto}`
    const updatedStudied = { ...studiedAssuntos }
    delete updatedStudied[key]
    setStudiedAssuntos(updatedStudied)
    localStorage.setItem('caderno_assuntos_estudados', JSON.stringify(updatedStudied))
  }

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[300px] text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-bold">Carregando catálogo de matérias...</span>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-muted/20 animate-in fade-in duration-300 overflow-hidden">
      
      {/* Header Fixo */}
      <div className="bg-card border-b border-border p-4 md:px-6 flex items-center justify-between shadow-xxs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-foreground uppercase tracking-wide">Edital Verticalizado</h2>
            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Estatísticas, catalogação e sequenciamento manual de edital</p>
          </div>
        </div>

        {/* Estatísticas Rápidas do Topo */}
        <div className="hidden md:flex items-center gap-6 text-xxs font-bold">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border rounded-lg">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Matérias: <strong className="text-foreground">{uniqueMateriasList.length}</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border rounded-lg">
            <PieChart className="w-4 h-4 text-teal-600 animate-pulse" />
            <span>Assuntos Totais: <strong className="text-foreground">
              {Object.values(customOrder).reduce((acc, curr) => acc + curr.length, 0) + 
                resolucoes.filter(r => r.assunto).reduce((acc, curr) => {
                  return acc + (customOrder[curr.materia || '']?.includes(curr.assunto || '') ? 0 : 1)
                }, 0)
              }
            </strong></span>
          </div>
        </div>
      </div>

      {/* Grid de 2 Colunas (Responsivo no celular) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Coluna Esquerda: Lista de Matérias */}
        <div className={`w-full md:w-80 border-r border-border bg-card flex flex-col h-full shrink-0 ${selectedMateria ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Caixa de Busca de Matérias */}
          <div className="p-4 border-b border-border space-y-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={materiaSearch}
                onChange={(e) => setMateriaSearch(e.target.value)}
                placeholder="Buscar matéria..."
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-card text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            {/* Ação para Adicionar Matéria */}
            {showAddMateria ? (
              <div className="space-y-2 p-2.5 bg-muted/30 border border-border rounded-lg animate-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  value={newMateriaName}
                  onChange={(e) => setNewMateriaName(e.target.value)}
                  placeholder="Nome da matéria (ex: Direito Administrativo)"
                  className="w-full px-2.5 py-1.5 border border-border rounded text-xs font-bold text-foreground bg-card outline-none"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setShowAddMateria(false)}
                    className="px-2.5 py-1.5 border border-border hover:bg-muted text-[10px] font-black rounded uppercase tracking-wide transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddMateria}
                    className="px-2.5 py-1.5 bg-primary hover:bg-[#1565c0] text-white text-[10px] font-black rounded uppercase tracking-wide transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMateria(true)}
                className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xxs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Matéria</span>
              </button>
            )}
          </div>

          {/* Lista com Rolagem */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {materiasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs font-semibold italic">
                Nenhuma matéria encontrada.
              </div>
            ) : (
              materiasFiltradas.map((materia) => {
                const isActive = selectedMateria === materia
                const isCustom = customMaterias.includes(materia)
                
                // Questões reais dessa matéria
                const qCount = resolucoes.filter(r => r.materia === materia).length
                
                return (
                  <button
                    key={materia}
                    onClick={() => setSelectedMateria(materia)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-bold transition-all group cursor-pointer ${
                      isActive 
                        ? 'border-primary/20 bg-primary/5 text-primary' 
                        : 'border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{materia}</span>
                        {isCustom && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded font-black uppercase">Custom</span>
                        )}
                      </div>
                      <div className="text-[10px] opacity-60 font-semibold mt-0.5">
                        {qCount} {qCount === 1 ? 'questão' : 'questões'}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {isCustom && (
                        <button
                          onClick={(e) => handleRemoveCustomMateria(materia, e)}
                          className="p-1 hover:text-red-550 hover:bg-muted rounded text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover matéria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-1 text-primary' : 'text-muted-foreground/45 group-hover:text-foreground'}`} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Assuntos & Painel de Detalhes */}
        <div className={`flex-1 bg-muted/10 flex flex-col h-full overflow-hidden ${!selectedMateria ? 'hidden md:flex' : 'flex'}`}>
          
          {selectedMateria ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Header de Detalhes da Matéria */}
              <div className="p-5 bg-card border-b border-border shrink-0 flex flex-col items-start justify-between gap-4">
                {/* Botão de Voltar para Mobile */}
                <button
                  onClick={() => setSelectedMateria(null)}
                  className="md:hidden flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-400 hover:text-violet-300 border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 rounded-xl cursor-pointer transition-all mb-2"
                >
                  <ChevronLeft className="w-4 h-4 animate-pulse" />
                  <span>Voltar para Matérias</span>
                </button>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-foreground uppercase tracking-wide">{selectedMateria}</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    {assuntosDaMateria.length} {assuntosDaMateria.length === 1 ? 'assunto catalogado' : 'assuntos catalogados'} • {materiaMetrics.totalQuestoes} {materiaMetrics.totalQuestoes === 1 ? 'questão real' : 'questões reais'}
                  </p>
                </div>

                {/* Métricas de Desempenho */}
                <div className="flex items-center gap-3.5 flex-wrap">
                  <div className="px-3.5 py-2 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      {/* Pequeno Círculo SVG de progresso */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="16" cy="16" r="12" className="text-border" strokeWidth="3" fill="transparent" stroke="currentColor" />
                        <circle 
                          cx="16" cy="16" r="12" 
                          className="text-emerald-500" 
                          strokeWidth="3" 
                          strokeDasharray={2 * Math.PI * 12}
                          strokeDashoffset={2 * Math.PI * 12 - (assuntosDaMateria.length > 0 ? (materiaMetrics.resolvidosCount / assuntosDaMateria.length) : 0) * (2 * Math.PI * 12)}
                          fill="transparent" stroke="currentColor" strokeLinecap="round" 
                        />
                      </svg>
                      <span className="absolute text-[8px] font-black text-foreground">
                        {assuntosDaMateria.length > 0 ? Math.round((materiaMetrics.resolvidosCount / assuntosDaMateria.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="text-xxs">
                      <div className="font-extrabold text-foreground">Syllabus Concluído</div>
                      <div className="text-muted-foreground font-semibold mt-0.5">{materiaMetrics.resolvidosCount} de {assuntosDaMateria.length} tópicos</div>
                    </div>
                  </div>

                  <div className="px-3.5 py-2 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
                    <Award className="w-5 h-5 text-amber-500" />
                    <div className="text-xxs">
                      <div className="font-extrabold text-foreground">Taxa de Acerto</div>
                      <div className={`font-black mt-0.5 ${materiaMetrics.taxaAcerto >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {materiaMetrics.taxaAcerto}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toolbar e Entrada de Assuntos */}
              <div className="p-4 bg-card border-b border-border flex flex-col md:flex-row items-center gap-3 shrink-0">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={assuntoSearch}
                    onChange={(e) => setAssuntoSearch(e.target.value)}
                    placeholder="Filtrar assuntos..."
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-muted/10 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={newAssuntoName}
                    onChange={(e) => setNewAssuntoName(e.target.value)}
                    placeholder="Novo assunto..."
                    className="flex-1 md:w-72 px-3 py-2 border border-border rounded-lg bg-card text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  />
                  <button
                    onClick={handleAddAssunto}
                    className="px-4 py-2.5 bg-primary hover:bg-[#1565c0] text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Filtros Rápidos de Status */}
              <div className="px-5 py-2.5 bg-muted/30 border-b border-border flex flex-wrap items-center gap-2 shrink-0 animate-fade-in">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mr-1">Filtrar Status:</span>
                <button
                  onClick={() => setStatusFiltro('todos')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
                    statusFiltro === 'todos'
                      ? 'bg-primary/10 border-primary/30 text-primary shadow-xs'
                      : 'bg-card border-border/80 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFiltro('criticos')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
                    statusFiltro === 'criticos'
                      ? 'bg-rose-500/10 border-rose-500/25 text-rose-400 shadow-xs'
                      : 'bg-card border-border/80 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  Críticos (&lt; 60%)
                </button>
                <button
                  onClick={() => setStatusFiltro('nao_iniciados')}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
                    statusFiltro === 'nao_iniciados'
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-500 shadow-xs'
                      : 'bg-card border-border/80 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  Não iniciados
                </button>
              </div>

              {/* Lista dos Assuntos estruturada */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2.5">
                {assuntosFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border border-dashed rounded-xl text-muted-foreground gap-2">
                    <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                    <h4 className="text-xs font-bold text-foreground">Nenhum assunto catalogado</h4>
                    <p className="text-xxs text-muted-foreground max-w-sm">Adicione um assunto manualmente acima para iniciar a organização verticalizada da matéria.</p>
                  </div>
                ) : (
                  assuntosFiltrados.map((assunto) => {
                    const originalIndex = assuntosDaMateria.indexOf(assunto)
                    const key = `${selectedMateria}::${assunto}`
                    const isStudied = studiedAssuntos[key] || false
                    
                    // Estatísticas de questões específicas deste assunto
                    const questoesDoAssunto = resolucoes.filter(r => r.materia === selectedMateria && r.assunto === assunto)
                    const countQuestoes = questoesDoAssunto.length
                    
                    const resolvidas = questoesDoAssunto.filter(q => q.alternativa && q.alternativa !== '')
                    const acertos = resolvidas.filter(q => q.acertou).length
                    const taxaAcerto = resolvidas.length > 0 ? Math.round((acertos / resolvidas.length) * 100) : 0

                    let borderLeftStyle = "border-l-border"
                    if (isStudied) {
                      borderLeftStyle = "border-l-[3px] border-l-[#1a7a52]"
                    } else if (countQuestoes > 0) {
                      if (taxaAcerto < 60) {
                        borderLeftStyle = "border-l-[3px] border-l-[#b33030]"
                      } else {
                        borderLeftStyle = "border-l-[3px] border-l-[#9c5f00]"
                      }
                    }

                    return (
                      <div 
                        key={assunto}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border ${borderLeftStyle} rounded-2xl shadow-xxs transition-all gap-4 group ${
                          isStudied 
                            ? 'border-emerald-500/20 bg-emerald-50/[0.02]' 
                            : 'hover:border-primary/20'
                        }`}
                      >
                        {/* Detalhes do Assunto */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          
                          {/* Botão Checkbox de Edital */}
                          <button
                            onClick={() => toggleAssuntoStudied(assunto)}
                            className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                              isStudied 
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm shadow-emerald-500/20' 
                                : 'border-border text-transparent hover:border-emerald-500/50 hover:bg-emerald-50/10'
                            }`}
                            title={isStudied ? "Marcar como não estudado" : "Marcar como concluído"}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>

                          <div className="min-w-0 pr-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex-shrink-0 text-xxs font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {originalIndex + 1}º
                              </span>
                              <h4 className={`text-xs font-bold truncate max-w-[180px] sm:max-w-[300px] ${isStudied ? 'text-foreground line-through opacity-65' : 'text-foreground'}`}>
                                {assunto}
                              </h4>
                              {countQuestoes > 0 && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                  taxaAcerto >= 60 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                                }`}>
                                  {taxaAcerto}% acerto
                                </span>
                              )}
                            </div>

                            {/* Detalhes rápidos de questões deste assunto */}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold mt-1">
                              <span className="flex items-center gap-1">
                                <HelpCircle className="w-3.5 h-3.5 opacity-60" />
                                {countQuestoes} {countQuestoes === 1 ? 'questão real' : 'questões reais'}
                              </span>
                              {countQuestoes > 0 && (
                                <>
                                  <span>•</span>
                                  <span className={taxaAcerto >= 70 ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                                    Taxa: {taxaAcerto}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Controles de Reordenação e Ações */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0">
                          
                          {/* Ações de Reordenação */}
                          <div className="flex items-center gap-1">
                            <button
                              disabled={originalIndex === 0}
                              onClick={() => moveAssunto(originalIndex, 'top')}
                              className="p-1.5 hover:text-primary hover:bg-muted border border-transparent hover:border-border rounded text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
                              title="Mover para o Topo"
                            >
                              <ChevronsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={originalIndex === 0}
                              onClick={() => moveAssunto(originalIndex, 'up')}
                              className="p-1.5 hover:text-primary hover:bg-muted border border-transparent hover:border-border rounded text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
                              title="Mover para Cima"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={originalIndex === assuntosDaMateria.length - 1}
                              onClick={() => moveAssunto(originalIndex, 'down')}
                              className="p-1.5 hover:text-primary hover:bg-muted border border-transparent hover:border-border rounded text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
                              title="Mover para Baixo"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={originalIndex === assuntosDaMateria.length - 1}
                              onClick={() => moveAssunto(originalIndex, 'bottom')}
                              className="p-1.5 hover:text-primary hover:bg-muted border border-transparent hover:border-border rounded text-muted-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
                              title="Mover para o Fim"
                            >
                              <ChevronsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="h-4 w-px bg-border/80 hidden sm:block" />

                          {/* Excluir Assunto (apenas se for assunto customizado sem questões reais) */}
                          <button
                            onClick={(e) => handleRemoveAssunto(assunto, e)}
                            className="p-1.5 hover:text-red-500 hover:bg-red-50 rounded text-muted-foreground disabled:opacity-20 disabled:hover:bg-transparent transition-all cursor-pointer"
                            disabled={resolucoes.some(r => r.materia === selectedMateria && r.assunto === assunto)}
                            title="Remover assunto do edital"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground gap-3">
              <ClipboardList className="w-12 h-12 text-muted-foreground/35" />
              <h3 className="text-xs font-bold text-foreground">Nenhuma matéria selecionada</h3>
              <p className="text-xxs text-muted-foreground max-w-sm text-center">Selecione uma matéria na coluna da esquerda ou crie uma nova para catalogar os seus assuntos.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  )
}
