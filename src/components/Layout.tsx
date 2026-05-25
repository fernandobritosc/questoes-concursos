import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, BrainCircuit, Database, ClipboardList } from 'lucide-react'
import { CommandPalette } from './CommandPalette'

export function Layout() {
  const location = useLocation()

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Edital Verticalizado', path: '/app/edital', icon: ClipboardList },
    { name: 'Caderno de Erros', path: '/app/revisao', icon: BookOpen },
    { name: 'Banco de Questões', path: '/app/questoes', icon: Database },
    { name: 'Mentor IA', path: '/app/mentor', icon: BrainCircuit },
  ]

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-card/80 backdrop-blur-sm flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 transition-shadow duration-300 group-hover:shadow-violet-500/40">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">Questões</span>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.15em] -mt-0.5">Concursos</p>
            </div>
          </Link>
        </div>

        {/* Divider gradient */}
        <div className="mx-6 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <nav className="mt-4 px-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            const Icon = item.icon
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                  isActive 
                    ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white font-semibold shadow-lg shadow-violet-500/20 nav-glow' 
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : ''}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-4">
          <div className="mx-2 h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
          <div className="px-4 py-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/10">
            <p className="text-xs text-violet-300 font-medium">Web Platform</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-5 flex flex-col">
        <Outlet />
      </main>

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  )
}
