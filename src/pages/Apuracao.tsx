import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Clock, TrendingUp, BookOpen, ChevronDown, ChevronRight, Target } from 'lucide-react'
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

interface MetaInfo {
  id: number
  titulo: string
  semana: number
  dataInicio: string | null
  dataFim: string | null
  horas: number
  desempenho: number | null
}

interface AssuntoInfo {
  assunto: string
  tarefas: TarefaComMeta[]
  totalHoras: number
  mediaDesempenho: number | null
  metas: MetaInfo[]
}

interface DisciplinaInfo {
  disciplina: string
  assuntos: AssuntoInfo[]
  totalHoras: number
  mediaDesempenho: number | null
}

export function Apuracao() {
  const [tarefas, setTarefas] = useState<TarefaComMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [discExpandidas, setDiscExpandidas] = useState<Set<string>>(new Set())
  const [assuntoExpandidos, setAssuntoExpandidos] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTarefasComMetas()
      .then(data => { setTarefas(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  const disciplinas = useMemo(() => {
    const map = new Map<string, TarefaComMeta[]>()
    for (const t of tarefas) {
      if (!t.disciplina) continue
      const arr = map.get(t.disciplina) || []
      arr.push(t)
      map.set(t.disciplina, arr)
    }

    const result: DisciplinaInfo[] = []
    for (const [disciplina, ts] of map) {
      const assuntoMap = new Map<string, TarefaComMeta[]>()
      for (const t of ts) {
        if (!t.assunto) continue
        const arr = assuntoMap.get(t.assunto) || []
        arr.push(t)
        assuntoMap.set(t.assunto, arr)
      }

      const assuntos: AssuntoInfo[] = []
      for (const [assunto, ats] of assuntoMap) {
        const metasMap = new Map<number, TarefaComMeta[]>()
        for (const t of ats) {
          const arr = metasMap.get(t.meta_id) || []
          arr.push(t)
          metasMap.set(t.meta_id, arr)
        }
        const metas: MetaInfo[] = Array.from(metasMap.entries()).map(([metaId, tArr]) => ({
          id: metaId,
          titulo: tArr[0].meta_titulo,
          semana: tArr[0].meta_semana,
          dataInicio: tArr[0].meta_data_inicio,
          dataFim: tArr[0].meta_data_fim,
          horas: somarHoras(tArr),
          desempenho: calcularMedia(tArr),
        }))
        metas.sort((a, b) => b.semana - a.semana)
        assuntos.push({
          assunto,
          tarefas: ats,
          totalHoras: somarHoras(ats),
          mediaDesempenho: calcularMedia(ats),
          metas,
        })
      }
      assuntos.sort((a, b) => (b.mediaDesempenho || 0) - (a.mediaDesempenho || 0))

      result.push({
        disciplina,
        assuntos,
        totalHoras: somarHoras(ts),
        mediaDesempenho: calcularMedia(ts),
      })
    }
    result.sort((a, b) => (a.mediaDesempenho || 0) - (b.mediaDesempenho || 0))
    return result
  }, [tarefas])

  function toggleDisc(d: string) {
    setDiscExpandidas(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  function toggleAssunto(a: string) {
    setAssuntoExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(a)) next.delete(a)
      else next.add(a)
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

  const totalAssuntos = disciplinas.reduce((acc, d) => acc + d.assuntos.length, 0)

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-black text-foreground">Apuração por Matéria</h1>
          <p className="text-[11px] text-muted-foreground font-medium">{disciplinas.length} matéria(s) · {totalAssuntos} assunto(s) · {tarefas.length} tarefa(s)</p>
        </div>
      </div>

      {disciplinas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum dado encontrado</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {disciplinas.map(d => {
            const discExp = discExpandidas.has(d.disciplina)
            return (
              <div key={d.disciplina} className="rounded-2xl border border-border bg-card overflow-hidden transition-all">
                {/* Cabeçalho da Matéria */}
                <button
                  onClick={() => toggleDisc(d.disciplina)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${d.mediaDesempenho !== null && d.mediaDesempenho >= 70 ? 'bg-green-500/10 text-green-400' : d.mediaDesempenho !== null && d.mediaDesempenho >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-foreground truncate">{d.disciplina}</h2>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{d.assuntos.length} assunto(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-foreground">{formatarHoras(d.totalHoras)}</p>
                      <p className="text-[9px] text-muted-foreground">horas</p>
                    </div>
                    {d.mediaDesempenho !== null && (
                      <div className="text-right">
                        <p className={`text-xs font-bold ${d.mediaDesempenho >= 70 ? 'text-green-400' : d.mediaDesempenho >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                          {d.mediaDesempenho}%
                        </p>
                        <p className="text-[9px] text-muted-foreground">média</p>
                      </div>
                    )}
                    {discExp ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Lista de Assuntos */}
                {discExp && (
                  <div className="border-t border-border">
                    {d.assuntos.map(a => {
                      const assExp = assuntoExpandidos.has(a.assunto)
                      return (
                        <div key={a.assunto} className="border-b border-border last:border-b-0">
                          <button
                            onClick={() => toggleAssunto(a.assunto)}
                            className="w-full flex items-center justify-between px-4 py-3 pl-8 hover:bg-muted/30 transition-all cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-1.5 rounded-lg shrink-0 ${a.mediaDesempenho !== null && a.mediaDesempenho >= 70 ? 'bg-green-500/10 text-green-400' : a.mediaDesempenho !== null && a.mediaDesempenho >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                                <TrendingUp className="w-3 h-3" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{a.assunto}</p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">{a.metas.length} meta(s)</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] font-bold text-muted-foreground">{formatarHoras(a.totalHoras)}</span>
                              {a.mediaDesempenho !== null && (
                                <span className={`text-[10px] font-bold ${a.mediaDesempenho >= 70 ? 'text-green-400' : a.mediaDesempenho >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                  {a.mediaDesempenho}%
                                </span>
                              )}
                              {assExp ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                            </div>
                          </button>

                          {/* Detalhamento por Meta */}
                          {assExp && (
                            <div className="px-4 pb-3 pl-8">
                              <div className="flex flex-col gap-1.5">
                                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider rounded-lg bg-muted/50">
                                  <div className="col-span-3">Meta</div>
                                  <div className="col-span-2 text-center">Período</div>
                                  <div className="col-span-2 text-center">Horas</div>
                                  <div className="col-span-2 text-center">Desempenho</div>
                                  <div className="col-span-3 text-center">Tarefas</div>
                                </div>
                                {a.metas.map(m => (
                                  <div key={m.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-xl hover:bg-muted/30 transition-all">
                                    <div className="col-span-3 text-xs font-semibold text-foreground truncate flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                      <Link
                                        to={`/app/metas?expandir=${m.id}`}
                                        className="hover:text-violet-400 transition-colors truncate"
                                        title="Abrir meta"
                                      >
                                        {m.titulo}
                                      </Link>
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
                                    <div className="col-span-3 text-center text-xs font-bold text-muted-foreground">
                                      {a.tarefas.filter(t => t.meta_id === m.id).length} tarefa(s)
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
          })}
        </div>
      )}
    </div>
  )
}