import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRevisao } from '../hooks/useRevisao'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import {
  BookOpen,
  CheckCircle2,
  BookOpenCheck,
} from 'lucide-react'
import { RevisaoMiniStats } from '../components/RevisaoMiniStats'
import { RevisaoFilterBar } from '../components/RevisaoFilterBar'
import { RevisaoMateriaTable } from '../components/RevisaoMateriaTable'
import { RevisaoFocusView } from '../components/RevisaoFocusView'
import { updateResolucaoProfessor } from '../services/supabase.service'

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

  const [searchParams, setSearchParams] = useSearchParams()
  const materiaParam = searchParams.get('materia')
  const assuntoParam = searchParams.get('assunto')

  const [busca, setBusca] = useState('')
  const [initialCounts, setInitialCounts] = useState<Record<string, number>>({})

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

  const [resolucaoExpanded, setResolucaoExpanded] = useState(false)
  const [editingResolucao, setEditingResolucao] = useState(false)
  const [resolucaoText, setResolucaoText] = useState('')
  const [savingResolucao, setSavingResolucao] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (questaoAtual) {
      setResolucaoText(questaoAtual.resolucao_professor || '')
      setEditingResolucao(false)
      setResolucaoExpanded(revelado && !!questaoAtual.resolucao_professor)
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

  const errosFiltrados = useMemo(() => {
    if (materiaParam && assuntoParam) {
      return erros.filter(e => e.materia === materiaParam && e.assunto === assuntoParam)
    }
    return erros
  }, [erros, materiaParam, assuntoParam])

  const activeInFilterIndex = useMemo(() => {
    if (!questaoAtual || errosFiltrados.length === 0) return -1
    return errosFiltrados.findIndex(e => e.questao_tec_id === questaoAtual.questao_tec_id)
  }, [errosFiltrados, questaoAtual])

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

  const stats = useMemo(() => {
    return {
      totalPendentes: erros.length,
      totalMaterias: new Set(erros.map(e => e.materia || 'Sem Matéria')).size,
      totalAssuntos: new Set(erros.map(e => `${e.materia || ''}|${e.assunto || ''}`)).size,
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

  return (
    <div className="flex flex-col gap-4 h-full min-h-0 flex-1 pb-12">

      <div className="flex items-center justify-between shrink-0 gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-black text-foreground tracking-tight">Caderno de Erros</h1>
          <RevisaoMiniStats
            totalPendentes={stats.totalPendentes}
            totalMaterias={stats.totalMaterias}
            totalAssuntos={stats.totalAssuntos}
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-350 text-xs font-black">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{totalErros === 1 ? '1 erro pendente' : `${totalErros} erros pendentes`}</span>
        </div>
      </div>

      <RevisaoFilterBar
        busca={busca}
        onBuscaChange={setBusca}
      />

      <RevisaoMateriaTable
        erros={erros}
        busca={busca}
        initialCounts={initialCounts}
        onNavigateAssunto={(materia, assunto) => setSearchParams({ materia, assunto })}
      />

    </div>
  )
}
