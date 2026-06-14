import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, ChevronUp, Trash2 } from 'lucide-react'
import type { ResolucaoView } from '../types/database'
import gruposData from '../data/grupos.json'

type GrupoEntry = { materia: string; grupo: string | null }
const GRUPOS_RAW = gruposData as Record<string, GrupoEntry>
const ASSUNTOS_ORDENADOS = Object.keys(GRUPOS_RAW)

const ASSUNTO_ORDER_MAP = new Map<string, number>()
ASSUNTOS_ORDENADOS.forEach((a, i) => ASSUNTO_ORDER_MAP.set(a, i))

const MATERIA_ORDER = new Map<string, number>()
const GRUPO_ORDER = new Map<string, number>()
ASSUNTOS_ORDENADOS.forEach((assunto, i) => {
  const entry = GRUPOS_RAW[assunto]
  if (!MATERIA_ORDER.has(entry.materia)) MATERIA_ORDER.set(entry.materia, i)
  if (entry.grupo && !GRUPO_ORDER.has(entry.grupo)) GRUPO_ORDER.set(entry.grupo, i)
})

function compareOrdered(a: string, b: string, orderMap: Map<string, number>): number {
  const ia = orderMap.get(a)
  const ib = orderMap.get(b)
  if (ia !== undefined && ib !== undefined) return ia - ib
  if (ia !== undefined) return -1
  if (ib !== undefined) return 1
  return a.localeCompare(b)
}

const ORGANIZAR_OPTIONS = [
  { id: 'materia_assunto', label: 'Matéria e Assunto', levels: ['materia', 'assunto'] },
  { id: 'materia', label: 'Matéria', levels: ['materia'] },
  { id: 'assunto', label: 'Assunto', levels: ['assunto'] },
  { id: 'banca', label: 'Banca', levels: ['banca_texto'] },
  { id: 'banca_ano', label: 'Banca e Ano', levels: ['banca_texto', 'ano'] },
  { id: 'ano', label: 'Ano', levels: ['ano'] },
  { id: 'orgao', label: 'Órgão', levels: ['orgao'] },
]

const EXIBIR_OPTIONS = [
  { id: 'estudo' as const, label: 'Ordem de Estudo' },
  { id: 'quantidade' as const, label: 'Quantidade' },
  { id: 'indice' as const, label: 'Alfabética' },
]

interface QuestaoIndiceProps {
  questoes: ResolucaoView[]
  onNavigate: (filtros: Record<string, string>) => void
}

type Node = { name: string; count: number; children: Record<string, Node>; isGrupo?: boolean }

function buildTree2(questoes: ResolucaoView[], levels: string[]): Record<string, Node> {
  const root: Record<string, Node> = {}
  questoes.forEach(q => {
    const qr = q as unknown as Record<string, unknown>
    const l1 = String(qr[levels[0]] || `Sem ${levels[0]}`)
    if (!root[l1]) root[l1] = { name: l1, count: 0, children: {} }
    root[l1].count++
    if (levels.length > 1) {
      const l2 = String(qr[levels[1]] || `Sem ${levels[1]}`)
      if (!root[l1].children[l2]) root[l1].children[l2] = { name: l2, count: 0, children: {} }
      root[l1].children[l2].count++
    }
  })
  return root
}

function buildTree3(questoes: ResolucaoView[]): Record<string, Node> {
  const root: Record<string, Node> = {}
  questoes.forEach(q => {
    const qr = q as unknown as Record<string, unknown>
    const materia = String(qr.materia || 'Sem materia')
    const assunto = String(qr.assunto || 'Sem assunto')
    const grupo = String(qr.grupo || '(sem grupo)')

    if (!root[materia]) root[materia] = { name: materia, count: 0, children: {} }
    root[materia].count++

    if (!root[materia].children[grupo]) {
      root[materia].children[grupo] = { name: grupo, count: 0, children: {}, isGrupo: true }
    }
    root[materia].children[grupo].count++

    if (!root[materia].children[grupo].children[assunto]) {
      root[materia].children[grupo].children[assunto] = { name: assunto, count: 0, children: {} }
    }
    root[materia].children[grupo].children[assunto].count++
  })
  return root
}

