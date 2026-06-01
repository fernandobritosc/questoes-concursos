import { useState } from 'react'
import { useMentor } from '../hooks/useMentor'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Button } from '../components/ui/Button'
import { BrainCircuit, Sparkles, Calendar, ChevronRight, GraduationCap, Printer, Cpu, Copy, Check, Info } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// Card Interativo e Premium para Google NotebookLM com ação de cópia integrada
function NotebookLMCard({ promptText }: { promptText: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-6 p-5 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/15 via-card to-card text-foreground shadow-md shadow-violet-500/5 relative overflow-hidden group print:hidden">
      <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-violet-500 to-indigo-600" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
            <Cpu className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Tutor de Estudo NotebookLM
            </h5>
            <p className="text-[10px] text-muted-foreground mt-0.5">Foco em recall ativo e simulações de bancas</p>
          </div>
        </div>
        <span className="text-[10px] bg-violet-500/10 text-violet-300 font-bold px-2 py-0.5 rounded-full border border-violet-500/25 w-fit">
          Google AI integration
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        Carregue suas fontes (leis secas, PDFs de cursos, anotações) no **Google NotebookLM** e cole o prompt abaixo no bate-papo para transformar as fontes em um tutor dinâmico deste assunto.
      </p>

      <div className="relative">
        <pre className="p-3 rounded-lg bg-black/40 text-[11px] font-mono overflow-y-auto max-h-[140px] text-zinc-300 leading-relaxed border border-border/30 pr-12 select-all">
          {promptText}
        </pre>
        <button
          onClick={handleCopy}
          className={`absolute top-2 right-2 p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
            copied
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700/80 text-zinc-300'
          }`}
          title="Copiar Prompt"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      
      {copied && (
        <span className="absolute bottom-4 right-5 text-[10px] text-emerald-400 font-semibold animate-fade-in flex items-center gap-1">
          <Check className="w-3 h-3" /> Prompt Copiado! Cole no NotebookLM.
        </span>
      )}
    </div>
  )
}

