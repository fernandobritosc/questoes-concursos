import { useState } from 'react'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { ResolucaoView } from '../types/database'

const ORGANIZAR_OPTIONS = [
  { id: 'materia_assunto', label: 'Matéria e Assunto', levels: ['materia', 'assunto'] },
  { id: 'materia', label: 'Matéria', levels: ['materia'] },
  { id: 'assunto', label: 'Assunto', levels: ['assunto'] },
  { id: 'banca', label: 'Banca', levels: ['banca_texto'] },
  { id: 'banca_ano', label: 'Banca e Ano', levels: ['banca_texto', 'ano'] },
  { id: 'ano', label: 'Ano', levels: ['ano'] },
  { id: 'orgao', label: 'Órgão', levels: ['orgao'] },
]

interface QuestaoIndiceProps {
  questoes: ResolucaoView[]
  onNavigate: (filtros: Record<string, string>) => void
}

export function QuestaoIndice({ questoes, onNavigate }: QuestaoIndiceProps) {
  const [organizarPor, setOrganizarPor] = useState('materia_assunto')
  const [exibirPor, setExibirPor] = useState<'indice' | 'quantidade'>('quantidade')
  const [customOrder] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('caderno_materias_assuntos_ordem')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const handleNodeClick = (nodeName: string, levelIndex: number, parentNames: string[]) => {
    const currentOption = ORGANIZAR_OPTIONS.find(o => o.id === organizarPor) || ORGANIZAR_OPTIONS[0]
    const levels = currentOption.levels
    const newFiltros: Record<string, string> = {}
    for (let i = 0; i < levelIndex; i++) {
      newFiltros[levels[i]] = parentNames[i]
    }
    newFiltros[levels[levelIndex]] = nodeName
    onNavigate(newFiltros)
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

  const currentOption = ORGANIZAR_OPTIONS.find(o => o.id === organizarPor) || ORGANIZAR_OPTIONS[0]
  const levels = currentOption.levels

  type Node = { name: string; count: number; children: Record<string, Node> }
  const root: Record<string, Node> = {}

  questoes.forEach(q => {
    const qr = q as unknown as Record<string, unknown>
    const level1Val = qr[levels[0]] || `Sem ${levels[0]}`
    const l1Str = String(level1Val)
    
    if (!root[l1Str]) {
      root[l1Str] = { name: l1Str, count: 0, children: {} }
    }
    root[l1Str].count++

    if (levels.length > 1) {
      const level2Val = qr[levels[1]] || `Sem ${levels[1]}`
      const l2Str = String(level2Val)
      if (!root[l1Str].children[l2Str]) {
        root[l1Str].children[l2Str] = { name: l2Str, count: 0, children: {} }
      }
      root[l1Str].children[l2Str].count++
    }
  })

  return (
    <div className="w-full max-w-5xl mx-auto bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <div className="relative inline-block">
            <span className="flex items-center gap-1">Organizar por: 
              <select 
                className="text-primary font-bold bg-transparent outline-none cursor-pointer border-b border-dashed border-primary/50 pb-0.5 hover:border-primary"
                value={organizarPor}
                onChange={(e) => setOrganizarPor(e.target.value)}
              >
                {ORGANIZAR_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className="text-foreground">{opt.label}</option>)}
              </select>
            </span>
          </div>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">Ordenar questões por: <strong className="text-primary cursor-pointer">Data</strong></span>
          <span className="hidden sm:inline">|</span>
          <div className="relative inline-block hidden sm:inline">
            <span className="flex items-center gap-1">Exibir questões por: 
              <select 
                className="text-primary font-bold bg-transparent outline-none cursor-pointer border-b border-dashed border-primary/50 pb-0.5 hover:border-primary"
                value={exibirPor}
                onChange={(e) => setExibirPor(e.target.value as 'indice' | 'quantidade')}
              >
                <option value="quantidade" className="text-foreground">Quantidade</option>
                <option value="indice" className="text-foreground">Índice</option>
              </select>
            </span>
          </div>
        </div>
        <button className="text-primary hover:underline text-xs font-bold flex items-center gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Remover questões
        </button>
      </div>
      
      <div className="p-2 border-b border-border bg-muted/10 flex items-center gap-3 text-xs font-bold text-primary">
        <button className="hover:underline flex items-center gap-1">
          <ChevronDown className="w-3.5 h-3.5" /> Expandir
        </button>
        <button className="hover:underline flex items-center gap-1">
          <ChevronUp className="w-3.5 h-3.5" /> Retrair
        </button>
      </div>

      <div className="p-4 md:p-6 space-y-1">
        {Object.values(root).sort((a,b) => exibirPor === 'quantidade' ? b.count - a.count : a.name.localeCompare(b.name)).map((node1, idx1) => (
          <div key={node1.name} className="text-sm">
            <div 
              className="flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded group cursor-pointer"
              onClick={() => handleNodeClick(node1.name, 0, [])}
            >
              <div className="flex items-center gap-2 font-bold text-foreground">
                {levels.length > 1 && <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
                {exibirPor === 'indice' ? <span className="text-muted-foreground mr-1">{idx1 + 1}.</span> : null}
                {node1.name}
              </div>
              {exibirPor === 'quantidade' && (
                <div className="text-muted-foreground flex gap-1 items-center">
                  <span className="text-foreground font-semibold">{node1.count}</span>
                  <span className="text-xs opacity-60">({((node1.count / (questoes.length || 1)) * 100).toFixed(2)}%)</span>
                </div>
              )}
            </div>
            
            {levels.length > 1 && Object.keys(node1.children).length > 0 && (
              <div className="pl-6 border-l-2 border-border/50 ml-4 mt-1 space-y-1 pb-2">
                {Object.values(node1.children).sort((a, b) => {
                  if (exibirPor === 'indice') {
                    const savedOrder = customOrder[node1.name] || []
                    if (savedOrder.length > 0) {
                      let idxA = savedOrder.indexOf(a.name)
                      let idxB = savedOrder.indexOf(b.name)
                      if (idxA === -1) idxA = savedOrder.length
                      if (idxB === -1) idxB = savedOrder.length
                      if (idxA !== idxB) return idxA - idxB
                    }
                  }
                  return exibirPor === 'quantidade' ? b.count - a.count : a.name.localeCompare(b.name)
                }).map((node2, idx2) => (
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
                    {exibirPor === 'quantidade' && (
                      <div className="text-muted-foreground flex gap-1 items-center text-xs">
                        <span>{node2.count}</span>
                        <span className="opacity-60">({((node2.count / (questoes.length || 1)) * 100).toFixed(2)}%)</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
