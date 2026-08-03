import { useState, useMemo, useEffect } from 'react'
import type { ResolucaoView } from '../types/database'

const FILTER_STORAGE_KEY = 'questoes_filter_state'

function loadFilterState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${FILTER_STORAGE_KEY}_${key}`)
    if (raw !== null) return JSON.parse(raw) as T
  } catch {
    // ignore
  }
  return fallback
}

function saveFilterState(key: string, value: unknown) {
  try {
    localStorage.setItem(`${FILTER_STORAGE_KEY}_${key}`, JSON.stringify(value))
  } catch {
    // ignore
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type FilterTab =
  | 'materia'
  | 'banca'
  | 'orgao'
  | 'ano'
  | 'concurso'
  | 'carreira'
  | 'escolaridade'
  | 'formacao'
  | 'regiao'
  | 'favoritas'
  | 'enunciados'
  | 'opcoes'

export type ObjetivoFilter = 'todos' | 'ineditas' | 'discursivas'
export type StatusFilter = 'todos' | 'acertos' | 'erros'

// ─── Constantes ────────────────────────────────────────────────────────────────

export const CARREIRAS_DISPONIVEIS = ['Policial', 'Fiscal', 'Tribunais', 'Administrativa', 'Saúde', 'Educação', 'Jurídica', 'Militar', 'Legislativa']
export const ESCOLARIDADES_DISPONIVEIS = ['Ensino Médio', 'Ensino Superior', 'Ensino Fundamental']
export const FORMACOES_DISPONIVEIS = ['Qualquer área de formação', 'Direito', 'Administração', 'Contabilidade / Economia', 'Tecnologia da Informação', 'Engenharia', 'Pedagogia', 'Medicina / Enfermagem']
export const REGIOES_DISPONIVEIS = ['Nacional (Federal)', 'São Paulo (SP)', 'Rio de Janeiro (RJ)', 'Minas Gerais (MG)', 'Goiás (GO)', 'Distrito Federal (DF)', 'Região Sul', 'Região Nordeste']
export const FAVORITAS_OPCOES = ['Minhas Favoritas (Estrelas)', 'Questões com Anotações', 'Questões Resolvidas recentemente']
export const ENUNCIADOS_OPCOES = ['Comentadas por Professores', 'Comentadas por IA', 'Sem Comentários', 'Com resolução em Vídeo']

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useQuestoesFilter(
  resolucoes: ResolucaoView[],
  filterOptions?: {
    materias: string[]
    bancas: string[]
    anos: number[]
    orgaos: string[]
    concursos: string[]
    assuntosPorMateria?: Record<string, string[]>
  } | null,
) {
  // ── Filter State (persistido em localStorage) ─────────────────────────────────
  const [objetivo, setObjetivo] = useState<ObjetivoFilter>('todos')
  const [activeTab, setActiveTab] = useState<FilterTab>('materia')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchBox, setShowSearchBox] = useState(false)
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>(() => loadFilterState('selectedMaterias', []))
  const [questaoTecId, setQuestaoTecId] = useState('')
  const [selectedAssuntos, setSelectedAssuntos] = useState<string[]>(() => loadFilterState('selectedAssuntos', []))
  const [selectedBancas, setSelectedBancas] = useState<string[]>(() => loadFilterState('selectedBancas', []))
  const [selectedAnos, setSelectedAnos] = useState<number[]>(() => loadFilterState('selectedAnos', []))
  const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>(() => loadFilterState('selectedOrgaos', []))
  const [selectedConcursos, setSelectedConcursos] = useState<string[]>(() => loadFilterState('selectedConcursos', []))
  const [selectedCarreiras, setSelectedCarreiras] = useState<string[]>(() => loadFilterState('selectedCarreiras', []))
  const [selectedEscolaridades, setSelectedEscolaridades] = useState<string[]>(() => loadFilterState('selectedEscolaridades', []))
  const [selectedFormacoes, setSelectedFormacoes] = useState<string[]>(() => loadFilterState('selectedFormacoes', []))
  const [selectedRegioes, setSelectedRegioes] = useState<string[]>(() => loadFilterState('selectedRegioes', []))
  const [selectedFavoritas, setSelectedFavoritas] = useState<string[]>(() => loadFilterState('selectedFavoritas', []))
  const [selectedEnunciados, setSelectedEnunciados] = useState<string[]>(() => loadFilterState('selectedEnunciados', []))
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('todos')
  const [isFilterExpanded, setIsFilterExpanded] = useState(() => loadFilterState('isFilterExpanded', false))
  const [visibleQuestionsCount, setVisibleQuestionsCount] = useState(25)
  const [expandedMateriaFolder, setExpandedMateriaFolder] = useState<string | null>(null)

  // Persist filter selections in localStorage
  useEffect(() => { saveFilterState('selectedMaterias', selectedMaterias) }, [selectedMaterias])
  useEffect(() => { saveFilterState('selectedAssuntos', selectedAssuntos) }, [selectedAssuntos])
  useEffect(() => { saveFilterState('selectedBancas', selectedBancas) }, [selectedBancas])
  useEffect(() => { saveFilterState('selectedAnos', selectedAnos) }, [selectedAnos])
  useEffect(() => { saveFilterState('selectedOrgaos', selectedOrgaos) }, [selectedOrgaos])
  useEffect(() => { saveFilterState('selectedConcursos', selectedConcursos) }, [selectedConcursos])
  useEffect(() => { saveFilterState('selectedCarreiras', selectedCarreiras) }, [selectedCarreiras])
  useEffect(() => { saveFilterState('selectedEscolaridades', selectedEscolaridades) }, [selectedEscolaridades])
  useEffect(() => { saveFilterState('selectedFormacoes', selectedFormacoes) }, [selectedFormacoes])
  useEffect(() => { saveFilterState('selectedRegioes', selectedRegioes) }, [selectedRegioes])
  useEffect(() => { saveFilterState('selectedFavoritas', selectedFavoritas) }, [selectedFavoritas])
  useEffect(() => { saveFilterState('selectedEnunciados', selectedEnunciados) }, [selectedEnunciados])
  useEffect(() => { saveFilterState('isFilterExpanded', isFilterExpanded) }, [isFilterExpanded])
  const [cadernoNome, setCadernoNome] = useState('Caderno de Estudo')
  const [pastaDestino, setPastaDestino] = useState('Analista Legislativo (ALEGO)/2026 - Analista Admi...')
  const [gerarEmSerie, setGerarEmSerie] = useState(false)
  const [filtros, setFiltros] = useState<Record<string, string> | null>(null)

  // ── Internal: buildServerFilters ──────────────────────────────────────────────

  function buildServerFilters(): Record<string, string[]> {
    const filters: Record<string, string[]> = {}
    if (selectedMaterias.length > 0)   filters.materia = selectedMaterias
    if (selectedBancas.length > 0)    filters.banca_texto = selectedBancas
    if (selectedAnos.length > 0)      filters.ano = selectedAnos.map(String)
    if (selectedOrgaos.length > 0)    filters.orgao = selectedOrgaos
    if (selectedConcursos.length > 0) filters.concurso = selectedConcursos
    // NOT included (remain client-side):
    // - selectedAssuntos (relies on materia fallback logic)
    // - selectedCarreiras (keyword matching)
    // - selectedStatus (depends on merged historico)
    // - objetivo (depends on merged historico)
    return filters
  }

  // ── Derived Data (Filtros dinâmicos) — memoizados ─────────────────────────────

  const materiasComAssuntos: Record<string, Set<string>> = (() => {
    if (filterOptions?.assuntosPorMateria) {
      const map: Record<string, Set<string>> = {}
      for (const [materia, assuntos] of Object.entries(filterOptions.assuntosPorMateria)) {
        map[materia] = new Set(assuntos)
      }
      return map
    }
    const map: Record<string, Set<string>> = {}
    for (const curr of resolucoes) {
      if (!curr.materia) continue
      if (!map[curr.materia]) map[curr.materia] = new Set<string>()
      if (curr.assunto) map[curr.materia].add(curr.assunto)
    }
    return map
  })()

  const materiasUnicas = useMemo(
    () => filterOptions?.materias ?? Array.from(new Set(resolucoes.map(r => r.materia).filter(Boolean))) as string[],
    [filterOptions, resolucoes]
  )
  const bancasUnicas = useMemo(
    () => filterOptions?.bancas ?? Array.from(new Set(resolucoes.map(r => r.banca_texto).filter(Boolean))) as string[],
    [filterOptions, resolucoes]
  )
  const anosUnicos = useMemo(
    () => filterOptions?.anos ?? Array.from(new Set(resolucoes.map(r => r.ano).filter(Boolean))) as number[],
    [filterOptions, resolucoes]
  )
  const orgaosUnicos = useMemo(
    () => filterOptions?.orgaos ?? Array.from(new Set(resolucoes.map(r => r.orgao).filter(Boolean))) as string[],
    [filterOptions, resolucoes]
  )
  const concursosUnicos = useMemo(
    () => filterOptions?.concursos ?? Array.from(new Set(resolucoes.map(r => r.concurso).filter(Boolean))) as string[],
    [filterOptions, resolucoes]
  )

  // ── Actions: Filtros ─────────────────────────────────────────────────────────

  const makeToggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (value: T) =>
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])

  const handleToggleMateria = (materia: string) => {
    setSelectedMaterias(prev => {
      const isSelected = prev.includes(materia)
      if (isSelected) {
        const assuntosDaMateria = Array.from(materiasComAssuntos[materia] || [])
        setSelectedAssuntos(assPrev => assPrev.filter(a => !assuntosDaMateria.includes(a)))
        return prev.filter(m => m !== materia)
      }
      return [...prev, materia]
    })
  }

  const handleToggleAssunto = (assunto: string) => {
    setSelectedAssuntos(prev => {
      const isSelected = prev.includes(assunto)
      if (isSelected) return prev.filter(a => a !== assunto)
      return [...prev, assunto]
    })
  }

  const handleToggleBanca = makeToggle(setSelectedBancas)
  const handleToggleAno = makeToggle(setSelectedAnos)
  const handleToggleOrgao = makeToggle(setSelectedOrgaos)
  const handleToggleConcurso = makeToggle(setSelectedConcursos)
  const handleToggleCarreira = makeToggle(setSelectedCarreiras)
  const handleToggleEscolaridade = makeToggle(setSelectedEscolaridades)
  const handleToggleFormacao = makeToggle(setSelectedFormacoes)
  const handleToggleRegiao = makeToggle(setSelectedRegioes)
  const handleToggleFavorita = makeToggle(setSelectedFavoritas)
  const handleToggleEnunciado = makeToggle(setSelectedEnunciados)

  const handleResetFilters = () => {
    setQuestaoTecId('')
    setSelectedMaterias([])
    setSelectedAssuntos([])
    setSelectedBancas([])
    setSelectedAnos([])
    setSelectedOrgaos([])
    setSelectedConcursos([])
    setSelectedCarreiras([])
    setSelectedEscolaridades([])
    setSelectedFormacoes([])
    setSelectedRegioes([])
    setSelectedFavoritas([])
    setSelectedEnunciados([])
    setSelectedStatus('todos')
    setObjetivo('todos')
  }

  // ── Actions: Filtragem ───────────────────────────────────────────────────────

  const getFilteredQuestions = (): ResolucaoView[] => {
    return resolucoes.filter(q => {
      if (objetivo === 'ineditas' && q.alternativa && q.alternativa !== '') return false

      const hasMateriaFilter = selectedMaterias.length > 0
      const hasAssuntoFilter = selectedAssuntos.length > 0

      let matchesMateria = true
      if (hasAssuntoFilter && !hasMateriaFilter) {
        matchesMateria = selectedAssuntos.includes(q.assunto || '')
      } else if (hasMateriaFilter) {
        if (hasAssuntoFilter) {
          matchesMateria = selectedAssuntos.includes(q.assunto || '') ||
            (selectedMaterias.includes(q.materia || '') && !q.assunto)
        } else {
          matchesMateria = selectedMaterias.includes(q.materia || '')
        }
      }

      const matchesBanca = selectedBancas.length === 0 || selectedBancas.includes(q.banca_texto || '')
      const matchesAno = selectedAnos.length === 0 || selectedAnos.includes(q.ano || 0)
      const matchesOrgao = selectedOrgaos.length === 0 || selectedOrgaos.includes(q.orgao || '')
      const matchesConcurso = selectedConcursos.length === 0 || selectedConcursos.includes(q.concurso || '')

      const matchesStatus =
        selectedStatus === 'todos' ||
        (selectedStatus === 'acertos' && q.acertou) ||
        (selectedStatus === 'erros' && !q.acertou && q.alternativa && q.alternativa !== '')

      let matchesCarreira = true
      if (selectedCarreiras.length > 0) {
        const concUpper = (q.concurso || '').toUpperCase()
        const orgUpper = (q.orgao || '').toUpperCase()
        matchesCarreira = selectedCarreiras.some(car => {
          if (car === 'Policial') return concUpper.includes('POLICIA') || orgUpper.includes('PC') || orgUpper.includes('PM') || orgUpper.includes('PRF') || orgUpper.includes('PF')
          if (car === 'Fiscal') return concUpper.includes('FISCAL') || concUpper.includes('SEFAZ') || orgUpper.includes('RECEITA')
          if (car === 'Tribunais') return concUpper.includes('TRIBUNAL') || orgUpper.includes('TJ') || orgUpper.includes('TRT') || orgUpper.includes('TRE')
          if (car === 'Legislativa') return concUpper.includes('LEGISLATIVO') || concUpper.includes('AL') || concUpper.includes('CAMARA') || concUpper.includes('SENADO') || orgUpper.includes('ALEGO')
          if (car === 'Jurídica') return concUpper.includes('JURIDICO') || concUpper.includes('PROCURADOR') || concUpper.includes('JUIZ') || concUpper.includes('DEFENSOR')
          return true
        })
      }

      const matchesTecId = !questaoTecId || String(q.questao_tec_id) === questaoTecId

      return matchesMateria && matchesBanca && matchesAno && matchesOrgao && matchesConcurso && matchesStatus && matchesCarreira && matchesTecId
    })
  }

  // ── Computed Values ──────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredQuestions = useMemo(() => getFilteredQuestions(), [
    resolucoes, objetivo, questaoTecId,
    selectedMaterias, selectedAssuntos, selectedBancas, selectedAnos,
    selectedOrgaos, selectedConcursos, selectedCarreiras,
    selectedStatus,
  ])
  const filteredCount = filteredQuestions.length

  const totalFiltrosAtivos =
    selectedMaterias.length +
    selectedBancas.length +
    selectedAnos.length +
    selectedOrgaos.length +
    selectedConcursos.length +
    selectedCarreiras.length +
    selectedEscolaridades.length +
    selectedFormacoes.length +
    selectedRegioes.length +
    selectedFavoritas.length +
    selectedEnunciados.length +
    (selectedStatus !== 'todos' ? 1 : 0)

  return {
    // Filter state (read)
    objetivo, setObjetivo,
    activeTab, setActiveTab,
    searchTerm, setSearchTerm,
    showSearchBox, setShowSearchBox,
    selectedMaterias,
    selectedAssuntos, setSelectedAssuntos,
    selectedBancas,
    selectedAnos,
    selectedOrgaos,
    selectedConcursos,
    selectedCarreiras,
    selectedEscolaridades,
    selectedFormacoes,
    selectedRegioes,
    selectedFavoritas,
    selectedEnunciados,
    questaoTecId, setQuestaoTecId,
    selectedStatus, setSelectedStatus,
    isFilterExpanded, setIsFilterExpanded,
    visibleQuestionsCount, setVisibleQuestionsCount,
    expandedMateriaFolder, setExpandedMateriaFolder,
    cadernoNome, setCadernoNome,
    pastaDestino, setPastaDestino,
    gerarEmSerie, setGerarEmSerie,
    filtros, setFiltros,

    // Derived / computed
    materiasUnicas,
    materiasComAssuntos,
    bancasUnicas,
    anosUnicos,
    orgaosUnicos,
    concursosUnicos,
    filteredQuestions,
    filteredCount,
    totalFiltrosAtivos,

    // Actions
    handleToggleMateria,
    handleToggleAssunto,
    handleToggleBanca,
    handleToggleAno,
    handleToggleOrgao,
    handleToggleConcurso,
    handleToggleCarreira,
    handleToggleEscolaridade,
    handleToggleFormacao,
    handleToggleRegiao,
    handleToggleFavorita,
    handleToggleEnunciado,
    handleResetFilters,
    getFilteredQuestions,
    buildServerFilters,
  }
}
