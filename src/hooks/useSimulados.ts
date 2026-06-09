import { useState, useEffect, useRef } from 'react'
import { fetchAllQuestoes, insertHistoricoResolucao } from '../services/supabase.service'
import { gerarFeedbackSimulado } from '../services/gemini.service'
import { trackEvent } from '../services/hermesTracker'
import type { ResolucaoView } from '../types/database'

export type SimuladoEtapa = 'setup' | 'active' | 'submitting' | 'results'

export interface SimuladoHistoricoItem {
  id: string
  data: string
  qtdQuestoes: number
  tempoMinutos: number
  tempoGasto: number
  acertos: number
  total: number
  taxa: number
  diagnosticoIA: string
}

export interface SimuladoConfig {
  qtdQuestoes: number
  tempoMinutos: number
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function useSimulados() {
  const [allQuestoes, setAllQuestoes] = useState<ResolucaoView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados do simulado ativo
  const [etapa, setEtapa] = useState<SimuladoEtapa>('setup')
  const [config, setConfig] = useState<SimuladoConfig>({ qtdQuestoes: 10, tempoMinutos: 15 })
  const [questoesSelected, setQuestoesSelected] = useState<ResolucaoView[]>([])
  const [respostasMarcadas, setRespostasMarcadas] = useState<Record<number, string>>({})
  const [questaoAtualIndex, setQuestaoAtualIndex] = useState(0)

  // Cronômetro
  const [tempoRestante, setTempoRestante] = useState(0)
  const [tempoGasto, setTempoGasto] = useState(0)

  // Resultados
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [diagnosticoIA, setDiagnosticoIA] = useState<string | null>(null)
  const [pontuacao, setPontuacao] = useState<{ acertos: number; total: number; taxa: number } | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Histórico de simulados locais
  const [historicoSimulados, setHistoricoSimulados] = useState<SimuladoHistoricoItem[]>([])

  // Carrega histórico do localStorage
  useEffect(() => {
    try {
      const hist = JSON.parse(localStorage.getItem('concursos_simulado_historico') || '[]')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistoricoSimulados(hist)
    } catch (err: unknown) {
      console.error('Erro ao carregar histórico local de simulados:', err)
    }
  }, [etapa])

  // Carrega as questões no início para analisar o perfil do usuário
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllQuestoes()
        setAllQuestoes(data)
      } catch (err: unknown) {
        console.error('Erro ao carregar questões para simulado:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar banco de dados.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /**
   * Submete todas as respostas ao banco de dados e obtém feedback da IA
   */
  const handleFinalizarSimulado = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setEtapa('submitting')

    let acertos = 0
    const total = questoesSelected.length

    // Mapeamento dos erros cometidos neste simulado
    const errosCometidos: { materia: string; assunto: string }[] = []

    // Calcula tempo gasto médio por questão
    const tempoMedioQuestao = total > 0 ? Math.round(tempoGasto / total) : 0

    // Salva cada resposta na tabela historico_resolucoes do Supabase
    const promises = questoesSelected.map(async q => {
      const id = q.questao_id || q.id!
      const resposta = respostasMarcadas[id] || ''
      const acertou = resposta.toUpperCase() === (q.gabarito || '').toUpperCase()

      if (acertou) {
        acertos++
      } else {
        errosCometidos.push({
          materia: q.materia || 'Geral',
          assunto: q.assunto || 'Sem Assunto',
        })
      }

      // Registra a tentativa no Supabase
      try {
        await insertHistoricoResolucao({
          questao_id: id,
          questao_tec_id: q.questao_tec_id,
          alternativa: resposta,
          acertou,
          tempo_segundos: tempoMedioQuestao,
        })
      } catch (err: unknown) {
        console.error(`Erro ao salvar histórico do simulado para questão ${id}:`, err)
      }
    })

    await Promise.all(promises)

    const taxa = total > 0 ? Math.round((acertos / total) * 100) : 0
    setPontuacao({ acertos, total, taxa })

    trackEvent('finalizar_simulado', { acertos, total, taxa })

    // Busca feedback tático no Gemini
    setLoadingFeedback(true)
    let feedbackText: string
    try {
      feedbackText = await gerarFeedbackSimulado(errosCometidos, acertos, total)
      setDiagnosticoIA(feedbackText)
    } catch (err: unknown) {
      console.error('Erro ao gerar feedback do Gemini:', err)
      feedbackText = '# Diagnóstico Indisponível\nOcorreu um erro temporário ao conectar-se ao Gemini AI. Verifique sua chave de API nas configurações.'
      setDiagnosticoIA(feedbackText)
    } finally {
      setLoadingFeedback(false)
    }

    // Salva no histórico do localStorage
    const novoSimulado: SimuladoHistoricoItem = {
      id: `sim_${Date.now()}`,
      data: new Date().toISOString(),
      qtdQuestoes: total,
      tempoMinutos: config.tempoMinutos,
      tempoGasto: tempoGasto,
      acertos,
      total,
      taxa,
      diagnosticoIA: feedbackText
    }

    try {
      const historicoExistente = JSON.parse(localStorage.getItem('concursos_simulado_historico') || '[]')
      const novoHistorico = [novoSimulado, ...historicoExistente]
      localStorage.setItem('concursos_simulado_historico', JSON.stringify(novoHistorico))
      setHistoricoSimulados(novoHistorico)
    } catch (err: unknown) {
      console.error('Erro ao salvar simulado no histórico local:', err)
    }

    setEtapa('results')
  }

  // Gerencia o cronômetro do simulado ativo
  useEffect(() => {
    if (etapa === 'active') {
      timerRef.current = setInterval(() => {
        setTempoRestante(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            // Auto submete ao zerar o cronômetro
            handleFinalizarSimulado()
            return 0
          }
          return prev - 1
        })
        setTempoGasto(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, questoesSelected])

  /**
   * Identifica os assuntos ou matérias com aproveitamento abaixo de 70%
   */
  const obterTopicosFracos = () => {
    const weakAssuntos = new Set<string>()
    const weakMaterias = new Set<string>()

    // Pega questões resolvidas recentemente para calcular estatísticas
    const respondidas = allQuestoes.filter(q => q.alternativa && q.alternativa !== '')

    const statsAssunto: Record<string, { total: number; acertos: number }> = {}
    const statsMateria: Record<string, { total: number; acertos: number }> = {}

    respondidas.forEach(q => {
      if (q.assunto) {
        if (!statsAssunto[q.assunto]) statsAssunto[q.assunto] = { total: 0, acertos: 0 }
        statsAssunto[q.assunto].total++
        if (q.acertou) statsAssunto[q.assunto].acertos++
      }
      if (q.materia) {
        if (!statsMateria[q.materia]) statsMateria[q.materia] = { total: 0, acertos: 0 }
        statsMateria[q.materia].total++
        if (q.acertou) statsMateria[q.materia].acertos++
      }
    })

    Object.entries(statsAssunto).forEach(([assunto, s]) => {
      const taxa = (s.acertos / s.total) * 100
      if (taxa < 70) weakAssuntos.add(assunto)
    })

    Object.entries(statsMateria).forEach(([materia, s]) => {
      const taxa = (s.acertos / s.total) * 100
      if (taxa < 70) weakMaterias.add(materia)
    })

    return { weakAssuntos, weakMaterias }
  }

  /**
   * Inicializa o simulado ativo
   */
  const handleIniciarSimulado = (qtd: number, tempoMin: number) => {
    setConfig({ qtdQuestoes: qtd, tempoMinutos: tempoMin })
    setRespostasMarcadas({})
    setQuestaoAtualIndex(0)
    setTempoRestante(tempoMin * 60)
    setTempoGasto(0)
    setDiagnosticoIA(null)
    setPontuacao(null)

    // Filtra questões do banco baseadas nas fraquezas
    const { weakAssuntos, weakMaterias } = obterTopicosFracos()

    // Filtra apenas as questões válidas do banco que contêm pelo menos 2 alternativas (ignora lixo do PDF)
    const questoesValidas = allQuestoes.filter(
      q => q.alternativas && Object.keys(q.alternativas).length >= 2
    )

    // Exclui questões que o aluno errou e ainda não corrigiu (para não refazer as mesmas questões do Caderno de Erros)
    const questoesValidasSemErros = questoesValidas.filter(
      q => !(q.alternativa && !q.acertou)
    )

    // 1. Damos prioridade absoluta para questões INÉDITAS (nunca resolvidas) dos assuntos fracos
    let pool = questoesValidasSemErros.filter(
      q => q.assunto && weakAssuntos.has(q.assunto) && (!q.alternativa || q.alternativa === '')
    )

    // 2. Se faltar, adicionamos questões que o aluno já acertou dos mesmos assuntos fracos (para fixação)
    if (pool.length < qtd) {
      const resolvidasAcerto = questoesValidasSemErros.filter(
        q => q.assunto && weakAssuntos.has(q.assunto) && q.alternativa && q.acertou && !pool.some(p => p.id === q.id)
      )
      pool = [...pool, ...resolvidasAcerto]
    }

    // 3. Se ainda faltar, adicionamos inéditas das matérias fracas (geral)
    if (pool.length < qtd) {
      const materiasIneditas = questoesValidasSemErros.filter(
        q => q.materia && weakMaterias.has(q.materia) && (!q.alternativa || q.alternativa === '') && !pool.some(p => p.id === q.id)
      )
      pool = [...pool, ...materiasIneditas]
    }

    // 4. Se ainda faltar, adicionamos questões acertadas das matérias fracas
    if (pool.length < qtd) {
      const materiasResolvidas = questoesValidasSemErros.filter(
        q => q.materia && weakMaterias.has(q.materia) && q.alternativa && q.acertou && !pool.some(p => p.id === q.id)
      )
      pool = [...pool, ...materiasResolvidas]
    }

    // 5. Se mesmo assim faltar, pega qualquer inédita do banco
    if (pool.length < qtd) {
      const ineditasGeral = questoesValidasSemErros.filter(
        q => (!q.alternativa || q.alternativa === '') && !pool.some(p => p.id === q.id)
      )
      pool = [...pool, ...ineditasGeral]
    }

    // 6. Se ainda assim faltar (caso raro), pega qualquer questão restante (exceto erros)
    if (pool.length < qtd) {
      const geral = questoesValidasSemErros.filter(q => !pool.some(p => p.id === q.id))
      pool = [...pool, ...geral]
    }

    // Mistura e limita à quantidade solicitada
    const selecionadas = shuffleArray(pool).slice(0, qtd)
    setQuestoesSelected(selecionadas)
    setEtapa('active')

    trackEvent('iniciar_simulado', { qtd_questoes: qtd, tempo_minutos: tempoMin })
  }

  /**
   * Marca uma resposta temporária para a questão
   */
  const handleMarcarResposta = (questaoId: number, alternativa: string) => {
    setRespostasMarcadas(prev => ({
      ...prev,
      [questaoId]: alternativa,
    }))
  }

  /**
   * Reseta o simulado voltando para a tela de Setup
   */
  const handleResetSimulado = () => {
    setEtapa('setup')
    setQuestoesSelected([])
    setRespostasMarcadas({})
    setQuestaoAtualIndex(0)
    setTempoRestante(0)
    setTempoGasto(0)
    setPontuacao(null)
    setDiagnosticoIA(null)
  }

  /**
   * Limpa todo o histórico de simulados do localStorage
   */
  const handleLimparHistorico = () => {
    if (window.confirm('Tem certeza de que deseja apagar todo o seu histórico de simulados? Essa ação não pode ser desfeita.')) {
      try {
        localStorage.removeItem('concursos_simulado_historico')
        setHistoricoSimulados([])
      } catch (err: unknown) {
        console.error('Erro ao apagar histórico local:', err)
      }
    }
  }

  return {
    loading,
    error,
    etapa,
    config,
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
  }
}
