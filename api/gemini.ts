import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Configura o SDK do Gemini usando a chave de API segura do backend
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

// Configura o cliente Admin do Supabase no backend
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null

export default async function handler(req: any, res: any) {
  // Define cabeçalhos de CORS e JSON
  res.setHeader('Content-Type', 'application/json')

  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' })
  }

  // 1. Validação do Token JWT do Supabase no Backend
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'Acesso negado: Token de autenticação ausente.' })
  }

  if (!supabase) {
    console.error('Erro de Configuração: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente no ambiente do servidor.')
    return res.status(500).json({ 
      error: 'Erro interno de configuração de autenticação do backend. Certifique-se de definir as variáveis de ambiente.' 
    })
  }

  try {
    // Valida o token JWT diretamente com a API de autenticação do Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' })
    }

    // 2. Validação da Chave do Gemini
    if (!apiKey) {
      console.error('Erro de Configuração: GEMINI_API_KEY não está configurada no ambiente do servidor.')
      return res.status(500).json({ 
        error: 'A chave de API do Gemini (GEMINI_API_KEY) não está configurada no backend.' 
      })
    }

    const { prompt, responseMimeType } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Parâmetro "prompt" é obrigatório e deve ser uma string.' })
    }

    // 3. Execução Segura do Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    
    const generationConfig: any = {}
    if (responseMimeType) {
      generationConfig.responseMimeType = responseMimeType
    }

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      generationConfig
    })

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return res.status(200).json({ text })
  } catch (error: any) {
    console.error('Erro no processamento da requisição:', error)
    return res.status(500).json({ 
      error: 'Erro interno ao processar a requisição com o Gemini AI.',
      details: error.message || String(error)
    })
  }
}
