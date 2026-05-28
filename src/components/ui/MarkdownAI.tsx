import React from 'react'
import { Sparkles, AlertCircle, Lightbulb, AlertTriangle, Info, BookOpen } from 'lucide-react'

interface MarkdownAIProps {
  text?: string | null
}

export function MarkdownAI({ text }: MarkdownAIProps) {
  if (!text) return null

  // Preprocess text to clean up LaTeX math markup leaks
  const cleanText = text
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\\rightarrow/g, '→')
    .replace(/\$\\Rightarrow\$/g, '⇒')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\$\\leftrightarrow\$/g, '↔')
    .replace(/\\leftrightarrow/g, '↔')
    .replace(/\$\\to\$/g, '→')
    .replace(/\\to/g, '→')
    .replace(/\$\\neq\$/g, '≠')
    .replace(/\\neq/g, '≠')
    .replace(/\$\\ge\$/g, '≥')
    .replace(/\\ge/g, '≥')
    .replace(/\$\\le\$/g, '≤')
    .replace(/\\le/g, '≤')

  const lines = cleanText.split('\n')

  return (
    <div className="space-y-3 text-foreground/90 leading-relaxed font-sans text-xs sm:text-sm print:text-neutral-900">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-1.5" />

        // Callouts / Alerts parsing (extremely robust to support leading bullets, numbers, asterisks, dashes, spaces and emojis)
        const pegadinhaMatch = trimmed.match(/^(?:[-*+•\d.\s]*|(?:\*\*)*)*(?:🚨\s*)*Pegadinhas?(?:\*\*)*\s*[:\-—]\s*(.*)/i)
        if (pegadinhaMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 flex items-start gap-3 shadow-sm select-text print:bg-red-50/50 print:border-red-300 print:text-red-950 print:break-inside-avoid">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400 print:text-red-650" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-red-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider print:text-red-800">🚨 Pegadinha da Banca!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm print:text-neutral-800">{parseFormatting(pegadinhaMatch[1])}</p>
              </div>
            </div>
          )
        }

        const dicaMatch = trimmed.match(/^(?:[-*+•\d.\s]*|(?:\*\*)*)*(?:💡\s*)*(?:Dica|Dica\s*de\s*Prova|Dica\s*de\s*Ouro|Macete)(?:\*\*)*\s*[:\-—]\s*(.*)/i)
        if (dicaMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-400 flex items-start gap-3 shadow-sm select-text print:bg-amber-50/50 print:border-amber-300 print:text-amber-950 print:break-inside-avoid">
              <Lightbulb className="w-5 h-5 shrink-0 mt-0.5 text-amber-400 print:text-amber-600" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-amber-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider print:text-amber-800">💡 Dica de Prova!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm print:text-neutral-800">{parseFormatting(dicaMatch[1])}</p>
              </div>
            </div>
          )
        }

        const atencaoMatch = trimmed.match(/^(?:[-*+•\d.\s]*|(?:\*\*)*)*(?:⚠️\s*)*(?:Atenção|Aviso)(?:\*\*)*\s*[:\-—]\s*(.*)/i)
        if (atencaoMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 text-orange-400 flex items-start gap-3 shadow-sm select-text print:bg-orange-50/50 print:border-orange-300 print:text-orange-950 print:break-inside-avoid">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-orange-400 print:text-orange-600" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-orange-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider print:text-orange-800">⚠️ Atenção!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm print:text-neutral-800">{parseFormatting(atencaoMatch[1])}</p>
              </div>
            </div>
          )
        }

        const importanteMatch = trimmed.match(/^(?:[-*+•\d.\s]*|(?:\*\*)*)*(?:ℹ️\s*)*Importante(?:\*\*)*\s*[:\-—]\s*(.*)/i)
        if (importanteMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 text-sky-400 flex items-start gap-3 shadow-sm select-text print:bg-sky-50/50 print:border-sky-300 print:text-sky-950 print:break-inside-avoid">
              <Info className="w-5 h-5 shrink-0 mt-0.5 text-sky-400 print:text-sky-600" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-sky-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider print:text-sky-850">ℹ️ Importante!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm print:text-neutral-800">{parseFormatting(importanteMatch[1])}</p>
              </div>
            </div>
          )
        }

        const resumoMatch = trimmed.match(/^(?:[-*+•\d.\s]*|(?:\*\*)*)*(?:✓\s*)*(Resumo|Conclusão)(?:\*\*)*\s*[:\-—]\s*(.*)/i)
        if (resumoMatch) {
          return (
            <div key={idx} className="my-3.5 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 flex items-start gap-3 shadow-sm select-text print:bg-emerald-50/50 print:border-emerald-300 print:text-emerald-950 print:break-inside-avoid">
              <BookOpen className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400 print:text-emerald-600" />
              <div className="flex-1 min-w-0">
                <strong className="font-extrabold text-emerald-300 block text-xs sm:text-sm mb-0.5 uppercase tracking-wider print:text-emerald-800">✓ {resumoMatch[1]}!</strong>
                <p className="text-muted-foreground text-xs sm:text-sm print:text-neutral-800">{parseFormatting(resumoMatch[2])}</p>
              </div>
            </div>
          )
        }

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xs sm:text-sm font-bold text-violet-400 mt-4 mb-1 tracking-tight flex items-center gap-1.5 print:text-violet-900 print:break-inside-avoid">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0 print:text-violet-750" />
              {parseFormatting(trimmed.substring(4))}
            </h4>
          )
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-sm sm:text-base font-black text-violet-300 mt-5 mb-2 tracking-tight border-b border-white/[0.05] pb-1 print:text-violet-950 print:border-neutral-200 print:break-inside-avoid">
              {parseFormatting(trimmed.substring(3))}
            </h3>
          )
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-base sm:text-lg font-black text-foreground mt-6 mb-3 tracking-tight print:text-black print:break-inside-avoid">
              {parseFormatting(trimmed.substring(2))}
            </h2>
          )
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex gap-2 pl-3 py-0.5 print:break-inside-avoid">
              <span className="text-violet-500 font-bold shrink-0 text-xs sm:text-sm print:text-violet-700">•</span>
              <p className="flex-1 text-muted-foreground text-xs sm:text-sm print:text-neutral-800">{parseFormatting(trimmed.substring(2))}</p>
            </div>
          )
        }

        // Ordered list numbers
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
        if (numMatch) {
          return (
            <div key={idx} className="flex gap-2 pl-3 py-0.5 print:break-inside-avoid">
              <span className="text-violet-400 font-bold text-xs sm:text-sm shrink-0 print:text-violet-750">{numMatch[1]}.</span>
              <p className="flex-1 text-muted-foreground text-xs sm:text-sm print:text-neutral-800">{parseFormatting(numMatch[2])}</p>
            </div>
          )
        }

        // Default paragraph
        return (
          <p key={idx} className="text-muted-foreground text-xs sm:text-sm leading-relaxed print:text-neutral-800 print:break-inside-avoid">
            {parseFormatting(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

function parseFormatting(text: string): React.ReactNode {
  if (!text) return ''

  // Split by bold (**text**), inline code (`code`), or italics (*text* or _text_)
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*|_.*?_)/g
  const parts = text.split(regex)

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-foreground bg-white/[0.01] px-0.5 rounded print:text-black">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-violet-300 font-mono text-[10px] sm:text-xs border border-white/[0.04] font-medium print:bg-neutral-100 print:text-violet-850 print:border-neutral-200">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-foreground/95 print:text-neutral-900">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return (
        <em key={i} className="italic text-foreground/95 print:text-neutral-900">
          {part.slice(1, -1)}
        </em>
      )
    }
    return part
  })
}
