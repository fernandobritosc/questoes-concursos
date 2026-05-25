import re

with open('src/pages/Questoes.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace Organizar Dropdown
old_organizar = r"""<div className="relative inline-block">\s*<span>Organizar por: <strong.*?</>.*?</div>"""
new_organizar = """<div className="relative inline-block">
                  <span className="flex items-center gap-1">Organizar por: 
                    <select 
                      className="text-primary font-bold bg-transparent outline-none cursor-pointer border-b border-dashed border-primary/50 pb-0.5 hover:border-primary"
                      value={organizarPor}
                      onChange={(e) => setOrganizarPor(e.target.value)}
                    >
                      {ORGANIZAR_OPTIONS.map(opt => <option key={opt.id} value={opt.id} className="text-foreground">{opt.label}</option>)}
                    </select>
                  </span>
                </div>"""
text = re.sub(old_organizar, new_organizar, text, flags=re.DOTALL)

# Replace Exibir Dropdown
old_exibir = r"""<div className="relative inline-block hidden sm:inline">\s*<span>Exibir questões por: <strong.*?</>.*?</div>"""
new_exibir = """<div className="relative inline-block hidden sm:inline">
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
                </div>"""
text = re.sub(old_exibir, new_exibir, text, flags=re.DOTALL)

with open('src/pages/Questoes.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Dropdowns replaced with native select tags.")
