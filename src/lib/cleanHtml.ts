export function cleanHtmlText(htmlStr: string | null | undefined): string {
  if (!htmlStr) return ''

  let text = htmlStr

  // Normaliza quebras de linha do HTML
  text = text
    .replace(/<br\s*[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p\s*[^>]*>/gi, '')

  // Remove tags <script> e <style> inteiras (incluindo conteúdo)
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Insere quebra de linha antes de qualquer tag que contenha classe math/MathJax/mq-
  // Isso faz com que o conteúdo desses spans fique em linha separada
  text = text.replace(/<span[^>]*class="[^"]*(?:math|MathJax|mq-)[^"]*"[^>]*>/gi, '\n')

  // Remove tags <annotation> e <semantics> inteiras (incluindo conteúdo)
  text = text.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/gi, '')
  text = text.replace(/<semantics[^>]*>[\s\S]*?<\/semantics>/gi, '')

  // Remove todas as tags HTML restantes
  text = text.replace(/<[^>]*>/g, '')

  // Decodifica entidades HTML
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&amp;': '&',
    '&apos;': "'",
    '&#39;': "'",
    '&#x27;': "'",
    '&rarr;': '→',
    '&larr;': '←',
    '&harr;': '↔',
    '&darr;': '↓',
    '&uarr;': '↑',
    '&rArr;': '⇒',
    '&lArr;': '⇐',
    '&hArr;': '⇔',
    '&dArr;': '⇓',
    '&uArr;': '⇑',
    '&forall;': '∀',
    '&exist;': '∃',
    '&isin;': '∈',
    '&notin;': '∉',
    '&ni;': '∋',
    '&prod;': '∏',
    '&sum;': '∑',
    '&minus;': '−',
    '&lowast;': '∗',
    '&radic;': '√',
    '&prop;': '∝',
    '&infin;': '∞',
    '&ang;': '∠',
    '&and;': '∧',
    '&or;': '∨',
    '&cap;': '∩',
    '&cup;': '∪',
    '&int;': '∫',
    '&there4;': '∴',
    '&sim;': '∼',
    '&cong;': '≅',
    '&asymp;': '≈',
    '&ne;': '≠',
    '&equiv;': '≡',
    '&le;': '≤',
    '&ge;': '≥',
    '&sub;': '⊂',
    '&sup;': '⊃',
    '&nsub;': '⊄',
    '&sube;': '⊆',
    '&supe;': '⊇',
    '&oplus;': '⊕',
    '&otimes;': '⊗',
    '&perp;': '⊥',
    '&sdot;': '⋅',
    '&lceil;': '⌈',
    '&rceil;': '⌉',
    '&lfloor;': '⌊',
    '&rfloor;': '⌋',
    '&lang;': '〈',
    '&rang;': '〉',
    '&loz;': '◊',
    '&spades;': '♠',
    '&clubs;': '♣',
    '&hearts;': '♥',
    '&diams;': '♦',
    '&prime;': '′',
    '&Prime;': '″',
    '&oline;': '‾',
    '&frasl;': '⁄',
    '&weierp;': '℘',
    '&image;': 'ℑ',
    '&real;': 'ℜ',
    '&alefsym;': 'ℵ',
    '&pound;': '£',
    '&yen;': '¥',
    '&euro;': '€',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&deg;': '°',
    '&plusmn;': '±',
    '&sup2;': '²',
    '&sup3;': '³',
    '&acute;': '´',
    '&micro;': 'µ',
    '&para;': '¶',
    '&middot;': '·',
    '&cedil;': '¸',
    '&frac14;': '¼',
    '&frac12;': '½',
    '&frac34;': '¾',
    '&iquest;': '¿',
    '&times;': '×',
    '&divide;': '÷',
    '&ETH;': 'Ð',
    '&eth;': 'ð',
    '&THORN;': 'Þ',
    '&thorn;': 'þ',
    '&AElig;': 'Æ',
    '&aelig;': 'æ',
    '&OElig;': 'Œ',
    '&oelig;': 'œ',
    '&Aring;': 'Å',
    '&aring;': 'å',
    '&Ccedil;': 'Ç',
    '&ccedil;': 'ç',
    '&szlig;': 'ß',
  }
  text = text.replace(/&(#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/g, (match) => entities[match] || match)

  // Remove espaços duplicados
  text = text.replace(/[ \t]+/g, ' ')

  // Normaliza caracteres matemáticos Unicode (Mathematical Alphanumeric Symbols U+1D400–U+1D7FF)
  // para seus equivalentes ASCII
  text = text.replace(/[\u{1D400}-\u{1D7FF}]/gu, (match) => {
    const cp = match.codePointAt(0)!
    if (cp >= 0x1D434 && cp <= 0x1D467) return String.fromCodePoint(cp - 0x1D434 + 0x41)
    if (cp >= 0x1D400 && cp <= 0x1D433) return String.fromCodePoint(cp - 0x1D400 + 0x41)
    if (cp >= 0x1D468 && cp <= 0x1D49B) return String.fromCodePoint(cp - 0x1D468 + 0x41)
    if (cp >= 0x1D49C && cp <= 0x1D4CF) return String.fromCodePoint(cp - 0x1D49C + 0x41)
    if (cp >= 0x1D504 && cp <= 0x1D537) return String.fromCodePoint(cp - 0x1D504 + 0x41)
    if (cp >= 0x1D538 && cp <= 0x1D56B) return String.fromCodePoint(cp - 0x1D538 + 0x41)
    return String.fromCodePoint(cp - 0x1D400 + 0x41)
  })

  // Remove linhas consecutivas duplicadas — pula linhas vazias na comparação
  // (após normalização, linhas com math e ASCII viram duplicatas)
  const lines = text.split('\n')
  const deduped: string[] = []
  let lastNonEmpty = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 0 && trimmed === lastNonEmpty) continue
    if (trimmed.length > 0) lastNonEmpty = trimmed
    deduped.push(line)
  }
  text = deduped.join('\n')

  // Remove linhas vazias excessivas
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}
