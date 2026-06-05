import { useEffect, useState } from 'react'
import { fetchAllResolucoes, insertHistoricoResolucao, updateResolucaoProfessor } from '../services/supabase.service'
import { gerarExplicacaoErro } from '../services/gemini.service'
import { trackEvent } from '../services/hermesTracker'
import type { ResolucaoView } from '../types/database'

/**
 * Hook para o Caderno de Erros (Revisao).
 * Gerencia o carregamento de erros e o fluxo de revisão questão a questão.
 * Com o modelo relacional, cada tentativa gera um novo registro em historico_resolucoes.
 */
export function useRevisao() {
  const [erros, setErros] = useState<ResolucaoView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Navegação
  const [questaoAtualIndex, setQuestaoAtualIndex] = useState(0)

  // Estado de resposta
  const [alternativaSelecionada, setAlternativaSelecionada] = useState<string | null>(null)
  const [revelado, setRevelado] = useState(false)
  const [salvandoResposta, setSalvandoResposta] = useState(false)

  // Explicações por ID de questão
  const [explicacoes, setExplicacoes] = useState<Record<string, string>>({})
  const [loadingExplicacao, setLoadingExplicacao] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAllResolucoes()
        
        // Agrupa por questao_tec_id e mantém apenas a tentativa mais recente
        const latestAttemptsMap = new Map<number, ResolucaoView>()
        for (const item of data) {
          if (item.questao_tec_id && !latestAttemptsMap.has(item.questao_tec_id)) {
            latestAttemptsMap.set(item.questao_tec_id, item)
          }
        }
        
        const schedule = JSON.parse(localStorage.getItem('concursos_spaced_repetition') || '{}')
        const now = new Date()
        
        const dueQuestions = Array.from(latestAttemptsMap.values()).filter(item => {
          // Se errou a última tentativa, está sempre na fila de revisão
          if (!item.acertou) return true
          
          // Se acertou, verifica se tem agendamento ativo e se está vencido (due)
          const meta = schedule[String(item.questao_id || item.id)]
          if (meta && meta.proximaRevisao) {
            return new Date(meta.proximaRevisao) <= now
          }
          
          return false
        })
        
        setErros(dueQuestions)
      } catch (err: unknown) {
        console.error('Erro ao buscar caderno de erros:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar caderno de erros.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const questaoAtual = erros[questaoAtualIndex] ?? null

  // Garante que toda nova questão sempre carregue sem resposta selecionada e não-revelada ao navegar
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlternativaSelecionada(null)
    setRevelado(false)
  }, [questaoAtual?.questao_tec_id])

  const handleResponder = () => {
    if (!alternativaSelecionada) return
    setRevelado(true)
  }

  /**
   * Registra a tentativa no banco (historico_resolucoes) e avança.
   * A questão só sai do caderno de erros se o usuário acertar.
   */
  /**
   * Registra a tentativa no banco (historico_resolucoes).
   */
  const handleConfirmarResposta = async (tempoSegundos: number = 0) => {
    if (!alternativaSelecionada || !questaoAtual) return

    const acertou = alternativaSelecionada.toUpperCase() === (questaoAtual.gabarito || '').toUpperCase()

    setSalvandoResposta(true)
    try {
      await insertHistoricoResolucao({
        questao_id: questaoAtual.questao_id,
        questao_tec_id: questaoAtual.questao_tec_id,
        alternativa: alternativaSelecionada,
        acertou,
        tempo_segundos: tempoSegundos,
      })

      trackEvent('revisar_questao', {
        questao_id: questaoAtual.questao_id || questaoAtual.id,
        questao_tec_id: questaoAtual.questao_tec_id,
        materia: questaoAtual.materia,
        assunto: questaoAtual.assunto,
        banca_texto: questaoAtual.banca_texto,
        orgao: questaoAtual.orgao,
        concurso: questaoAtual.concurso,
        ano: questaoAtual.ano,
        gabarito: questaoAtual.gabarito,
        alternativa_selecionada: alternativaSelecionada,
        acertou,
        tempo_segundos: tempoSegundos,
        enunciado: questaoAtual.enunciado,
        alternativas: questaoAtual.alternativas,
      })
    } catch (err: unknown) {
      console.error('Erro ao salvar resposta:', err)
    } finally {
      setSalvandoResposta(false)
    }

    setRevelado(true)
  }

  const handleProxima = () => {
    setAlternativaSelecionada(null)
    setRevelado(false)
    if (questaoAtualIndex < erros.length - 1) {
      setQuestaoAtualIndex(prev => prev + 1)
    }
  }

  /**
   * Classifica a facilidade da resposta usando o algoritmo SM-2 e reagenda.
   */
  const handleClassificar = async (grade: number) => {
    if (!questaoAtual) return

    const questaoId = questaoAtual.questao_id || questaoAtual.id
    const schedule = JSON.parse(localStorage.getItem('concursos_spaced_repetition') || '{}')
    const meta = schedule[String(questaoId)] || { n: 0, ef: 2.5, interval: 0 }

    // Calcula os novos parâmetros SM-2
    let n = meta.n
    let ef = meta.ef
    let interval: number

    if (grade >= 3) {
      if (n === 0) {
        interval = 1
      } else if (n === 1) {
        interval = 4
      } else {
        interval = Math.round(meta.interval * meta.ef)
      }
      n = n + 1
    } else {
      n = 0
      interval = 1
    }

    // Atualiza fator de facilidade (EF)
    ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    if (ef < 1.3) ef = 1.3

    const proximaRevisao = new Date()
    proximaRevisao.setDate(proximaRevisao.getDate() + interval)

    // Grava de volta no localStorage
    schedule[String(questaoId)] = {
      n,
      ef,
      interval,
      proximaRevisao: proximaRevisao.toISOString()
    }
    localStorage.setItem('concursos_spaced_repetition', JSON.stringify(schedule))

    trackEvent('classificar_revisao', { questao_id: questaoId, grade })

    // Remove a questão da fila ativa localmente
    setErros(prev => prev.filter((_, idx) => idx !== questaoAtualIndex))

    // Ajusta o índice
    if (questaoAtualIndex >= erros.length - 1 && questaoAtualIndex > 0) {
      setQuestaoAtualIndex(prev => prev - 1)
    }

    // Reseta estado da resposta
    setAlternativaSelecionada(null)
    setRevelado(false)
  }

  /**
   * Obtém os prazos dinâmicos baseados no estado atual de SM-2
   */
  const obterPrazosEstimados = (questaoId: number) => {
    const schedule = JSON.parse(localStorage.getItem('concursos_spaced_repetition') || '{}')
    const meta = schedule[String(questaoId)] || { n: 0, ef: 2.5, interval: 0 }

    const dificilInterval = 1
    
    let bomInterval: number
    if (meta.n === 0) bomInterval = 1
    else if (meta.n === 1) bomInterval = 4
    else bomInterval = Math.max(1, Math.round(meta.interval * meta.ef))

    let facilInterval: number
    if (meta.n === 0) facilInterval = 3
    else if (meta.n === 1) facilInterval = 6
    else facilInterval = Math.max(1, Math.round(meta.interval * meta.ef * 1.3))

    return {
      dificil: dificilInterval,
      bom: bomInterval,
      facil: facilInterval
    }
  }

  const handleExplicacaoIA = async () => {
    if (!questaoAtual || !alternativaSelecionada || loadingExplicacao) return

    const targetId = questaoAtual.questao_id || questaoAtual.id
    if (!targetId) return

    const key = String(targetId)
    if (explicacoes[key]) return // já gerada

    setLoadingExplicacao(true)
    try {
      const texto = await gerarExplicacaoErro(questaoAtual, alternativaSelecionada)
      setExplicacoes(prev => ({ ...prev, [key]: texto }))
      
      // Salva automaticamente no banco de dados para evitar re-gerações futuras
      await updateResolucaoProfessor(targetId, texto)
      
      // Atualiza o estado local reativamente
      setErros(prev => prev.map(q => 
        (q.questao_id || q.id) === targetId ? { ...q, resolucao_professor: texto } : q
      ))

      trackEvent('gerar_explicacao_ia', {
        questao_id: targetId,
        materia: questaoAtual.materia,
        assunto: questaoAtual.assunto,
      })
    } catch (err: unknown) {
      console.error('Erro na IA:', err)
      setExplicacoes(prev => ({
        ...prev,
        [key]: 'Desculpe, ocorreu um erro ao gerar a explicação. Verifique sua chave de API.',
      }))
    } finally {
      setLoadingExplicacao(false)
    }
  }

  const explicacaoAtual = questaoAtual
    ? explicacoes[String(questaoAtual.questao_id || questaoAtual.id)] ?? null
    : null

  return {
    erros,
    loading,
    error,
    questaoAtual,
    questaoAtualIndex,
    setQuestaoAtualIndex,
    totalErros: erros.length,
    alternativaSelecionada,
    setAlternativaSelecionada,
    revelado,
    salvandoResposta,
    explicacaoAtual,
    loadingExplicacao,
    handleResponder,
    handleConfirmarResposta,
    handleProxima,
    handleExplicacaoIA,
    handleClassificar,
    obterPrazosEstimados,
  }
}
