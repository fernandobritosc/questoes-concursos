import { useState, useEffect, useMemo } from 'react'
import { BarChart3, Clock, TrendingUp, BookOpen, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { fetchTarefasComMetas } from '../services/supabase.service'
import type { TarefaMeta } from '../types/database'

type TarefaComMeta = TarefaMeta & { meta_titulo: string; meta_semana: number; meta_data_inicio: string | null; meta_data_fim: string | null }

function formatarData(d: string | null): string {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function somarHoras(tarefas: TarefaMeta[]): number {
  return tarefas.reduce((acc, t) => {
    if (!t.tempo_estimado) return acc
    const [h, m] = t.tempo_estimado.split(':').map(Number)
    return acc + (h || 0) + (m || 0) / 60
  }, 0)
}

function formatarHoras(totalHoras: number): string {
  const h = Math.floor(totalHoras)
  const m = Math.round((totalHoras - h) * 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

function calcularMedia(tarefas: TarefaMeta[]): number | null {
  const comNota = tarefas.filter(t => t.desempenho !== null && t.desempenho > 0)
  if (comNota.length === 0) return null
  return Math.round(comNota.reduce((acc, t) => acc + t.desempenho!, 0) / comNota.length)
}

interface AssuntoAgrupado {
  assunto: string
  disciplina: string
  tarefas: TarefaComMeta[]
  totalHoras: number
  mediaDesempenho: number | null
  metas: { id: number; titulo: string; semana: number; dataInicio: string | null; dataFim: string | null; horas: number; desempenho: number | null }[]
}

export function Apuracao() {
  const [tarefas, setTarefas] = useState<TarefaComMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroDisciplina, setFiltroDisciplina] = useState('')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTarefasComMetas()
      .then(data => { setTarefas(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const disciplinas = useMemo(() => {
    const set = new Set(tarefas.map(t => t.disciplina).filter(Boolean))
    return Array.from(set).sort()
  }, [tarefas])

  const assuntos = useMemo(() => {
    const map = new Map<string, TarefaComMeta[]>()
    for (const t of tarefas) {
      if (!t.assunto) continue
      if (filtroDisciplina && t.disciplina !== filtroDisciplina) continue
      const existing = map.get(t.assunto) || []
      existing.push(t)
      map.set(t.assunto, existing)
    }
    const result: AssuntoAgrupado[] = []
    for (const [assunto, ts] of map) {
      const metasMap = new Map<number, TarefaComMeta[]>()
      for (const t of ts) {
        const arr = metasMap.get(t.meta_id) || []
        arr.push(t)
        metasMap.set(t.meta_id, arr)
      }
      const metas = Array.from(metasMap.entries()).map(([metaId, tArr]) => ({
        id: metaId,
        titulo: tArr[0].meta_titulo,
        semana: tArr[0].meta_semana,
        dataInicio: tArr[0].meta_data_inicio,
        dataFim: tArr[0].meta_data_fim,
        horas: somarHoras(tArr),
        desempenho: calcularMedia(tArr),
      }))
      metas.sort((a, b) => b.semana - a.semana)
      result.push({
        assunto,
        disciplina: ts[0].disciplina,
        tarefas: ts,
        totalHoras: somarHoras(ts),
        mediaDesempenho: calcularMedia(ts),
        metas,
      })
    }
    result.sort((a, b) => (b.mediaDesempenho || 0) - (a.mediaDesempenho || 0))
    return result
  }, [tarefas, filtroDisciplina])

  function toggleExpandido(assunto: string) {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(assunto)) next.delete(assunto)
      else next.add(assunto)
      return next
    })
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center text-red-400 text-sm font-bold">{error}</div>
  )

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground">Apuração por Assunto</h1>
            <p className="text-[11px] text-muted-foreground font-medium">{assuntos.length} assunto(s) · {tarefas.length} tarefa(s)</p>
          </div>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filtroDisciplina}
            onChange={e => setFiltroDisciplina(e.target.value)}
            className="pl-8 pr-4 py-2 rounded-xl bg-muted border border-border text-xs text-foreground outline-none focus:border-violet-500/50 appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="">Todas as disciplinas</option>
            {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {assuntos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum assunto encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {assuntos.map(a => {
            const expandido = expandidos.has(a.assunto)
            return (
              <div key={a.assunto} className="rounded-2xl border border-border bg-card overflow-hidden transition-all">
                <button
                  onClick={() => toggleExpandido(a.assunto)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${a.mediaDesempenho !== null && a.mediaDesempenho >= 70 ? 'bg-green-500/10 text-green-400' : a.mediaDesempenho !== null && a.mediaDesempenho >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{a.assunto}</h3>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        {a.disciplina} · {a.metas.length} meta(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-foreground">{formatarHoras(a.totalHoras)}</p>
                      <p className="text-[9px] text-muted-foreground">horas</p>
                    </div>
                    {a.mediaDesempenho !== null && (
                      <div className="text-right">
                        <p className={`text-xs font-bold ${a.mediaDesempenho >= 70 ? 'text-green-400' : a.mediaDesempenho >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                          {a.mediaDesempenho}%
                        </p>
                        <p className="text-[9px] text-muted-foreground">média</p>
                      </div>
                    )}
                    {expandido ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
                {expandido && (
                  <div className="border-t border-border p-4">
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider rounded-lg bg-muted/50">
                        <div className="col-span-4">Meta</div>
                        <div className="col-span-2 text-center">Período</div>
                        <div className="col-span-2 text-center">Horas</div>
                        <div className="col-span-2 text-center">Desempenho</div>
                        <div className="col-span-2 text-center">Tarefas</div>
                      </div>
                      {a.metas.map(m => (
                        <div key={m.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-all">
                          <div className="col-span-4 text-xs font-semibold text-foreground truncate flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                            {m.titulo}
                          </div>
                          <div className="col-span-2 text-center text-[10px] text-muted-foreground">
                            {formatarData(m.dataInicio)} – {formatarData(m.dataFim)}
                          </div>
                          <div className="col-span-2 text-center text-xs font-bold text-foreground">
                            {formatarHoras(m.horas)}
                          </div>
                          <div className="col-span-2 text-center">
                            {m.desempenho !== null ? (
                              <span className={`text-xs font-bold ${m.desempenho >= 70 ? 'text-green-400' : m.desempenho >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                {m.desempenho}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            )}
                          </div>
                          <div className="col-span-2 text-center text-xs font-bold text-muted-foreground">
                            {m.horas > 0 ? Math.round(m.horas / 0.5) : '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}