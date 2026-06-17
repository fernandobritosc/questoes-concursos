import { useRef, useLayoutEffect } from 'react'
import { Bold, Italic, Strikethrough, Quote, List, ListOrdered, Code, Link } from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

type WrapType = '**' | '*' | '~~' | '`' | '> ' | '- ' | '1. '

function wrapSelection(wrapper: WrapType, multiline?: boolean, selected?: string) {
  if (wrapper === '> ' || wrapper === '- ' || wrapper === '1. ') {
    if (multiline || (selected && selected.includes('\n'))) {
      const lines = selected
        ? selected.split('\n').map(l => wrapper + l).join('\n')
        : wrapper
      return lines
    }
    return wrapper + (selected || '')
  }
  return wrapper + (selected || 'texto') + wrapper
}

export function MarkdownEditor({ value, onChange, placeholder, minHeight = '180' }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== value) {
      textareaRef.current.value = value
    }
  }, [value])

  const insert = (wrapper: WrapType, multiline?: boolean) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = ta.value.substring(start, end)
    const wrapped = wrapSelection(wrapper, multiline, selected)
    ta.value = ta.value.substring(0, start) + wrapped + ta.value.substring(end)
    const pos = start + wrapped.length
    ta.setSelectionRange(pos, pos)
    ta.focus()
    onChange(ta.value)
  }

  const insertLink = () => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const linkText = ta.value.substring(start, end) || 'texto'
    const replacement = `[${linkText}](url)`
    ta.value = ta.value.substring(0, start) + replacement + ta.value.substring(end)
    const pos = start + linkText.length + 3
    ta.setSelectionRange(pos, pos)
    ta.focus()
    onChange(ta.value)
  }

  const btnClass = "p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5 p-1 bg-muted/50 border border-border rounded-t-lg flex-wrap">
        <button type="button" onClick={() => insert('**')} className={btnClass} title="Negrito (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => insert('*')} className={btnClass} title="Itálico (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => insert('~~')} className={btnClass} title="Riscado">
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-5 bg-border mx-1" />
        <button type="button" onClick={() => insert('> ')} className={btnClass} title="Citação">
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => insert('- ', true)} className={btnClass} title="Lista">
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => insert('1. ', true)} className={btnClass} title="Lista Numerada">
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-5 bg-border mx-1" />
        <button type="button" onClick={() => insert('`')} className={btnClass} title="Código">
          <Code className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={insertLink} className={btnClass} title="Link">
          <Link className="w-3.5 h-3.5" />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ minHeight: `${minHeight}px` }}
        className="w-full p-3 text-xs border border-t-0 border-border rounded-b-lg focus:ring-2 focus:ring-[#1976d2] focus:border-[#1976d2] bg-card font-medium text-foreground shadow-inner resize-y leading-relaxed focus:outline-none"
      />
    </div>
  )
}
