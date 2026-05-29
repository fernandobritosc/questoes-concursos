import { useEffect, useState, useMemo } from 'react'
import { 
  fetchAllQuestoes, 
  updateResolucaoProfessor,
  insertHistoricoResolucao,
  fetchHistoricoByQuestao
} from '../services/supabase.service'
import { gerarResolucaoProfessor } from '../services/gemini.service'
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

// ─── Helper: Validação de Questão ─────────────────────────────────────────────

export const getQuestionValidation = (q: Resolucao): string[] => {
  const errors: string[] = []
  if (!q.questao_tec_id || q.questao_tec_id <= 0) errors.push('ID da questão ausente ou inválido')
  if (!q.enunciado || q.enunciado.trim().length < 10) errors.push('Enunciado curto ou ausente')
  if (!q.gabarito) errors.push('Gabarito ausente')
  const validAlts = Object.values(q.alternativas || {}).filter(val => val && val.trim() !== '')
  if (validAlts.length < 2) errors.push('Alternativas insuficientes')
  return errors
}

// ─── Hook Principal ────────────────────────────────────────────────────────────

/**
 * Hook central do Banco de Questões.
 * Gerencia: carregamento, filtros, caderno de estudo, importação de PDF e resolução por IA.
 */
export function useQuestoes() {
  // ── Dados Principais ──────────────────────────────────────────────────────────
  const [resolucoes, setResolucoes] = useState<ResolucaoView[]>([])
  const [loading, setLoading] = useState(true)

  // ── Estado do Caderno ─────────────────────────────────────────────────────────
  const [cadernoQuestoes, setCadernoQuestoes] = useState<ResolucaoView[]>([])
  const [isCadernoActive, setIsCadernoActive] = useState(false)
  const [currentQuestaoIndex, setCurrentQuestaoIndex] = useState(0)
  const [alternativaSelecionada, setAlternativaSelecionada] = useState<string | null>(null)
  const [revelado, setRevelado] = useState(false)
  const [explicacoes, setExplicacoes] = useState<Record<number, string>>({})
  const [loadingExplicacao, setLoadingExplicacao] = useState<number | null>(null)
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
        if (String((q as any)[key] || `Sem ${key}`) !== val) return false;
      }
      return true;
    })
  }, [cadernoQuestoes, filtros])

  // ── Importação PDF ────────────────────────────────────────────────────────────
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // ─── Effects ─────────────────────────────────────────────────────────────────

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleQuestionsCount(25)
  }, [selectedMaterias, selectedAssuntos, selectedBancas, selectedAnos, selectedOrgaos, selectedConcursos, selectedCarreiras, selectedStatus, objetivo])

  // Sync resolução text when navigating caderno
  useEffect(() => {
    if (questoesExibidas.length > 0 && questoesExibidas[currentQuestaoIndex]) {
      const q = questoesExibidas[currentQuestaoIndex]
      setResolucaoText(q.resolucao_professor || '')
      setEditingResolucao(false)
      setAlternativaSelecionada(null)
      setRevelado(false)
    }
  }, [currentQuestaoIndex, questoesExibidas])

  // Initial load
  useEffect(() => {
    async function load() {
      try {
        // Busca todas as questões importadas com o último resultado de cada uma
        const data = await fetchAllQuestoes()
        setResolucoes(data)
        setCadernoQuestoes(data)
      } catch (err) {
        console.error('Erro ao buscar banco de questões:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ─── Relational Timer & History Loading Effects ──────────────────────────────
  
  // Timer: incrementa segundos se a questão ainda não foi respondida
  useEffect(() => {
    let timer: any = null
    if (!revelado && questoesExibidas.length > 0) {
      timer = setInterval(() => {
        setTempoSegundos(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [revelado, currentQuestaoIndex, questoesExibidas])

  // Reset timer on navigating questions
  useEffect(() => {
    setTempoSegundos(0)
  }, [currentQuestaoIndex])

  const loadHistoricoDaQuestao = async (questaoId: number) => {
    setLoadingHistoricoAtivo(true)
    try {
      const hist = await fetchHistoricoByQuestao(questaoId)
      setHistoricoQuestaoAtiva(hist)
    } catch (err) {
      console.error('Erro ao carregar histórico da questão ativa:', err)
    } finally {
      setLoadingHistoricoAtivo(false)
    }
  }

  // Load history of active question when currentQuestaoIndex or caderno changes
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

  // ─── Derived Data (Filtros dinâmicos) ─────────────────────────────────────────

  const materiasComAssuntos = resolucoes.reduce((acc, curr) => {
    if (!curr.materia) return acc
    if (!acc[curr.materia]) acc[curr.materia] = new Set<string>()
    if (curr.assunto) acc[curr.materia].add(curr.assunto)
    return acc
  }, {} as Record<string, Set<string>>)

  const materiasUnicas = Array.from(new Set(resolucoes.map(r => r.materia).filter(Boolean))) as string[]
  const bancasUnicas = Array.from(new Set(resolucoes.map(r => r.banca_texto).filter(Boolean))) as string[]
  const anosUnicos = Array.from(new Set(resolucoes.map(r => r.ano).filter(Boolean))) as number[]
  const orgaosUnicos = Array.from(new Set(resolucoes.map(r => r.orgao).filter(Boolean))) as string[]
  const concursosUnicos = Array.from(new Set(resolucoes.map(r => r.concurso).filter(Boolean))) as string[]

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
    } catch (err) {
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
    } catch (err: any) {
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
      
      // Recarrega o histórico específico desta questão
      await loadHistoricoDaQuestao(targetId)
    } catch (err) {
      console.error('Erro ao salvar tentativa de resolução:', err)
      alert('Erro ao registrar resposta no banco de dados.')
    } finally {
      setSalvandoResposta(false)
    }
  }
  // ─── Computed Values ──────────────────────────────────────────────────────────

  const filteredQuestions = getFilteredQuestions()
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
  }
}
