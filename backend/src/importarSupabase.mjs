/**
 * importarSupabase.mjs — Importa os dados exportados do Supabase para o Postgres da VM.
 *
 * Pré-requisitos:
 *   1. Túnel SSH ativo: ssh -L 5432:127.0.0.1:5432 ubuntu@204.216.111.13
 *   2. Dados em ../export/ (users.json + *_rows.csv)
 *   3. Rodar a partir do backend/: node src/importarSupabase.mjs [--dry-run]
 *
 * Ordem de importação: users → questoes → historico_resolucoes → metas_concurso → tarefas_meta
 * Usa batches multi-row para importação rápida via túnel SSH.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXPORT_DIR = path.resolve(__dirname, '../../export')

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://concursos_app:concursos_app_secret_2026@127.0.0.1:5432/concursos'
const SENHA_PROVISORIA = process.env.SENHA_PROVISORIA || 'mudar123'
const BATCH = 500

const SENDO_DRY_RUN = process.argv.includes('--dry-run')

function log(msg) {
  console.log(msg)
}

/** Parser CSV simples com suporte a aspas duplas (RFC 4180). */
function parseCsv(file) {
  const txt = fs.readFileSync(file, 'utf8')
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
  const rows = parseCsv(path.join(EXPORT_DIR, `${name}_rows.csv`))
  const header = rows[0]
  return rows.slice(1).map(r => {
    const obj = {}
    header.forEach((h, i) => { obj[h] = r[i] ?? '' })
    return obj
  })
}

function loadUsersJson() {
  return JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, 'users.json'), 'utf8'))
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
    const res = await client.query(sql, params)
    inserted += res.rowCount
  }
  return inserted
}

