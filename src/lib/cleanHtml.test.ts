import { describe, it, expect } from 'vitest'
import { cleanHtmlText } from './cleanHtml'

describe('cleanHtmlText', () => {
  it('returns empty string for null', () => {
    expect(cleanHtmlText(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(cleanHtmlText(undefined)).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(cleanHtmlText('')).toBe('')
  })

  it('preserves plain text without HTML', () => {
    expect(cleanHtmlText('Hello world')).toBe('Hello world')
  })

  it('replaces <br> with newline', () => {
    expect(cleanHtmlText('Line1<br>Line2')).toBe('Line1\nLine2')
  })

  it('replaces <br/> with newline', () => {
    expect(cleanHtmlText('A<br/>B')).toBe('A\nB')
  })

  it('replaces <br /> with newline', () => {
    expect(cleanHtmlText('X<br />Y')).toBe('X\nY')
  })

  it('replaces </p> with double newline and removes <p>', () => {
    const input = '<p>Paragraph 1</p><p>Paragraph 2</p>'
    const result = cleanHtmlText(input)
    expect(result).toContain('Paragraph 1')
    expect(result).toContain('Paragraph 2')
    expect(result).not.toContain('<p>')
    expect(result).not.toContain('</p>')
  })

  it('removes <strong> tags', () => {
    expect(cleanHtmlText('<strong>bold</strong>')).toBe('bold')
  })

  it('removes <span> tags', () => {
    expect(cleanHtmlText('<span class="x">text</span>')).toBe('text')
  })

  it('decodes &nbsp; to space', () => {
    expect(cleanHtmlText('a&nbsp;b')).toBe('a b')
  })

  it('decodes &lt; and &gt;', () => {
    expect(cleanHtmlText('&lt;div&gt;')).toBe('<div>')
  })

  it('decodes &amp;', () => {
    expect(cleanHtmlText('a&amp;b')).toBe('a&b')
  })

  it('decodes &quot;', () => {
    expect(cleanHtmlText('&quot;hello&quot;')).toBe('"hello"')
  })

  it('decodes &#39; and &#x27; as apostrophe', () => {
    expect(cleanHtmlText('It&#39;s &#x27;cool&#x27;')).toBe("It's 'cool'")
  })

  it('trims whitespace from result', () => {
    expect(cleanHtmlText('  hello  ')).toBe('hello')
  })

  it('handles complex HTML mix', () => {
    const input = '<p><strong>Title:</strong> Value<br/>Line 2</p>'
    const result = cleanHtmlText(input)
    expect(result).toContain('Title:')
    expect(result).toContain('Value')
    expect(result).toContain('Line 2')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('removes MathJax spans to avoid text duplication', () => {
    const input = 'P1: (A→B)∧(¬B→A)<span class="math-italic">(𝐴→𝐵)∧(¬𝐵→𝐴)</span>'
    expect(cleanHtmlText(input)).toBe('P1: (A→B)∧(¬B→A)')
  })

  it('removes annotation and semantics tags', () => {
    const input = '<semantics><annotation>duplicated text</annotation></semantics>Real text'
    expect(cleanHtmlText(input)).toBe('Real text')
  })

  it('removes consecutive duplicate lines', () => {
    const input = 'P1: (A→B)∧(¬B→A)\nP1: (A→B)∧(¬B→A)'
    expect(cleanHtmlText(input)).toBe('P1: (A→B)∧(¬B→A)')
  })
})
