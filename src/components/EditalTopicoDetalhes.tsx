import { useState, useMemo, useCallback } from 'react'
import { ChevronLeft, Award, Search, Check, BookOpen, FileText, ListChecks, ChevronRight, ChevronDown, Link2, X, Database } from 'lucide-react'
import type { MateriaEdital, ResolucaoView } from '../types/database'
import { getTopicoMapping, setTopicoAssuntos } from '../lib/topicoMappingStorage'

interface EditalTopicoDetalhesProps {
  materiaEdital: MateriaEdital
  onVoltar: () => void
  resolucoes: ResolucaoView[]
  assuntoSearch: string
  onAssuntoSearchChange: (value: string) => void
  statusFiltro: 'todos' | 'criticos'
  onStatusFiltroChange: (filtro: 'todos' | 'criticos') => void
  uniqueMateriasList: string[]
}

const MATERIA_MAP_KEY = 'edital_materia_map'

function getMateriaMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MATERIA_MAP_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setMateriaMapEntry(materiaEditalId: string, dbMateria: string) {
  const map = getMateriaMap()
  map[materiaEditalId] = dbMateria
  localStorage.setItem(MATERIA_MAP_KEY, JSON.stringify(map))
}

export function EditalTopicoDetalhes({
  materiaEdital,
  onVoltar,
  resolucoes,
  assuntoSearch,
  onAssuntoSearchChange,
  statusFiltro,
  onStatusFiltroChange,
  uniqueMateriasList,
}: EditalTopicoDetalhesProps) {
  const [topicosChecklist, setTopicosChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`edital_topicos_${materiaEdital.id}`)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [expandedTopico, setExpandedTopico] = useState<string | null>(null)
  const [linkingTopico, setLinkingTopico] = useState<string | null>(null)
  const [linkSelection, setLinkSelection] = useState<string[]>([])

  const savedMapping = useMemo(() => getTopicoMapping(materiaEdital.id), [materiaEdital.id])
  const [showMateriaLinker, setShowMateriaLinker] = useState(false)
  const [, setRefresh] = useState(0)
  const forceRefresh = useCallback(() => setRefresh(n => n + 1), [])

  const mappedDbMateria = getMateriaMap()[materiaEdital.id]

  const toggleTopico = (topico: string) => {
    const updated = { ...topicosChecklist, [topico]: !topicosChecklist[topico] }
    setTopicosChecklist(updated)
    localStorage.setItem(`edital_topicos_${materiaEdital.id}`, JSON.stringify(updated))
  }

  function abrirLink(topico: string) {
    const current = savedMapping[topico] ?? []
    setLinkSelection([...current])
    setLinkingTopico(topico)
  }

  function toggleAssuntoLink(assunto: string) {
    setLinkSelection(prev =>
      prev.includes(assunto) ? prev.filter(a => a !== assunto) : [...prev, assunto]
    )
  }

  function salvarLink() {
    if (!linkingTopico) return
    setTopicoAssuntos(materiaEdital.id, linkingTopico, linkSelection)
    setLinkingTopico(null)
    setLinkSelection([])
    forceRefresh()
  }

  function cancelarLink() {
    setLinkingTopico(null)
    setLinkSelection([])
  }

  const materiaNome = mappedDbMateria ?? materiaEdital.nome

  const questoesDaMateria = useMemo(() =>
    resolucoes.filter(r => r.materia === materiaNome),
    [resolucoes, materiaNome]
  )

  const assuntosInternos = useMemo(() => {
    const set = new Set<string>()
    resolucoes.forEach(r => {
      if (r.materia === materiaNome && r.assunto) {
        set.add(r.assunto)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [resolucoes, materiaNome])

  const resolvidas = questoesDaMateria.filter(q => q.alternativa && q.alternativa !== '')
  const acertos = resolvidas.filter(q => q.acertou).length
  const taxaAcerto = resolvidas.length > 0 ? Math.round((acertos / resolvidas.length) * 100) : 0
  const temMatch = questoesDaMateria.length > 0
  const topicosCompletos = materiaEdital.topicos.filter(t => topicosChecklist[t]).length

  const topicosComInfo = useMemo(() => {
    return materiaEdital.topicos
      .filter(t => t.toLowerCase().includes(assuntoSearch.toLowerCase()))
      .map(t => {
        const linkedAssuntos = savedMapping[t] ?? []
        const questoesDoTopico = linkedAssuntos.length > 0
          ? resolucoes.filter(r => r.materia === materiaNome && r.assunto && linkedAssuntos.includes(r.assunto))
          : []
        const total = questoesDoTopico.length
        const questoesAssunto = linkedAssuntos.map(a => ({
          assunto: a,
          questoes: resolucoes.filter(r => r.materia === materiaNome && r.assunto === a),
        }))
        return { topico: t, totalQuestoes: total, linkedAssuntos, questoesAssunto }
      })
  }, [materiaEdital.topicos, savedMapping, resolucoes, materiaNome, assuntoSearch])

  const corCount = (total: number, linked: boolean) => {
    if (!linked) return 'text-muted-foreground/40'
    if (total === 0) return 'text-muted-foreground/50'
    if (total < 5) return 'text-amber-500'
    if (total < 20) return 'text-emerald-500'
    return 'text-emerald-400'
  }

  return (
    <div className="flex-1 bg-muted/10 flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-card border-b border-border shrink-0">
          <button
            onClick={onVoltar}
            className="md:hidden flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-400 hover:text-violet-300 border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 rounded-xl cursor-pointer transition-all mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wide">{materiaEdital.nome}</h3>
                {temMatch && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase border border-emerald-500/20">
                    No banco
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold">
                {materiaEdital.topicos.length} {materiaEdital.topicos.length === 1 ? 'tópico' : 'tópicos'} no edital
                <span className="mx-1.5">•</span>
                {questoesDaMateria.length} {questoesDaMateria.length === 1 ? 'questão' : 'questões'} no banco
                {mappedDbMateria && mappedDbMateria !== materiaEdital.nome && (
                  <span className="text-teal-500 ml-1">
                    (via {mappedDbMateria})
                  </span>
                )}
              </p>
              {!temMatch && !mappedDbMateria && (
                <button
                  onClick={() => setShowMateriaLinker(true)}
                  className="mt-2 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-3 h-3" />
                  Vincular matéria do banco
                </button>
              )}
              {!temMatch && mappedDbMateria && (
                <p className="mt-2 text-[10px] text-amber-400 font-semibold">
                  A matéria "{mappedDbMateria}" não tem questões no banco. Associe os tópicos abaixo para começar.
                </p>
              )}
            </div>

            {temMatch && (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-muted/40 border border-border rounded-xl">
                <Award className="w-5 h-5 text-amber-500" />
                <div className="text-xxs">
                  <div className="font-extrabold text-foreground">Taxa de Acerto</div>
                  <div className={`font-black mt-0.5 ${taxaAcerto >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {taxaAcerto}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {!temMatch && !mappedDbMateria && (
            <div className="mt-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xxs text-amber-400 font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 shrink-0" />
              Nenhuma questão encontrada com o nome "{materiaEdital.nome}". 
              Vincule a matéria do banco para cruzar os dados.
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-5 py-3 bg-card border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={assuntoSearch}
              onChange={(e) => onAssuntoSearchChange(e.target.value)}
              placeholder="Filtrar tópicos..."
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-muted/10 text-xs font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="px-5 py-2.5 bg-muted/30 border-b border-border flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mr-1">Filtro:</span>
          <button
            onClick={() => onStatusFiltroChange('todos')}
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
              statusFiltro === 'todos'
                ? 'bg-primary/10 border-primary/30 text-primary shadow-xs'
                : 'bg-card border-border/80 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => onStatusFiltroChange('criticos')}
            className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer border ${
              statusFiltro === 'criticos'
                ? 'bg-rose-500/10 border-rose-500/25 text-rose-400 shadow-xs'
                : 'bg-card border-border/80 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            Sem vínculo
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                Tópicos do Edital
              </h4>
              <span className="text-[10px] text-muted-foreground font-semibold ml-auto">
                {topicosCompletos}/{materiaEdital.topicos.length} concluídos
              </span>
            </div>

            {topicosComInfo.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-card border border-border border-dashed rounded-xl text-muted-foreground gap-2">
                <ListChecks className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs font-semibold text-foreground">Nenhum tópico encontrado</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {topicosComInfo.map(({ topico, totalQuestoes, linkedAssuntos, questoesAssunto }) => {
                  const isChecked = topicosChecklist[topico] || false
                  const isExpanded = expandedTopico === topico
                  const temVinculo = linkedAssuntos.length > 0
                  const semVinculo = !temVinculo

                  const passaFiltro =
                    statusFiltro === 'todos' ||
                    (statusFiltro === 'criticos' && semVinculo)

                  if (!passaFiltro) return null

                  return (
                    <div key={topico} className="bg-card border border-border/80 rounded-xl overflow-hidden">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => toggleTopico(topico)}
                          className="flex items-start gap-3 p-3 flex-1 min-w-0 text-left transition-all group cursor-pointer hover:bg-muted/10"
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-600 text-white'
                              : 'border-muted-foreground/30 group-hover:border-primary/50'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-semibold leading-relaxed ${
                              isChecked ? 'text-muted-foreground line-through' : 'text-foreground'
                            }`}>
                              {topico}
                            </div>
                            {semVinculo && (
                              <div className="text-[9px] text-amber-500/70 font-semibold mt-0.5 flex items-center gap-1">
                                <Link2 className="w-2.5 h-2.5" />
                                Sem assuntos vinculados
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-1 pr-3 py-3 shrink-0">
                          <span className={`text-[10px] font-black font-mono tabular-nums ${corCount(totalQuestoes, temVinculo)}`}>
                            {temVinculo ? `${totalQuestoes} ${totalQuestoes === 1 ? 'q' : 'qs'}` : '—'}
                          </span>
                          <button
                            onClick={() => abrirLink(topico)}
                            className={`p-1.5 rounded cursor-pointer transition-all ${
                              temVinculo
                                ? 'text-teal-500 hover:bg-teal-500/10'
                                : 'text-muted-foreground/30 hover:text-teal-500 hover:bg-teal-500/10'
                            }`}
                            title="Vincular assuntos"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                          {temVinculo && (
                            <button
                              onClick={() => setExpandedTopico(isExpanded ? null : topico)}
                              className="p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted rounded cursor-pointer transition-all"
                            >
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && temVinculo && (
                        <div className="border-t border-border/60 px-3 py-3 space-y-2 bg-muted/5">
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mb-2">
                            Assuntos vinculados ({linkedAssuntos.length})
                          </p>
                          {questoesAssunto.map(({ assunto, questoes }) => {
                            const resolvidasA = questoes.filter(q => q.alternativa && q.alternativa !== '')
                            const acertosA = resolvidasA.filter(q => q.acertou).length
                            const taxaA = resolvidasA.length > 0 ? Math.round((acertosA / resolvidasA.length) * 100) : 0
                            return (
                              <div key={assunto} className="flex items-center justify-between py-1.5 px-2 bg-card border border-border/30 rounded-lg">
                                <span className="text-[11px] font-semibold text-foreground/80 truncate pr-2">{assunto}</span>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[10px] font-mono font-black text-muted-foreground">
                                    {questoes.length} q
                                  </span>
                                  {resolvidasA.length > 0 && (
                                    <span className={`text-[10px] font-mono font-black ${taxaA >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                      {taxaA}%
                                    </span>
                                  )}
                                </div>
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

            {temMatch && assuntosInternos.length > 0 && (
              <div className="mt-6 px-4 py-3 bg-card border border-border/60 rounded-xl">
                <p className="text-[10px] text-muted-foreground font-semibold">
                  <strong className="text-foreground">{assuntosInternos.length} assuntos</strong> disponíveis no banco para esta matéria.
                  Clique no ícone <Link2 className="w-2.5 h-2.5 inline text-teal-500" /> ao lado de cada tópico para vincular.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de vinculação de assuntos */}
      {linkingTopico && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={cancelarLink}>
          <div className="bg-card border border-border rounded-2xl shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                <Link2 className="w-4 h-4 text-teal-500" />
                Vincular assuntos
              </h3>
              <button onClick={cancelarLink} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border">
              <p className="text-xs font-bold text-foreground">{linkingTopico}</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                Selecione os assuntos do banco que correspondem a este tópico:
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {assuntosInternos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs font-semibold italic">
                  Nenhum assunto disponível no banco para esta matéria.
                </div>
              ) : (
                assuntosInternos.map(a => {
                  const selected = linkSelection.includes(a)
                  return (
                    <button
                      key={a}
                      onClick={() => toggleAssuntoLink(a)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        selected
                          ? 'bg-teal-500/10 border-teal-500/30'
                          : 'bg-card border-border/50 hover:border-border hover:bg-muted/10'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        selected
                          ? 'bg-teal-500 border-teal-500 text-white'
                          : 'border-muted-foreground/30'
                      }`}>
                        {selected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold text-foreground">{a}</span>
                    </button>
                  )
                })
              )}
            </div>

            <div className="p-4 border-t border-border flex items-center justify-between shrink-0">
              <span className="text-[10px] text-muted-foreground font-semibold">
                {linkSelection.length} {linkSelection.length === 1 ? 'assunto selecionado' : 'assuntos selecionados'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelarLink}
                  className="px-4 py-2 border border-border hover:bg-muted text-xs font-black rounded-lg cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarLink}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Vincular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de vinculação de matéria */}
      {showMateriaLinker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowMateriaLinker(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-lg w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-xs font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-500" />
                Vincular matéria
              </h3>
              <button onClick={() => setShowMateriaLinker(false)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border">
              <p className="text-xs font-bold text-foreground">{materiaEdital.nome}</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                Nenhuma questão encontrada com este nome. Selecione a matéria correspondente no banco:
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {uniqueMateriasList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-xs font-semibold italic">
                  Nenhuma matéria disponível no banco.
                </div>
              ) : (
                uniqueMateriasList.map(dbMateria => {
                  const alreadyLinked = mappedDbMateria === dbMateria
                  return (
                    <button
                      key={dbMateria}
                      onClick={() => {
                        setMateriaMapEntry(materiaEdital.id, dbMateria)
                        setShowMateriaLinker(false)
                        forceRefresh()
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        alreadyLinked
                          ? 'bg-teal-500/10 border-teal-500/30'
                          : 'bg-card border-border/50 hover:border-border hover:bg-muted/10'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-semibold text-foreground">{dbMateria}</span>
                      {alreadyLinked && <Check className="w-3.5 h-3.5 text-teal-500 ml-auto" />}
                    </button>
                  )
                })
              )}
            </div>

            {mappedDbMateria && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={() => {
                    const map = getMateriaMap()
                    delete map[materiaEdital.id]
                    localStorage.setItem(MATERIA_MAP_KEY, JSON.stringify(map))
                    setShowMateriaLinker(false)
                    forceRefresh()
                  }}
                  className="w-full py-2 border border-dashed border-border/60 rounded-lg text-[10px] font-black text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 transition-all cursor-pointer"
                >
                  Desvincular matéria
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
