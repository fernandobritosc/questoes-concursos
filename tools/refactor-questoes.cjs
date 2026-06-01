const fs = require('fs');

const fileContent = fs.readFileSync('src/pages/Questoes.tsx', 'utf-8');

// 1. Add topTab to state
let updatedContent = fileContent.replace(
  /const \[activeTab, setActiveTab\] = useState<FilterTab>\('materia'\)/,
  `const [activeTab, setActiveTab] = useState<FilterTab>('materia')
  const [topTab, setTopTab] = useState<'questoes' | 'indice' | 'estatisticas' | 'gabarito'>('questoes')`
);

// Add missing icon imports
updatedContent = updatedContent.replace(
  /AlertTriangle,/,
  `AlertTriangle,
  Settings,
  Printer,
  List,`
);

// 2. Extract the resolvendo block
// Find the exact return statement start
const returnStartStr = 'return (\n    <div className="space-y-6 animate-in fade-in duration-300">';
const returnStartIdx = updatedContent.indexOf(returnStartStr);

if (returnStartIdx === -1) {
    console.error('Could not find returnStartIdx');
    process.exit(1);
}

// Find Modal de Importação (end of main view)
const modalStartStr = '{/* Modal de Importação de PDF do TEC Concursos */}';
const modalStartIdx = updatedContent.indexOf(modalStartStr);

if (modalStartIdx === -1) {
    console.error('Could not find modalStartIdx');
    process.exit(1);
}

const beforeReturn = updatedContent.substring(0, returnStartIdx);
const afterModal = updatedContent.substring(modalStartIdx);

// Now grab the Resolvendo view inside the return block
// It starts with /* ================= CADERNO DE QUESTÕES
const cadernoStartStr = '/* ================= CADERNO DE QUESTÕES (SLIDER VISUALIZADOR DE ALTA FIDELIDADE TEC) ================= */';
const cadernoStartIdx = updatedContent.indexOf(cadernoStartStr);

// It ends exactly at `)}` before modalStartStr
const endOfReturnBlockIdx = updatedContent.lastIndexOf(')}', modalStartIdx) + 2;

const resolvendoViewBlock = updatedContent.substring(cadernoStartIdx + cadernoStartStr.length, endOfReturnBlockIdx);
// Note: we need to strip out the closing `)}` from resolvendoViewBlock because we are no longer inside the ternary.
const resolvendoViewClean = resolvendoViewBlock.replace(/}\)\s*}$/, '').replace(/}\)\s*$/, '').trim();

// Because the original ended with:
//         </div>
//       )}
// Let's just find the last </div> in resolvendoViewBlock
const lastDivIdx = resolvendoViewBlock.lastIndexOf('</div>');
const resolvendoViewContent = resolvendoViewBlock.substring(0, lastDivIdx + 6).trim();

const newUi = `return (
    <div className="h-[calc(100vh-60px)] flex flex-col bg-muted/20 animate-in fade-in duration-300 overflow-hidden">
      
      {/* Top Tabs Header Estilo TEC */}
      <div className="bg-card border-b border-border px-4 flex items-center justify-start text-xs sm:text-sm font-bold text-muted-foreground select-none overflow-x-auto shrink-0 shadow-xxs">
        <button
          onClick={() => setTopTab('questoes')}
          className={\`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap \${topTab === 'questoes' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}\`}
        >
          <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> Questões
        </button>
        <button
          onClick={() => setTopTab('indice')}
          className={\`py-3.5 px-4 sm:px-6 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap \${topTab === 'indice' ? 'border-primary text-primary bg-primary/5' : 'border-transparent hover:text-foreground hover:bg-muted/50'}\`}
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
                  Importe um PDF do TEC Concursos para ver questões.
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
              ${resolvendoViewContent}
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
      
`;

const finalContent = beforeReturn + newUi + '      ' + afterModal;

fs.writeFileSync('src/pages/Questoes.tsx', finalContent);
console.log('Successfully refactored Questoes.tsx');