export function QuestaoIndice({ questoes, onNavigate }: QuestaoIndiceProps) {
  const [organizarPor, setOrganizarPor] = useState('materia_assunto')
  const [exibirPor, setExibirPor] = useState<'estudo' | 'quantidade' | 'indice'>('estudo')
  const [expandedMaterias, setExpandedMaterias] = useState<Set<string>>(new Set())
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set())
  const [customOrder] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('caderno_materias_assuntos_ordem')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const currentOption = ORGANIZAR_OPTIONS.find(o => o.id === organizarPor) || ORGANIZAR_OPTIONS[0]
  const levels = currentOption.levels
  const isModoEstudo = organizarPor === 'materia_assunto' && exibirPor === 'estudo'

  const root = useMemo(
    () => isModoEstudo ? buildTree3(questoes) : buildTree2(questoes, levels),
    [questoes, isModoEstudo, levels]
  )

  const handleNodeClick = (nodeName: string, levelIndex: number, parentNames: string[]) => {
    if (isModoEstudo) {
      if (levelIndex === 0) {
        setExpandedMaterias(prev => {
          const next = new Set(prev)
          if (next.has(nodeName)) { next.delete(nodeName) } else { next.add(nodeName) }
          return next
        })
        return
      }
      if (levelIndex === 1) {
        const key = `${parentNames[0]}||${nodeName}`
        setExpandedGrupos(prev => {
          const next = new Set(prev)
          if (next.has(key)) { next.delete(key) } else { next.add(key) }
          return next
        })
        return
      }
      if (levelIndex === 2) {
        onNavigate({ materia: parentNames[0], assunto: nodeName })
        return
      }
      return
    }

    if (levelIndex === 0 && levels.length > 1) {
      setExpandedMaterias(prev => {
        const next = new Set(prev)
        if (next.has(nodeName)) { next.delete(nodeName) } else { next.add(nodeName) }
        return next
      })
      return
    }

    const newFiltros: Record<string, string> = {}
    for (let i = 0; i < levelIndex; i++) {
      newFiltros[levels[i]] = parentNames[i]
    }
    newFiltros[levels[levelIndex]] = nodeName
    onNavigate(newFiltros)
  }

  const toggleAll = (expand: boolean) => {
    if (expand) {
      const materias = new Set(Object.keys(root))
      const grupos = new Set<string>()
      for (const node1 of Object.values(root)) {
        for (const childName of Object.keys(node1.children)) {
          grupos.add(`${node1.name}||${childName}`)
        }
      }
      setExpandedMaterias(materias)
      setExpandedGrupos(grupos)
    } else {
      setExpandedMaterias(new Set())
      setExpandedGrupos(new Set())
    }
  }

  const sortNodes = (children: Record<string, Node>, depth: 0 | 1 | 2): Node[] => {
    const cmp = exibirPor === 'quantidade'
      ? (a: Node, b: Node) => b.count - a.count
      : exibirPor === 'estudo' && isModoEstudo
        ? depth === 0
          ? (a: Node, b: Node) => compareOrdered(a.name, b.name, MATERIA_ORDER)
          : depth === 1
            ? (a: Node, b: Node) => {
                if (a.name === '(sem grupo)') return -1
                if (b.name === '(sem grupo)') return 1
                return compareOrdered(a.name, b.name, GRUPO_ORDER)
              }
            : (a: Node, b: Node) => compareOrdered(a.name, b.name, ASSUNTO_ORDER_MAP)
        : (a: Node, b: Node) => {
            const savedOrder = customOrder[Object.keys(root)[0]] || []
            if (savedOrder.length > 0 && exibirPor === 'indice') {
              const idxA = savedOrder.indexOf(a.name)
              const idxB = savedOrder.indexOf(b.name)
              if (idxA !== -1 && idxB !== -1) return idxA - idxB
              if (idxA !== -1) return -1
              if (idxB !== -1) return 1
            }
            return a.name.localeCompare(b.name)
          }
    return Object.values(children).sort(cmp)
  }

  if (questoes.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 space-y-1">
          <div className="text-center py-8 text-muted-foreground text-sm italic">
            Nenhuma questão no caderno para exibir o índice.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <div className="relative inline-block">
            <span className="flex items-center gap-1">Organizar por: 
              <select 
                className="text-primary font-bold bg-card outline-none cursor-pointer border-b border-dashed border-primary/50 pb-0.5 hover:border-primary"
                value={organizarPor}
                onChange={(e) => setOrganizarPor(e.target.value)}
              >
                {ORGANIZAR_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className="bg-card text-foreground">{opt.label}</option>)}
              </select>
            </span>
          </div>
          <span className="hidden sm:inline">|</span>
          <div className="relative inline-block">
            <span className="flex items-center gap-1">Exibir por: 
              <select 
                className="text-primary font-bold bg-card outline-none cursor-pointer border-b border-dashed border-primary/50 pb-0.5 hover:border-primary"
                value={exibirPor}
                onChange={(e) => setExibirPor(e.target.value as 'estudo' | 'quantidade' | 'indice')}
              >
                {EXIBIR_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className="bg-card text-foreground">{opt.label}</option>)}
              </select>
            </span>
          </div>
        </div>
        <button className="text-primary hover:underline text-xs font-bold flex items-center gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Remover questões
        </button>
      </div>
      
      <div className="p-2 border-b border-border bg-muted/10 flex items-center gap-3 text-xs font-bold text-primary">
        <button className="hover:underline flex items-center gap-1" onClick={() => toggleAll(true)}>
          <ChevronDown className="w-3.5 h-3.5" /> Expandir
        </button>
        <button className="hover:underline flex items-center gap-1" onClick={() => toggleAll(false)}>
          <ChevronUp className="w-3.5 h-3.5" /> Retrair
        </button>
      </div>

      <div className="p-4 md:p-6 space-y-1">
        {sortNodes(root, 0).map((node1, idx1) => (
          <div key={node1.name} className="text-sm">
            {/* Level 0 — Matéria */}
            <div 
              className="flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded group cursor-pointer"
              onClick={() => handleNodeClick(node1.name, 0, [])}
            >
              <div className="flex items-center gap-2 font-bold text-foreground">
                {(isModoEstudo || (!isModoEstudo && levels.length > 1)) && (
                  expandedMaterias.has(node1.name) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )
                )}
                {exibirPor === 'indice' && !isModoEstudo && levels.length <= 1 ? <span className="text-muted-foreground mr-1">{idx1 + 1}.</span> : null}
                <span className="group-hover:text-primary transition-colors">{node1.name}</span>
              </div>
              {exibirPor !== 'indice' && (
                <div
                  data-testid="count-materia"
                  className="text-muted-foreground flex gap-1 items-center cursor-pointer hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    const key = isModoEstudo ? 'materia' : levels[0]
                    onNavigate({ [key]: node1.name })
                  }}
                >
                  <span className="text-foreground font-semibold group-hover:text-primary">{node1.count}</span>
                  <span className="text-xs opacity-60">({((node1.count / (questoes.length || 1)) * 100).toFixed(2)}%)</span>
                </div>
              )}
            </div>
            
            {/* Children */}
            {expandedMaterias.has(node1.name) && (() => {
              const children = sortNodes(node1.children, isModoEstudo ? 1 : 1)

              if (isModoEstudo) {
                return (
                  <div className="pl-6 border-l-2 border-border/50 ml-4 mt-1 space-y-1 pb-2">
                    {children.map((node2) => (
                      <div key={node2.name}>
                        {/* Level 1 — Grupo */}
                        <div
                          className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded cursor-pointer group"
                          onClick={() => handleNodeClick(node2.name, 1, [node1.name])}
                        >
                          <div className="flex items-center gap-2 text-muted-foreground font-semibold group-hover:text-foreground transition-colors">
                            {expandedGrupos.has(`${node1.name}||${node2.name}`) ? (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            {node2.name}
                          </div>
                          <div className="text-muted-foreground flex gap-1 items-center text-xs">
                            <span>{node2.count}</span>
                            <span className="opacity-60">({((node2.count / (questoes.length || 1)) * 100).toFixed(2)}%)</span>
                          </div>
                        </div>

                        {/* Level 2 — Assuntos */}
                        {expandedGrupos.has(`${node1.name}||${node2.name}`) && (
                          <div className="pl-6 border-l-2 border-border/30 ml-4 mt-1 space-y-0.5 pb-1">
                            {sortNodes(node2.children, 2).map((node3) => (
                              <div
                                key={node3.name}
                                className="flex items-center justify-between py-1 px-2 hover:bg-muted/30 rounded cursor-pointer group"
                                onClick={() => handleNodeClick(node3.name, 2, [node1.name, node2.name])}
                              >
                                <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors text-xs">
                                  <div className="w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary transition-colors" />
                                  {node3.name}
                                </div>
                                <div className="text-muted-foreground flex gap-1 items-center text-xs">
                                  <span>{node3.count}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }

              // 2-level tree
              if (levels.length > 1 && children.length > 0) {
                return (
                  <div className="pl-6 border-l-2 border-border/50 ml-4 mt-1 space-y-1 pb-2">
                    {children.map((node2, idx2) => (
                      <div 
                        key={node2.name} 
                        className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded cursor-pointer group"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNodeClick(node2.name, 1, [node1.name]);
                        }}
                      >
                        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary transition-colors" />
                          {exibirPor === 'indice' ? <span className="mr-1">{idx1 + 1}.{idx2 + 1}.</span> : null}
                          {node2.name}
                        </div>
                        {exibirPor !== 'indice' && (
                          <div className="text-muted-foreground flex gap-1 items-center text-xs">
                            <span>{node2.count}</span>
                            <span className="opacity-60">({((node2.count / (questoes.length || 1)) * 100).toFixed(2)}%)</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
              return null
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}
