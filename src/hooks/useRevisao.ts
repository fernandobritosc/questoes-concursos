import { useEffect, useState } from 'react'
import { fetchResolucoeComErros, insertHistoricoResolucao, updateResolucaoProfessor } from '../services/supabase.service'
import { gerarExplicacaoErro } from '../services/gemini.service'
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
        const data = await fetchResolucoeComErros()
        setErros(data)
      } catch (err: any) {
        console.error('Erro ao buscar caderno de erros:', err)
        setError(err.message || 'Erro ao carregar caderno de erros.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const questaoAtual = erros[questaoAtualIndex] ?? null

  // Garante que toda nova questão sempre carregue sem resposta selecionada e não-revelada ao navegar
  useEffect(() => {
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

      // Se acertou, remove do caderno de erros localmente
      if (acertou) {
        setErros(prev => prev.filter((_, idx) => idx !== questaoAtualIndex))
        // Ajusta o índice se necessário
        if (questaoAtualIndex >= erros.length - 1 && questaoAtualIndex > 0) {
          setQuestaoAtualIndex(prev => prev - 1)
        }
      }
    } catch (err: any) {
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
    } catch (err: any) {
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
  }
}
