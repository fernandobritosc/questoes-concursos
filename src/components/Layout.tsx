import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  BookOpen, 
  BrainCircuit, 
  Database, 
  ClipboardList, 
  Timer, 
  Map, 
  Target,
  Menu, 
  X,
  LogOut,
  Sun,
  Moon
} from 'lucide-react'
import { CommandPalette } from './CommandPalette'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'


export function Layout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('app-theme')
    return (saved as 'dark' | 'light') || 'dark'
  })

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('app-theme', nextTheme)
  }

  const navItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Editais', path: '/app/edital', icon: ClipboardList },
    { name: 'Simulados IA', path: '/app/simulados', icon: Timer },
    { name: 'Mapa de Questões', path: '/app/mapa', icon: Map },
    { name: 'Caderno de Erros', path: '/app/revisao', icon: BookOpen },
    { name: 'Banco de Questões', path: '/app/questoes', icon: Database },
    { name: 'Metas de Estudo', path: '/app/metas', icon: Target },
  ]

  const { session } = useAuth()
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }


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
              : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-white/[0.04]'
          }`}
        >
          <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : ''}`} />
          {item.name}
        </Link>
      )
    })
  )

  return (
    <div className="flex flex-col h-screen w-full bg-background print:h-auto print:block print:bg-white overflow-hidden">
      
      {/* 📱 TOP BAR MOBILE (< md) */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md z-40 sticky top-0 print:hidden shrink-0">
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
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
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
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/[0.04] transition-all text-xs font-semibold cursor-pointer mb-2 animate-in fade-in"
              >
                {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-violet-500" />}
                {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
              </button>
              {session && (
                <button
                  onClick={() => {
                    handleLogout()
                    closeMobileMenu()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-xs font-semibold cursor-pointer mb-2"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  Sair da Conta
                </button>
              )}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />
              <div className="px-4 py-3 rounded-xl bg-violet-500/5 dark:bg-violet-500/[0.07] border border-violet-500/10">
                <p className="text-xs text-violet-600 dark:text-violet-300 font-medium">Web Platform</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">v1.0.0 (Mobile)</p>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* 🔗 BOTTOM NAV (Desktop >= md) — substitui a sidebar lateral */}
      <nav className="hidden md:flex h-14 border-t border-border bg-card/80 backdrop-blur-sm items-center justify-center gap-1 px-4 print:hidden shrink-0">
        <Link to="/" className="flex items-center gap-2 mr-6 pr-6 border-r border-border/50">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-foreground">Questões Concursos</span>
        </Link>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-violet-600/90 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{item.name}</span>
            </Link>
          )
        })}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-white/[0.04] transition-all cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-violet-500" />}
            <span className="hidden lg:inline">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
          </button>
          {session && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Sair</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 flex flex-col print:p-0 print:overflow-visible print:h-auto print:block">
        <Outlet />
      </main>

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  )
}

