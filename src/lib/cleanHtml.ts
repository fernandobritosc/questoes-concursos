export function cleanHtmlText(htmlStr: string | null | undefined): string {
  if (!htmlStr) return '';
  
  let text = htmlStr;
  
  // 1. Substitui tags <br> (com ou sem atributos) por quebras de linha reais
  text = text.replace(/<br\s*[^>]*>/gi, '\n');
  
  // 2. Substitui fechamento de parágrafo </p> por quebras de linha duplas
  text = text.replace(/<\/p>/gi, '\n\n');
  
  // 3. Remove a abertura de tags <p ...>
  text = text.replace(/<p\s*[^>]*>/gi, '');
  
  // 4. Remove qualquer outra tag HTML restante (como <strong>, <span>, <div>, etc.)
  text = text.replace(/<[^>]*>/g, '');
  
  // 5. Decodifica entidades HTML comuns que possam restar
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&amp;': '&',
    '&apos;': "'",
    '&#39;': "'",
    '&#x27;': "'"
  };
  text = text.replace(/&(nbsp|lt|gt|quot|amp|apos|#39|#x27);/g, (match) => entities[match] || match);
  
  // 6. Normaliza múltiplos espaços e quebras de linha
  return text.trim();
}
