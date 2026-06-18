import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Lightbulb,
  ExternalLink,
  Target,
  Circle,
  CheckCircle2,
  Play,
  XCircle,
} from 'lucide-react'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { fetchTarefaById } from '../services/supabase.service'
import type { TarefaMeta } from '../types/database'

const STATUS_CONFIG: Record<TarefaMeta['status'], { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  pendente: { icon: Circle, label: 'Pendente', color: 'text-muted-foreground' },
  iniciada: { icon: Play, label: 'Iniciada', color: 'text-blue-500' },
  concluída: { icon: CheckCircle2, label: 'Concluída', color: 'text-green-500' },
  ignorada: { icon: XCircle, label: 'Ignorada', color: 'text-red-400' },
}

export function TarefaDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tarefa, setTarefa] = useState<TarefaMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    fetchTarefaById(Number(id))
      .then(setTarefa)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />
  if (error) return (
    <div className="p-8 text-center">
      <p className="text-red-400 text-lg">{error}</p>
      <button onClick={() => navigate('/app/metas')} className="mt-4 text-sm text-violet-400 hover:underline cursor-pointer">Voltar</button>
    </div>
  )
  if (!tarefa) return (
    <div className="p-8 text-center">
      <p className="text-muted-foreground text-lg">Tarefa não encontrada</p>
      <button onClick={() => navigate('/app/metas')} className="mt-4 text-sm text-violet-400 hover:underline cursor-pointer">Voltar</button>
    </div>
  )

  const statusCfg = STATUS_CONFIG[tarefa.status]
  const StatusIcon = statusCfg.icon

  return (
    <div className="max-w-full mx-auto px-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/app/metas')}
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-bold text-foreground">{tarefa.disciplina}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{tarefa.descricao}</p>
        </div>
      </div>

      {/* Grid Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Formato</div>
          <div className="text-base font-semibold text-foreground">{tarefa.formato}</div>
        </div>
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Tempo</div>
          <div className="text-base font-semibold text-foreground">{tarefa.tempo_estimado || '—'}</div>
        </div>
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Desempenho</div>
          <div className={`text-base font-bold ${tarefa.desempenho !== null ? (tarefa.desempenho >= 70 ? 'text-green-400' : tarefa.desempenho >= 40 ? 'text-amber-400' : 'text-red-400') : ''}`}>
            {tarefa.desempenho !== null ? `${tarefa.desempenho}%` : '—'}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-muted/50">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</div>
          <span className={`flex items-center gap-1 text-base font-bold ${statusCfg.color}`}>
            <StatusIcon className="w-4 h-4" />{statusCfg.label}
          </span>
        </div>
        {tarefa.avaliacao && (
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Avaliação</div>
            <div className="text-base font-semibold text-foreground">{tarefa.avaliacao}</div>
          </div>
        )}
        {tarefa.relevancia && (
          <div className="p-4 rounded-xl bg-muted/50">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Relevância</div>
            <div className="text-base font-semibold text-foreground">{tarefa.relevancia}</div>
          </div>
        )}
      </div>

      {/* Assunto */}
      {tarefa.assunto && (
        <div className="p-5 rounded-xl bg-muted/50 mb-4">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Assunto
          </div>
          <div className="text-base text-foreground">{tarefa.assunto}</div>
        </div>
      )}

      {/* Material Indicado */}
      {tarefa.material_indicado && (
        <div className="p-5 rounded-xl bg-muted/50 mb-4">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Material Indicado
          </div>
          <div className="text-base text-foreground">{tarefa.material_indicado}</div>
        </div>
      )}

      {/* Conteúdo */}
      {tarefa.conteudo && (
        <div className="p-5 rounded-xl bg-muted/50 mb-4">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Conteúdo da Tarefa
          </div>
          <div
            className="text-base text-foreground prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: tarefa.conteudo }}
          />
        </div>
      )}

      {/* Dicas */}
      {tarefa.conteudo_dicas && (
        <div className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-4">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> Dicas e Bizus
          </div>
          <div
            className="text-base text-foreground prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: tarefa.conteudo_dicas }}
          />
        </div>
      )}

      {/* Link TEC */}
      {tarefa.link_tec && (
        <a
          href={tarefa.link_tec}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-400 hover:bg-blue-500/10 transition-all mb-4"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="text-sm font-bold">Abrir no TEC Concursos</span>
        </a>
      )}
    </div>
  )
}