async function importUsers() {
  const users = loadUsersJson()
  log(`\n[users] ${users.length} usuários`)
  const hash = bcrypt.hashSync(SENHA_PROVISORIA, 10)
  const validos = []
  for (const u of users) {
    const email = String(u.email || '').trim().toLowerCase()
    if (!email || !u.id) { log(`  ⚠ usuário sem email/id ignorado: ${JSON.stringify(u)}`); continue }
    validos.push({
      id: u.id, email, password_hash: hash, name: u.name || null,
      approved: true, is_admin: false, created_at: dt(u.created_at) || new Date(),
    })
  }
  const n = await bulkInsert(
    'users', validos,
    ['id', 'email', 'password_hash', 'name', 'approved', 'is_admin', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  if (!SENDO_DRY_RUN) {
    for (const u of validos) {
      await client.query(
        `INSERT INTO profiles (id, email, approved, is_admin)
         VALUES ($1, $2, true, false) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.email]
      )
    }
  }
  log(`  ${n} usuários (senha provisória: "${SENHA_PROVISORIA}")`)
}

async function importQuestoes() {
  const rows = loadCsv('questoes')
  log(`\n[questoes] ${rows.length} questões`)
  const validas = []
  for (const r of rows) {
    const id = num(r.id)
    const tecId = num(r.questao_tec_id)
    if (id === null || tecId === null) continue
    let alternativas = {}
    if (r.alternativas && String(r.alternativas).trim()) {
      try { alternativas = JSON.parse(r.alternativas) } catch { alternativas = {} }
    }
    validas.push({
      id, questao_tec_id: tecId, materia: r.materia || null, assunto: r.assunto || null,
      grupo: r.grupo || null, banca_texto: r.banca_texto || null, orgao: r.orgao || null,
      concurso: r.concurso || null, prova: r.prova || null, ano: num(r.ano),
      caderno_nome: r.caderno_nome || null, enunciado: r.enunciado || null,
      gabarito: r.gabarito || null, alternativas, resolucao_professor: r.resolucao_professor || null,
      created_at: dt(r.created_at) || new Date(),
    })
  }
  const n = await bulkInsert(
    'questoes', validas,
    ['id', 'questao_tec_id', 'materia', 'assunto', 'grupo', 'banca_texto', 'orgao',
     'concurso', 'prova', 'ano', 'caderno_nome', 'enunciado', 'gabarito', 'alternativas',
     'resolucao_professor', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} importadas`)
}

async function importHistorico() {
  const rows = loadCsv('historico_resolucoes')
  const users = loadUsersJson()
  const fallbackUserId = (users.find(u => /^fernandobritosc/i.test(u.email || '')) || users[0] || {}).id || null
  log(`\n[historico_resolucoes] ${rows.length} registros (sem user_id → fallback ${fallbackUserId})`)
  const validos = []
  let orfaos = 0
  for (const r of rows) {
    const id = num(r.id)
    const questaoId = num(r.questao_id)
    const tecId = num(r.questao_tec_id)
    let userId = r.user_id || null
    if (!userId) { userId = fallbackUserId; orfaos++ }
    if (id === null || questaoId === null || tecId === null || !userId) continue
    validos.push({
      id, questao_id: questaoId, questao_tec_id: tecId, user_id: userId,
      alternativa: r.alternativa || null, acertou: bool(r.acertou),
      tempo_segundos: num(r.tempo_segundos),
      data_resolucao: dt(r.data_resolucao) || new Date(),
      created_at: dt(r.created_at) || new Date(),
    })
  }
  const n = await bulkInsert(
    'historico_resolucoes', validos,
    ['id', 'questao_id', 'questao_tec_id', 'user_id', 'alternativa', 'acertou',
     'tempo_segundos', 'data_resolucao', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} importados (${orfaos} órfãos atribuídos ao usuário padrão)`)
}

async function importMetas() {
  const rows = loadCsv('metas_concurso')
  log(`\n[metas_concurso] ${rows.length} metas`)
  const validas = []
  for (const r of rows) {
    const id = num(r.id)
    const userId = r.user_id || null
    if (id === null || !userId) continue
    validas.push({
      id, user_id: userId, titulo: r.titulo || '', semana_numero: num(r.semana_numero) || 0,
      data_inicio: r.data_inicio || null, data_fim: r.data_fim || null,
      total_tarefas: num(r.total_tarefas) || 0, created_at: dt(r.created_at) || new Date(),
    })
  }
  const n = await bulkInsert(
    'metas_concurso', validas,
    ['id', 'user_id', 'titulo', 'semana_numero', 'data_inicio', 'data_fim', 'total_tarefas', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} metas`)
}

async function importTarefas() {
  const rows = loadCsv('tarefas_meta')
  log(`\n[tarefas_meta] ${rows.length} tarefas`)
  const validas = []
  for (const r of rows) {
    const id = num(r.id)
    const metaId = num(r.meta_id)
    if (id === null || metaId === null) continue
    validas.push({
      id, meta_id: metaId, ordem: num(r.ordem) || 0, disciplina: r.disciplina || '',
      formato: r.formato || '', descricao: r.descricao || '',
      tempo_estimado: r.tempo_estimado || null, status: r.status || 'pendente',
      desempenho: num(r.desempenho), avaliacao: r.avaliacao || null,
      relevancia: r.relevancia || null, material_indicado: r.material_indicado || null,
      link_tec: r.link_tec || null, assunto: r.assunto || null,
      conteudo: r.conteudo || null, conteudo_dicas: r.conteudo_dicas || null,
      created_at: dt(r.created_at) || new Date(),
    })
  }
  const n = await bulkInsert(
    'tarefas_meta', validas,
    ['id', 'meta_id', 'ordem', 'disciplina', 'formato', 'descricao', 'tempo_estimado',
     'status', 'desempenho', 'avaliacao', 'relevancia', 'material_indicado', 'link_tec',
     'assunto', 'conteudo', 'conteudo_dicas', 'created_at'],
    'ON CONFLICT (id) DO NOTHING'
  )
  log(`  ${n} tarefas`)
}

async function resetSequences() {
  log('\n[sequences] ajustando sequences (BIGSERIAL)')
  const tables = ['questoes', 'historico_resolucoes', 'metas_concurso', 'tarefas_meta']
  for (const t of tables) {
    const sql = `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1))`
    if (SENDO_DRY_RUN) { log(`  [dry] ${t}`); continue }
    await client.query(sql)
  }
  log('  ok')
}

async function main() {
  log(`Conectando em ${DATABASE_URL}`)
  log(`Modo: ${SENDO_DRY_RUN ? 'DRY-RUN (nenhuma escrita)' : 'IMPORTACAO REAL'}`)
  await client.connect()
  try {
    await importUsers()
    await importQuestoes()
    await importHistorico()
    await importMetas()
    await importTarefas()
    await resetSequences()
    log('\nConcluído!')
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('\nERRO:', err.message)
  process.exit(1)
})
