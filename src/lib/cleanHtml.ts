export function cleanHtmlText(htmlStr: string | null | undefined): string {
  if (!htmlStr) return ''

  // Normaliza quebras de linha do HTML
  let text = htmlStr
    .replace(/<br\s*[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p\s*[^>]*>/gi, '')

  // Remove tags <script> e <style> inteiras (incluindo conteúdo)
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Remove MathJax / annotation spans — eles duplicam o texto visível
  // TEC costuma ter: texto normal + <span class="math-...">texto itálico matemático</span>
  text = text.replace(/<span[^>]*class="[^"]*math[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
  text = text.replace(/<span[^>]*class="[^"]*MathJax[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
  text = text.replace(/<span[^>]*class="[^"]*mq-[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
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

  // Remove linhas duplicadas consecutivas (caso o MathJax tenha deixado cópia)
  text = text.replace(/^(.+)$\s+^\1$/gm, '$1')

  // Remove espaços duplicados e linhas vazias excessivas
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}
