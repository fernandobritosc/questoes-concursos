import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { 
  fetchPaginatedQuestoes,
  fetchFilterOptions,
  updateResolucaoProfessor,
  insertHistoricoResolucao,
  fetchHistoricoByQuestao,
  updateQuestao
} from '../services/supabase.service'
import { gerarResolucaoProfessor } from '../services/gemini.service'
import { trackEvent } from '../services/hermesTracker'
import type { ResolucaoView, HistoricoResolucao } from '../types/database'

// Alias de compatibilidade local
type Resolucao = ResolucaoView

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type FilterTab =
  | 'materia'
  | 'banca'
  | 'orgao'
  | 'ano'
  | 'carreira'
  | 'escolaridade'
  | 'formacao'
  | 'regiao'
  | 'favoritas'
  | 'enunciados'
  | 'opcoes'

export type ObjetivoFilter = 'todos' | 'ineditas' | 'discursivas'
export type StatusFilter = 'todos' | 'acertos' | 'erros'

export interface ImportStatus {
  step: 'idle' | 'loading_engine' | 'reading_pages' | 'parsing' | 'review' | 'checking_existing' | 'saving' | 'success' | 'error'
  progress: number
  total: number
  errorMsg?: string
  importedCount?: number
}

// ─── Constantes ────────────────────────────────────────────────────────────────

export const CARREIRAS_DISPONIVEIS = ['Policial', 'Fiscal', 'Tribunais', 'Administrativa', 'Saúde', 'Educação', 'Jurídica', 'Militar', 'Legislativa']
export const ESCOLARIDADES_DISPONIVEIS = ['Ensino Médio', 'Ensino Superior', 'Ensino Fundamental']
export const FORMACOES_DISPONIVEIS = ['Qualquer área de formação', 'Direito', 'Administração', 'Contabilidade / Economia', 'Tecnologia da Informação', 'Engenharia', 'Pedagogia', 'Medicina / Enfermagem']
export const REGIOES_DISPONIVEIS = ['Nacional (Federal)', 'São Paulo (SP)', 'Rio de Janeiro (RJ)', 'Minas Gerais (MG)', 'Goiás (GO)', 'Distrito Federal (DF)', 'Região Sul', 'Região Nordeste']
export const FAVORITAS_OPCOES = ['Minhas Favoritas (Estrelas)', 'Questões com Anotações', 'Questões Resolvidas recentemente']
export const ENUNCIADOS_OPCOES = ['Comentadas por Professores', 'Comentadas por IA', 'Sem Comentários', 'Com resolução em Vídeo']

// ─── Hook Principal ────────────────────────────────────────────────────────────

/**
 * Hook central do Banco de Questões.
 * Gerencia: carregamento, filtros, caderno de estudo, importação de PDF e resolução por IA.
 */
