/**
 * gemini.service.ts
 * Camada centralizada de acesso à API do Google Gemini.
 * Todos os prompts e chamadas ao modelo passam por aqui.
 */
import { geminiModel } from '../lib/gemini'

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface FraquezaItem {
  assunto: string
  materia: string
  taxa: number
  total: number
}

export interface QuestaoParaExplicacao {
  banca_texto?: string | null
  materia?: string | null
  assunto?: string | null
  enunciado?: string | null
  alternativas: Record<string, string>
  gabarito?: string | null
}

// ─── Funções de Serviço ────────────────────────────────────────────────────────

/**
 * Gera uma explicação de erro para uma questão específica no Caderno de Erros.
 */
export async function gerarExplicacaoErro(
  questao: QuestaoParaExplicacao,
  alternativaSelecionada: string
): Promise<string> {
  const prompt = `
    Aja como um professor especialista de concursos públicos.
    O aluno errou a seguinte questão da banca ${questao.banca_texto} sobre ${questao.materia} (${questao.assunto}):
    
    Enunciado:
    ${questao.enunciado}
    
    Alternativa que o aluno marcou (INCORRETA):
    ${questao.alternativas[alternativaSelecionada]}
    
    Gabarito correto:
    ${questao.alternativas[questao.gabarito || '']}
    
    Explique de forma direta e didática:
    1. Por que a alternativa marcada pelo aluno está errada (qual foi a "pegadinha" ou erro de conceito).
    2. Por que o gabarito é o correto.
    Use uma linguagem amigável, encorajadora e focada na preparação para concursos. Formate bem o texto com parágrafos e sem markdown excessivo.
  `
  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}

/**
 * Gera uma explicação detalhada (resolução do professor) para uma questão via IA.
 * Usada no painel de questões para gerar resolução automática.
 */
export async function gerarResolucaoProfessor(
  questao: QuestaoParaExplicacao
): Promise<string> {
  const alternativasStr = Object.entries(questao.alternativas || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letra, texto]) => `${letra}) ${texto}`)
    .join('\n')

  const prompt = `
    Aja como um professor especialista de concursos públicos que está escrevendo a resolução oficial de uma questão.
    
    Questão da banca ${questao.banca_texto} sobre ${questao.materia} - ${questao.assunto}:
    
    Enunciado:
    ${questao.enunciado}
    
    Alternativas:
    ${alternativasStr}
    
    Gabarito: ${questao.gabarito}
    
    Escreva uma resolução detalhada e didática desta questão que:
    1. Explique por que o gabarito (${questao.gabarito}) está correto
    2. Explique por que as demais alternativas estão erradas (principalmente as que são "pegadinhas")
    3. Contextualize com a teoria necessária para resolver este tipo de questão
    
    Use uma linguagem clara, direta e encorajadora. Não use markdown excessivo.
  `
  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}

/**
 * Gera um plano de estudos semanal com base nas fraquezas detectadas.
 */
export async function gerarPlanoEstudos(fraquezas: FraquezaItem[]): Promise<string> {
  const listaAssuntosStr = fraquezas
    .slice(0, 5)
    .map(f => `- ${f.materia}: ${f.assunto} (${f.taxa}% de acerto)`)
    .join('\n')

  const prompt = `
    Aja como um mentor de alto nível para concursos públicos.
    Eu sou um aluno e estas são as minhas 5 maiores fraquezas atuais baseadas na minha taxa de acerto:
    ${listaAssuntosStr}

    Por favor, gere um Plano de Estudos direcionado e prático para a próxima semana, focando em melhorar esses pontos fracos.
    Divida em:
    1. Diagnóstico breve (o que esses erros indicam).
    2. Cronograma Semanal (Dia 1 ao Dia 7) com metas práticas (ex: "Dia 1: Revisar teoria X e fazer 10 questões da banca Y").
    3. Dica de Ouro de memorização ou foco para essas matérias específicas.

    Mantenha um tom encorajador e direto. Formate bem usando markdown, mas não de forma exagerada.
  `
  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}

/**
 * Gera um prompt de parsing de PDF com questões de concurso.
 * Retorna o texto do prompt (o parsing em si é feito no hook useQuestoes).
 */
export function buildPdfParsingPrompt(
  pageText: string,
  cadernoName: string
): string {
  return `
Você é um sistema especializado em estruturar questões de concursos públicos em JSON.

Analise o texto abaixo extraído de um PDF de questões do banco de dados TEC Concursos e extraia TODAS as questões presentes.

Para cada questão encontrada, retorne um objeto JSON com os campos:
- questao_tec_id: número inteiro do ID da questão (ex: 1234567) - OBRIGATÓRIO
- enunciado: texto completo do enunciado da questão
- alternativas: objeto com as alternativas (ex: {"A": "texto", "B": "texto", ...})
- gabarito: letra do gabarito (A, B, C, D ou E)
- materia: matéria principal da questão
- assunto: assunto específico da questão
- banca_texto: nome da banca examinadora
- orgao: órgão/instituição do concurso
- ano: ano do concurso (número inteiro)
- caderno: "${cadernoName}"
- acertou: false
- alternativa: ""
- data_resolucao: "${new Date().toISOString()}"

Retorne APENAS um array JSON válido com as questões encontradas, sem texto adicional.
Se não encontrar questões, retorne um array vazio: []

Texto do PDF:
${pageText}
  `.trim()
}
