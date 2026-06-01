import re

with open('src/pages/Questoes.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add states for organizarPor
state_injection = """  const [topTab, setTopTab] = useState<'questoes' | 'indice' | 'estatisticas' | 'gabarito'>('questoes')
  const [organizarPor, setOrganizarPor] = useState('materia_assunto')
  const [isOrganizarDropdownOpen, setIsOrganizarDropdownOpen] = useState(false)

  const ORGANIZAR_OPTIONS = [
    { id: 'materia_assunto', label: 'Matéria e Assunto', levels: ['materia', 'assunto'] },
    { id: 'materia', label: 'Matéria', levels: ['materia'] },
    { id: 'assunto', label: 'Assunto', levels: ['assunto'] },
    { id: 'banca', label: 'Banca', levels: ['banca'] },
    { id: 'ano', label: 'Ano', levels: ['ano'] },
    { id: 'orgao', label: 'Órgão', levels: ['orgao'] },
  ]
"""
text = text.replace("  const [topTab, setTopTab] = useState<'questoes' | 'indice' | 'estatisticas' | 'gabarito'>('questoes')", state_injection)

# 2. Replace the HTML for "Organizar por:"
dropdown_html = """                  <div className="relative inline-block">
                    <span>Organizar por: <strong 
                      className="text-primary cursor-pointer hover:underline"
                      onClick={() => setIsOrganizarDropdownOpen(!isOrganizarDropdownOpen)}
                    >
                      {ORGANIZAR_OPTIONS.find(o => o.id === organizarPor)?.label}
                    </strong></span>

                    {isOrganizarDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsOrganizarDropdownOpen(false)} />
                        <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-20 py-1">
                          {ORGANIZAR_OPTIONS.map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setOrganizarPor(opt.id)
                                setIsOrganizarDropdownOpen(false)
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 ${organizarPor === opt.id ? 'font-bold text-primary' : 'text-foreground'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>"""

text = re.sub(r'<span>Organizar por: <strong.*?</strong></span>', dropdown_html, text, flags=re.DOTALL)

# 3. Replace the grouping logic in the Indice tab
old_grouping_regex = r'\{\(\) => \{\s*// Group by Materia -> Assunto.*?return Object\.entries\(grouped\).*?\n\s*\}\)\(\)\}'

new_grouping = """{(() => {
                  const currentOption = ORGANIZAR_OPTIONS.find(o => o.id === organizarPor) || ORGANIZAR_OPTIONS[0]
                  const levels = currentOption.levels
                  
                  type Node = { name: string; count: number; children: Record<string, Node> }
                  const root: Record<string, Node> = {}

                  cadernoQuestoes.forEach(q => {
                    const level1Val = q[levels[0] as keyof typeof q] || `Sem ${levels[0]}`
                    const l1Str = String(level1Val)
                    
                    if (!root[l1Str]) {
                      root[l1Str] = { name: l1Str, count: 0, children: {} }
                    }
                    root[l1Str].count++

                    if (levels.length > 1) {
                      const level2Val = q[levels[1] as keyof typeof q] || `Sem ${levels[1]}`
                      const l2Str = String(level2Val)
                      if (!root[l1Str].children[l2Str]) {
                        root[l1Str].children[l2Str] = { name: l2Str, count: 0, children: {} }
                      }
                      root[l1Str].children[l2Str].count++
                    }
                  })

                  return Object.values(root).sort((a,b) => a.name.localeCompare(b.name)).map(node1 => (
                    <div key={node1.name} className="text-sm">
                      <div className="flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded group cursor-pointer">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          {levels.length > 1 && <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />}
                          {node1.name}
                        </div>
                        <div className="text-muted-foreground flex gap-1 items-center">
                          <span className="text-foreground font-semibold">{node1.count}</span>
                          <span className="text-xs opacity-60">({((node1.count / (cadernoQuestoes.length || 1)) * 100).toFixed(2)}%)</span>
                        </div>
                      </div>
                      
                      {levels.length > 1 && Object.keys(node1.children).length > 0 && (
                        <div className="pl-6 border-l-2 border-border/50 ml-4 mt-1 space-y-1 pb-2">
                          {Object.values(node1.children).sort((a,b) => a.name.localeCompare(b.name)).map(node2 => (
                            <div key={node2.name} className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded cursor-pointer group">
                              <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                                <div className="w-1 h-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary transition-colors" />
                                {node2.name}
                              </div>
                              <div className="text-muted-foreground flex gap-1 items-center text-xs">
                                <span>{node2.count}</span>
                                <span className="opacity-60">({((node2.count / (cadernoQuestoes.length || 1)) * 100).toFixed(2)}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                })()}"""

text = re.sub(old_grouping_regex, new_grouping.replace('\\', '\\\\'), text, flags=re.DOTALL)

with open('src/pages/Questoes.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Dropdown and dynamic grouping logic added.")
