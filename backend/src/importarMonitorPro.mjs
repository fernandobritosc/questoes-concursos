/**
 * importarMonitorPro.mjs — Importa os dados do app MONITOR PRO (Supabase → Postgres da VM).
 *
 * Separado de importarSupabase.mjs (Questões Concursos) — os projetos têm tabelas distintas.
 *
 * Pré-requisitos:
 *   1. Túnel SSH ativo: ssh -L 5432:127.0.0.1:5432 ubuntu@204.216.111.13
 *   2. Dados em ../export_monitorpro/ (CSVs exportados no dashboard Supabase):
 *        profiles.csv, flashcards.csv, editais_materias.csv, discursivas.csv,
 *        news_feed.csv, ranking_geral.csv, registros_estudos.csv
 *   3. users: reutiliza ../export/users.json + cria os usuários que existem só nos
 *      profiles do Monitor Pro (com senha provisória) para não violar a FK profiles→users
 *   4. Rodar a partir do backend/: node src/importarMonitorPro.mjs [--dry-run]
 *
 * Ordem: users → profiles → registros_estudos → flashcards → editais_materias
 *        → discursivas → news_feed → ranking_geral
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { logger } from './logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXPORT_DIR = path.resolve(__dirname, '../../export_monitorpro')
const USERS_JSON = path.resolve(__dirname, '../../export/users.json')

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://concursos_app:concursos_app_secret_2026@127.0.0.1:5432/concursos'
const SENHA_PROVISORIA = process.env.SENHA_PROVISORIA || 'mudar123'
const BATCH = 500

const SENDO_DRY_RUN = process.argv.includes('--dry-run')

function log(msg) {
  logger.info(msg)
}

/** Parser CSV simples com suporte a aspas duplas (RFC 4180). */
function parseCsv(txt) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i]
    if (inQuotes) {
      if (c === '"') {
        if (txt[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

function loadCsv(name) {
  const file = path.join(EXPORT_DIR, `${name}.csv`)
  if (!fs.existsSync(file)) {
    log(`  ⚠ arquivo não encontrado: ${name}.csv — pulando`)
    return []
  }
  const rows = parseCsv(fs.readFileSync(file, 'utf8'))
  if (!rows.length) return []
  const header = rows[0]
  return rows.slice(1).map(r => {
    const obj = {}
    header.forEach((h, i) => { obj[h] = r[i] ?? '' })
    return obj
  })
}

function loadUsersJson() {
  return JSON.parse(fs.readFileSync(USERS_JSON, 'utf8'))
}

function num(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function bool(v) {
  if (v === null || v === undefined || v === '') return false
  return v === 'true' || v === 't' || v === '1'
}

function dt(v) {
  if (v === null || v === undefined || v === '') return null
  const s = String(v).trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Converte um campo CSV em JSONB (null quando vazio/inválido).
    Retorna STRING JSON (o driver pg não serializa objetos/arrays para jsonb). */
function json(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null
  const s = String(v).trim()
  if (s === 'null') return null
  try { return JSON.stringify(JSON.parse(s)) } catch { return null }
}

/** Texto que respeita null vazio. */
function txt(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null
  return String(v)
}

const client = new pg.Client({ connectionString: DATABASE_URL })

/** Insere em batches multi-row. rows: array de objetos com as colunas. */
async function bulkInsert(table, rows, cols, extraSql = '') {
  if (!rows.length) return 0
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const placeholders = chunk
      .map((_, r) => `(${cols.map((_, c) => `$${r * cols.length + c + 1}`).join(',')})`)
      .join(',')
    const params = chunk.flatMap(r => cols.map(c => r[c] ?? null))
    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders} ${extraSql}`
    if (SENDO_DRY_RUN) { inserted += chunk.length; continue }
    try {
      const res = await client.query(sql, params)
      inserted += res.rowCount
    } catch (e) {
      const analiseIdx = cols.indexOf('analise_erros')
      const jsonAmostra = analiseIdx >= 0
        ? JSON.stringify(params.slice(analiseIdx, params.length).filter((_, i) => (i + analiseIdx) % cols.length === analiseIdx), (k, v) => typeof v === 'string' && v.length > 120 ? v.slice(0, 120) + '...' : v).slice(0, 1000)
        : 'n/a'
      throw new Error(`[${table}] ${e.message}\n  analise_erros=${jsonAmostra}\n  params=${JSON.stringify(params, (k, v) => typeof v === 'string' && v.length > 150 ? v.slice(0, 150) + '...' : v).slice(0, 800)}`)
    }
  }
  return inserted
}

/** INSERT multi-row simples (sem ON CONFLICT) usado para CRIAÇÃO garantida de users. */
async function insertRows(sql, params) {
  if (SENDO_DRY_RUN) return params.length && true
  await client.query(sql, params)
}

/**
 * Sincroniza a tabela users:
 *   1. users do export/users.json (Questões Concursos)
 *   2. + os emails que existem nos profiles do Monitor Pro mas não estão em users
 *      (criados com senha provisória para satisfazer a FK profiles→users)
 */
async function importUsers() {
  const usersJson = loadUsersJson()
  const emailsNorm = e => String(e || '').trim().toLowerCase()

  const mapa = new Map()
  for (const u of usersJson) {
    const email = emailsNorm(u.email)
    if (u.id && email) mapa.set(u.id, { id: u.id, email, name: u.name || null, origem: 'json' })
  }

  // 1) users que existem só nos profiles (têm email real)
  const profilesCsv = loadCsv('profiles')
  for (const p of profilesCsv) {
    const email = emailsNorm(p.email)
    if (p.id && email && !mapa.has(p.id)) {
      mapa.set(p.id, { id: p.id, email, name: null, origem: 'profile' })
    }
  }

  // 2) ids referenciados como owner em qualquer tabela (sem email) → email sintético
  const tabRefs = [
    'registros_estudos', 'flashcards', 'editais_materias',
    'discursivas', 'news_feed', 'ranking_geral'
  ]
  const refsSet = new Set()
  for (const t of tabRefs) {
    for (const r of loadCsv(t)) {
      const uid = String(r.user_id || '').trim()
      if (uid && uid !== 'null' && uid !== 'undefined' && uid !== '') refsSet.add(uid)
    }
  }
  const sinteticos = []
  for (const uid of refsSet) {
    if (mapa.has(uid)) continue
    const email = uid + '@imported.local'
    sinteticos.push({ id: uid, email, name: null, origem: 'referencia' })
    mapa.set(uid, sinteticos[sinteticos.length - 1])
  }

  log(`\n[users] ${usersJson.length} (json) + ${profilesCsv.filter(p => p.id && p.email && !mapaBefore(usersJson, p.id, p.email)).length} (profiles) + ${sinteticos.length} (referenciados)`)
  const all = Array.from(mapa.values())
  const hash = bcrypt.hashSync(SENHA_PROVISORIA, 10)
  const validos = all.map(u => ({
    id: u.id, email: u.email, password_hash: hash, name: u.name,
    approved: true, is_admin: false, created_at: new Date(),
  }))
  const n = await bulkInsert(
    'users', validos,
    ['id', 'email', 'password_hash', 'name', 'approved', 'is_admin', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  if (sinteticos.length) {
    log(`  ↔ ${sinteticos.length} usuário(s) criado(s) por referência (sem email) — senha "${SENHA_PROVISORIA}":`)
    for (const o of sinteticos) log(`    - ${o.id}`)
  }
  log(`  ${n} na tabela users`)
}

function mapaBefore(usersJson, pId, pEmail) {
  return usersJson.some(u => String(u.id) === pId && String(u.email || '').toLowerCase() === pEmail)
}

async function importProfiles() {
  const rows = loadCsv('profiles')
  log(`\n[profiles] ${rows.length} perfis`)
  const validos = []
  for (const r of rows) {
    if (!r.id) continue
    validos.push({
      id: r.id, email: txt(r.email), username: txt(r.username), chat_id: txt(r.chat_id),
      approved: bool(r.approved), is_admin: bool(r.is_admin),
      created_at: dt(r.created_at) || new Date(),
    })
  }
  const n = await bulkInsert(
    'profiles', validos,
    ['id', 'email', 'username', 'chat_id', 'approved', 'is_admin', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} perfis`)
}

async function importRegistros() {
  const rows = loadCsv('registros_estudos')
  log(`\n[registros_estudos] ${rows.length} registros`)
  const validos = []
  for (const r of rows) {
    const id = String(r.id || '').trim()
    if (!id || id === 'null' || id === 'undefined') continue
    validos.push({
      id,
      data_estudo: dt(r.data_estudo) || null,
      usuario: txt(r.usuario),
      concurso: txt(r.concurso),
      materia: txt(r.materia),
      assunto: txt(r.assunto),
      acertos: num(r.acertos),
      total: num(r.total),
      taxa: num(r.taxa),
      proxima_revisao: dt(r.proxima_revisao),
      criado_em: dt(r.criado_em) || new Date(),
      tempo: num(r.tempo),
      rev_24h: bool(r.rev_24h),
      rev_07d: bool(r.rev_07d),
      rev_15d: bool(r.rev_15d),
      rev_30d: bool(r.rev_30d),
      comentarios: txt(r.comentarios),
      dificuldade: txt(r.dificuldade),
      relevancia: num(r.relevancia),
      user_id: txt(r.user_id) || null,
      analise_erros: json(r.analise_erros),
      sugestao_mentor: txt(r.sugestao_mentor),
      meta: txt(r.meta),
      tipo: txt(r.tipo) || 'Estudo',
    })
  }
  const n = await bulkInsert(
    'registros_estudos', validos,
    ['id', 'data_estudo', 'usuario', 'concurso', 'materia', 'assunto', 'acertos', 'total',
     'taxa', 'proxima_revisao', 'criado_em', 'tempo', 'rev_24h', 'rev_07d', 'rev_15d',
     'rev_30d', 'comentarios', 'dificuldade', 'relevancia', 'user_id', 'analise_erros',
     'sugestao_mentor', 'meta', 'tipo'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} registros importados`)
}

async function importFlashcards() {
  const rows = loadCsv('flashcards')
  log(`\n[flashcards] ${rows.length} cards`)
  const validos = []
  for (const r of rows) {
    if (!r.id || !r.user_id) continue
    validos.push({
      id: r.id, user_id: r.user_id, concurso: txt(r.concurso) || 'Geral',
      materia: txt(r.materia), assunto: txt(r.assunto),
      front: txt(r.front), back: txt(r.back),
      status: txt(r.status) || 'novo',
      next_review: dt(r.next_review), interval: num(r.interval),
      ease_factor: num(r.ease_factor), original_audio_id: txt(r.original_audio_id),
      author_name: txt(r.author_name), ai_generated_assets: json(r.ai_generated_assets),
      created_at: dt(r.created_at) || new Date(),
    })
  }
  const n = await bulkInsert(
    'flashcards', validos,
    ['id', 'user_id', 'concurso', 'materia', 'assunto', 'front', 'back', 'status',
     'next_review', 'interval', 'ease_factor', 'original_audio_id', 'author_name',
     'ai_generated_assets', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} cards importados`)
}

async function importEditais() {
  const rows = loadCsv('editais_materias')
  log(`\n[editais_materias] ${rows.length} matérias`)
  const validos = []
  for (const r of rows) {
    const id = String(r.id || '').trim()
    if (!id || !r.user_id) continue
    validos.push({
      id,
      user_id: r.user_id, concurso: txt(r.concurso),
      cargo: txt(r.cargo), materia: txt(r.materia),
      topicos: json(r.topicos) || [],
      data_prova: txt(r.data_prova), is_principal: bool(r.is_principal),
      peso: num(r.peso), usuario: txt(r.usuario),
      meta_horas: num(r.meta_horas), meta_questoes: num(r.meta_questoes),
      is_template: bool(r.is_template), template_criador_id: txt(r.template_criador_id),
      template_nome: txt(r.template_nome), template_descricao: txt(r.template_descricao),
      template_clones: num(r.template_clones),
    })
  }
  const n = await bulkInsert(
    'editais_materias', validos,
    ['id', 'user_id', 'concurso', 'cargo', 'materia', 'topicos', 'data_prova',
     'is_principal', 'peso', 'usuario', 'meta_horas', 'meta_questoes', 'is_template',
     'template_criador_id', 'template_nome', 'template_descricao', 'template_clones'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} matérias importadas`)
}

async function importDiscursivas() {
  const rows = loadCsv('discursivas')
  log(`\n[discursivas] ${rows.length} discursivas`)
  const validos = []
  for (const r of rows) {
    if (!r.id || !r.user_id) continue
    validos.push({
      id: r.id, user_id: r.user_id, title: txt(r.title),
      prompt: txt(r.prompt), image_url: txt(r.image_url),
      analysis_text: txt(r.analysis_text),
      created_at: dt(r.created_at) || new Date(),
    })
  }
  const n = await bulkInsert(
    'discursivas', validos,
    ['id', 'user_id', 'title', 'prompt', 'image_url', 'analysis_text', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} discursivas importadas`)
}

async function importNewsFeed() {
  const rows = loadCsv('news_feed')
  log(`\n[news_feed] ${rows.length} notícias`)
  const validos = []
  for (const r of rows) {
    if (!r.id) continue
    validos.push({
      id: r.id, title: txt(r.title), summary: txt(r.summary),
      source_name: txt(r.source_name), source_url: txt(r.source_url),
      image_url: txt(r.image_url), tags: json(r.tags) || [],
      published_at: dt(r.published_at) || new Date(),
      created_at: dt(r.created_at) || new Date(),
    })
  }
  const n = await bulkInsert(
    'news_feed', validos,
    ['id', 'title', 'summary', 'source_name', 'source_url', 'image_url', 'tags',
     'published_at', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} notícias importadas`)
}

async function importRanking() {
  const rows = loadCsv('ranking_geral')
  log(`\n[ranking_geral] ${rows.length} linhas`)
  const validos = []
  for (const r of rows) {
    if (!r.user_id) continue
    validos.push({
      user_id: r.user_id, name: txt(r.name), email: txt(r.email),
      total_questoes: num(r.total_questoes) || 0,
      total_acertos: num(r.total_acertos) || 0,
      total_tempo: num(r.total_tempo) || 0,
    })
  }
  const n = await bulkInsert(
    'ranking_geral', validos,
    ['user_id', 'name', 'email', 'total_questoes', 'total_acertos', 'total_tempo'],
    'ON CONFLICT (user_id) DO NOTHING'
  )
  log(`  ${n} linhas importadas`)
}

async function main() {
  log(`Conectando em ${DATABASE_URL}`)
  log(`Modo: ${SENDO_DRY_RUN ? 'DRY-RUN (nenhuma escrita)' : 'IMPORTACAO REAL'}`)
  await client.connect()
  try {
    await importUsers()
    await importProfiles()
    await importRegistros()
    await importFlashcards()
    await importEditais()
    await importDiscursivas()
    await importNewsFeed()
    await importRanking()
    log('\nConcluído!')
  } finally {
    await client.end()
  }
}

main().catch(err => {
  logger.error(err, 'Erro na importação')
  process.exit(1)
})