export function useQuestoes() {
  // ── Dados Principais ──────────────────────────────────────────────────────────
  const [resolucoes, setResolucoes] = useState<ResolucaoView[]>([])
  const [loading, setLoading] = useState(true)

  // ── Paginação ─────────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [pageLoading, setPageLoading] = useState(false)
  const [filterOptions, setFilterOptions] = useState<{ materias: string[]; bancas: string[]; anos: number[]; orgaos: string[]; concursos: string[] } | null>(null)

  // ── Estado do Caderno ─────────────────────────────────────────────────────────
  const [cadernoQuestoes, setCadernoQuestoes] = useState<ResolucaoView[]>([])
  const [isCadernoActive, setIsCadernoActive] = useState(false)
  const [currentQuestaoIndex, setCurrentQuestaoIndex] = useState(0)
  const [alternativaSelecionada, setAlternativaSelecionada] = useState<string | null>(null)
  const [revelado, setRevelado] = useState(false)
  const [explicacoes, setExplicacoes] = useState<Record<number, string>>({})
  const [loadingExplicacao, setLoadingExplicacao] = useState<number | null>(null)
  const [loadingError, setLoadingError] = useState<string | null>(null)
  const [pageLoadingError, setPageLoadingError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  // ── Resolução do Professor ────────────────────────────────────────────────────
  const [editingResolucao, setEditingResolucao] = useState(false)
  const [resolucaoText, setResolucaoText] = useState('')
  const [resolucaoExpanded, setResolucaoExpanded] = useState(true)
  const [savingResolucao, setSavingResolucao] = useState(false)

  // ── Histórico e Resoluções Relacionais ──────────────────────────────────────────
  const [tempoSegundos, setTempoSegundos] = useState(0)
  const [salvandoResposta, setSalvandoResposta] = useState(false)
  const [historicoQuestaoAtiva, setHistoricoQuestaoAtiva] = useState<HistoricoResolucao[]>([])
  const [loadingHistoricoAtivo, setLoadingHistoricoAtivo] = useState(false)

  // ── Filtros ───────────────────────────────────────────────────────────────────
  const [objetivo, setObjetivo] = useState<ObjetivoFilter>('todos')
  const [activeTab, setActiveTab] = useState<FilterTab>('materia')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchBox, setShowSearchBox] = useState(false)
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([])
  const [selectedAssuntos, setSelectedAssuntos] = useState<string[]>([])
  const [selectedBancas, setSelectedBancas] = useState<string[]>([])
  const [selectedAnos, setSelectedAnos] = useState<number[]>([])
  const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>([])
  const [selectedConcursos, setSelectedConcursos] = useState<string[]>([])
  const [selectedCarreiras, setSelectedCarreiras] = useState<string[]>([])
  const [selectedEscolaridades, setSelectedEscolaridades] = useState<string[]>([])
  const [selectedFormacoes, setSelectedFormacoes] = useState<string[]>([])
  const [selectedRegioes, setSelectedRegioes] = useState<string[]>([])
  const [selectedFavoritas, setSelectedFavoritas] = useState<string[]>([])
  const [selectedEnunciados, setSelectedEnunciados] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('todos')
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)
  const [visibleQuestionsCount, setVisibleQuestionsCount] = useState(25)
  const [expandedMateriaFolder, setExpandedMateriaFolder] = useState<string | null>(null)
  const [cadernoNome, setCadernoNome] = useState('Caderno de Estudo')
  const [pastaDestino, setPastaDestino] = useState('Analista Legislativo (ALEGO)/2026 - Analista Admi...')
  const [gerarEmSerie, setGerarEmSerie] = useState(false)

  // ── Filtros do Mapa de Questões (Tópicos/Assuntos) ───────────────────────────
  const [filtros, setFiltros] = useState<Record<string, string> | null>(null)

  const questoesExibidas = useMemo(() => {
    if (!filtros) return cadernoQuestoes;
    return cadernoQuestoes.filter(q => {
      for (const [key, val] of Object.entries(filtros)) {
        if (String((q as unknown as Record<string, unknown>)[key] || `Sem ${key}`) !== val) return false;
      }
      return true;
    })
  }, [cadernoQuestoes, filtros])

  // ── Importação PDF ────────────────────────────────────────────────────────────
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // ── Paginação e Filtros Server-Side ──────────────────────────────────────────
  const abortControllerRef = useRef<AbortController | null>(null)

  const PAGE_SIZE = 200

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

  const loadPage = useCallback(async (targetPage: number, replace: boolean = false) => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Don't set pageLoading for the initial load (loading === true already covers it)
    if (!loading) setPageLoading(true)
    setPageLoadingError(null)

    try {
      const serverFilters = buildServerFilters()
      const result = await fetchPaginatedQuestoes(targetPage, PAGE_SIZE, serverFilters, controller.signal)

      if (controller.signal.aborted) return  // Stale response — discard

      if (replace) {
        // Replace all data (new filter set or first load)
        setResolucoes(result.data)
        setCadernoQuestoes(result.data)
      } else {
        // Append data (same filter set, new page)
        setResolucoes(prev => {
          const updated = [...prev]
          const start = (targetPage - 1) * PAGE_SIZE
          result.data.forEach((item, i) => { updated[start + i] = item })
          return updated
        })
        setCadernoQuestoes(prev => {
          const updated = [...prev]
          const start = (targetPage - 1) * PAGE_SIZE
          result.data.forEach((item, i) => { updated[start + i] = item })
          return updated
        })
      }

      setPage(targetPage)
      setTotalPages(result.totalPages)
      setTotalCount(result.total)
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return  // Silently ignore cancelled requests
      if (!controller.signal.aborted) {
        setPageLoadingError(err instanceof Error ? err.message : 'Erro ao carregar página.')
      }
    } finally {
      if (!controller.signal.aborted) {
        setPageLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selectedMaterias, selectedBancas, selectedAnos, selectedOrgaos, selectedConcursos])

  const handleNavigatePage = useCallback(async (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages || targetPage === page) return
    await loadPage(targetPage, false)
  }, [totalPages, page, loadPage])

  // ─── Effects ─────────────────────────────────────────────────────────────────

  // Sync resolução text when navigating caderno
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (questoesExibidas.length > 0 && questoesExibidas[currentQuestaoIndex]) {
      const q = questoesExibidas[currentQuestaoIndex]
      setResolucaoText(q.resolucao_professor || '')
      setEditingResolucao(false)
      setAlternativaSelecionada(null)
      setRevelado(false)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [currentQuestaoIndex, questoesExibidas])

  // Initial load — fetch page 1 and filter options
  useEffect(() => {
    let cancelled = false
    async function load() {
      console.log('[LOG useQuestoes] Iniciando carga paginada...')
      setLoadingError(null)
      try {
        // Fetch filter options in parallel with page 1
        const serverFilters = buildServerFilters()
        const [paginatedResult, filterOpts] = await Promise.race([
          Promise.all([
            fetchPaginatedQuestoes(1, PAGE_SIZE, serverFilters),
            fetchFilterOptions(),
          ]),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout ao conectar com o banco de dados. Verifique sua conexão.')), 30000)
          ),
        ])

        if (cancelled) {
          console.log('[LOG useQuestoes] Componente desmontado durante carga.')
          return
        }

        const result = paginatedResult
        const opts = filterOpts
        console.log(`[LOG useQuestoes] Dados carregados: ${result.data.length} questões (página 1 de ${result.totalPages}, total=${result.total})`)

        if (result.data.length > 0) {
          const q0 = result.data[0]
          console.log(`[LOG useQuestoes] 1ª questão: id=${q0.questao_tec_id}, enunciado=${(q0.enunciado || '').length}chars`)
        }

        setResolucoes(result.data)
        setCadernoQuestoes(result.data)
        setPage(1)
        setTotalPages(result.totalPages)
        setTotalCount(result.total)
        setFilterOptions(opts)
      } catch (err: unknown) {
        console.error('[LOG useQuestoes] Erro na carga inicial:', err)
        if (!cancelled) {
          setLoadingError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar questões.')
        }
      } finally {
        if (!cancelled) {
          console.log('[LOG useQuestoes] setLoading(false)')
          setLoading(false)
        }
      }
    }
    console.log('[LOG useQuestoes] useEffect disparado, chamando load()')
    load()
    return () => {
      console.log('[LOG useQuestoes] Cleanup: cancelando carga')
      cancelled = true
      abortControllerRef.current?.abort()
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // When filters change, reset to page 1 and reload
  useEffect(() => {
    // Skip the initial render — initial load handles page 1
    if (loading) return

    async function reloadOnFilterChange() {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      setPageLoading(true)
      setPageLoadingError(null)

      try {
        const serverFilters = buildServerFilters()
        const result = await fetchPaginatedQuestoes(1, PAGE_SIZE, serverFilters, controller.signal)
        if (controller.signal.aborted) return

        setResolucoes(result.data)
        setCadernoQuestoes(result.data)
        setPage(1)
        setTotalPages(result.totalPages)
        setTotalCount(result.total)
        setCurrentQuestaoIndex(0)
        setAlternativaSelecionada(null)
        setRevelado(false)
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return
        if (!controller.signal.aborted) {
          setPageLoadingError(err instanceof Error ? err.message : 'Erro ao carregar página.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setPageLoading(false)
        }
      }
    }

    reloadOnFilterChange()
    return () => { abortControllerRef.current?.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMaterias, selectedBancas, selectedAnos,
    selectedOrgaos, selectedConcursos,
  ])

  // ─── Relational Timer & History Loading Effects ──────────────────────────────
  
  // Timer: incrementa segundos se a questão ainda não foi respondida
  useEffect(() => {
    if (revelado || questoesExibidas.length === 0) return
    const timer = setInterval(() => {
      setTempoSegundos(prev => prev + 1)
    }, 1000)
    return () => { clearInterval(timer) }
  }, [revelado, currentQuestaoIndex, questoesExibidas])

  // Reset timer on navigating questions
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTempoSegundos(0)
  }, [currentQuestaoIndex])

  const loadHistoricoDaQuestao = async (questaoId: number) => {
    setLoadingHistoricoAtivo(true)
    try {
      const hist = await fetchHistoricoByQuestao(questaoId)
      setHistoricoQuestaoAtiva(hist)
    } catch (err: unknown) {
      console.error('Erro ao carregar histórico da questão ativa:', err)
    } finally {
      setLoadingHistoricoAtivo(false)
    }
  }

  // Load history of active question when currentQuestaoIndex or caderno changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (questoesExibidas.length > 0 && questoesExibidas[currentQuestaoIndex]) {
      const q = questoesExibidas[currentQuestaoIndex]
      const targetId = q.questao_id || q.id
      if (targetId) {
        loadHistoricoDaQuestao(targetId)
      } else {
        setHistoricoQuestaoAtiva([])
      }
    } else {
      setHistoricoQuestaoAtiva([])
    }
  }, [currentQuestaoIndex, questoesExibidas])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ─── Derived Data (Filtros dinâmicos) — memoizados ─────────────────────────────

  const materiasComAssuntos = useMemo(() =>
    resolucoes.reduce((acc, curr) => {
      if (!curr.materia) return acc
      if (!acc[curr.materia]) acc[curr.materia] = new Set<string>()
      if (curr.assunto) acc[curr.materia].add(curr.assunto)
      return acc
    }, {} as Record<string, Set<string>>),
    [resolucoes]
  )

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

  // ─── Actions: Filtros ─────────────────────────────────────────────────────────

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

  const handleToggleAssunto = (assunto: string, materia: string) => {
    setSelectedAssuntos(prev => {
      const isSelected = prev.includes(assunto)
      if (isSelected) return prev.filter(a => a !== assunto)
      if (!selectedMaterias.includes(materia)) {
        setSelectedMaterias(mPrev => [...mPrev, materia])
      }
      return [...prev, assunto]
    })
  }

  const makeToggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (value: T) =>
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])

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

  // ─── Actions: Filtragem ───────────────────────────────────────────────────────

  const getFilteredQuestions = (): Resolucao[] => {
    return resolucoes.filter(q => {
      if (objetivo === 'ineditas' && q.alternativa && q.alternativa !== '') return false

      const hasMateriaFilter = selectedMaterias.length > 0
      const hasAssuntoFilter = selectedAssuntos.length > 0

      let matchesMateria = true
      if (hasMateriaFilter) {
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

      return matchesMateria && matchesBanca && matchesAno && matchesOrgao && matchesConcurso && matchesStatus && matchesCarreira
    })
  }

  // ─── Actions: Caderno ─────────────────────────────────────────────────────────

  const handleGerarCaderno = () => {
    const questoesFiltradas = getFilteredQuestions()
    if (questoesFiltradas.length === 0) return
    setCadernoQuestoes(questoesFiltradas)
    setCurrentQuestaoIndex(0)
    setAlternativaSelecionada(null)
    setRevelado(false)
    setIsCadernoActive(true)

    trackEvent('gerar_caderno', { quantidade: questoesFiltradas.length, total_filtros: totalFiltrosAtivos })
  }

  const handleCopy = (id: number) => {
    navigator.clipboard.writeText(id.toString())
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ─── Actions: IA no Caderno ───────────────────────────────────────────────────

  const handleExplicacaoIA = async (questao: Resolucao) => {
    const targetId = questao.questao_id || questao.id
    if (!targetId || loadingExplicacao === questao.id) return
    if (explicacoes[questao.id!]) return

    setLoadingExplicacao(questao.id!)
    try {
      const texto = await gerarResolucaoProfessor(questao)
      setExplicacoes(prev => ({ ...prev, [questao.id!]: texto }))
      
      // Salva automaticamente no banco de dados para evitar re-gerações futuras
      await updateResolucaoProfessor(targetId, texto)
      
      // Atualiza o estado da resolução local e da lista de questões reativamente
      setResolucaoText(texto)
      setCadernoQuestoes(prev => prev.map(q => 
        (q.questao_id || q.id) === targetId ? { ...q, resolucao_professor: texto } : q
      ))
      setResolucoes(prev => prev.map(q => 
        (q.questao_id || q.id) === targetId ? { ...q, resolucao_professor: texto } : q
      ))

      trackEvent('gerar_explicacao_ia', {
        questao_id: targetId,
        materia: questao.materia,
        assunto: questao.assunto,
      })
    } catch (err: unknown) {
      console.error(err)
      setExplicacoes(prev => ({
        ...prev,
        [questao.id!]: 'Ocorreu um erro ao gerar a explicação da IA. Verifique sua chave de API.'
      }))
    } finally {
      setLoadingExplicacao(null)
    }
  }

  // ─── Actions: Resolução do Professor ─────────────────────────────────────────
  const handleSaveResolucao = async () => {
    if (questoesExibidas.length === 0 || !questoesExibidas[currentQuestaoIndex]) return
    const questao = questoesExibidas[currentQuestaoIndex]
    // Usa questao_id (FK para tabela questoes) ou id como fallback
    const targetId = questao.questao_id || questao.id
    if (!targetId) return

    setSavingResolucao(true)
    try {
      await updateResolucaoProfessor(targetId, resolucaoText)

      setCadernoQuestoes(prev => prev.map(q => 
        (q.questao_id === targetId || q.id === targetId) ? { ...q, resolucao_professor: resolucaoText } : q
      ))
      setResolucoes(prev => prev.map(r =>
        (r.questao_id === targetId || r.id === targetId) ? { ...r, resolucao_professor: resolucaoText } : r
      ))
      setEditingResolucao(false)
    } catch (err: unknown) {
      console.error('Erro ao salvar resolução:', err)
      alert('Erro ao salvar a resolução do professor. Verifique sua conexão ou permissões.')
    } finally {
      setSavingResolucao(false)
    }
  }

  const handleConfirmarResposta = async () => {
    if (revelado || !alternativaSelecionada) return
    if (questoesExibidas.length === 0 || !questoesExibidas[currentQuestaoIndex]) return
    const questao = questoesExibidas[currentQuestaoIndex]
    const targetId = questao.questao_id || questao.id
    if (!targetId) return

    const acertou = alternativaSelecionada.toUpperCase() === (questao.gabarito || '').toUpperCase()

    setSalvandoResposta(true)
    try {
      await insertHistoricoResolucao({
        questao_id: targetId,
        questao_tec_id: questao.questao_tec_id,
        alternativa: alternativaSelecionada,
        acertou,
        tempo_segundos: tempoSegundos,
      })

      // Atualiza o estado local para marcar a questão como respondida
      const resolucaoData = {
        alternativa: alternativaSelecionada,
        acertou,
        tempo_segundos: tempoSegundos,
        data_resolucao: new Date().toISOString(),
      }

      setCadernoQuestoes(prev => prev.map(q => 
        (q.questao_id === targetId || q.id === targetId) ? { ...q, ...resolucaoData } : q
      ))
      
      // Atualiza na lista total de resoluções
      setResolucoes(prev => prev.map(r => 
        (r.questao_id === targetId || r.id === targetId) ? { ...r, ...resolucaoData } : r
      ))

      setRevelado(true)

      trackEvent('responder_questao', {
        questao_id: targetId,
        questao_tec_id: questao.questao_tec_id,
        materia: questao.materia,
        assunto: questao.assunto,
        banca_texto: questao.banca_texto,
        gabarito: questao.gabarito,
        alternativa_selecionada: alternativaSelecionada,
        acertou,
        tempo_segundos: tempoSegundos,
      })

      // Recarrega o histórico específico desta questão
      await loadHistoricoDaQuestao(targetId)
    } catch (err: unknown) {
      console.error('Erro ao salvar tentativa de resolução:', err)
      alert('Erro ao registrar resposta no banco de dados.')
    } finally {
      setSalvandoResposta(false)
    }
  }

  const handleEditQuestao = async (updatedFields: Partial<ResolucaoView>) => {
    if (questoesExibidas.length === 0 || !questoesExibidas[currentQuestaoIndex]) return false
    const questao = questoesExibidas[currentQuestaoIndex]
    const targetId = questao.questao_id || questao.id
    if (!targetId) return false

    try {
      // Monta payload com campos da tabela 'questoes'
      const payload: Record<string, unknown> = {}
      if (updatedFields.enunciado !== undefined) payload.enunciado = updatedFields.enunciado
      if (updatedFields.alternativas !== undefined) payload.alternativas = updatedFields.alternativas
      if (updatedFields.materia !== undefined) payload.materia = updatedFields.materia
      if (updatedFields.assunto !== undefined) payload.assunto = updatedFields.assunto
      if (updatedFields.banca_texto !== undefined) payload.banca_texto = updatedFields.banca_texto
      if (updatedFields.orgao !== undefined) payload.orgao = updatedFields.orgao
      if (updatedFields.concurso !== undefined) payload.concurso = updatedFields.concurso
      if (updatedFields.prova !== undefined) payload.prova = updatedFields.prova
      if (updatedFields.ano !== undefined) payload.ano = updatedFields.ano
      if (updatedFields.gabarito !== undefined) payload.gabarito = updatedFields.gabarito

      await updateQuestao(targetId, payload)

      const updateLocal = (q: ResolucaoView) => {
        if (q.questao_id === targetId || q.id === targetId) {
          return { ...q, ...updatedFields }
        }
        return q
      }

      setCadernoQuestoes(prev => prev.map(updateLocal))
      setResolucoes(prev => prev.map(updateLocal))

      trackEvent('editar_questao', {
        questao_id: targetId,
        campos: Object.keys(payload),
      })

      return true
    } catch (err: unknown) {
      console.error('Erro ao editar questão:', err)
      alert('Erro ao salvar alterações da questão. Verifique sua conexão.')
      return false
    }
  }
  // ─── Computed Values ──────────────────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredQuestions = useMemo(() => getFilteredQuestions(), [
    resolucoes, objetivo,
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
    // ── State ──────────────────────────────────────────────────────────────
    resolucoes,
    setResolucoes,
    loading,
    loadingError,
    page,
    totalPages,
    totalCount,
    pageLoading,
    pageLoadingError,
    handleNavigatePage,
    PAGE_SIZE,
    cadernoQuestoes,
    setCadernoQuestoes,
    isCadernoActive,
    setIsCadernoActive,
    currentQuestaoIndex,
    setCurrentQuestaoIndex,
    alternativaSelecionada,
    setAlternativaSelecionada,
    revelado,
    setRevelado,
    explicacoes,
    loadingExplicacao,
    copiedId,
    editingResolucao,
    setEditingResolucao,
    resolucaoText,
    setResolucaoText,
    resolucaoExpanded,
    setResolucaoExpanded,
    savingResolucao,
    tempoSegundos,
    salvandoResposta,
    historicoQuestaoAtiva,
    loadingHistoricoAtivo,

    // ── Filter State ───────────────────────────────────────────────────────
    filtros,
    setFiltros,
    questoesExibidas,
    objetivo,
    setObjetivo,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    showSearchBox,
    setShowSearchBox,
    selectedMaterias,
    selectedAssuntos,
    setSelectedAssuntos,
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
    selectedStatus,
    setSelectedStatus,
    isFilterExpanded,
    setIsFilterExpanded,
    visibleQuestionsCount,
    setVisibleQuestionsCount,
    expandedMateriaFolder,
    setExpandedMateriaFolder,
    cadernoNome,
    setCadernoNome,
    pastaDestino,
    setPastaDestino,
    gerarEmSerie,
    setGerarEmSerie,

    // ── Import PDF State ───────────────────────────────────────────────────
    isImportModalOpen,
    setIsImportModalOpen,

    // ── Derived / Computed ─────────────────────────────────────────────────
    materiasUnicas,
    materiasComAssuntos,
    bancasUnicas,
    anosUnicos,
    orgaosUnicos,
    concursosUnicos,
    filteredQuestions,
    filteredCount,
    totalFiltrosAtivos,

    // ── Actions ────────────────────────────────────────────────────────────
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
    handleGerarCaderno,
    handleCopy,
    handleExplicacaoIA,
    handleSaveResolucao,
    handleConfirmarResposta,
    loadHistoricoDaQuestao,
    handleEditQuestao,
  }
}
