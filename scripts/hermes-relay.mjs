import { createServer } from 'node:http'
import { appendFileSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { networkInterfaces } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOG_FILE = join(__dirname, '..', 'hermes_events.jsonl')
const ENV_FILE = join(__dirname, '..', '.env.local')
const PORT = 3333
const HOST = '0.0.0.0'

// Carrega credenciais do Supabase do .env.local
const envContent = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf-8') : ''
const SUPABASE_URL = (envContent.match(/^VITE_SUPABASE_URL=(.+)$/m) || [])[1] || ''
const SUPABASE_KEY = (envContent.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m) || [])[1] || ''

process.on('uncaughtException', (err) => {
  console.error('[hermes] Erro não capturado (ignorado):', err.message)
})
process.on('unhandledRejection', (err) => {
  console.error('[hermes] Promise rejeitada não tratada (ignorada):', err?.message || err)
})

function writeEvent(event) {
  const line = JSON.stringify(event) + '\n'
  appendFileSync(LOG_FILE, line, 'utf-8')
}

function readEventsSince(bytes) {
  if (!existsSync(LOG_FILE)) return []
  const content = readFileSync(LOG_FILE, 'utf-8').slice(bytes)
  if (!content) return []
  return content.split('\n').filter(Boolean).map(line => JSON.parse(line))
}

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/event') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const event = JSON.parse(body)
        event._offset = existsSync(LOG_FILE) ? statSync(LOG_FILE).size : 0
        writeEvent(event)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, offset: event._offset }))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  if (req.method === 'GET' && req.url.startsWith('/events')) {
    const url = new URL(req.url, `http://${HOST}:${PORT}`)
    const after = parseInt(url.searchParams.get('after') || '0', 10)
    const events = readEventsSince(after)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ events, total: events.length }))
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, logFile: LOG_FILE }))
    return
  }

  if (req.method === 'GET' && req.url.startsWith('/questao/')) {
    const qid = req.url.split('/')[2]
    if (!qid || !SUPABASE_URL || !SUPABASE_KEY) {
      res.writeHead(qid ? 503 : 400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ erro: qid ? 'Supabase não configurado' : 'ID ausente' }))
      return
    }
    const opts = { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    import('node:https').then(https => {
      const u = new URL(`${SUPABASE_URL}/rest/v1/questoes?id=eq.${qid}&select=*`)
      https.get(u, opts, (r) => {
        let b = ''
        r.on('data', c => b += c)
        r.on('end', () => {
          res.writeHead(r.statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
          res.end(b)
        })
      }).on('error', (e) => {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ erro: e.message }))
      })
    })
    return
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      nome: 'Hermes Relay',
      descricao: 'Central de eventos do app Questões Concursos',
      supabase_conectado: !!(SUPABASE_URL && SUPABASE_KEY),
      rotas: {
        'POST /event': { descricao: 'App envia eventos em tempo real', body: 'JSON { tipo, dados, timestamp }', auth: false },
        'GET /events?after=N': { descricao: 'Busca eventos a partir do byte offset N (catch-up)', auth: false },
        'GET /questao/:id': { descricao: 'Busca dados completos da questão no Supabase', auth: false },
        'GET /health': { descricao: 'Health check', auth: false },
      },
      exemplo_evento: {
        id: 'evt_123_1',
        tipo: 'responder_questao',
        dados: {
          questao_id: 123,
          questao_tec_id: 456789,
          materia: 'Direito Constitucional',
          assunto: 'ADI 3.395',
          banca_texto: 'CESPE',
          orgao: 'STF',
          concurso: 'Analista Judiciário',
          ano: 2023,
          gabarito: 'A',
          alternativa_selecionada: 'B',
          acertou: false,
          tempo_segundos: 45,
          enunciado: 'À luz da jurisprudência do STF...',
          alternativas: { A: 'Correta', B: 'Incorreta', C: 'Incorreta', D: 'Incorreta' },
        },
        timestamp: '2026-06-04T23:00:00.000Z',
        _offset: 512,
      },
    }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ erro: 'rota não encontrada', rotas_disponiveis: ['POST /event', 'GET /events?after=N', 'GET /questao/:id', 'GET /health', 'GET /'] }))
}).listen(PORT, HOST, () => {
  const interfaces = networkInterfaces()
  let ip = 'localhost'
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface || []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ip = addr.address
        break
      }
    }
    if (ip !== 'localhost') break
  }

  console.log(`Hermes Relay rodando em http://localhost:${PORT}`)
  console.log(`De dentro do WSL use: http://${ip}:${PORT}`)
  console.log(`Eventos salvos em: ${LOG_FILE}`)
  console.log(``)
  console.log(`Rotas disponíveis:`)
  console.log(`  POST /event          — receber evento (usado pelo app)`)
  console.log(`  GET  /events?after=N  — buscar eventos a partir do byte offset N`)
  console.log(`  GET  /health          — health check`)
})
