import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis do arquivo .env.local para o process.env do Node
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }

  return {
    plugins: [
      react(),
      tailwindcss(),
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
    server: {
      proxy: {
        // Backend próprio (Fastify) — default local; sobrescrever com VITE_PROXY_TARGET
        // ex.: VITE_PROXY_TARGET=http://204.216.111.13:3000 para usar a VM em dev
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: true,
          rewrite: (p: string) => p.replace(/^\/api/, ''),
        },
      },
    },
  }
})
