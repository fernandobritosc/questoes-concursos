import { Link } from 'react-router-dom'

export function Landing() {
  return (
    <div className="force-dark min-h-screen bg-gray-950 text-slate-50 font-sans selection:bg-violet-500/30">
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <span className="text-lg font-bold text-white">Q</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">Questões Concursos</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/app/dashboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link
              to="/app/dashboard"
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:bg-violet-500 hover:shadow-violet-500/40"
            >
              Testar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION (Dark SaaS + PAS) ─── */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 pt-24 text-center">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/10 via-gray-950 to-gray-950" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
        
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-300 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
            Acesso antecipado liberado
          </div>
          
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-white md:text-7xl lg:leading-[1.1]">
            Pare de perder tempo com PDFs.<br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
              Comece a ser aprovado.
            </span>
          </h1>
          
          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-400 leading-relaxed md:text-xl">
            A plataforma definitiva para quem estuda em alto nível. Analise seus erros com Inteligência Artificial, crie cadernos inteligentes e direcione seu foco para o que realmente cai na prova.
          </p>
          
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center w-full max-w-md mx-auto">
            <Link
              to="/app/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-violet-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-violet-600/20 transition-all hover:bg-violet-500 hover:scale-105 active:scale-95"
            >
              Começar a usar gratuitamente
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500 font-medium">Não é necessário cartão de crédito.</p>
        </div>
      </section>

      {/* ─── FEATURES SECTION (Alternating) ─── */}
      <section className="relative py-24 sm:py-32 bg-gray-950 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className="text-base font-semibold leading-7 text-violet-400">Por que escolher o Questões Concursos?</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Tudo o que você precisa para chegar no topo.
            </p>
          </div>

          <div className="mt-16 flex flex-col gap-24">
            
            {/* Feature 1 */}
            <div className="flex flex-col gap-12 lg:flex-row items-center">
              <div className="flex-1 space-y-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 border border-gray-800 shadow-inner">
                  <svg className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09l2.846.813-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-white">Inteligência Artificial a seu favor.</h3>
                <p className="text-lg text-gray-400 leading-relaxed">
                  Não fique preso em dúvidas. A nossa IA age como um professor particular, fornecendo explicações detalhadas e instantâneas para cada questão que você erra ou tem dificuldade.
                </p>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-2xl blur-2xl"></div>
                <div className="relative rounded-2xl border border-gray-800 bg-gray-900/50 p-8 shadow-2xl backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="h-4 w-1/3 rounded bg-gray-800"></div>
                    <div className="h-4 w-full rounded bg-gray-800"></div>
                    <div className="h-4 w-2/3 rounded bg-gray-800"></div>
                    <div className="mt-8 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                      <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-violet-600/20 flex items-center justify-center">
                          <span className="text-violet-400 text-xs">IA</span>
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="h-3 w-1/4 rounded bg-violet-400/20"></div>
                          <div className="h-3 w-full rounded bg-gray-800"></div>
                          <div className="h-3 w-5/6 rounded bg-gray-800"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 (Reversed) */}
            <div className="flex flex-col gap-12 lg:flex-row-reverse items-center">
              <div className="flex-1 space-y-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 border border-gray-800 shadow-inner">
                  <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-white">Caderno de Erros Inteligente.</h3>
                <p className="text-lg text-gray-400 leading-relaxed">
                  Não basta apenas resolver, é preciso entender. Nosso sistema categoriza automaticamente seus erros para você focar apenas naquilo que precisa de revisão cirúrgica, otimizando seu tempo de estudo.
                </p>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-gradient-to-tl from-indigo-500/10 to-transparent rounded-2xl blur-2xl"></div>
                <div className="relative rounded-2xl border border-gray-800 bg-gray-900/50 p-8 shadow-2xl backdrop-blur-sm">
                   <div className="grid grid-cols-2 gap-4">
                     {[1, 2, 3, 4].map(i => (
                       <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
                         <div className="flex items-center justify-between mb-4">
                           <div className="h-2 w-8 rounded-full bg-red-500/50"></div>
                           <span className="text-xs text-gray-500">Erro</span>
                         </div>
                         <div className="h-3 w-full rounded bg-gray-800 mb-2"></div>
                         <div className="h-3 w-2/3 rounded bg-gray-800"></div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col gap-12 lg:flex-row items-center">
              <div className="flex-1 space-y-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 border border-gray-800 shadow-inner">
                  <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-white">Importação Mágica de PDFs.</h3>
                <p className="text-lg text-gray-400 leading-relaxed">
                  Chega de estudar por arquivos mortos. Suba seus PDFs de cursinhos e deixe nossa tecnologia extrair as questões e transformá-las em um banco interativo em segundos.
                </p>
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent rounded-2xl blur-2xl"></div>
                <div className="relative rounded-2xl border border-gray-800 bg-gray-900/50 p-8 shadow-2xl backdrop-blur-sm flex items-center justify-center flex-col gap-4 border-dashed border-2">
                  <svg className="h-12 w-12 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-400">Arraste seu PDF de questões aqui</p>
                  <button className="rounded-lg bg-gray-800 px-4 py-2 text-xs text-white">Procurar Arquivo</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative py-24 bg-violet-950/20 border-t border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">
            Pronto para transformar sua forma de estudar?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-violet-200/70 mb-10">
            Junte-se aos estudantes que já estão usando a tecnologia a favor da aprovação. É de graça para começar.
          </p>
          <Link
            to="/app/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-gray-900 shadow-xl shadow-white/10 transition-all hover:bg-gray-100 hover:scale-105 active:scale-95"
          >
            Acessar a Plataforma Agora
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 bg-gray-950 py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600">
              <span className="text-xs font-bold text-white">Q</span>
            </div>
            <span className="text-sm font-semibold text-gray-300">Questões Concursos</span>
          </div>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Questões Concursos. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