export function Mentor() {
  const {
    loading,
    fraquezas,
    plano,
    gerandoPlano,
    handleGerarPlano,
    selectedFraqueza,
    setSelectedFraqueza,
    planosAssuntos,
    gerandoMentoria,
    handleGerarMentoria,
    tarefasConcluidas,
    handleToggleTarefa,
    handleLimparPlano,
    dbSyncError
  } = useMentor()

  if (loading) return <LoadingSpinner />

  // Renderizadores customizados do ReactMarkdown para uma UI/UX premium e suporte a impressão
  const customRenderers = {
    p: ({ children, ...props }: any) => {
      // Reconhece se o texto contém "Pegadinha:" ou "Dica de Prova:"
      const textContent = Array.isArray(children)
        ? children.map(c => typeof c === 'string' ? c : '').join('')
        : typeof children === 'string' ? children : '';

      if (textContent.includes('Pegadinha:')) {
        return (
          <div className="my-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 text-foreground relative overflow-hidden group print:border-amber-500 print:bg-amber-500/5 print:text-zinc-900 print:shadow-none">
            <div className="absolute top-0 left-0 h-full w-1 bg-amber-500" />
            <div className="flex gap-3 items-start">
              <span className="text-lg shrink-0 mt-0.5 print:text-amber-600">⚠️</span>
              <div className="text-sm leading-relaxed whitespace-pre-wrap print:text-zinc-800">
                {children}
              </div>
            </div>
          </div>
        )
      }

      if (textContent.includes('Dica de Prova:')) {
        return (
          <div className="my-4 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10 text-foreground relative overflow-hidden group print:border-indigo-500 print:bg-indigo-500/5 print:text-zinc-900 print:shadow-none">
            <div className="absolute top-0 left-0 h-full w-1 bg-indigo-500" />
            <div className="flex gap-3 items-start">
              <span className="text-lg shrink-0 mt-0.5 print:text-indigo-600">💡</span>
              <div className="text-sm leading-relaxed whitespace-pre-wrap print:text-zinc-800">
                {children}
              </div>
            </div>
          </div>
        )
      }

      return <p className="text-sm text-muted-foreground leading-relaxed mb-4 print:text-zinc-700" {...props}>{children}</p>
    },
    h3: ({ children, ...props }: any) => (
      <h3 className="text-base font-bold text-foreground mt-6 mb-3 border-b border-border/40 pb-2 flex items-center gap-2 print:text-zinc-900 print:border-zinc-300" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }: any) => (
      <h4 className="text-sm font-bold text-foreground mt-4 mb-2 flex items-center gap-2 print:text-zinc-900" {...props}>
        {children}
      </h4>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc pl-5 space-y-2 mb-4 text-sm text-muted-foreground leading-relaxed print:text-zinc-700" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal pl-5 space-y-2 mb-4 text-sm text-muted-foreground leading-relaxed print:text-zinc-700" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="leading-relaxed" {...props}>
        {children}
      </li>
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      const content = String(children).replace(/\n$/, '')
      
      if (language === 'notebooklm') {
        return <NotebookLMCard promptText={content} />
      }
      
      return inline ? (
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground font-mono" {...props}>{children}</code>
      ) : (
        <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs text-foreground font-mono my-3 border border-border/40" {...props}>
          <code>{children}</code>
        </pre>
      )
    }
  }

  const activeMentoriaText = selectedFraqueza
    ? planosAssuntos[`${selectedFraqueza.materia} - ${selectedFraqueza.assunto}`]
    : null

  const showPrintButton = (selectedFraqueza === null && plano) || (selectedFraqueza !== null && activeMentoriaText)

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-12 print:space-y-0 print:pb-0 print:max-w-none">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Mentor IA</h1>
        <p className="text-muted-foreground mt-1">Seu treinador pessoal focado em eliminar suas fraquezas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:block">
        {/* Painel Lateral */}
        <div className="md:col-span-1 space-y-4 animate-in slide-in-from-left duration-300 print:hidden">
          {/* Card do Plano Geral Semanal */}
          <button
            onClick={() => setSelectedFraqueza(null)}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              selectedFraqueza === null
                ? 'border-primary/50 bg-primary/10 text-foreground ring-1 ring-primary/20 shadow-sm'
                : 'border-border/60 hover:border-primary/40 bg-card hover:bg-muted/10 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${selectedFraqueza === null ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm text-foreground">Plano Geral Semanal</h4>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">Cronograma de 7 dias baseado em erros</p>
              </div>
            </div>
          </button>

          {/* Lista de Fraquezas */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2 border-b border-border/40 pb-3">
              <BrainCircuit className="w-4.5 h-4.5 text-primary" />
              Fraquezas Mapeadas
            </h3>
            
            {fraquezas.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Selecione um ponto de atenção abaixo para acessar uma mentoria tática exclusiva:
                </p>
                <div className="space-y-2">
                  {fraquezas.slice(0, 5).map((f, i) => {
                    const isSelected = selectedFraqueza?.assunto === f.assunto && selectedFraqueza?.materia === f.materia
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedFraqueza(f)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-primary/60 bg-primary/5 text-foreground ring-1 ring-primary/25 shadow-sm'
                            : 'border-border/60 hover:border-primary/40 bg-card hover:bg-muted/10 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {f.assunto}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xxs text-muted-foreground truncate max-w-[120px]">{f.materia}</span>
                            <span className="text-xxs font-bold text-destructive">{f.taxa}% acerto</span>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-primary translate-x-0.5' : 'text-muted-foreground/40'}`} />
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Você não possui dados suficientes de erros repetidos para gerarmos um alerta de fraqueza no momento.
              </p>
            )}
          </div>
        </div>

        {/* Painel de Conteúdo Principal */}
        <div className="md:col-span-2 animate-in slide-in-from-right duration-300 print:w-full print:block print:p-0">
          <div className="bg-card border border-border rounded-xl shadow-sm min-h-[500px] flex flex-col overflow-hidden print:border-none print:shadow-none print:bg-transparent print:min-h-0">
            {/* Cabeçalho Dinâmico */}
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between print:border-b-2 print:border-zinc-300 print:px-0 print:pb-3 print:bg-transparent">
              <div>
                <h3 className="font-semibold text-foreground text-base print:text-2xl print:text-zinc-900 print:font-extrabold">
                  {selectedFraqueza ? `🎯 Mentoria: ${selectedFraqueza.assunto}` : '📅 Plano Geral Semanal'}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 print:text-sm print:text-zinc-600 print:mt-1">
                  {selectedFraqueza
                    ? `${selectedFraqueza.materia} • Taxa de acerto de ${selectedFraqueza.taxa}% (${selectedFraqueza.total} questões)`
                    : 'Visão integrada e cronograma semanal de estudos'}
                </p>
              </div>
              
              {/* Botão de Salvar PDF / Imprimir */}
              {showPrintButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  icon={<Printer className="w-4 h-4" />}
                  className="print:hidden cursor-pointer bg-card/50 hover:bg-muted border-border/80 transition-all text-xs font-semibold shadow-xs"
                >
                  Salvar PDF / Imprimir
                </Button>
              )}
            </div>
            
            {/* Conteúdo Principal */}
            <div className="p-6 flex-1 flex flex-col justify-start print:p-0 print:mt-6">
              {/* Modo: Plano Geral */}
              {selectedFraqueza === null && (
                <>
                  {!plano && !gerandoPlano && (
                    <div className="my-auto py-12 flex flex-col items-center justify-center text-center text-muted-foreground print:hidden">
                      <Sparkles className="w-12 h-12 mb-4 text-primary animate-pulse" />
                      <h4 className="font-bold text-foreground mb-1 text-base">Plano Geral de Estudos Semanal</h4>
                      <p className="text-sm max-w-md mx-auto leading-relaxed">
                        Analise suas {fraquezas.length} fraquezas de forma integrada e elabore um cronograma de 7 dias focado em alavancar seu desempenho geral.
                      </p>
                      <Button
                        onClick={handleGerarPlano}
                        loading={gerandoPlano}
                        icon={<Sparkles className="w-4 h-4" />}
                        className="mt-6 cursor-pointer"
                      >
                        Gerar Plano Tático Geral
                      </Button>
                    </div>
                  )}

                  {gerandoPlano && (
                    <div className="my-auto py-12 flex flex-col items-center justify-center text-center text-primary print:hidden">
                      <LoadingSpinner size="md" text="O Mentor IA está analisando seu histórico e estruturando seu plano semanal..." />
                    </div>
                  )}

                  {plano && !gerandoPlano && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {typeof plano === 'string' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 print:text-zinc-800">
                          <ReactMarkdown components={customRenderers}>
                            {plano}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="space-y-6 text-left">
                          {/* Banner de Sincronização de Banco (se houver erro/ausência de colunas) */}
                          {dbSyncError && (
                            <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-400 text-xs space-y-2.5 animate-scale-in print:hidden">
                              <div className="flex items-start gap-2.5">
                                <Info className="w-4 h-4 text-yellow-450 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <p className="font-extrabold text-foreground">Sincronização em Nuvem Desativada</p>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Seu plano semanal está sendo salvo localmente no <strong>localStorage</strong> do navegador. Para habilitar o salvamento persistente na nuvem (Supabase), execute o script SQL abaixo no <strong>SQL Editor</strong> do painel do seu Supabase:
                                  </p>
                                </div>
                              </div>
                              <div className="relative">
                                <pre className="p-2.5 rounded bg-black/40 text-[9px] font-mono overflow-x-auto text-zinc-350 border border-white/5 leading-relaxed">
{`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mentor_plano JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mentor_tarefas JSONB DEFAULT '{}'::jsonb;`}
                                </pre>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mentor_plano JSONB DEFAULT '{}'::jsonb;\nALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mentor_tarefas JSONB DEFAULT '{}'::jsonb;`);
                                    alert('Código SQL copiado para a área de transferência!');
                                  }}
                                  className="absolute top-2 right-2 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-zinc-800/80 border border-zinc-700 text-zinc-300 rounded hover:bg-zinc-700 cursor-pointer"
                                >
                                  Copiar SQL
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Diagnóstico Glassmorphism */}
                          <div className="p-5 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/10 via-card to-card text-foreground shadow-xs relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-violet-500 to-indigo-600" />
                            <h4 className="text-xs font-black text-violet-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-violet-400" /> Diagnóstico do Mentor
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                              {plano.diagnostico}
                            </p>
                          </div>

                          {/* Lista do Cronograma Semanal */}
                          <div className="space-y-4">
                            <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
                              <Calendar className="w-4 h-4 text-primary" /> Cronograma de Estudos da Semana
                            </h4>

                            <div className="flex flex-col gap-3">
                              {plano.cronograma.map((item, index) => {
                                const isCompleted = !!tarefasConcluidas[index]
                                
                                // Determina o badge de carga de trabalho
                                let cargaStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                if (item.carga === 'Moderada') {
                                  cargaStyle = "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                } else if (item.carga === 'Intensa') {
                                  cargaStyle = "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }

                                return (
                                  <div
                                    key={index}
                                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden ${
                                      isCompleted
                                        ? 'border-emerald-500/30 bg-emerald-500/[0.02] opacity-75'
                                        : 'border-border/60 hover:border-primary/40 bg-card'
                                    }`}
                                  >
                                    {isCompleted && (
                                      <div className="absolute top-0 left-0 h-full w-1 bg-emerald-500" />
                                    )}

                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                      {/* Checkbox interativo */}
                                      <button
                                        onClick={() => handleToggleTarefa(index)}
                                        className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer shrink-0 mt-0.5 transition-all ${
                                          isCompleted
                                            ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                                            : 'border-border bg-black/10 hover:border-primary/50 text-transparent'
                                        }`}
                                      >
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </button>

                                      <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-xs font-bold text-foreground">
                                            {item.dia}
                                          </span>
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${cargaStyle}`}>
                                            Carga: {item.carga}
                                          </span>
                                          <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-black">
                                            {item.questoes_sugeridas} questões
                                          </span>
                                        </div>

                                        <div className="flex flex-col gap-1 mt-1">
                                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                                            {item.materia}
                                          </p>
                                          {item.topicos && item.topicos.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                              {item.topicos.map((topico, tIdx) => (
                                                <span key={tIdx} className="text-[10px] font-bold text-violet-300 bg-violet-500/5 px-2 py-0.5 rounded border border-white/[0.04]">
                                                  {topico}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        <p className={`text-xs mt-2 leading-relaxed font-medium ${isCompleted ? 'line-through text-muted-foreground/60' : 'text-muted-foreground'}`}>
                                          {item.meta_estudo}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Dica de Ouro */}
                          {plano.dica_ouro && (
                            <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-foreground relative overflow-hidden">
                              <div className="absolute top-0 left-0 h-full w-1 bg-indigo-500" />
                              <h4 className="text-xs font-black text-indigo-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 animate-pulse text-indigo-400" /> Dica de Ouro do Mentor
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                                {plano.dica_ouro}
                              </p>
                            </div>
                          )}

                          {/* Botão de Exclusão para Regenerar */}
                          <div className="flex justify-end pt-4 print:hidden">
                            <button
                              onClick={handleLimparPlano}
                              className="px-4 py-2 border border-destructive/25 text-destructive bg-destructive/5 hover:bg-destructive/10 text-xxs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                            >
                              Limpar e Regenerar Plano
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Modo: Mentoria de Assunto Específico */}
              {selectedFraqueza !== null && (
                <>
                  {/* Se a mentoria ainda NÃO foi gerada */}
                  {!activeMentoriaText && !gerandoMentoria && (
                    <div className="my-auto py-12 flex flex-col items-center justify-center text-center text-muted-foreground print:hidden">
                      <div className="bg-primary/5 p-4 rounded-full border border-primary/10 mb-4 animate-pulse">
                        <GraduationCap className="w-12 h-12 text-primary" />
                      </div>
                      <h4 className="font-bold text-foreground mb-1 text-base">Mentoria de Assunto Direcionada</h4>
                      <p className="text-sm max-w-md mx-auto leading-relaxed">
                        Solicite uma mentoria e plano de revisão cirúrgico focados exclusivamente em **{selectedFraqueza.assunto}**.
                      </p>
                      <p className="text-xs max-w-sm mx-auto text-muted-foreground/80 leading-relaxed mt-2">
                        O Mentor IA irá detalhar os pontos mais cobrados nas provas, mapear as pegadinhas típicas e propor um plano de ataque ativo para você.
                      </p>
                      <Button
                        onClick={() => handleGerarMentoria(selectedFraqueza)}
                        loading={gerandoMentoria}
                        icon={<BrainCircuit className="w-4 h-4" />}
                        className="mt-6 cursor-pointer"
                      >
                        Consultar Mentor IA
                      </Button>
                    </div>
                  )}

                  {/* Se está GERANDO a mentoria de assunto */}
                  {gerandoMentoria && (
                    <div className="my-auto py-12 flex flex-col items-center justify-center text-center text-primary print:hidden">
                      <LoadingSpinner size="md" text={`O Mentor IA está analisando a matéria de ${selectedFraqueza.assunto}...`} />
                    </div>
                  )}

                  {/* Se a mentoria JÁ foi gerada */}
                  {activeMentoriaText && !gerandoMentoria && (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 animate-in fade-in slide-in-from-bottom-2 duration-300 print:text-zinc-800">
                      <ReactMarkdown components={customRenderers}>
                        {activeMentoriaText}
                      </ReactMarkdown>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


