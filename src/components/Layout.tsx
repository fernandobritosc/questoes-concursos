import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BookOpen, 
  BrainCircuit, 
  Database, 
  ClipboardList, 
  Timer, 
  Map, 
  Menu, 
  X 
} from 'lucide-react'
import { CommandPalette } from './CommandPalette'

export function Layout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Edital Verticalizado', path: '/app/edital', icon: ClipboardList },
    { name: 'Simulados IA', path: '/app/simulados', icon: Timer },
    { name: 'Mapa de Questões', path: '/app/mapa', icon: Map },
    { name: 'Caderno de Erros', path: '/app/revisao', icon: BookOpen },
    { name: 'Banco de Questões', path: '/app/questoes', icon: Database },
    { name: 'Mentor IA', path: '/app/mentor', icon: BrainCircuit },
  ]

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const renderNavLinks = () => (
    navItems.map((item) => {
      const isActive = location.pathname.startsWith(item.path)
      const Icon = item.icon
      
      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={closeMobileMenu}
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
    })
  )

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background print:h-auto print:block print:bg-white overflow-hidden">
      
      {/* 📱 TOP BAR MOBILE (< md) */}
      <header className="flex md:hidden items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-md z-40 sticky top-0 print:hidden shrink-0">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/25">
            <BrainCircuit className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-foreground">Questões</span>
            <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-[0.15em] -mt-1">Concursos</p>
          </div>
        </Link>

        <button
          onClick={toggleMobileMenu}
          className="p-2 rounded-lg border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer transition-colors"
          title="Abrir Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* 📱 DRAWER OVERLAY & BACKGROUND (Mobile) */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop Blur escurecido */}
          <div 
            onClick={closeMobileMenu}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          />
          
          {/* Sidebar Drawer Deslizante */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-card/95 border-r border-border z-50 flex flex-col p-4 md:hidden animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-6 pt-2">
              <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg">
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-base font-bold text-foreground">Questões</span>
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider -mt-0.5">Concursos</p>
                </div>
              </Link>
              <button 
                onClick={closeMobileMenu}
                className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />

            <nav className="space-y-1 flex-1 overflow-y-auto">
              {renderNavLinks()}
            </nav>

            <div className="pt-4 mt-auto">
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
              <div className="px-4 py-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/10">
                <p className="text-xs text-violet-300 font-medium">Web Platform</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">v1.0.0 (Mobile)</p>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* 💻 SIDEBAR FIXA (Desktop >= md) */}
      <aside className="hidden md:flex w-56 border-r border-border bg-card/80 backdrop-blur-sm flex-col print:hidden shrink-0">
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

        <nav className="mt-4 px-4 space-y-1 flex-1 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        {/* Bottom section */}
        <div className="p-4 mt-auto">
          <div className="mx-2 h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
          <div className="px-4 py-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/10">
            <p className="text-xs text-violet-300 font-medium">Web Platform</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 flex flex-col print:p-0 print:overflow-visible print:h-auto print:block">
        <Outlet />
      </main>

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  )
}

