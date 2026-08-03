import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Loader2,
  ClipboardList,
  PieChart,
  FileText,
  Settings2,
} from 'lucide-react'
import { fetchAllQuestoesLeves } from '../services/supabase.service'
import type { ResolucaoView } from '../types/database'
import { EditalSidebar } from '../components/EditalSidebar'
import { EditalMateriaDetalhes } from '../components/EditalMateriaDetalhes'
import { EditalAssuntoItem } from '../components/EditalAssuntoItem'
import { EditalTreeSidebar } from '../components/EditalTreeSidebar'
import { EditalTopicoDetalhes } from '../components/EditalTopicoDetalhes'
import { useToast } from '../contexts/ToastContext'
import { listEditais } from '../lib/editaisStorage'

export function EditalVerticalizado() {
  const toast = useToast()
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

  // Estados do Modo Edital
  const [editaisList] = useState(() => listEditais())
  const [selectedEditalId, setSelectedEditalId] = useState<string | null>(null)
  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null)
  const [selectedMateriaIdEdital, setSelectedMateriaIdEdital] = useState<string | null>(null)

  const selectedEdital = selectedEditalId
    ? editaisList.find(e => e.id === selectedEditalId) ?? null
    : null

  const isEditalMode = selectedEdital !== null

  // Carregar dados iniciais da base
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllQuestoesLeves()
        setResolucoes(data)
      } catch (err: unknown) {
        console.error('Erro ao carregar matérias do banco:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Auto-selecionar primeiro cargo ao entrar em modo edital
  useEffect(() => {
    if (isEditalMode && !selectedCargoId && selectedEdital.cargos.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCargoId(selectedEdital.cargos[0].id)
    }
  }, [isEditalMode, selectedCargoId, selectedEdital])

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
      toast.warning('Matéria duplicada', 'Esta matéria já existe no seu catálogo!')
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
      toast.warning('Assunto duplicado', 'Este assunto já existe nesta matéria!')
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
      toast.warning('Remoção bloqueada', 'Não é possível remover este assunto porque ele possui questões reais importadas no banco de dados.')
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

  // Total de assuntos (para o header)
  const totalAssuntosCount = useMemo(() => {
    return Object.values(customOrder).reduce((acc, curr) => acc + curr.length, 0) +
      resolucoes.filter(r => r.assunto).reduce((acc, curr) => {
        return acc + (customOrder[curr.materia || '']?.includes(curr.assunto || '') ? 0 : 1)
      }, 0)
  }, [resolucoes, customOrder])

  // Computações do Modo Edital
  const selectedCargo = useMemo(() => {
    if (!selectedEdital || !selectedCargoId) return null
    return selectedEdital.cargos.find(c => c.id === selectedCargoId) ?? null
  }, [selectedEdital, selectedCargoId])

  const selectedMateriaEdital = useMemo(() => {
    if (!selectedCargo || !selectedMateriaIdEdital) return null
    return selectedCargo.materias.find(m => m.id === selectedMateriaIdEdital) ?? null
  }, [selectedCargo, selectedMateriaIdEdital])



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

        {/* Seletor de Edital + Estatísticas */}
        <div className="flex items-center gap-3">
          <Link
            to="/app/edital/gerenciar"
            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted border border-border rounded-lg transition-all cursor-pointer hidden md:flex"
            title="Gerenciar Editais"
          >
            <Settings2 className="w-4 h-4" />
          </Link>
          <select
            value={selectedEditalId ?? ''}
            onChange={(e) => {
              const val = e.target.value || null
              setSelectedEditalId(val)
              setSelectedCargoId(null)
              setSelectedMateriaIdEdital(null)
              setSelectedMateria(null)
            }}
            className="px-3 py-1.5 border border-border rounded-lg bg-card text-[11px] font-bold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer max-w-[200px]"
          >
            <option value="">Catálogo Geral</option>
            {editaisList.map(ed => (
              <option key={ed.id} value={ed.id}>{ed.sigla} {ed.ano} — {ed.banca}</option>
            ))}
          </select>

          {!isEditalMode && (
            <div className="hidden md:flex items-center gap-6 text-xxs font-bold">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border rounded-lg">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Matérias: <strong className="text-foreground">{uniqueMateriasList.length}</strong></span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border rounded-lg">
                <PieChart className="w-4 h-4 text-teal-600" />
                <span>Assuntos Totais: <strong className="text-foreground">{totalAssuntosCount}</strong></span>
              </div>
            </div>
          )}

          {isEditalMode && selectedEdital && (
            <div className="hidden md:flex items-center gap-6 text-xxs font-bold">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border rounded-lg">
                <FileText className="w-4 h-4 text-primary" />
                <span>Órgão: <strong className="text-foreground">{selectedEdital.sigla}</strong></span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border border-border rounded-lg">
                <PieChart className="w-4 h-4 text-teal-600" />
                <span>Cargos: <strong className="text-foreground">{selectedEdital.cargos.length}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid de 2 Colunas (Responsivo no celular) */}
      <div className="flex-1 flex overflow-hidden relative">

        {isEditalMode && selectedEdital ? (
          <EditalTreeSidebar
            edital={selectedEdital}
            selectedCargoId={selectedCargoId}
            onSelectCargo={(cargoId) => {
              setSelectedCargoId(cargoId)
              setSelectedMateriaIdEdital(null)
            }}
            selectedMateriaId={selectedMateriaIdEdital}
            onSelectMateria={setSelectedMateriaIdEdital}
            resolucoes={resolucoes}
          />
        ) : (
          <EditalSidebar
            materias={materiasFiltradas}
            selectedMateria={selectedMateria}
            onSelectMateria={setSelectedMateria}
            materiaSearch={materiaSearch}
            onMateriaSearchChange={setMateriaSearch}
            showAddMateria={showAddMateria}
            onToggleAddMateria={() => setShowAddMateria(!showAddMateria)}
            newMateriaName={newMateriaName}
            onNewMateriaNameChange={setNewMateriaName}
            onAddMateria={handleAddMateria}
            customMaterias={customMaterias}
            onRemoveCustomMateria={handleRemoveCustomMateria}
            getQuestaoCount={(materia) => resolucoes.filter(r => r.materia === materia).length}
          />
        )}

        {isEditalMode && selectedMateriaEdital ? (
          <EditalTopicoDetalhes
            materiaEdital={selectedMateriaEdital}
            onVoltar={() => setSelectedMateriaIdEdital(null)}
            resolucoes={resolucoes}
            assuntoSearch={assuntoSearch}
            onAssuntoSearchChange={setAssuntoSearch}
            statusFiltro={statusFiltro === 'nao_iniciados' ? 'todos' : statusFiltro}
            onStatusFiltroChange={(f) => setStatusFiltro(f)}
            uniqueMateriasList={uniqueMateriasList}
          />
        ) : !isEditalMode ? (
          <EditalMateriaDetalhes
            selectedMateria={selectedMateria}
            onVoltar={() => setSelectedMateria(null)}
            assuntosCount={assuntosDaMateria.length}
            totalQuestoes={materiaMetrics.totalQuestoes}
            taxaAcerto={materiaMetrics.taxaAcerto}
            resolvidosCount={materiaMetrics.resolvidosCount}
            assuntoSearch={assuntoSearch}
            onAssuntoSearchChange={setAssuntoSearch}
            newAssuntoName={newAssuntoName}
            onNewAssuntoNameChange={setNewAssuntoName}
            onAddAssunto={handleAddAssunto}
            statusFiltro={statusFiltro}
            onStatusFiltroChange={setStatusFiltro}
          >
            {assuntosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border border-dashed rounded-xl text-muted-foreground gap-2">
                <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                <h4 className="text-xs font-bold text-foreground">Nenhum assunto catalogado</h4>
                <p className="text-xxs text-muted-foreground max-w-sm">Adicione um assunto manualmente acima para iniciar a organização verticalizada da matéria.</p>
              </div>
            ) : (
              assuntosFiltrados.map((assunto) => {
                const originalIndex = assuntosDaMateria.indexOf(assunto)
                const isStudied = studiedAssuntos[`${selectedMateria}::${assunto}`] || false
                const questoesDoAssunto = resolucoes.filter(r => r.materia === selectedMateria && r.assunto === assunto)
                const countQuestoes = questoesDoAssunto.length
                const resolvidas = questoesDoAssunto.filter(q => q.alternativa && q.alternativa !== '')
                const acertos = resolvidas.filter(q => q.acertou).length
                const taxaAcerto = resolvidas.length > 0 ? Math.round((acertos / resolvidas.length) * 100) : 0

                return (
                  <EditalAssuntoItem
                    key={assunto}
                    assunto={assunto}
                    index={originalIndex}
                    total={assuntosDaMateria.length}
                    isStudied={isStudied}
                    onToggleStudied={() => toggleAssuntoStudied(assunto)}
                    questaoCount={countQuestoes}
                    taxaAcerto={taxaAcerto}
                    onMove={(direction) => moveAssunto(originalIndex, direction)}
                    onRemove={(e) => handleRemoveAssunto(assunto, e)}
                    canRemove={!resolucoes.some(r => r.materia === selectedMateria && r.assunto === assunto)}
                  />
                )
              })
            )}
          </EditalMateriaDetalhes>
        ) : isEditalMode && !selectedMateriaIdEdital ? (
          <div className="flex-1 bg-muted/10 flex items-center justify-center">
            <div className="flex flex-col items-center text-muted-foreground gap-3">
              <FileText className="w-12 h-12 text-muted-foreground/35" />
              <h3 className="text-xs font-bold text-foreground">Selecione uma matéria</h3>
              <p className="text-xxs text-muted-foreground max-w-sm text-center">
                Escolha um cargo e uma matéria na coluna da esquerda para ver os tópicos do edital e as questões no banco.
              </p>
            </div>
          </div>
        ) : null}

      </div>

    </div>
  )
}
