import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

type NextFunction = (err?: Error) => void

interface VercelLikeRequest {
  url?: string
  body?: unknown
  on?: (event: string, handler: (chunk: Buffer) => void) => void
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse
  json: (data: Record<string, unknown>) => void
  setHeader: (name: string, value: string) => VercelLikeResponse
}

// Middleware local para emular a função serverless /api/gemini em desenvolvimento local (npm run dev)
function apiEmulatorPlugin() {
  return {
    name: 'api-emulator',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: VercelLikeRequest, res: {
        statusCode: number
        setHeader: (name: string, value: string) => void
        end: (data: string) => void
      }, next: NextFunction) => {
        if (req.url?.startsWith('/api/gemini')) {
          try {
            const module = await server.ssrLoadModule('./api/gemini.ts')
            const handler = module.default as (req: VercelLikeRequest, res: VercelLikeResponse) => void

            const chunks: Buffer[] = []
            req.on?.('data', (chunk: Buffer) => { chunks.push(chunk) })
            await new Promise<void>((resolve) => req.on?.('end', () => resolve()))
            const bodyText = Buffer.concat(chunks).toString()
            const body = bodyText ? JSON.parse(bodyText) : {}

            const vercelReq = { ...req, body }

            const vercelRes: VercelLikeResponse = {
              status(code: number) {
                res.statusCode = code
                return this
              },
              json(data: Record<string, unknown>) {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              },
              setHeader(name: string, value: string) {
                res.setHeader(name, value)
                return this
              }
            }

            await handler(vercelReq, vercelRes)
          } catch (err: unknown) {
            console.error('Erro no emulador de API local:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            const message = err instanceof Error ? err.message : String(err)
            res.end(JSON.stringify({ error: 'Erro no emulador local', details: message }))
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
    plugins: [
      react(),
      tailwindcss(),
      apiEmulatorPlugin(),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/react-router')) {
              return 'vendor-router'
            }
            if (id.includes('node_modules/recharts')) {
              return 'vendor-recharts'
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide'
            }
            if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-') || id.includes('node_modules/unified')) {
              return 'vendor-markdown'
            }
          },
        },
      },
    },
  }
})
