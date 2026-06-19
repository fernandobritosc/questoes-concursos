import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  LayoutDashboard, 
  ClipboardList, 
  BookOpen, 
  Database, 
  Command, 
  ChevronRight 
} from 'lucide-react'

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 1. Escutar atalho global Ctrl+K ou Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        setQuery('')
        setSelectedIndex(0)
      }
    };
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 2. Focar input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden' // trava rolagem do fundo
    } else {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // 3. Fechar paleta
  const closePalette = () => {
    setIsOpen(false)
    setQuery('')
  }

  // 4. Lista Estática de Comandos base de Navegação
  const baseCommands = useMemo(() => [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Visão geral do seu progresso, tempo de estudo e métricas',
      icon: LayoutDashboard,
      category: 'Navegação',
      action: () => {
        navigate('/app/dashboard')
        closePalette()
      }
    },
    {
      id: 'nav-edital',
      title: 'Edital Verticalizado',
      subtitle: 'Catalogação e sequenciamento de tópicos do edital de concurso',
      icon: ClipboardList,
      category: 'Navegação',
      action: () => {
        navigate('/app/edital')
        closePalette()
      }
    },
    {
      id: 'nav-revisao',
      title: 'Caderno de Erros',
      subtitle: 'Revise e pratique novamente as questões que você errou',
      icon: BookOpen,
      category: 'Navegação',
      action: () => {
        navigate('/app/revisao')
        closePalette()
      }
    },
    {
      id: 'nav-questoes',
      title: 'Banco de Questões',
      subtitle: 'Busque, resolva e comente questões importadas de PDFs',
      icon: Database,
      category: 'Navegação',
      action: () => {
        navigate('/app/questoes')
        closePalette()
      }
    },
  ], [navigate])

  // 5. Filtrar e Computar Comandos Dinâmicos com base na busca do aluno
  const filteredCommands = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()
    
    // Lista de retorno
    let list = [...baseCommands]

    // Se houver busca geral, filtra a lista base de navegação
    if (cleanQuery !== '') {
      list = list.filter(cmd => 
        cmd.title.toLowerCase().includes(cleanQuery) || 
        cmd.subtitle.toLowerCase().includes(cleanQuery)
      )
    }

    // Lógica para detectar ID de Questão (Ex: 123456 ou Q123456)
    const numericMatch = query.trim().match(/^q?(\d+)$/i)
    if (numericMatch) {
      const qId = numericMatch[1]
      list.unshift({
        id: 'action-search-qid',
        title: `Ir para a Questão Q${qId}`,
        subtitle: `Abre diretamente a questão Q${qId} no Banco de Questões`,
        icon: Database,
        category: 'Busca',
        action: () => {
          navigate(`/app/questoes?id=${qId}`)
          closePalette()
        }
      })
    }



    return list
  }, [query, baseCommands, navigate])

  // Resetar índice selecionado quando a lista filtrada muda
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0)
  }, [filteredCommands])

  // 6. Controle de Teclado no Modal (Setas, Enter e Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closePalette()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      scrollIntoView(selectedIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      scrollIntoView(selectedIndex - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
      }
    }
  }

  // Scroll automático para item fora da viewport do modal
  const scrollIntoView = (index: number) => {
    if (!listRef.current) return
    const container = listRef.current
    const items = container.querySelectorAll('.command-item')
    const target = items[index] as HTMLElement

    if (target) {
      const containerTop = container.scrollTop
      const containerBottom = containerTop + container.clientHeight
      const elemTop = target.offsetTop
      const elemBottom = elemTop + target.clientHeight

      if (elemTop < containerTop) {
        container.scrollTop = elemTop
      } else if (elemBottom > containerBottom) {
        container.scrollTop = elemBottom - container.clientHeight
      }
    }
  }

  if (!isOpen) return null

  // Agrupamento por categorias para renderização organizada
  const categories = ['Busca', 'Navegação'].filter(cat => 
    filteredCommands.some(cmd => cmd.category === cat)
  )

  let globalIndex = 0

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closePalette}
    >
      <div 
        className="max-w-lg w-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // impede fechar ao clicar no modal
      >
        {/* Barra de Pesquisa */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Digite para pesquisar, busque ID de questão (ex: 123456) ou pergunte ao Mentor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <div className="flex items-center gap-1 bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded text-[10px] text-muted-foreground font-black uppercase tracking-wider shrink-0 select-none">
            ESC
          </div>
        </div>

        {/* Lista de Resultados */}
        <div 
          ref={listRef}
          className="max-h-[320px] overflow-y-auto p-2 scrollbar-thin select-none"
        >
          {filteredCommands.length > 0 ? (
            categories.map((category) => {
              const categoryCommands = filteredCommands.filter(cmd => cmd.category === category)
              return (
                <div key={category} className="mb-2 last:mb-0">
                  <div className="px-3 py-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em] select-none">
                    {category}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {categoryCommands.map((cmd) => {
                      const itemIdx = globalIndex++
                      const isSelected = selectedIndex === itemIdx
                      const Icon = cmd.icon

                      return (
                        <div
                          key={cmd.id}
                          onClick={cmd.action}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={`command-item flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                            isSelected 
                              ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg' 
                              : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${
                              isSelected ? 'bg-white/15 text-white' : 'bg-white/[0.04] border border-white/[0.05] text-muted-foreground'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                {cmd.title}
                              </p>
                              {cmd.subtitle && (
                                <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-muted-foreground/80'}`}>
                                  {cmd.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 opacity-0 transition-opacity ${
                            isSelected ? 'opacity-100 text-white' : 'group-hover:opacity-100 text-muted-foreground/60'
                          }`} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-muted-foreground">
              <Command className="w-8 h-8 mb-2 text-muted-foreground/30 animate-pulse" />
              <p className="text-xs font-bold">Nenhum resultado encontrado</p>
              <p className="text-[10px] opacity-60 mt-0.5 max-w-[280px]">Tente outra busca ou use atalhos numéricos de ID.</p>
            </div>
          )}
        </div>

        {/* Rodapé explicativo */}
        <div className="px-4 py-2 bg-white/[0.01] border-t border-white/[0.06] flex items-center justify-between text-[10px] text-muted-foreground/60 font-bold select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="bg-white/[0.05] border border-white/10 px-1.5 py-0.5 rounded font-mono text-[9px] text-muted-foreground">↑↓</span> Navegar</span>
            <span className="flex items-center gap-1"><span className="bg-white/[0.05] border border-white/10 px-1.5 py-0.5 rounded font-mono text-[9px] text-muted-foreground">↵</span> Executar</span>
          </div>
          <span className="flex items-center gap-1">Paleta de Comandos <Command className="w-3 h-3" /></span>
        </div>
      </div>
    </div>
  )
}
