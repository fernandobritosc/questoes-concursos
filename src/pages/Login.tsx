import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { GraduationCap, Mail, Lock, ShieldAlert, Sparkles, Check } from 'lucide-react'

export function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password
        })
        if (signUpError) throw signUpError
        setSuccess('Cadastro realizado! Se necessário, verifique seu e-mail para confirmação.')
        setIsSignUp(false)
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (signInError) throw signInError
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-950 via-zinc-900 to-black px-4 relative overflow-hidden">
      {/* Luzes de fundo decorativas */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

      {/* Card Principal Glassmorphic */}
      <div className="w-full max-w-md p-8 rounded-2xl border border-border/40 bg-zinc-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        {/* Barra superior de gradiente */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-violet-500 to-indigo-600" />

        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 rounded-2xl bg-primary/15 border border-primary/20 text-primary mb-4 shadow-md shadow-primary/5">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-1.5">
            Questões Concursos <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Plataforma de alta fidelidade e mentor inteligente.
          </p>
        </div>

        {/* Abas Alternadoras */}
        <div className="grid grid-cols-2 bg-black/40 p-1.5 rounded-lg mb-6 border border-border/20 text-xs font-bold">
          <button
            onClick={() => {
              setIsSignUp(false)
              setError(null)
              setSuccess(null)
            }}
            className={`py-2 rounded-md transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => {
              setIsSignUp(true)
              setError(null)
              setSuccess(null)
            }}
            className={`py-2 rounded-md transition-all cursor-pointer ${
              isSignUp
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {/* Mensagens de Feedback */}
        {error && (
          <div className="mb-5 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xxs font-bold flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xxs font-bold flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
              E-mail
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@email.com"
                className="w-full bg-black/35 border border-border/60 hover:border-primary/50 focus:border-primary rounded-lg pl-10 pr-4 py-2.5 text-xs text-foreground font-semibold placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/20 shadow-xxs transition-all"
              />
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
              Senha
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/35 border border-border/60 hover:border-primary/50 focus:border-primary rounded-lg pl-10 pr-4 py-2.5 text-xs text-foreground font-semibold placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/20 shadow-xxs transition-all"
              />
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full mt-6 py-2.5 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-xs font-black shadow-md cursor-pointer uppercase tracking-wider transition-all"
          >
            {isSignUp ? 'Cadastrar' : 'Entrar'}
          </Button>
        </form>

        <p className="text-[10px] text-muted-foreground text-center mt-6">
          Ao prosseguir, você concorda com nossos Termos de Uso e Políticas.
        </p>

      </div>
    </div>
  )
}
