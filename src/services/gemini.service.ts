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
  const gabaritoLetra = questao.gabarito || 'Não especificado'
  const gabaritoTexto = (questao.gabarito && questao.alternativas?.[questao.gabarito]) || 'Texto da alternativa correta não especificado'

  const alternativasRestantes = Object.entries(questao.alternativas || {})
    .filter(([letra]) => letra !== alternativaSelecionada && letra !== questao.gabarito)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letra, texto]) => `${letra}) ${texto}`)
    .join('\n')

  const prompt = `
    Aja como um professor especialista de concursos públicos orientando um aluno que errou uma questão.
    O aluno errou a seguinte questão da banca ${questao.banca_texto} sobre ${questao.materia} (${questao.assunto}):
    
    Enunciado:
    ${questao.enunciado}
    
    Alternativa que o aluno marcou (INCORRETA):
    ${alternativaSelecionada}) ${questao.alternativas[alternativaSelecionada]}
    
    Gabarito oficial de referência:
    ${gabaritoLetra}) ${gabaritoTexto}
    
    Outras alternativas da questão (também incorretas):
    ${alternativasRestantes}
    
    DIRETRIZ DE PRECISÃO JURÍDICA (CRÍTICA):
    Ao explicar a competência da Justiça do Trabalho (Art. 114 da CF) sobre servidores públicos, siga estritamente a jurisprudência consolidada do STF (ADI 3.395-DF) e Súmula 137 do STJ:
    - A Justiça do Trabalho NÃO tem competência para julgar causas de servidores estatutários (regime estatutário) ou temporários em regime jurídico-administrativo (Art. 37, IX, CF).
    - O julgamento de servidores estatutários ou temporários cabe exclusivamente à Justiça Comum (Estadual para Estados/Municípios, Federal para a União).
    - A Justiça do Trabalho SÓ é competente para servidores celetistas (CLT - empregados públicos), empresas públicas e sociedades de economia mista.
    Nunca afirme que a EC 45/2004 deu competência à Justiça do Trabalho para julgar servidores estatutários. A ADI 3.395 do STF suspendeu qualquer interpretação nesse sentido.
    
    Se o Gabarito de referência for 'Não especificado', você deve deduzir qual alternativa é a correta analisando o enunciado e as opções, explicando-a no local do gabarito. Nunca afirme que a questão não tem resposta ou que o gabarito é 'null' se for viável identificar a alternativa correta juridicamente.
    
    Escreva uma explicação detalhada e altamente estruturada seguindo ESTRITAMENTE a estrutura abaixo, utilizando exatamente estes títulos em Markdown (###):
    
    ### 📚 Análise do Seu Erro
    [Explique de forma clara por que a alternativa marcada pelo aluno (${alternativaSelecionada}) está errada. Se houver uma pegadinha clássica da banca na opção selecionada, inicie o parágrafo estritamente com o prefixo "Pegadinha: [texto]" para que ela seja destacada visualmente em um card.]
    
    ### ✅ Justificativa do Gabarito
    [Explique de forma detalhada por que o gabarito oficial (${gabaritoLetra}) é o correto.]
    
    ### 🔍 Outras Alternativas
    [Para CADA UMA das outras alternativas incorretas restantes, crie obrigatoriamente um parágrafo explicativo individual e separado por uma quebra de linha dupla. Cada alternativa deve começar em sua própria linha (ex: "Alternativa X está errada porque..."). NUNCA agrupe a explicação de múltiplas alternativas em uma única linha ou parágrafo. Se alguma das alternativas contiver uma pegadinha clássica da banca, inicie esse parágrafo estritamente com o prefixo "Pegadinha: [texto]" no começo da linha para que seja renderizada em um card.]
    
    ### 💡 Dica de Prova
    [Se houver alguma dica de ouro ou mnemônico valioso para memorização na prova, crie um parágrafo iniciando estritamente com o prefixo "Dica de Prova: [texto]".]
    
    Use uma linguagem acolhedora, focada em guiar o aprendizado do aluno. Garanta que todas as opções da questão fiquem explicadas.
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
  const gabaritoLetra = questao.gabarito || 'Não especificado'

  const alternativasStr = Object.entries(questao.alternativas || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letra, texto]) => `${letra}) ${texto}`)
    .join('\n')

  const prompt = `
    Aja como um professor especialista de concursos públicos que está escrevendo a resolução oficial, estruturada e detalhada de uma questão.
    
    Questão da banca ${questao.banca_texto} sobre ${questao.materia} - ${questao.assunto}:
    
    Enunciado:
    ${questao.enunciado}
    
    Alternativas:
    ${alternativasStr}
    
    Gabarito oficial de referência: ${gabaritoLetra}
    
    DIRETRIZ DE PRECISÃO JURÍDICA (CRÍTICA):
    Ao explicar a competência da Justiça do Trabalho (Art. 114 da CF) sobre servidores públicos, siga estritamente a jurisprudência consolidada do STF (ADI 3.395-DF) e Súmula 137 do STJ:
    - A Justiça do Trabalho NÃO tem competência para julgar causas de servidores estatutários (regime estatutário) ou temporários em regime jurídico-administrativo (Art. 37, IX, CF).
    - O julgamento de servidores estatutários ou temporários cabe exclusivamente à Justiça Comum (Estadual para Estados/Municípios, Federal para a União).
    - A Justiça do Trabalho SÓ é competente para servidores celetistas (CLT - empregados públicos), empresas públicas e sociedades de economia mista.
    Nunca afirme que a EC 45/2004 deu competência à Justiça do Trabalho para julgar servidores estatutários. A ADI 3.395 do STF suspendeu qualquer interpretação nesse sentido.
    
    Se o Gabarito de referência for 'Não especificado', você deve deduzir qual alternativa é a correta analisando o enunciado e as opções, explicando-a no local do gabarito. Nunca afirme que a questão não tem resposta ou que o gabarito é 'null' se for viável identificar a alternativa correta juridicamente.
    
    Você DEVE obrigatoriamente produzir uma resolução completa que explique e detalhe cada uma das alternativas individualmente, sem pular nenhuma opção.
    
    Siga ESTRITAMENTE a estrutura abaixo em sua resposta, utilizando exatamente estes títulos em Markdown (###):
    
    ### 📚 Introdução Conceitual
    [Escreva aqui uma breve introdução conceitual ou teórica sobre o tema da questão. Você pode destacar pontos teóricos de alta relevância ou regras importantes iniciando o parágrafo estritamente com "Atenção: [texto]" ou "Importante: [texto]" para que o sistema renderize em cards destacados.]
    
    ### ✅ Gabarito Comentado
    [Escreva aqui uma explicação aprofundada de por que o gabarito oficial (${gabaritoLetra}) está correto.]
    
    ### 🔍 Análise das Alternativas
    [Para CADA UMA das outras alternativas incorretas, crie obrigatoriamente um parágrafo explicativo individual e separado por uma quebra de linha dupla. Cada alternativa deve começar em sua própria linha (ex: "Alternativa A está incorreta porque..."). NUNCA junte ou agrupe a explicação de múltiplas alternativas em uma única linha ou parágrafo. Se alguma alternativa contiver uma pegadinha clássica da banca, a explicação dessa alternativa deve iniciar estritamente com o prefixo "Pegadinha: [texto]" no começo do parágrafo, para que ela seja destacada em um card visual.]
    
    ### 💡 Dica de Prova
    [Se houver uma dica rápida ou macete de prova para acelerar a resolução, crie um parágrafo iniciando estritamente com o prefixo "Dica de Prova: [texto]".]
    
    ### 📝 Resumo da Questão
    [Termine com uma síntese de fechamento iniciando o parágrafo estritamente com o prefixo "Resumo: [texto]". Não misture outros prefixos como "Atenção" ou "Importante" nesta linha.]
    
    Use uma linguagem formal, clara e muito didática. Certifique-se de justificar o erro de todas as alternativas incorretas individualmente para ajudar o aluno a aprender.
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
    Aponte de 2 a 3 pegadinhas ou cascas de banana clássicas que as bancas costumam colocar nas questões deste assunto para confundir os candidatos. Escreva cada pegadinha em seu próprio parágrafo individual separado por uma quebra de linha dupla. Cada um desses parágrafos deve iniciar estritamente com o prefixo "Pegadinha: [texto]" no começo da linha para que ela seja devidamente destacada visualmente.

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
