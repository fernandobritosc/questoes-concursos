import fs from 'fs';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const supabase = createClient(
  "https://dyxtalcvjcprmhuktyfd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHRhbGN2amNwcm1odWt0eWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MzI1MjcsImV4cCI6MjA4NDEwODUyN30.BPMR3SBmTrf_3icEyYjWUmiC5ZsoCseEXB3LF6c14L8"
);

const pdfPath = "C:\\Users\\uniao\\Downloads\\Tec Concursos - Questões para concursos, provas, editais, simulados_.pdf";

async function run() {
  if (!fs.existsSync(pdfPath)) {
    console.error("PDF file not found at:", pdfPath);
    return;
  }

  console.log("Reading PDF file...");
  const dataBuffer = fs.readFileSync(pdfPath);
  try {
    const { PDFParse } = pdf;
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    console.log("PDF parsed successfully!");
    console.log("Total Pages:", data.total);
    
    const text = data.text;
    console.log("Total characters in PDF text:", text.length);

    // Find Gabarito
    const gabaritoIndex = text.lastIndexOf("Gabarito");
    if (gabaritoIndex === -1) {
      console.error("Could not find 'Gabarito' section in PDF text.");
      return;
    }

    const questionsText = text.substring(0, gabaritoIndex);
    const gabaritoText = text.substring(gabaritoIndex);

    console.log("\n--- Parsing Gabarito ---");
    const answersMap = {};
    const answerRegex = /(\d+)\)\s*([A-E]|Certo|Errado)\b/g;
    let match;
    while ((match = answerRegex.exec(gabaritoText)) !== null) {
      const qNum = parseInt(match[1], 10);
      let val = match[2];
      if (val === 'Certo') val = 'C';
      if (val === 'Errado') val = 'E';
      answersMap[qNum] = val;
    }
    const totalAnswers = Object.keys(answersMap).length;
    console.log(`Found ${totalAnswers} answers in the Gabarito.`);

    console.log("\n--- Parsing Questions ---");
    // Split by question URL
    const chunks = questionsText.split("www.tecconcursos.com.br/questoes/");
    console.log(`Split questions text into ${chunks.length} chunks.`);

    const parsedQuestions = [];
    let seqNum = 1;

    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      const lines = chunk.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 3) {
        continue;
      }

      const questaoIdStr = lines[0].match(/^(\d+)/)?.[1];
      if (!questaoIdStr) {
        continue;
      }
      const questao_tec_id = parseInt(questaoIdStr, 10);

      // Line 1: Subheader (Banca - Cargo (Órgão)/Órgão/Ano)
      const subheader = lines[1] || '';
      let banca = '';
      let cargo = '';
      let orgao = '';
      let ano = null;

      const subparts = subheader.split(" - ");
      if (subparts.length >= 2) {
        banca = subparts[0].trim();
        const rightSide = subparts.slice(1).join(" - ");
        const rightparts = rightSide.split("/");
        
        if (rightparts.length >= 1) {
          cargo = rightparts[0].trim();
        }
        if (rightparts.length >= 2) {
          orgao = rightparts[1].trim();
        }
        const lastPart = rightparts[rightparts.length - 1];
        const anoMatch = lastPart.match(/\b(19\d\d|20\d\d)\b/);
        if (anoMatch) {
          ano = parseInt(anoMatch[1], 10);
        }
      }

      // Line 2: Subject line (Materia - Assunto)
      const subjectLine = lines[2] || '';
      let materia = '';
      let assunto = '';
      const subjParts = subjectLine.split(" - ");
      if (subjParts.length >= 2) {
        materia = subjParts[0].trim();
        assunto = subjParts.slice(1).join(" - ").trim();
      } else {
        materia = subjectLine.trim();
      }

      // Rest of the text contains question text and alternatives
      const restText = lines.slice(3).join("\n");
      let remainingText = restText.trim();

      // Parse alternatives
      const alternativas = {};

      // Match letter alternatives
      const optionLetters = ['a', 'b', 'c', 'd', 'e'];
      const altIndices = [];

      for (const letter of optionLetters) {
        const altPattern = new RegExp(`(^|\\n)\\s*${letter}\\)\\s+`, 'i');
        const altMatch = remainingText.match(altPattern);
        if (altMatch && altMatch.index !== undefined) {
          altIndices.push({ letter: letter.toUpperCase(), index: altMatch.index, markerLength: altMatch[0].length });
        }
      }

      let enunciado = '';

      if (altIndices.length >= 2) {
        // Sort indices to ensure order
        altIndices.sort((a, b) => a.index - b.index);
        
        enunciado = remainingText.substring(0, altIndices[0].index).trim();

        for (let j = 0; j < altIndices.length; j++) {
          const current = altIndices[j];
          const next = altIndices[j + 1];
          const start = current.index + current.markerLength;
          const end = next ? next.index : remainingText.length;
          alternativas[current.letter] = remainingText.substring(start, end).trim().replace(/\s+/g, ' ');
        }
      } else {
        // Check for Certo/Errado
        const hasCerto = remainingText.toLowerCase().includes("certo");
        const hasErrado = remainingText.toLowerCase().includes("errado");

        if (hasCerto && hasErrado) {
          alternativas["C"] = "Certo";
          alternativas["E"] = "Errado";
          
          enunciado = remainingText
            .replace(/Certo\s*Errado$/i, '')
            .replace(/Certo\s*\n\s*Errado$/i, '')
            .trim();
        } else {
          enunciado = remainingText;
        }
      }

      // Format statement whitespaces
      enunciado = enunciado.replace(/\s+/g, ' ').trim();

      const gabarito = answersMap[seqNum] || null;

      parsedQuestions.push({
        questao_tec_id,
        alternativa: "",
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
        concurso: cargo ? `${banca} - ${cargo}` : banca,
        prova: orgao ? `${orgao} / ${ano || ''}` : '',
        ano,
        caderno_nome: "Competência da Justiça do Trabalho",
        resolucao_professor: null
      });

      seqNum++;
    }

    console.log(`Parsed ${parsedQuestions.length} questions successfully!`);

    // Ingest into Supabase
    console.log("\n--- Checking Existing Questions in Supabase ---");
    
    // Fetch all existing questao_tec_ids from the table
    const { data: existingRows, error: fetchError } = await supabase
      .from('resolucoes')
      .select('questao_tec_id');

    if (fetchError) {
      console.error("Error fetching existing questao_tec_ids:", fetchError);
      return;
    }

    const existingIds = new Set(existingRows.map(r => r.questao_tec_id).filter(Boolean));
    console.log(`Found ${existingIds.size} questions already present in the database.`);

    // Filter parsedQuestions to only keep new ones
    const newQuestions = parsedQuestions.filter(q => !existingIds.has(q.questao_tec_id));
    console.log(`Out of ${parsedQuestions.length} parsed questions, ${newQuestions.length} are new.`);

    if (newQuestions.length === 0) {
      console.log("All questions are already imported! Nothing to do.");
      return;
    }

    console.log("\n--- Ingesting New Questions into Supabase ---");
    
    // Split into chunks of 50 to avoid any request size limits
    const chunkSize = 50;
    let successCount = 0;

    for (let i = 0; i < newQuestions.length; i += chunkSize) {
      const chunk = newQuestions.slice(i, i + chunkSize);
      console.log(`Inserting new questions ${i + 1} to ${Math.min(i + chunkSize, newQuestions.length)}...`);
      
      const { data, error } = await supabase
        .from('resolucoes')
        .insert(chunk);

      if (error) {
        console.error("Error inserting chunk:", error);
        throw error;
      }
      successCount += chunk.length;
    }

    console.log(`\nSuccessfully imported ${successCount} new questions into Supabase!`);
    
  } catch (err) {
    console.error("Error running import:", err);
  }
}

run();
