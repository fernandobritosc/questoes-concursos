/**
 * gemini.service.ts
 * Camada centralizada de acesso à API do Google Gemini.
 * Todos os prompts e chamadas ao modelo passam por aqui, agora redirecionados de forma segura pelo backend.
 */

import { supabase } from '../lib/supabase'

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

// ─── Helper de Comunicação Backend ───────────────────────────────────────────

/**
 * Envia um prompt para o endpoint backend serverless que executa o Gemini de forma segura.
 */
async function chamarGeminiBackend(prompt: string, options?: { responseMimeType?: string }): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token || ''

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ prompt, responseMimeType: options?.responseMimeType })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Erro ao obter resposta do Mentor IA no servidor.')
  }

  const data = await response.json()
  return data.text
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
    1. Por que a alternativa marcada pelo aluno está errada. Se houver uma pegadinha ou erro de conceito clássico da banca, inicie a frase explicativa com "Pegadinha: " para que ela seja destacada visualmente.
    2. Por que o gabarito é o correto.
    3. Se houver alguma dica de ouro ou mnemônico valioso para memorização na prova, inicie a linha com "Dica de Prova: ".
    
    Use uma linguagem amigável, encorajadora e focada na preparação para concursos. Formate bem o texto com parágrafos e sem markdown excessivo.
  `
  return chamarGeminiBackend(prompt)
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
    1. Explique por que o gabarito (${questao.gabarito}) está correto.
    2. Explique por que as demais alternativas estão erradas. Se alguma alternativa for uma pegadinha comum, inicie a explicação dela com "Pegadinha: ".
    3. Destaque pontos teóricos de alta relevância ou regras importantes iniciando com "Atenção: " ou "Importante: ".
    4. Se houver uma dica rápida ou macete de prova para acelerar a resolução, inicie o parágrafo com "Dica de Prova: ".
    5. Termine com uma síntese de fechamento iniciando com "Resumo: ".
    
    Use uma linguagem clara, direta e encorajadora. Não use markdown excessivo.
  `
  return chamarGeminiBackend(prompt)
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
    Aja como um mentor de alto nível especializado em concursos públicos.
    Eu sou um aluno e estas são as minhas 5 maiores fraquezas atuais baseadas na minha taxa de acerto em questões:
    ${listaAssuntosStr}

    Por favor, elabore um plano de estudos tático semanal de 7 dias com base nas minhas fraquezas.
    Você DEVE responder a essa solicitação ESTRITAMENTE em formato JSON.
    Não adicione blocos de código markdown (\`\`\`json ou \`\`\`), não adicione textos explicativos extras fora do JSON. Retorne apenas o JSON bruto e válido.

    Formato JSON exigido:
    {
      "diagnostico": "Um parágrafo de análise técnica sincera, estratégica e encorajadora do mentor sobre os pontos onde o aluno está falhando e o que isso indica sobre o seu método de estudo.",
      "cronograma": [
        {
          "dia": "Segunda-feira",
          "materia": "Nome da matéria da fraqueza",
          "topicos": ["Subtópico 1", "Subtópico 2"],
          "carga": "Leve, Moderada ou Intensa",
          "questoes_sugeridas": 15,
          "meta_estudo": "Roteiro de ação prático e focado no assunto para o dia (ex: ler resumos de súmulas, resolver caderno de erros, ou cobrir lei seca de artigos X a Y)."
        },
        ... (gere para todos os 7 dias da semana seguindo a mesma estrutura)
      ],
      "dica_ouro": "Uma dica rápida de ouro ou mnemônico focado de memorização para essas fraquezas mapeadas."
    }
  `.trim()

  return chamarGeminiBackend(prompt, { responseMimeType: 'application/json' })
}

/**
 * Gera uma mentoria super detalhada e tática para uma fraqueza de assunto específica.
 */
