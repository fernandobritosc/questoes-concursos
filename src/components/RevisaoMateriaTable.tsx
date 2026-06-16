import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, BookOpen, Clock, TrendingUp, Play } from 'lucide-react'
import type { ResolucaoView } from '../types/database'

interface AssuntoData {
  nome: string
  quantidade: number
}

interface MateriaRow {
  materia: string
  pendentes: number
  revisados: number
  totalOriginal: number
  progresso: number
  ultimaRevisao: number
  assuntos: AssuntoData[]
}

interface RevisaoMateriaTableProps {
  erros: ResolucaoView[]
  busca: string
  initialCounts: Record<string, number>
  onNavigateAssunto: (materia: string, assunto: string) => void
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const dias = Math.floor(diff / 86400000)
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias < 7) return `${dias}d atrás`
  if (dias < 30) return `${Math.floor(dias / 7)}sem atrás`
  return `${Math.floor(dias / 30)}m atrás`
}

export function RevisaoMateriaTable({ erros, busca, initialCounts, onNavigateAssunto }: RevisaoMateriaTableProps) {
  const [expandedMateria, setExpandedMateria] = useState<string | null>(null)

  const rows = useMemo(() => {
    const map: Record<string, { erros: ResolucaoView[]; ultimaRevisao: number; assuntos: Record<string, number> }> = {}

    erros.forEach(e => {
      const mat = e.materia || 'Sem Matéria'
      if (!map[mat]) map[mat] = { erros: [], ultimaRevisao: 0, assuntos: {} }
      map[mat].erros.push(e)

      const ass = e.assunto || 'Sem Assunto'
      map[mat].assuntos[ass] = (map[mat].assuntos[ass] || 0) + 1

      const t = e.data_resolucao ? new Date(e.data_resolucao).getTime() : 0
      if (t > map[mat].ultimaRevisao) map[mat].ultimaRevisao = t
    })

    const textoBusca = busca.toLowerCase().trim()

    return Object.entries(map)
      .filter(([materia]) => !textoBusca || materia.toLowerCase().includes(textoBusca))
      .map(([materia, data]): MateriaRow => {
        const pendentes = data.erros.length
        const totalOriginal = initialCounts[materia] || pendentes
        const revisados = Math.max(0, totalOriginal - pendentes)
        const progresso = totalOriginal > 0 ? Math.round((revisados / totalOriginal) * 100) : 0
        return {
          materia,
          pendentes,
          revisados,
          totalOriginal,
          progresso,
          ultimaRevisao: data.ultimaRevisao,
          assuntos: Object.entries(data.assuntos)
            .map(([nome, quantidade]) => ({ nome, quantidade }))
            .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome)),
        }
      })
      .sort((a, b) => b.pendentes - a.pendentes || a.materia.localeCompare(b.materia))
  }, [erros, busca, initialCounts])

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3 border border-dashed border-border rounded-2xl bg-muted/5">
        <BookOpen className="w-10 h-10 text-muted-foreground/30" />
        <span className="text-sm font-semibold">Nenhum erro encontrado</span>
        <span className="text-xs">Tente ajustar sua busca ou filtros.</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2">
      {rows.map(row => {
        const isExpanded = expandedMateria === row.materia

        return (
          <div key={row.materia} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all">
            <button
              onClick={() => setExpandedMateria(isExpanded ? null : row.materia)}
              className="w-full p-4 flex items-center gap-4 transition-all text-left cursor-pointer hover:bg-muted/10"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-foreground truncate max-w-[300px]">
                    {row.materia}
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    {row.pendentes} pendente{row.pendentes !== 1 ? 's' : ''}
                  </span>
                  {row.revisados > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {row.revisados} revisado{row.revisados !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-semibold flex-wrap">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{row.progresso}% concluído</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Última revisão: {timeAgo(row.ultimaRevisao)}</span>
                  </span>
                  <span className="text-muted-foreground/60">{row.assuntos.length} assunto{row.assuntos.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="w-full max-w-sm bg-muted/30 rounded-full h-1.5 overflow-hidden border border-border/30">
                  <div
                    className="bg-gradient-to-r from-violet-500 to-indigo-650 h-full rounded-full transition-all duration-500"
                    style={{ width: `${row.progresso}%` }}
                  />
                </div>
              </div>

              <div className="shrink-0 text-muted-foreground">
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border/60 bg-background/50 p-3 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                {row.assuntos.map(assunto => (
                  <button
                    key={assunto.nome}
                    onClick={() => onNavigateAssunto(row.materia, assunto.nome)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-card border border-border hover:border-violet-500/40 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-bold text-foreground truncate">
                        {assunto.nome}
                      </span>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 shrink-0">
                        {assunto.quantidade}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Play className="w-3 h-3 fill-violet-400" />
                      <span>Revisar</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
