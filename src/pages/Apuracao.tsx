import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Clock, TrendingUp, ChevronDown, ChevronRight, Target, CheckCircle2, AlertCircle } from 'lucide-react'
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

function contarConcluidas(tarefas: TarefaMeta[]): number {
  return tarefas.filter(t => t.status === 'concluída').length
}

function corDesempenho(valor: number | null): string {
  if (valor === null) return 'text-muted-foreground'
  if (valor >= 70) return 'text-green-400'
  if (valor >= 40) return 'text-amber-400'
  return 'text-red-400'
}

function bgDesempenho(valor: number | null): string {
  if (valor === null) return 'bg-muted'
  if (valor >= 70) return 'bg-green-500'
  if (valor >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

interface MetaInfo {
  id: number
  titulo: string
  semana: number
  dataInicio: string | null
  dataFim: string | null
  horas: number
  desempenho: number | null
  totalTarefas: number
  concluidas: number
}

interface AssuntoInfo {
  assunto: string
  tarefas: TarefaComMeta[]
  totalHoras: number
  maxHoras: number
  mediaDesempenho: number | null
  metas: MetaInfo[]
}

interface DisciplinaInfo {
  disciplina: string
  assuntos: AssuntoInfo[]
  totalHoras: number
  maxHoras: number
  mediaDesempenho: number | null
  totalTarefas: number
  concluidas: number
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
        const chave = t.assunto || 'Sem assunto'
        const arr = assuntoMap.get(chave) || []
        arr.push(t)
        assuntoMap.set(chave, arr)
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
          totalTarefas: tArr.length,
          concluidas: contarConcluidas(tArr),
        }))
        metas.sort((a, b) => b.semana - a.semana)
        assuntos.push({
          assunto,
          tarefas: ats,
          totalHoras: somarHoras(ats),
          maxHoras: 0,
          mediaDesempenho: calcularMedia(ats),
          metas,
        })
      }
      assuntos.sort((a, b) => (b.mediaDesempenho || 0) - (a.mediaDesempenho || 0))

      const maxH = Math.max(...assuntos.map(a => a.totalHoras), 1)
      for (const a of assuntos) a.maxHoras = maxH

      result.push({
        disciplina,
        assuntos,
        totalHoras: somarHoras(ts),
        maxHoras: 0,
        mediaDesempenho: calcularMedia(ts),
        totalTarefas: ts.length,
        concluidas: contarConcluidas(ts),
      })
    }
    for (const d of result) d.maxHoras = Math.max(...d.assuntos.map(a => a.totalHoras), 1)
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
  const totalConcluidas = disciplinas.reduce((acc, d) => acc + d.concluidas, 0)

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-black text-foreground">Apuração por Matéria</h1>
          <p className="text-[11px] text-muted-foreground font-medium">
            {disciplinas.length} matéria(s) · {totalAssuntos} assunto(s) · {tarefas.length} tarefa(s)
            {totalConcluidas > 0 && ` · ${totalConcluidas} concluída(s)`}
          </p>
        </div>
      </div>

      {disciplinas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto">
          <div className="p-4 rounded-2xl bg-muted/30">
            <BarChart3 className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Nenhum dado encontrado</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Use a extensão do LS Concurso para extrair suas metas semanais.
              Os dados aparecerão aqui automaticamente.
            </p>
          </div>
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
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all cursor-pointer text-left gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      d.mediaDesempenho !== null && d.mediaDesempenho >= 70 ? 'bg-green-500/10 text-green-400' :
                      d.mediaDesempenho !== null && d.mediaDesempenho >= 40 ? 'bg-amber-500/10 text-amber-400' :
                      d.mediaDesempenho !== null ? 'bg-red-500/10 text-red-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-foreground truncate">{d.disciplina}</h2>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{d.assuntos.length} assunto(s)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Tarefas concluídas */}
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3 h-3 text-green-400" />
                        <span>{d.concluidas}/{d.totalTarefas}</span>
                      </p>
                      <p className="text-[9px] text-muted-foreground">concluídas</p>
                    </div>

                    {/* Horas */}
                    <div className="text-right">
                      <p className="text-xs font-bold text-foreground">{formatarHoras(d.totalHoras)}</p>
                      <p className="text-[9px] text-muted-foreground">horas</p>
                    </div>

                    {/* Média */}
                    {d.mediaDesempenho !== null && (
                      <div className="text-right">
                        <p className={`text-xs font-bold ${corDesempenho(d.mediaDesempenho)}`}>
                          {d.mediaDesempenho}%
                        </p>
                        <p className="text-[9px] text-muted-foreground">média</p>
                      </div>
                    )}

                    {discExp ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Barra de progresso geral da matéria */}
                {discExp && (
                  <div className="px-4 pb-1">
                    <div className="flex gap-2 items-center">
                      {/* Barra de horas */}
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500/60 transition-all"
                          style={{ width: `${Math.min((d.totalHoras / 40) * 100, 100)}%` }}
                        />
                      </div>
                      {/* Barra de desempenho */}
                      {d.mediaDesempenho !== null && (
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${bgDesempenho(d.mediaDesempenho)}`}
                            style={{ width: `${d.mediaDesempenho}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                      <span>horas ({formatarHoras(d.totalHoras)} de 40h)</span>
                      {d.mediaDesempenho !== null && <span>desempenho ({d.mediaDesempenho}%)</span>}
                    </div>
                  </div>
                )}

                {/* Lista de Assuntos */}
                {discExp && (
                  <div className="border-t border-border mt-2">
                    {d.assuntos.map(a => {
                      const assExp = assuntoExpandidos.has(a.assunto)
                      return (
                        <div key={a.assunto} className="border-b border-border last:border-b-0">
                          <button
                            onClick={() => toggleAssunto(a.assunto)}
                            className="w-full flex items-center justify-between px-4 py-3 pl-8 hover:bg-muted/30 transition-all cursor-pointer text-left gap-2"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-1.5 rounded-lg shrink-0 ${
                                a.mediaDesempenho !== null && a.mediaDesempenho >= 70 ? 'bg-green-500/10 text-green-400' :
                                a.mediaDesempenho !== null && a.mediaDesempenho >= 40 ? 'bg-amber-500/10 text-amber-400' :
                                a.mediaDesempenho !== null ? 'bg-red-500/10 text-red-400' : 'bg-muted text-muted-foreground'
                              }`}>
                                <TrendingUp className="w-3 h-3" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{a.assunto}</p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">{a.metas.length} meta(s)</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Barra de horas miniatura */}
                              <div className="hidden sm:flex items-center gap-1.5">
                                <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-violet-500/50 transition-all"
                                    style={{ width: `${(a.totalHoras / a.maxHoras) * 100}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground min-w-[32px] text-right">
                                  {formatarHoras(a.totalHoras)}
                                </span>
                              </div>

                              <span className="text-[10px] font-bold text-muted-foreground sm:hidden">{formatarHoras(a.totalHoras)}</span>

                              {a.mediaDesempenho !== null && (
                                <span className={`text-[10px] font-bold ${corDesempenho(a.mediaDesempenho)}`}>
                                  {a.mediaDesempenho}%
                                </span>
                              )}
                              {assExp ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                            </div>
                          </button>

                          {/* Barra de progresso do assunto */}
                          {assExp && (
                            <div className="px-4 pl-8 pb-1">
                              <div className="flex gap-2">
                                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-violet-500/40 transition-all"
                                    style={{ width: `${(a.totalHoras / d.maxHoras) * 100}%` }}
                                  />
                                </div>
                                {a.mediaDesempenho !== null && (
                                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${bgDesempenho(a.mediaDesempenho)}`}
                                      style={{ width: `${a.mediaDesempenho}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Detalhamento por Meta */}
                          {assExp && (
                            <div className="px-4 pb-3 pl-8">
                              <div className="flex flex-col gap-1.5">
                                {a.metas.map(m => {
                                  const metaConcluidas = m.concluidas
                                  const metaTotal = m.totalTarefas
                                  const progressoTarefas = metaTotal > 0 ? (metaConcluidas / metaTotal) * 100 : 0
                                  return (
                                    <div key={m.id} className="rounded-xl bg-muted/20 p-3 hover:bg-muted/30 transition-all">
                                      <div className="flex items-center justify-between gap-2 mb-2">
                                        <Link
                                          to={`/app/metas?expandir=${m.id}`}
                                          className="text-xs font-semibold text-foreground hover:text-violet-400 transition-colors truncate flex items-center gap-1.5"
                                          title="Abrir meta"
                                        >
                                          <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                          {m.titulo}
                                        </Link>
                                        <span className="text-[9px] text-muted-foreground shrink-0">
                                          {formatarData(m.dataInicio)} – {formatarData(m.dataFim)}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-3 gap-3">
                                        {/* Horas */}
                                        <div>
                                          <p className="text-[9px] text-muted-foreground mb-0.5">Horas</p>
                                          <p className="text-sm font-bold text-foreground">{formatarHoras(m.horas)}</p>
                                          <div className="w-full h-1 rounded-full bg-muted overflow-hidden mt-1">
                                            <div
                                              className="h-full rounded-full bg-violet-500/60 transition-all"
                                              style={{ width: `${Math.min((m.horas / 8) * 100, 100)}%` }}
                                            />
                                          </div>
                                        </div>

                                        {/* Desempenho */}
                                        <div>
                                          <p className="text-[9px] text-muted-foreground mb-0.5">Desempenho</p>
                                          {m.desempenho !== null ? (
                                            <>
                                              <p className={`text-sm font-bold ${corDesempenho(m.desempenho)}`}>
                                                {m.desempenho}%
                                              </p>
                                              <div className="w-full h-1 rounded-full bg-muted overflow-hidden mt-1">
                                                <div
                                                  className={`h-full rounded-full transition-all ${bgDesempenho(m.desempenho)}`}
                                                  style={{ width: `${m.desempenho}%` }}
                                                />
                                              </div>
                                            </>
                                          ) : (
                                            <div className="flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3 text-muted-foreground/40" />
                                              <span className="text-[10px] text-muted-foreground/40">—</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Tarefas */}
                                        <div>
                                          <p className="text-[9px] text-muted-foreground mb-0.5">Tarefas</p>
                                          <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                            <CheckCircle2 className={`w-3.5 h-3.5 ${metaConcluidas === metaTotal && metaTotal > 0 ? 'text-green-400' : 'text-muted-foreground/40'}`} />
                                            {metaConcluidas}/{metaTotal}
                                          </p>
                                          {metaTotal > 0 && (
                                            <div className="w-full h-1 rounded-full bg-muted overflow-hidden mt-1">
                                              <div
                                                className={`h-full rounded-full transition-all ${progressoTarefas >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                                                style={{ width: `${progressoTarefas}%` }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
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
