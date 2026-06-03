import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownAI } from './MarkdownAI'

describe('MarkdownAI', () => {
  it('renders null when text is missing', () => {
    const { container } = render(<MarkdownAI text={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders plain text paragraphs correctly', () => {
    render(<MarkdownAI text="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders bold formatting correctly', () => {
    render(<MarkdownAI text="This is **bold** text" />)
    const boldEl = screen.getByText('bold')
    expect(boldEl.tagName).toBe('STRONG')
    expect(boldEl).toHaveClass('font-extrabold')
  })

  it('renders italics formatting correctly', () => {
    render(<MarkdownAI text="This is *italic* and _italic_ text" />)
    const italics = screen.getAllByText('italic')
    expect(italics).toHaveLength(2)
    italics.forEach(el => {
      expect(el.tagName).toBe('EM')
      expect(el).toHaveClass('italic')
    })
  })

  it('renders strikethrough formatting correctly', () => {
    render(<MarkdownAI text="This is ~~strikethrough~~ text" />)
    const strikeEl = screen.getByText('strikethrough')
    expect(strikeEl.tagName).toBe('SPAN')
    expect(strikeEl).toHaveClass('line-through')
  })

  it('renders bullet list items correctly', () => {
    render(<MarkdownAI text={`- Item 1
- Item 2`} />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('renders ordered list items correctly', () => {
    render(<MarkdownAI text={`1. First item
2. Second item`} />)
    expect(screen.getByText('First item')).toBeInTheDocument()
    expect(screen.getByText('Second item')).toBeInTheDocument()
  })

  it('renders callout alerts correctly', () => {
    render(<MarkdownAI text="🚨 Pegadinha: Cuidado com isso" />)
    expect(screen.getByText(/Pegadinha/)).toBeInTheDocument()
    expect(screen.getByText('Cuidado com isso')).toBeInTheDocument()
  })

  it('renders blockquotes correctly', () => {
    render(<MarkdownAI text={`> This is a quote
>
> Continued quote`} />)
    expect(screen.getByText('This is a quote')).toBeInTheDocument()
    expect(screen.getByText('Continued quote')).toBeInTheDocument()
  })

  it('renders markdown tables correctly', () => {
    const tableText = `
| Header 1 | **Header 2** |
| --- | --- |
| Row 1 Col 1 | Row 1 Col 2 |
| Row 2 Col 1 | Row 2 Col 2 |
`
    render(<MarkdownAI text={tableText} />)
    
    // Expect elements to be in document
    const tableEl = screen.getByRole('table')
    expect(tableEl).toBeInTheDocument()
    
    // Check headers
    expect(screen.getByText('Header 1')).toBeInTheDocument()
    const boldHeader = screen.getByText('Header 2')
    expect(boldHeader.tagName).toBe('STRONG')
    
    // Check rows
    expect(screen.getByText('Row 1 Col 1')).toBeInTheDocument()
    expect(screen.getByText('Row 1 Col 2')).toBeInTheDocument()
    expect(screen.getByText('Row 2 Col 1')).toBeInTheDocument()
    expect(screen.getByText('Row 2 Col 2')).toBeInTheDocument()
  })
})
