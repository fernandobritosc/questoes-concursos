import re

with open('src/pages/Questoes.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add state for filters
if "const [filtros, setFiltros] = useState<Record<string, string> | null>(null)" not in text:
    state_injection = """  const [topTab, setTopTab] = useState<'questoes' | 'indice' | 'estatisticas' | 'gabarito' | 'configuracoes' | 'imprimir'>('indice')
  const [filtros, setFiltros] = useState<Record<string, string> | null>(null)
  
  const questoesExibidas = useMemo(() => {
    if (!filtros) return cadernoQuestoes;
    return cadernoQuestoes.filter(q => {
      for (const [key, val] of Object.entries(filtros)) {
        if (String((q as any)[key] || `Sem ${key}`) !== val) return false;
      }
      return true;
    })
  }, [cadernoQuestoes, filtros])
  
  const handleNodeClick = (nodeName: string, levelIndex: number, parentNames: string[]) => {
    const currentOption = ORGANIZAR_OPTIONS.find(o => o.id === organizarPor) || ORGANIZAR_OPTIONS[0];
    const levels = currentOption.levels;
    
    const newFiltros: Record<string, string> = {};
    for (let i = 0; i < levelIndex; i++) {
      newFiltros[levels[i]] = parentNames[i];
    }
    newFiltros[levels[levelIndex]] = nodeName;
    
    setFiltros(newFiltros);
    setCurrentQuestaoIndex(0);
    setTopTab('questoes');
  }"""
    text = text.replace("const [topTab, setTopTab] = useState<'questoes' | 'indice' | 'estatisticas' | 'gabarito' | 'configuracoes' | 'imprimir'>('indice')", state_injection)

# 2. Add UI for active filter inside Questões tab (right before the question counter)
filter_ui = """
        {/* Filtro Ativo */}
        {filtros && (
          <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-2 rounded-lg flex items-center justify-between text-xs mb-4">
            <span className="font-bold">
              Filtro ativo: {Object.values(filtros).join(' > ')} ({questoesExibidas.length} questões)
            </span>
            <button 
              onClick={() => { setFiltros(null); setCurrentQuestaoIndex(0); }}
              className="hover:underline font-bold"
            >
              Limpar filtro
            </button>
          </div>
        )}
"""
if "{/* Filtro Ativo */}" not in text:
    text = text.replace("{/* Controles Superiores da Questão */}", filter_ui + "\n        {/* Controles Superiores da Questão */}")

# 3. Add onClick to tree nodes
# node1
node1_div = """<div className="flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded group cursor-pointer">"""
node1_repl = """<div 
                      className="flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded group cursor-pointer"
                      onClick={() => handleNodeClick(node1.name, 0, [])}
                    >"""
text = text.replace(node1_div, node1_repl)

# node2
node2_div = """<div key={node2.name} className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded cursor-pointer group">"""
node2_repl = """<div 
                            key={node2.name} 
                            className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNodeClick(node2.name, 1, [node1.name]);
                            }}
                          >"""
text = text.replace(node2_div, node2_repl)

# 4. Replace cadernoQuestoes[currentQuestaoIndex] with questoesExibidas[currentQuestaoIndex] IN THE RENDER PART OF QUESTOES TAB
# We should only replace inside the "Questões" tab.
# Let's do a global replace of "cadernoQuestoes[currentQuestaoIndex]" to "questoesExibidas[currentQuestaoIndex]" 
# and "cadernoQuestoes.length" to "questoesExibidas.length" EXCEPT in `importFile` or similar functions.
# Actually, currentQuestaoIndex is only used in render.
text = text.replace("cadernoQuestoes[currentQuestaoIndex]", "questoesExibidas[currentQuestaoIndex]")
# For length, there's `currentQuestaoIndex === cadernoQuestoes.length - 1` and `Math.random() * cadernoQuestoes.length`
text = text.replace("cadernoQuestoes.length - 1", "questoesExibidas.length - 1")
text = text.replace("Math.random() * cadernoQuestoes.length", "Math.random() * questoesExibidas.length")

# 5. Fix possible empty questoesExibidas array crash
if "if (questoesExibidas.length === 0)" not in text:
    empty_state = """
        {questoesExibidas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <FileQuestion className="w-16 h-16 text-muted-foreground/30" />
            <h3 className="text-xl font-bold text-foreground">Nenhuma questão encontrada</h3>
            <p className="text-muted-foreground max-w-md">
              O filtro atual não retornou nenhuma questão.
            </p>
            <button 
              onClick={() => { setFiltros(null); setCurrentQuestaoIndex(0); }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <>
        {/* Controles Superiores da Questão */}
"""
    # Find where topTab === 'questoes' rendering starts
    # `        {/* Controles Superiores da Questão */}`
    text = text.replace("{/* Controles Superiores da Questão */}", empty_state)
    # Then we need to close the <> at the end of the questao block, which is before `{/* Fim do Conteúdo Principal */}`
    text = text.replace("{/* Fim do Conteúdo Principal */}", "</>\n        )} {/* Fim do Conteúdo Principal */}")

with open('src/pages/Questoes.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Applied filtering logic to Questoes.tsx")
