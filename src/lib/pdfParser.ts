import type { Resolucao } from '../types/database';

interface PdfJsLib {
  GlobalWorkerOptions: { workerSrc: string }
  getDocument(params: { data: ArrayBuffer }): { promise: Promise<PdfDocument> }
}

interface PdfDocument {
  numPages: number
  getPage(pageNum: number): Promise<PdfPage>
}

interface PdfPage {
  getTextContent(): Promise<{ items: PdfTextItem[] }>
}

interface PdfTextItem {
  str: string
  transform: number[]
}

export async function loadPdfJs(): Promise<PdfJsLib> {
  const w = window as unknown as { pdfjsLib: PdfJsLib | undefined }
  if (w.pdfjsLib) {
    return w.pdfjsLib;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const lib = w.pdfjsLib!;
      lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(lib);
    };
    script.onerror = () => reject(new Error('Falha ao carregar PDF.js da CDN.'));
    document.body.appendChild(script);
  });
}

export async function extractPdfText(
  pdfjsLib: PdfJsLib,
  buffer: ArrayBuffer,
  onProgress?: (pageNum: number, total: number) => void
): Promise<{ fullText: string; totalPages: number }> {
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = pdfDoc.numPages;
  let fullText = '';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items;
    const validItems = items.filter((item) => item.str && item.str.trim() !== '');

    validItems.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 4) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    const pageLines: string[] = [];
    let currentY = -999;
    let currentLineItems: PdfTextItem[] = [];

    for (const item of validItems) {
      const y = item.transform[5];
      if (currentY === -999) {
        currentY = y;
        currentLineItems.push(item);
      } else if (Math.abs(y - currentY) <= 4) {
        currentLineItems.push(item);
      } else {
        currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]);
        pageLines.push(currentLineItems.map((i) => i.str).join(' '));
        currentY = y;
        currentLineItems = [item];
      }
    }
    if (currentLineItems.length > 0) {
      currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]);
      pageLines.push(currentLineItems.map((i) => i.str).join(' '));
    }

    fullText += pageLines.join('\n') + '\n';
    onProgress?.(pageNum, totalPages);
  }

  return { fullText, totalPages };
}

