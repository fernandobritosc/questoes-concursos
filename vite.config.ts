import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Middleware local para emular a função serverless /api/gemini em desenvolvimento local (npm run dev)
function apiEmulatorPlugin() {
  return {
    name: 'api-emulator',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/gemini')) {
          try {
            // Importa o handler dinamicamente usando o ssrLoadModule do Vite
            const module = await server.ssrLoadModule('./api/gemini.ts')
            const handler = module.default

            // Mock de VercelRequest consumindo os chunks da requisição
            const chunks = []
            for await (const chunk of req) {
              chunks.push(chunk)
            }
            const bodyText = Buffer.concat(chunks).toString()
            const body = bodyText ? JSON.parse(bodyText) : {}

            const vercelReq = Object.assign(req, { body })

            // Mock de VercelResponse
            const vercelRes = {
              status(statusCode: number) {
                res.statusCode = statusCode
                return this
              },
              json(data: any) {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
                return this
              },
              setHeader(name: string, value: string) {
                res.setHeader(name, value)
                return this
              }
            }

            await handler(vercelReq, vercelRes)
          } catch (err: any) {
            console.error('Erro no emulador de API local:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Erro no emulador local', details: err.message }))
          }
          return
        }
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis do arquivo .env.local para o process.env do Node
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }

  return {
    plugins: [react(), tailwindcss(), apiEmulatorPlugin()],
  }
})
