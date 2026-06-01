import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Configura o SDK do Gemini usando a chave de API segura do backend
const apiKey = process.env.GEMINI_API_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Define cabeçalhos de CORS e JSON
  res.setHeader('Content-Type', 'application/json')

  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' })
  }

  // Verifica se a chave de API está configurada no backend
  if (!apiKey) {
    console.error('Erro de Configuração: GEMINI_API_KEY não está configurada no ambiente do servidor.')
    return res.status(500).json({ 
      error: 'A chave de API do Gemini (GEMINI_API_KEY) não está configurada no backend. Por favor, adicione-a às variáveis de ambiente.' 
    })
  }

  try {
    const { prompt } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Parâmetro "prompt" é obrigatório e deve ser uma string.' })
    }

    // Inicializa a instância do Google Generative AI de forma segura no backend
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    // Executa a chamada à API do Gemini
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return res.status(200).json({ text })
  } catch (error: any) {
    console.error('Erro ao chamar o Gemini no backend:', error)
    return res.status(500).json({ 
      error: 'Erro interno ao processar a requisição com o Gemini AI.',
      details: error.message || String(error)
    })
  }
}
