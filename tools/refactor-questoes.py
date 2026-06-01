import re

with open('src/pages/Questoes.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add useState if needed
for i, line in enumerate(lines):
    if "import { LoadingSpinner" in line:
        # Check if useState is already imported somewhere
        if not any('useState' in l for l in lines[:i]):
            lines.insert(i, "import { useState } from 'react'\n")
        break

# 2. Add Settings and Printer to lucide-react imports
for i, line in enumerate(lines):
    if "import {" in line and "lucide-react" in "".join(lines[i:i+30]):
        # Add Settings and Printer if not present
        lucide_block = "".join(lines[i:i+30])
        if "Settings," not in lucide_block:
            for j in range(i, i+30):
                if "AlertTriangle" in lines[j]:
                    lines.insert(j+1, "  Settings,\n  Printer,\n  List,\n")
                    break
        break

# 3. Add topTab state
for i, line in enumerate(lines):
    if "const {" in line:
        pass
    if "return (" in line and "div className" in lines[i+1]:
        return_index = i
        lines.insert(i, "  const [topTab, setTopTab] = useState<'questoes' | 'indice' | 'estatisticas' | 'gabarito'>('questoes')\n\n")
        break

# We need to re-read because we modified the lines array length
lines_str = "".join(lines)

# Find the start of the return block
return_match = re.search(r'return \(\s*<div className="space-y-6 animate-in fade-in duration-300">', lines_str)
if not return_match:
    print("Could not find return block")
    exit(1)
start_idx = return_match.start()

# Find the end of the isCadernoActive block, which is right before {/* Modal de Importação...
modal_match = re.search(r'\{\/\*\s*Modal de Importa.*?o de PDF do TEC Concursos\s*\*\/\}', lines_str)
if not modal_match:
    print("Could not find modal block")
    exit(1)
end_idx = modal_match.start()

# Extract the Resolvendo view
resolvendo_match = re.search(r'\{\/\* Card Central do Visualizador \*\/\}\s*(<div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">.*?)(\s*</div>\s*</div>\s*</div>\s*\)\s*\}\s*</>|\s*</div>\s*</div>\s*\{\/\* Modal)', lines_str[start_idx:end_idx], re.DOTALL)

if not resolvendo_match:
    print("Could not find Resolvendo view")
    # Save the block to debug
    with open('debug_block.txt', 'w', encoding='utf-8') as f:
        f.write(lines_str[start_idx:end_idx])
    exit(1)

resolvendo_view = resolvendo_match.group(1)

# Ensure the resolvendo view is closed properly
# It should end with the closing div of the main card
# Let's count divs to be safe, but a simple fix is to just make sure we capture it correctly.
# Actually, the Resolvendo block inside Questoes.tsx ends with </div> and then some other buttons like Limpar.
# We will just copy the whole <div className="space-y-6 max-w-4xl mx-auto pb-12"> block

resolvendo_container_match = re.search(r'(<div className="space-y-6 max-w-4xl mx-auto pb-12">.*?(?=</div>\s*</div>\s*\{\/\* Modal))', lines_str[start_idx:end_idx], re.DOTALL)
if resolvendo_container_match:
    resolvendo_view = resolvendo_container_match.group(1) + "</div>\n"
else:
    resolvendo_container_match = re.search(r'(<div className="space-y-6 max-w-4xl mx-auto pb-12">.*?(?=\s*</>\s*\)\s*:\s*\())', lines_str[start_idx:end_idx], re.DOTALL)
    if resolvendo_container_match:
         resolvendo_view = resolvendo_container_match.group(1) + "\n"

# I will write my own simpler Resolvendo container extraction if regex is tricky
# The original code has:
# <div className="space-y-6 max-w-4xl mx-auto pb-12">
#   {/* Card Central */}
#   <div...> ... </div>
#   {/* Botões extras */}
# </div>
# We can just extract it manually.

new_ui = """return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-muted/20 animate-in fade-in duration-300 overflow-hidden">
      
      {/* Top Tabs Header Estilo TEC */}
      <div className="bg-card border-b border-border px-4 flex items-center justify-start text-xs sm:text-sm font-bold text-muted-foreground select-none overflow-x-auto shrink-0 shadow-xxs">
        <button
          onClick={() => setTopTab('questoes')}
          className={`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${topTab === 'questoes' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}`}
        >
          <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Questões
        </button>
        <button
          onClick={() => setTopTab('indice')}
          className={`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${topTab === 'indice' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}`}
        >
          <List className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Índice
        </button>
        <button className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground opacity-40 cursor-not-allowed transition-colors whitespace-nowrap">
          <PieChart className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Estatísticas
        </button>
        <button className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground opacity-40 cursor-not-allowed transition-colors whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Gabarito
        </button>
        <button className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground opacity-40 cursor-not-allowed transition-colors whitespace-nowrap hidden sm:flex">
          <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Configurações
        </button>
        <button className="py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 border-transparent hover:text-foreground opacity-40 cursor-not-allowed transition-colors whitespace-nowrap hidden sm:flex">
          <Printer className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Imprimir
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        
        {topTab === 'questoes' && (
          <div className="w-full max-w-5xl mx-auto">
            {cadernoQuestoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-xl shadow-sm">
                <Layers className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-bold text-foreground mb-2">Nenhuma questão disponível</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Importe um PDF do TEC Concursos ou ajuste seus filtros (quando disponíveis) para ver questões.
                </p>
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="mt-6 flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-sm font-bold transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Importar PDF do TEC
                </button>
              </div>
            ) : (
""" + resolvendo_view + """
            )}
          </div>
        )}

        {topTab === 'indice' && (
          <div className="w-full max-w-5xl mx-auto bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Organizar por: <strong className="text-primary cursor-pointer">Matéria e Assunto</strong></span>
                <span className="hidden sm:inline">|</span>
                <span className="hidden sm:inline">Ordenar questões por: <strong className="text-primary cursor-pointer">Data</strong></span>
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
              {(() => {
                // Group by Materia -> Assunto
                const grouped: Record<string, { count: number, assuntos: Record<string, number> }> = {}
                cadernoQuestoes.forEach(q => {
                  const mat = q.materia || 'Sem Matéria'
                  const ass = q.assunto || 'Sem Assunto'
                  if (!grouped[mat]) grouped[mat] = { count: 0, assuntos: {} }
                  grouped[mat].count++
                  if (!grouped[mat].assuntos[ass]) grouped[mat].assuntos[ass] = 0
                  grouped[mat].assuntos[ass]++
                })
                
                return Object.entries(grouped).sort((a,b) => a[0].localeCompare(b[0])).map(([materia, data]) => (
                  <div key={materia} className="text-sm">
                    <div className="flex items-center justify-between py-2 px-2 hover:bg-muted/30 rounded group cursor-pointer">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        {materia}
                      </div>
                      <span className="text-muted-foreground font-mono text-xs">{data.count}</span>
                    </div>
                    
                    <div className="pl-6 space-y-1 border-l border-border/50 ml-4 my-1">
                      {Object.entries(data.assuntos).sort((a,b) => a[0].localeCompare(b[0])).map(([assunto, count]) => (
                        <div key={assunto} className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/30 rounded group cursor-pointer">
                          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                            <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                            {assunto}
                          </div>
                          <span className="text-muted-foreground font-mono text-xs">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              })()}
              
              {cadernoQuestoes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm italic">
                  Nenhuma questão no caderno para exibir o índice.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

"""

final_code = lines_str[:start_idx] + new_ui + lines_str[end_idx:]

with open('src/pages/Questoes.tsx', 'w', encoding='utf-8') as f:
    f.write(final_code)

print("Done replacing.")
