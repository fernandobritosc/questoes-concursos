import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const pdfPath = "C:\\Users\\uniao\\Downloads\\Tec Concursos - Questões para concursos, provas, editais, simulados_.pdf";

async function run() {
  if (!fs.existsSync(pdfPath)) {
    console.error("PDF file not found at:", pdfPath);
    return;
  }

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
    console.log("Sample answers (1-10):", Object.fromEntries(Object.entries(answersMap).slice(0, 10)));

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
      let isMultipleChoice = false;

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
        isMultipleChoice = true;
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
          
          // Remove "Certo" and "Errado" from the end of the statement
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
        seqNum,
        questao_tec_id,
        banca_texto: banca,
        cargo,
        orgao,
        concurso: cargo ? `${banca} - ${cargo}` : banca,
        prova: orgao ? `${orgao} / ${ano || ''}` : '',
        ano,
        materia,
        assunto,
        enunciado,
        alternativas,
        gabarito
      });

      seqNum++;
    }

    console.log(`Parsed ${parsedQuestions.length} questions successfully!`);
    
    if (parsedQuestions.length > 0) {
      console.log("\nSample parsed question (Q1):");
      console.log(JSON.stringify(parsedQuestions[0], null, 2));

      const certs = parsedQuestions.filter(q => Object.keys(q.alternativas).length === 2);
      console.log(`\nFound ${certs.length} Certo/Errado questions.`);
      if (certs.length > 0) {
        console.log("Sample Certo/Errado question parsed:", JSON.stringify(certs[0], null, 2));
      }
    }

  } catch (err) {
    console.error("Error parsing PDF:", err);
  }
}

run();
