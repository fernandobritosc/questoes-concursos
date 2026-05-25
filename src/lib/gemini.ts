import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

if (!apiKey) {
  console.warn('Falta a variável de ambiente VITE_GEMINI_API_KEY.')
}

export const genAI = new GoogleGenerativeAI(apiKey || '')

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
