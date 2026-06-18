import { useState, useEffect, useCallback } from 'react'
import {
  Target,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Circle,
  CheckCircle2,
  Play,
  XCircle,
  Clock,
  BookOpen,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Lightbulb,
  FileText,
} from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useMetasConcurso } from '../hooks/useMetasConcurso'
import { fetchTarefaById } from '../services/supabase.service'
import type { MetaConcurso, TarefaMeta } from '../types/database'

const STATUS_CONFIG: Record<TarefaMeta['status'], { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  pendente: { icon: Circle, label: 'Pendente', color: 'text-muted-foreground' },
  iniciada: { icon: Play, label: 'Iniciada', color: 'text-blue-500' },
  concluída: { icon: CheckCircle2, label: 'Concluída', color: 'text-green-500' },
  ignorada: { icon: XCircle, label: 'Ignorada', color: 'text-red-400' },
}

const FORMATO_CORES: Record<string, string> = {
  'Exercícios': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Teórico e Exercícios': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'Revisão': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Simulados': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Teórico': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

function formatarData(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function calcularProgresso(tarefas: TarefaMeta[]): { concluidas: number; total: number; pct: number } {
  const total = tarefas.length
  const concluidas = tarefas.filter(t => t.status === 'concluída').length
  return { total, concluidas, pct: total > 0 ? Math.round((concluidas / total) * 100) : 0 }
}

export function MetasConcurso() {
  const {
    metas, loading, error,
    criarMeta, excluirMeta,
    carregarTarefas, adicionarTarefas,
    atualizarTarefa, mudarStatusTarefa, excluirTarefa,
  } = useMetasConcurso()

  const [metaExpandida, setMetaExpandida] = useState<number | null>(null)
  const [tarefasMap, setTarefasMap] = useState<Record<number, TarefaMeta[]>>({})
  const [loadingTarefas, setLoadingTarefas] = useState<Record<number, boolean>>({})

  // Modal criar meta
  const [showCriarMeta, setShowCriarMeta] = useState(false)
  const [novaMetaTitulo, setNovaMetaTitulo] = useState('')
  const [novaMetaSemana, setNovaMetaSemana] = useState(metas.length + 1)
  const [novaMetaDataInicio, setNovaMetaDataInicio] = useState('')
  const [novaMetaDataFim, setNovaMetaDataFim] = useState('')

  // Modal adicionar tarefas
  const [showAddTarefas, setShowAddTarefas] = useState(false)
  const [metaParaTarefas, setMetaParaTarefas] = useState<number | null>(null)
  const [novasTarefas, setNovasTarefas] = useState<Omit<TarefaMeta, 'id' | 'created_at'>[]>([])

  // Modal editar tarefa
  const [showEditarTarefa, setShowEditarTarefa] = useState(false)
  const [tarefaEditando, setTarefaEditando] = useState<TarefaMeta | null>(null)
  const [editFormData, setEditFormData] = useState({ status: '' as TarefaMeta['status'], desempenho: '' })

  // Modal ver tarefa
  const [tarefaVer, setTarefaVer] = useState<TarefaMeta | null>(null)

  const carregarTarefasDaMeta = useCallback(async (metaId: number) => {
    setLoadingTarefas(prev => ({ ...prev, [metaId]: true }))
    try {
      const data = await carregarTarefas(metaId)
      setTarefasMap(prev => ({ ...prev, [metaId]: data }))
    } finally {
      setLoadingTarefas(prev => ({ ...prev, [metaId]: false }))
    }
  }, [carregarTarefas])

  useEffect(() => {
    if (tarefaVer?.id) {
      fetchTarefaById(tarefaVer.id).then(fresh => {
        if (fresh) setTarefaVer(fresh)
      }).catch(() => {})
    }
  }, [tarefaVer?.id])

  useEffect(() => {
    if (metaExpandida !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      carregarTarefasDaMeta(metaExpandida)
    }
  }, [metaExpandida, carregarTarefasDaMeta])

  async function handleCriarMeta() {
    if (!novaMetaTitulo.trim()) return
    const meta = await criarMeta(
      novaMetaTitulo.trim(),
      novaMetaSemana,
      novaMetaDataInicio || null,
      novaMetaDataFim || null
    )
    setShowCriarMeta(false)
    setNovaMetaTitulo('')
    setNovaMetaSemana(metas.length + 1)
    setNovaMetaDataInicio('')
    setNovaMetaDataFim('')
    setMetaExpandida(meta.id!)
  }

  function handleAddTarefasAbrir(metaId: number) {
    setMetaParaTarefas(metaId)
    setNovasTarefas([{
      meta_id: metaId,
      ordem: 1,
      disciplina: '',
      formato: 'Exercícios',
      descricao: '',
      tempo_estimado: null,
      status: 'pendente',
      desempenho: null,
      avaliacao: null,
      relevancia: null,
      material_indicado: null,
      link_tec: null,
      assunto: null,
      conteudo: null,
      conteudo_dicas: null,
    }])
    setShowAddTarefas(true)
  }

  function handleAddLinhaTarefa() {
    if (metaParaTarefas === null) return
    setNovasTarefas(prev => [
      ...prev,
      {
        meta_id: metaParaTarefas,
        ordem: prev.length + 1,
        disciplina: '',
        formato: 'Exercícios',
        descricao: '',
        tempo_estimado: null,
        status: 'pendente',
        desempenho: null,
        avaliacao: null,
        relevancia: null,
        material_indicado: null,
        link_tec: null,
        assunto: null,
        conteudo: null,
        conteudo_dicas: null,
      },
    ])
  }

  function handleUpdateNovaTarefa(idx: number, field: string, value: string | null) {
    setNovasTarefas(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  async function handleSalvarTarefas() {
    if (metaParaTarefas === null) return
    const validas = novasTarefas.filter(t => t.disciplina.trim() && t.descricao.trim())
    if (validas.length === 0) return
    const inseridas = await adicionarTarefas(metaParaTarefas, validas)
    const existentes = tarefasMap[metaParaTarefas] || []
    setTarefasMap(prev => ({ ...prev, [metaParaTarefas]: [...existentes, ...inseridas] }))
    setShowAddTarefas(false)
    setNovasTarefas([])
  }

  function handleEditarTarefa(tarefa: TarefaMeta) {
    setTarefaEditando(tarefa)
    setEditFormData({ status: tarefa.status, desempenho: tarefa.desempenho?.toString() || '' })
    setShowEditarTarefa(true)
  }

  async function handleSalvarEdicaoTarefa() {
    if (!tarefaEditando) return
    const payload: Partial<TarefaMeta> = { status: editFormData.status as TarefaMeta['status'] }
    if (editFormData.desempenho) {
      payload.desempenho = Math.min(100, Math.max(0, Number(editFormData.desempenho)))
    }
    await atualizarTarefa(tarefaEditando.id!, payload)
    const metaId = tarefaEditando.meta_id
    if (tarefasMap[metaId]) {
      setTarefasMap(prev => ({
        ...prev,
        [metaId]: prev[metaId].map(t => t.id === tarefaEditando.id ? { ...t, ...payload } : t),
      }))
    }
    setShowEditarTarefa(false)
    setTarefaEditando(null)
  }

  async function handleExcluirTarefa(tarefaId: number, metaId: number) {
    await excluirTarefa(tarefaId)
    setTarefasMap(prev => ({
      ...prev,
      [metaId]: (prev[metaId] || []).filter(t => t.id !== tarefaId),
    }))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground">Metas de Estudo</h1>
            <p className="text-xs text-muted-foreground font-medium">LS Concurso — Histórico completo de metas</p>
          </div>
        </div>
        <button
          onClick={() => setShowCriarMeta(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nova Meta
        </button>
      </div>

      {metas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8 rounded-2xl border border-dashed border-border bg-muted/30">
          <Target className="w-16 h-16 text-muted-foreground/40" />
          <h2 className="text-base font-bold text-foreground">Nenhuma meta registrada</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Crie sua primeira meta para começar a registrar seu plano de estudos semanal.
          </p>
          <button
            onClick={() => setShowCriarMeta(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Criar Primeira Meta
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {metas.map(meta => (
            <MetaCard
              key={meta.id}
              meta={meta}
              expandida={metaExpandida === meta.id}
              tarefas={tarefasMap[meta.id!] || []}
              loadingTarefas={loadingTarefas[meta.id!] || false}
              onToggle={() => setMetaExpandida(prev => prev === meta.id ? null : meta.id!)}
              onExcluir={() => excluirMeta(meta.id!)}
              onAddTarefas={() => handleAddTarefasAbrir(meta.id!)}
              onEditarTarefa={handleEditarTarefa}
              onMudarStatus={async (id, status) => {
                await mudarStatusTarefa(id, status)
                setTarefasMap(prev => ({
                  ...prev,
                  [meta.id!]: (prev[meta.id!] || []).map(t => t.id === id ? { ...t, status } : t),
                }))
              }}
              onExcluirTarefa={(id) => handleExcluirTarefa(id, meta.id!)}
              onVerTarefa={(t) => setTarefaVer(t)}
            />
          ))}
        </div>
      )}

      {/* Modal Criar Meta */}
      <Modal
        isOpen={showCriarMeta}
        onClose={() => setShowCriarMeta(false)}
        title="Nova Meta Semanal"
        subtitle="Registre uma nova semana de estudos do LS Concurso"
        icon={<Target className="w-5 h-5" />}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Título da Meta</label>
            <input
              type="text"
              value={novaMetaTitulo}
              onChange={e => setNovaMetaTitulo(e.target.value)}
              placeholder="Ex: Planejamento Pré-Edital Regular - Semana 1"
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Nº da Semana</label>
              <input
                type="number"
                value={novaMetaSemana}
                onChange={e => setNovaMetaSemana(Number(e.target.value))}
                min={1}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Data Início</label>
              <input
                type="date"
                value={novaMetaDataInicio}
                onChange={e => setNovaMetaDataInicio(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Data Fim</label>
              <input
                type="date"
                value={novaMetaDataFim}
                onChange={e => setNovaMetaDataFim(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </div>
          <button
            onClick={handleCriarMeta}
            disabled={!novaMetaTitulo.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
          >
            Criar Meta
          </button>
        </div>
      </Modal>

      {/* Modal Adicionar Tarefas */}
      <Modal
        isOpen={showAddTarefas}
        onClose={() => setShowAddTarefas(false)}
        title="Adicionar Tarefas"
        subtitle="Adicione as tarefas da semana"
        icon={<BookOpen className="w-5 h-5" />}
        size="xl"
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2">
            <div className="col-span-2">Disciplina</div>
            <div className="col-span-2">Formato</div>
            <div className="col-span-5">Descrição</div>
            <div className="col-span-2">Tempo</div>
            <div className="col-span-1" />
          </div>
          {novasTarefas.map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <input
                type="text"
                value={t.disciplina}
                onChange={e => handleUpdateNovaTarefa(i, 'disciplina', e.target.value)}
                placeholder="Direito Admin."
                className="col-span-2 px-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-violet-500/50"
              />
              <select
                value={t.formato}
                onChange={e => handleUpdateNovaTarefa(i, 'formato', e.target.value)}
                className="col-span-2 px-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground outline-none focus:border-violet-500/50"
              >
                <option value="Exercícios">Exercícios</option>
                <option value="Teórico e Exercícios">Teórico + Exerc.</option>
                <option value="Teórico">Teórico</option>
                <option value="Revisão">Revisão</option>
                <option value="Simulados">Simulados</option>
              </select>
              <input
                type="text"
                value={t.descricao}
                onChange={e => handleUpdateNovaTarefa(i, 'descricao', e.target.value)}
                placeholder="Poderes e Deveres..."
                className="col-span-5 px-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-violet-500/50"
              />
              <input
                type="text"
                value={t.tempo_estimado || ''}
                onChange={e => handleUpdateNovaTarefa(i, 'tempo_estimado', e.target.value || null)}
                placeholder="00:00"
                className="col-span-2 px-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-violet-500/50"
              />
              {i > 0 && (
                <button
                  onClick={() => setNovasTarefas(prev => prev.filter((_, j) => j !== i))}
                  className="col-span-1 p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={handleAddLinhaTarefa}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:border-violet-500/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar linha
          </button>
          <button
            onClick={handleSalvarTarefas}
            disabled={!novasTarefas.some(t => t.disciplina.trim() && t.descricao.trim())}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed mt-2 transition-all"
          >
            Salvar {novasTarefas.filter(t => t.disciplina.trim() && t.descricao.trim()).length} tarefa(s)
          </button>
        </div>
      </Modal>

      {/* Modal Editar Tarefa */}
      <Modal
        isOpen={showEditarTarefa}
        onClose={() => setShowEditarTarefa(false)}
        title="Editar Tarefa"
        subtitle={tarefaEditando?.descricao || ''}
        icon={<BookOpen className="w-5 h-5" />}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(STATUS_CONFIG) as [TarefaMeta['status'], (typeof STATUS_CONFIG)[TarefaMeta['status']]][]).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button
                    key={key}
                    onClick={() => setEditFormData(prev => ({ ...prev, status: key }))}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      editFormData.status === key
                        ? 'border-violet-500/50 bg-violet-500/10 text-foreground'
                        : 'border-border bg-muted text-muted-foreground hover:border-violet-500/30'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Desempenho (%)</label>
            <input
              type="number"
              value={editFormData.desempenho}
              onChange={e => setEditFormData(prev => ({ ...prev, desempenho: e.target.value }))}
              min={0}
              max={100}
              placeholder="0-100"
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
          </div>
          <button
            onClick={handleSalvarEdicaoTarefa}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold shadow-lg cursor-pointer transition-all"
          >
            Salvar
          </button>
        </div>
      </Modal>

      {/* Modal Ver Tarefa */}
      <Modal
        isOpen={tarefaVer !== null}
        onClose={() => setTarefaVer(null)}
        title={tarefaVer?.disciplina || ''}
        subtitle={tarefaVer?.descricao || ''}
        icon={<BookOpen className="w-5 h-5" />}
        size="full"
        headerAction={tarefaVer?.id ? (
          <a
            href={`/app/metas/tarefa/${tarefaVer.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 text-[11px] font-bold transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Página inteira
          </a>
        ) : undefined}
      >
        {tarefaVer && (
          <div className="flex flex-col gap-4">
            {/* Grid de informações básicas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Disciplina</div>
                <div className="text-base font-semibold text-foreground">{tarefaVer.disciplina}</div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Formato</div>
                <div className="text-base font-semibold text-foreground">{tarefaVer.formato}</div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tempo</div>
                <div className="text-base font-semibold text-foreground">{tarefaVer.tempo_estimado || '—'}</div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Desempenho</div>
                <div className={`text-base font-bold ${tarefaVer.desempenho !== null ? (tarefaVer.desempenho >= 70 ? 'text-green-400' : tarefaVer.desempenho >= 40 ? 'text-amber-400' : 'text-red-400') : ''}`}>
                  {tarefaVer.desempenho !== null ? `${tarefaVer.desempenho}%` : '—'}
                </div>
              </div>
              {tarefaVer.avaliacao && (
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Avaliação</div>
                  <div className="text-base font-semibold text-foreground">{tarefaVer.avaliacao}</div>
                </div>
              )}
              {tarefaVer.relevancia && (
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Relevância</div>
                  <div className="text-base font-semibold text-foreground">{tarefaVer.relevancia}</div>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Descrição</div>
              <div className="text-base text-foreground">{tarefaVer.descricao}</div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 p-4 rounded-xl bg-muted/50">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status:</div>
              {(() => {
                const cfg = STATUS_CONFIG[tarefaVer.status]
                const Icon = cfg.icon
                return <span className={`flex items-center gap-1 text-base font-bold ${cfg.color}`}><Icon className="w-4 h-4" />{cfg.label}</span>
              })()}
            </div>

            {/* Campos extras do modal LS */}
            {tarefaVer.assunto && (
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Assunto
                </div>
                <div className="text-base text-foreground">{tarefaVer.assunto}</div>
              </div>
            )}

            {tarefaVer.material_indicado && (
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Material Indicado
                </div>
                <div className="text-base text-foreground">{tarefaVer.material_indicado}</div>
              </div>
            )}

            {tarefaVer.conteudo && (
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Conteúdo da Tarefa
                </div>
                <div
                  className="text-base text-foreground prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: tarefaVer.conteudo }}
                />
              </div>
            )}

            {tarefaVer.conteudo_dicas && (
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Dicas e Bizus
                </div>
                <div
                  className="text-base text-foreground prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: tarefaVer.conteudo_dicas }}
                />
              </div>
            )}

            {tarefaVer.link_tec && (
              <a
                href={tarefaVer.link_tec}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-400 hover:bg-blue-500/10 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm font-bold">Abrir no TEC Concursos</span>
              </a>
            )}

          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── Sub-componente: Card de Meta ───────────────────────────

function MetaCard({
  meta, expandida, tarefas, loadingTarefas,
  onToggle, onExcluir, onAddTarefas,
  onEditarTarefa, onMudarStatus, onExcluirTarefa, onVerTarefa,
}: {
  meta: MetaConcurso
  expandida: boolean
  tarefas: TarefaMeta[]
  loadingTarefas: boolean
  onToggle: () => void
  onExcluir: () => void
  onAddTarefas: () => void
  onEditarTarefa: (t: TarefaMeta) => void
  onMudarStatus: (id: number, status: TarefaMeta['status']) => Promise<void>
  onExcluirTarefa: (id: number) => void
  onVerTarefa: (t: TarefaMeta) => void
}) {
  const { concluidas, total, pct } = calcularProgresso(tarefas)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden transition-all">
      {/* Header clicável */}
      <div className="flex w-full">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between p-4 hover:bg-muted/30 transition-all cursor-pointer text-left min-w-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">{meta.titulo}</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                {meta.total_tarefas} tarefa(s) &middot; {formatarData(meta.data_inicio)} – {formatarData(meta.data_fim)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {tarefas.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <span className={`text-xs font-bold ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  {pct}%
                </span>
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-violet-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
            {expandida ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        <button
          onClick={e => { e.stopPropagation(); onExcluir() }}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer shrink-0 mr-2"
          title="Excluir meta"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Conteúdo expandido */}
      {expandida && (
        <div className="border-t border-border">
          {loadingTarefas ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : tarefas.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhuma tarefa adicionada</p>
              <button
                onClick={onAddTarefas}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 text-violet-400 text-xs font-bold hover:bg-violet-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Tarefas
              </button>
            </div>
          ) : (
            <div className="p-4">
              {/* Barra de progresso */}
              {total > 0 && (
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Progresso</span>
                      <span className="text-[10px] font-bold text-foreground">{concluidas}/{total} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-violet-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={onAddTarefas}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 text-[10px] font-bold hover:bg-violet-500/20 transition-all shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
              )}

              {/* Tabela de tarefas */}
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-2">Disciplina</div>
                  <div className="col-span-1">Formato</div>
                  <div className="col-span-3">Descrição</div>
                  <div className="col-span-1 text-center">Tempo</div>
                  <div className="col-span-1 text-center">Desempenho</div>
                  <div className="col-span-1 text-center">Relevância</div>
                  <div className="col-span-1 text-center">Status</div>
                  <div className="col-span-1 text-center" />
                </div>
                {tarefas.map(t => (
                  <TarefaRow
                    key={t.id}
                    tarefa={t}
                    onEditar={() => onEditarTarefa(t)}
                    onMudarStatus={(s) => onMudarStatus(t.id!, s)}
                    onExcluir={() => onExcluirTarefa(t.id!)}
                    onVer={() => onVerTarefa(t)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente: Linha de Tarefa ────────────────────────

function TarefaRow({
  tarefa, onEditar, onMudarStatus, onExcluir, onVer,
}: {
  tarefa: TarefaMeta
  onEditar: () => void
  onMudarStatus: (status: TarefaMeta['status']) => Promise<void>
  onExcluir: () => void
  onVer: () => void
}) {
  const cfg = STATUS_CONFIG[tarefa.status]
  const StatusIcon = cfg.icon
  const formatoCor = FORMATO_CORES[tarefa.formato] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'

  const proximoStatus: Record<string, TarefaMeta['status']> = {
    pendente: 'iniciada',
    iniciada: 'concluída',
    concluída: 'pendente',
    ignorada: 'pendente',
  }

  return (
    <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-all group">
      <div className="col-span-1 text-[10px] font-bold text-muted-foreground">{tarefa.ordem}</div>
      <div className="col-span-2 text-xs font-semibold text-foreground truncate">{tarefa.disciplina}</div>
      <div className="col-span-1">
        <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] font-bold ${formatoCor}`}>
          {tarefa.formato === 'Teórico e Exercícios' ? 'Teórico + Exerc.' : tarefa.formato}
        </span>
      </div>
      <div className="col-span-3 text-xs text-muted-foreground truncate">{tarefa.descricao}</div>
      <div className="col-span-1 text-center">
        {tarefa.tempo_estimado ? (
          <span className="text-[10px] font-bold text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            {tarefa.tempo_estimado}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
      </div>
      <div className="col-span-1 text-center">
        {tarefa.desempenho !== null ? (
          <span className={`text-[10px] font-bold ${tarefa.desempenho >= 70 ? 'text-green-400' : tarefa.desempenho >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
            {tarefa.desempenho}%
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
      </div>
      <div className="col-span-1 text-center">
        {tarefa.relevancia && tarefa.relevancia !== '-' ? (
          <span className="text-[10px] font-bold text-muted-foreground">{tarefa.relevancia}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40">—</span>
        )}
      </div>
      <div className="col-span-1 flex justify-center">
        <button
          onClick={() => onMudarStatus(proximoStatus[tarefa.status])}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${cfg.color} hover:bg-muted`}
          title={`Mudar para ${STATUS_CONFIG[proximoStatus[tarefa.status]].label}`}
        >
          <StatusIcon className="w-3 h-3" />
          <span className="hidden sm:inline">{cfg.label}</span>
        </button>
      </div>
      <div className="col-span-1 flex items-center justify-end gap-1">
        <button
          onClick={onVer}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-blue-500/10 hover:text-blue-400 transition-all cursor-pointer"
          title="Ver detalhes"
        >
          <BookOpen className="w-3 h-3" />
        </button>
        <button
          onClick={onEditar}
          className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-violet-500/10 hover:text-violet-400 transition-all cursor-pointer"
          title="Editar"
        >
          <TrendingUp className="w-3 h-3" />
        </button>
        <button
          onClick={onExcluir}
          className="p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
          title="Excluir"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
