import React from 'react'
import { Sparkles, AlertCircle, Lightbulb, AlertTriangle, Info, BookOpen } from 'lucide-react'

interface MarkdownAIProps {
  text?: string | null
}

export function MarkdownAI({ text }: MarkdownAIProps) {
  if (!text) return null

  const lines = text.split('\n')

  return (
    <div className="space-y-3 text-foreground/90 leading-relaxed font-sans text-xs sm:text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-1.5" />

        // Callouts / Alerts parsing
        const pegadinhaMatch = trimmed.match(/^(Pegadinha|🚨\s*Pegadinha|Pegadinhas):\s*(.*)/i)
        if (pegadinhaMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 flex items-start gap-3 shadow-sm select-text">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-red-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider">🚨 Pegadinha da Banca!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm">{parseFormatting(pegadinhaMatch[2])}</p>
              </div>
            </div>
          )
        }

        const dicaMatch = trimmed.match(/^(Dica|💡\s*Dica|Dica\s*de\s*Prova|Dica\s*de\s*Ouro):\s*(.*)/i)
        if (dicaMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400 flex items-start gap-3 shadow-sm select-text">
              <Lightbulb className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-amber-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider">💡 Dica de Prova!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm">{parseFormatting(dicaMatch[2])}</p>
              </div>
            </div>
          )
        }

        const atencaoMatch = trimmed.match(/^(Atenção|⚠️\s*Atenção|Aviso):\s*(.*)/i)
        if (atencaoMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-orange-400 flex items-start gap-3 shadow-sm select-text">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-orange-400" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-orange-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider">⚠️ Atenção!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm">{parseFormatting(atencaoMatch[2])}</p>
              </div>
            </div>
          )
        }

        const importanteMatch = trimmed.match(/^(Importante|ℹ️\s*Importante):\s*(.*)/i)
        if (importanteMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 text-sky-400 flex items-start gap-3 shadow-sm select-text">
              <Info className="w-5 h-5 shrink-0 mt-0.5 text-sky-400" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-sky-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider">ℹ️ Importante!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm">{parseFormatting(importanteMatch[2])}</p>
              </div>
            </div>
          )
        }

        const resumoMatch = trimmed.match(/^(Resumo|Conclusão):\s*(.*)/i)
        if (resumoMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 flex items-start gap-3 shadow-sm select-text">
              <BookOpen className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-emerald-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider">✓ {resumoMatch[1]}!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm">{parseFormatting(resumoMatch[2])}</p>
              </div>
            </div>
          )
        }

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xs sm:text-sm font-bold text-violet-400 mt-4 mb-1 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              {parseFormatting(trimmed.substring(4))}
            </h4>
          )
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-sm sm:text-base font-black text-violet-300 mt-5 mb-2 tracking-tight border-b border-white/[0.05] pb-1">
              {parseFormatting(trimmed.substring(3))}
            </h3>
          )
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-base sm:text-lg font-black text-foreground mt-6 mb-3 tracking-tight">
              {parseFormatting(trimmed.substring(2))}
            </h2>
          )
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-2 pl-3 py-0.5">
              <span className="text-violet-500 font-bold shrink-0 text-xs sm:text-sm">•</span>
              <p className="flex-1 text-muted-foreground text-xs sm:text-sm">{parseFormatting(trimmed.substring(2))}</p>
            </div>
          )
        }

        // Ordered list numbers
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
        if (numMatch) {
          return (
            <div key={idx} className="flex gap-2 pl-3 py-0.5">
              <span className="text-violet-400 font-bold text-xs sm:text-sm shrink-0">{numMatch[1]}.</span>
              <p className="flex-1 text-muted-foreground text-xs sm:text-sm">{parseFormatting(numMatch[2])}</p>
            </div>
          )
        }

        // Default paragraph
        return (
          <p key={idx} className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
            {parseFormatting(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

function parseFormatting(text: string): React.ReactNode {
  if (!text) return ''

  // Split by bold (**text**) or inline code (`code`)
  const regex = /(\*\*.*?\*\*|`.*?`)/g
  const parts = text.split(regex)

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-foreground bg-white/[0.01] px-0.5 rounded">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-violet-300 font-mono text-[10px] sm:text-xs border border-white/[0.04] font-medium">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}