export function parsePdfContent(
  fullText: string,
  cadernoName: string
): Resolucao[] {
  const gabaritoIndex = fullText.lastIndexOf('Gabarito');
  if (gabaritoIndex === -1) {
    throw new Error('Nao foi possivel encontrar a secao Gabarito no PDF.');
  }

  const questionsText = fullText.substring(0, gabaritoIndex);
  const gabaritoText = fullText.substring(gabaritoIndex);

  const answersMap: Record<number, string> = {};
  const answerRegex = /(\d+)\)\s*([A-E]|Certo|Errado)\b/g;
  let match;
  while ((match = answerRegex.exec(gabaritoText)) !== null) {
    const qNum = parseInt(match[1], 10);
    let val = match[2];
    if (val === 'Certo') val = 'C';
    if (val === 'Errado') val = 'E';
    answersMap[qNum] = val;
  }

  const chunks = questionsText.split(/www\.tecconcursos\.com\.br\/questoes\/(?=\d{5,8}\b)/);
  if (chunks.length <= 1) {
    throw new Error('Nenhuma questao encontrada no PDF.');
  }

  const parsed: Resolucao[] = [];
  let seqNum = 1;

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    const rawLines = chunk.split('\n').map((l: string) => l.trim()).filter(Boolean);

    const lines = rawLines.filter((line: string) => {
      const lower = line.toLowerCase();
      if (line.match(/\b\d{2}\/\d{2}\/\d{4}\b/)) return false;
      if ((lower.includes('tec') && lower.includes('concurso')) || lower.includes('tecconcursos')) return false;
      if (lower.includes('questoes para') || lower.includes('editais, simulados') || lower.includes('provas,')) return false;
      if (lower.startsWith('http://') || lower.startsWith('https://')) return false;
      if (lower.includes('www.tecconcursos.com.br')) return false;
      if (line.match(/^p[a\u00e1]gina \d+ de \d+$/i) || line.match(/^page \d+ of \d+$/i) || line.match(/^\d+\/\d+$/)) return false;
      return true;
    });

    if (lines.length < 3) continue;

    const questaoIdStr = lines[0].match(/^(\d{5,8})/)?.[1];
    if (!questaoIdStr) continue;
    const questao_tec_id = parseInt(questaoIdStr, 10);

    const subheader = lines[1] || '';
    let banca: string | undefined;
    let cargo = '';
    let orgao = '';
    let ano: number | null = null;

    const subparts = subheader.split(' - ');
    if (subparts.length >= 2) {
      banca = subparts[0].trim();
      const rightSide = subparts.slice(1).join(' - ');
      const rightparts = rightSide.split('/');
      if (rightparts.length >= 1) {
        cargo = rightparts[0].trim();
      }
      if (rightparts.length >= 2) {
        orgao = rightparts[1].trim();
      }
      const anoPart = rightparts.find(p => /\b(19\d\d|20\d\d)\b/.test(p));
      if (anoPart) {
        const anoMatch = anoPart.match(/\b(19\d\d|20\d\d)\b/);
        if (anoMatch) {
          ano = parseInt(anoMatch[0], 10);
        }
      }
    } else {
      banca = subheader.trim();
    }

    const subjectLine = lines[2] || '';
    let materia: string | undefined;
    let assunto = '';
    const subjParts = subjectLine.split(' - ');
    if (subjParts.length >= 2) {
      materia = subjParts[0].trim();
      assunto = subjParts.slice(1).join(' - ').trim();
    } else {
      materia = subjectLine.trim();
    }

    let enunciadoStartLine = 3;
    while (
      lines[enunciadoStartLine] &&
      /^[a-zA-Z\u00e1-\u00fa\u00c1-\u00da\u00e0-\u00f9\u00c0-\u00d9\u00e3-\u00f5\u00c3-\u00d5\u00e2-\u00fb\u00c2-\u00db\u00e7\u00c7\s\u2013/]+[)]\s*$/.test(lines[enunciadoStartLine].trim()) &&
      lines[enunciadoStartLine].trim().length < 50
    ) {
      enunciadoStartLine++;
    }

    const restText = lines.slice(enunciadoStartLine).join('\n');
    const remainingText = restText.trim();

    const alternativas: Record<string, string> = {};
    const optionLetters = ['a', 'b', 'c', 'd', 'e'];
    const altIndices: { letter: string; index: number; markerLength: number }[] = [];

    for (const letter of optionLetters) {
      const altPattern = new RegExp(`(^|\\n)\\s*${letter}\\)\\s+`, 'i');
      const altMatch = remainingText.match(altPattern);
      if (altMatch && altMatch.index !== undefined) {
        altIndices.push({ letter: letter.toUpperCase(), index: altMatch.index, markerLength: altMatch[0].length });
      }
    }

    let enunciado: string | undefined;

    if (altIndices.length >= 2) {
      altIndices.sort((a, b) => a.index - b.index);
      enunciado = remainingText.substring(0, altIndices[0].index).trim();
      for (let j = 0; j < altIndices.length; j++) {
        const current = altIndices[j];
        const next = altIndices[j + 1];
        const start = current.index + current.markerLength;
        const end = next ? next.index : remainingText.length;
        let altText = remainingText.substring(start, end).trim().replace(/\s+/g, ' ');
        altText = altText.replace(/\s*Gabarito:\s*([A-E]|Certo|Errado|C|E)\s*$/i, '').trim();
        alternativas[current.letter] = altText;
      }
    } else {
      const hasCerto = remainingText.toLowerCase().includes('certo');
      const hasErrado = remainingText.toLowerCase().includes('errado');
      if (hasCerto && hasErrado) {
        alternativas['C'] = 'Certo';
        alternativas['E'] = 'Errado';
        enunciado = remainingText
          .replace(/Certo\s*Errado$/i, '')
          .replace(/Certo\s*\n\s*Errado$/i, '')
          .trim();
      } else {
        enunciado = remainingText;
      }
    }

    enunciado = enunciado.replace(/^\s*\d+[).\s-]\s*/, '').trim();
    enunciado = enunciado.replace(/\s+/g, ' ').trim();

    let gabarito = answersMap[seqNum] || null;
    if (!gabarito) {
      const chunkGabaritoMatch = chunk.match(/\bGabarito:\s*([A-E]|Certo|Errado|C|E)\b/i);
      if (chunkGabaritoMatch) {
        let val = chunkGabaritoMatch[1];
        if (val.toLowerCase() === 'certo') val = 'C';
        if (val.toLowerCase() === 'errado') val = 'E';
        gabarito = val.toUpperCase();
      }
    }

    parsed.push({
      id: -1,
      questao_id: -1,
      questao_tec_id,
      alternativa: '',
      acertou: false,
      data_resolucao: '1970-01-01T00:00:00.000Z',
      materia,
      assunto,
      banca_texto: banca,
      gabarito,
      tempo_segundos: 0,
      enunciado,
      alternativas,
      orgao,
      concurso: cargo ? banca + ' - ' + cargo : banca,
      prova: orgao ? orgao + ' / ' + (ano || '') : '',
      ano,
      caderno_nome: cadernoName,
      resolucao_professor: null,
    });

    seqNum++;
  }

  if (parsed.length === 0) {
    throw new Error('Nao foi possivel extrair nenhuma questao do PDF.');
  }

  return parsed;
}
