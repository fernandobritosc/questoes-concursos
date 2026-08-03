import type { VercelRequest, VercelResponse } from '@vercel/node'
import jwt from 'jsonwebtoken'
import Groq from 'groq-sdk'

const apiKey = process.env.GROQ_API_KEY

if (!apiKey) {
  throw new Error('GROQ_API_KEY não configurada no ambiente do servidor.')
}

// Secret do backend próprio (Fastify). Em produção, defina via variável de ambiente.
const jwtSecret = process.env.JWT_SECRET || 'troque-este-secret-na-producao-2026'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' })
  }

  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado: Token de autenticação ausente.' })
  }

  try {
    let payload: jwt.JwtPayload | string | null = null
    try {
      payload = jwt.verify(token, jwtSecret)
    } catch {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' })
    }
    if (!payload || typeof payload === 'string' || !payload.sub) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' })
    }

    const { prompt, responseMimeType } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Parâmetro "prompt" é obrigatório e deve ser uma string.' })
    }

    const groq = new Groq({ apiKey })

    const options: Groq.Chat.CompletionCreateParams = {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }]
    }

    if (responseMimeType === 'application/json') {
      options.response_format = { type: 'json_object' }
    }

    const chatCompletion = await groq.chat.completions.create(options)
    const text = chatCompletion.choices[0]?.message?.content || ''

    return res.status(200).json({ text })
  } catch (error: unknown) {
    console.error('Erro no processamento da requisição:', error)
    return res.status(500).json({ 
      error: 'Erro interno ao processar a requisição com o Groq AI.',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}
