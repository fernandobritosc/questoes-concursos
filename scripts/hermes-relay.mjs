import { createServer } from 'node:http'
import { openSync, writeSync, fsyncSync, closeSync, readFileSync, existsSync, statSync, renameSync } from 'node:fs'
import { createGzip } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOG_FILE = join(__dirname, '..', 'hermes_events.jsonl')
const LOG_DIR = dirname(LOG_FILE)
const ENV_FILE = join(__dirname, '..', '.env.local')
const MAX_PAYLOAD_BYTES = 64 * 1024
const MAX_LOG_BYTES = 50 * 1024 * 1024
const ROTATION_KEEP_DAYS = 30

const envContent = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf-8') : ''
const envVal = (k) => (envContent.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1] || ''

const RELAY_BIND = envVal('HERMES_RELAY_URL') || 'http://127.0.0.1:3333'
const bindUrl = new URL(RELAY_BIND)
const HOST = bindUrl.hostname
const PORT = parseInt(bindUrl.port, 10) || 3333
const SUPABASE_URL = envVal('VITE_SUPABASE_URL')
const SUPABASE_KEY = envVal('VITE_SUPABASE_ANON_KEY')

const ALLOWED_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

process.on('uncaughtException', (err) => {
  console.error('[hermes] Erro não capturado (ignorado):', err.message)
})
process.on('unhandledRejection', (err) => {
  console.error('[hermes] Promise rejeitada não tratada (ignorada):', err?.message || err)
})

let currentDay = new Date().toISOString().slice(0, 10)

function shouldRotate() {
  const today = new Date().toISOString().slice(0, 10)
  if (today !== currentDay) {
    currentDay = today
    return `day-${today}`
  }
  if (existsSync(LOG_FILE) && statSync(LOG_FILE).size >= MAX_LOG_BYTES) {
    return `size-${Date.now()}`
  }
  return null
}

async function rotateAndCompress(reason) {
  if (!existsSync(LOG_FILE)) return
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const archive = join(LOG_DIR, `hermes_events_${ts}.jsonl`)
  renameSync(LOG_FILE, archive)
  console.log(`[hermes] JSONL rotacionado (${reason}) → ${archive}`)
  const gz = createGzip()
  const src = await import('node:fs').then(fs => fs.createReadStream(archive))
  const dst = await import('node:fs').then(fs => fs.createWriteStream(`${archive}.gz`))
  await new Promise((resolve, reject) => {
    src.pipe(gz).pipe(dst).on('finish', resolve).on('error', reject)
  })
  await import('node:fs').then(fs => fs.promises.unlink(archive))
  console.log(`[hermes] Compactado → ${archive}.gz`)
  await purgeOldArchives()
}

async function purgeOldArchives() {
  const cutoff = Date.now() - ROTATION_KEEP_DAYS * 24 * 60 * 60 * 1000
  const { readdirSync } = await import('node:fs')
  for (const name of readdirSync(LOG_DIR)) {
    if (!name.startsWith('hermes_events_') || !name.endsWith('.jsonl.gz')) continue
    const full = join(LOG_DIR, name)
    const mtimeMs = statSync(full).mtimeMs
    if (mtimeMs < cutoff) {
      await import('node:fs').then(fs => fs.promises.unlink(full))
      console.log(`[hermes] Arquivo antigo removido: ${name}`)
    }
  }
}

async function writeEvent(event) {
  const reason = shouldRotate()
  if (reason) await rotateAndCompress(reason)
  const line = JSON.stringify(event) + '\n'
  const fd = openSync(LOG_FILE, 'a')
  try {
    writeSync(fd, line, 'utf-8')
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
}

function readEventsSince(bytes) {
  if (!existsSync(LOG_FILE)) return []
  const buf = readFileSync(LOG_FILE)
  if (bytes >= buf.length) return []
  // bytes > 0: skip past the first newline to exclude the event at position 'bytes'
  let start = bytes
  if (bytes > 0) {
    const nl = buf.indexOf('\n', bytes)
    if (nl === -1) return []
    start = nl + 1
  }
  const content = buf.slice(start).toString('utf-8')
  if (!content) return []
  return content.split('\n').filter(Boolean).map(line => JSON.parse(line))
}

createServer((req, res) => {
  const origin = req.headers.origin || ''
  if (ALLOWED_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/event') {
    let body = ''
    let aborted = false
    req.on('data', chunk => {
      if (aborted) return
      body += chunk
      if (body.length > MAX_PAYLOAD_BYTES) {
        aborted = true
        res.writeHead(413, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `payload excede ${MAX_PAYLOAD_BYTES} bytes` }))
        req.destroy()
      }
    })
    req.on('end', async () => {
      if (aborted) return
      try {
        const event = JSON.parse(body)
        event._offset = existsSync(LOG_FILE) ? statSync(LOG_FILE).size : 0
        await writeEvent(event)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, offset: event._offset }))
      } catch (err) {
        const origem = `${req.socket.remoteAddress}:${req.socket.remotePort}`
        console.error(`[hermes] JSON inválido de ${origem} — método=${req.method} url=${req.url} body(${body.length}B)="${body.slice(0, 80)}"`)
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
  console.log(`Hermes Relay rodando em http://${HOST}:${PORT}`)
  console.log(`Eventos salvos em: ${LOG_FILE}`)
  console.log(`Max payload: ${MAX_PAYLOAD_BYTES} bytes`)
  console.log(`Rotação: ${MAX_LOG_BYTES / 1024 / 1024} MB ou troca de dia → hermes_events_*.jsonl.gz (mantém ${ROTATION_KEEP_DAYS} dias)`)
  console.log(``)
  console.log(`Rotas disponíveis:`)
  console.log(`  POST /event          — receber evento (usado pelo app)`)
  console.log(`  GET  /events?after=N  — buscar eventos a partir do byte offset N`)
  console.log(`  GET  /health          — health check`)
})