export async function gerarMentoriaAssunto(fraqueza: FraquezaItem): Promise<string> {
  const prompt = `
    Aja como um mentor e professor de altíssimo nível especializado na preparação para concursos públicos brasileiros.
    Eu sou um concurseiro e estou enfrentando grandes dificuldades no seguinte tema específico:
    - **Matéria**: ${fraqueza.materia}
    - **Assunto**: ${fraqueza.assunto}
    - **Meu Desempenho Atual**: Apenas ${fraqueza.taxa}% de acertos em um total de ${fraqueza.total} questões resolvidas.

    Por favor, elabore um diagnóstico e guia de mentoria extremamente prático, aprofundado, direcionado e NÃO GENÉRICO para eu dominar este assunto. O seu guia deve ser formatado em Markdown e conter as seguintes seções estruturadas:

    ### 🎯 1. Diagnóstico do Tema
    Explique brevemente por que este assunto costuma ser desafiador, a relevância dele para provas e qual a chave conceitual que eu preciso virar na mente para compreendê-lo (evite generalidades, explique a lógica por trás da matéria).

    ### 🔥 2. Tópicos Quentes (O que mais cai)
    Seja específico e preciso. Liste as principais regras, súmulas, artigos de lei ou conceitos teóricos que são disparadamente os mais cobrados pelas bancas examinadoras sobre este assunto específico. Diga exatamente no que focar.

    ### ⚠️ 3. Pegadinhas e Armadilhas da Banca
    Aponte de 2 a 3 pegadinhas ou cascas de banana clássicas que as bancas costumam colocar nas questões deste assunto para confundir os candidatos. Inicie cada item explicativo da pegadinha estritamente com o prefixo "Pegadinha: " (ex: "Pegadinha: A banca tenta trocar a competência X pela Y...").

    ### 🚀 4. Plano de Ataque (Como estudar)
    Forneça um roteiro passo a passo prático de estudo e revisão ativa para este tema (ex: "1º Passo: Ler atentamente o artigo X... 2º Passo: Criar uma tabela comparativa entre... 3º Passo: Resolver questões focadas em...").

    ### 💡 5. Dica de Prova & Memorização
    Forneça uma dica de prova valiosa, um mnemônico inteligente, uma associação mental ou um resumo visual ultra-focado para eu não esquecer mais as regras fundamentais deste assunto. Inicie o parágrafo explicativo da dica estritamente com o prefixo "Dica de Prova: ".

    ### 💻 6. Prompt de Estudo Ativo (Google NotebookLM)
    Gere um prompt altamente focado para eu copiar e colar no **Google NotebookLM** (uma IA baseada em documentos). O prompt gerado deve ser incluído **estritamente** dentro de um bloco de código markdown com a linguagem \`notebooklm\` (ex: \`\`\`notebooklm\n[Prompt de NotebookLM]\n\`\`\`).
    O prompt de NotebookLM deve instruir a IA do NotebookLM a:
    1. Agir como um examinador rigoroso especializado em concursos sobre o assunto "${fraqueza.assunto}" (${fraqueza.materia}).
    2. Realizar perguntas de recall ativo (active recall) baseadas unicamente nos documentos que eu fizer upload (ex: leis secas, resumos, PDFs).
    3. Fazer uma pergunta por vez, esperar minha resposta, avaliá-la dando nota e só então seguir para a próxima pergunta.
    4. Simular pegadinhas clássicas das bancas e pedir que eu identifique o erro conceitual.

    Mantenha um tom altamente profissional, objective, direto e motivador. Diga com precisão o que eu preciso fazer para subir minha taxa de acerto. Use markdown limpo, com títulos claros e boa legibilidade.
  `.trim()

  return chamarGeminiBackend(prompt)
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

/**
 * Gera um diagnóstico tático de desempenho e conselho exclusivo baseado nos erros de um simulado específico.
 */
export async function gerarFeedbackSimulado(
  erros: { materia: string; assunto: string }[],
  acertos: number,
  total: number
): Promise<string> {
  const taxaAcerto = total > 0 ? Math.round((acertos / total) * 100) : 0

  let errosStr = ''
  if (erros.length > 0) {
    errosStr = erros
      .map(e => `- ${e.materia || 'Sem Matéria'}: ${e.assunto || 'Geral'}`)
      .join('\n')
  } else {
    errosStr = 'Nenhum erro cometido! Parabéns, aproveitamento de 100% neste simulado.'
  }

  const prompt = `
    Aja como um mentor de alto nível para concursos públicos.
    Eu acabo de realizar um Simulado Inteligente Personalizado com os seguintes resultados:
    - Acertos: ${acertos} de ${total} (${taxaAcerto}% de aproveitamento)
    
    Tópicos onde cometi erros neste simulado:
    ${errosStr}

    Por favor, forneça um conselho exclusivo de mentor IA de como estudar os pontos onde falhei:
    1. **Análise Tática**: Um breve comentário de incentivo ou crítica construtiva com base na taxa de acerto (${taxaAcerto}%).
    2. **Plano de Ataque**: Orientações claras, estratégicas e práticas sobre como estudar/revisar cada um dos tópicos falhados (use os tópicos listados acima).
    3. Destaque avisos cruciais ou alertas iniciando a linha com "Atenção: " ou "Dica de Prova: " para que o sistema renderize em cards destacados.

    Use uma linguagem motivadora, objetiva e profissional. Formate a resposta usando markdown com títulos claros e boa legibilidade.
  `.trim()

  return chamarGeminiBackend(prompt)
}
