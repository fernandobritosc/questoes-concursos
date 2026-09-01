import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { config } from './config.js'
import { queryRows, queryOne } from './db.js'
import { registerUser, loginUser, getAuthUser, ensureProfile, changePassword } from './auth.js'
import { registerCrud } from './routes/crud.js'
import { registerStorage } from './routes/storage.js'

const app = Fastify({ logger: { level: 'info' } })

await app.register(cors, {
  origin: true,
  credentials: true,
})
await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } })

// Middleware: injeta o usuário autenticado (se houver)
app.addHook('onRequest', async (request) => {
  request.authUser = getAuthUser(request)
})

const TABLES = [
  'users',
  'profiles',
  'questoes',
  'historico_resolucoes',
  'metas_concurso',
  'tarefas_meta',
  'materiais_estudo',
  'study_materials',
  'notifications',
  'flashcards',
  'registros_estudos',
  'editais_materias',
  'gabaritos_salvos',
  'discursivas',
  'news_feed',
  'ranking_geral',
]

registerCrud(app, TABLES)
registerCrud(app, TABLES, '/rest/v1')
registerStorage(app)

// ─── Auth ─────────────────────────────────────────────────────

app.post('/auth/register', async (request, reply) => {
  try {
    const result = await registerUser(request.body || {})
    return reply.code(201).send(result)
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message })
  }
})

app.post('/auth/login', async (request, reply) => {
  try {
    const result = await loginUser(request.body || {})
    return reply.send(result)
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message })
  }
})

app.post('/auth/change-password', async (request, reply) => {
  try {
    const user = request.authUser
    if (!user) return reply.code(401).send({ message: 'Autenticação necessária' })
    const result = await changePassword(user.id, request.body || {})
    return reply.send(result)
  } catch (err) {
    return reply.code(err.statusCode || 500).send({ message: err.message })
  }
})

app.get('/auth/me', async (request, reply) => {
  const user = request.authUser
  if (!user) return reply.code(401).send({ message: 'Não autenticado' })
  const dbUser = await queryOne('SELECT * FROM users WHERE id = $1', [user.id])
  if (!dbUser) return reply.code(404).send({ message: 'Usuário não encontrado' })
  await ensureProfile(dbUser.id)
  const profile = await queryOne('SELECT * FROM profiles WHERE id = $1', [dbUser.id])
  for (const h of ['password_hash']) delete dbUser[h]
  return reply.send({ ...dbUser, profile })
})

// ─── Histórico com JOIN em questões ───────────────────────────

app.get('/historico/detalhado', async (request, reply) => {
  const user = request.authUser
  if (!user) return reply.code(401).send({ message: 'Autenticação necessária' })

  const { offset = '0', limit = '100000' } = request.query
  const rows = await queryRows(
    `SELECT h.id, h.questao_id, h.questao_tec_id, h.alternativa, h.acertou,
            h.tempo_segundos, h.data_resolucao,
            q.id AS q_id, q.questao_tec_id AS q_tec, q.materia, q.assunto, q.grupo,
            q.banca_texto, q.orgao, q.concurso, q.prova, q.ano, q.caderno_nome,
            q.enunciado, q.gabarito, q.alternativas, q.resolucao_professor
     FROM historico_resolucoes h
     LEFT JOIN questoes q ON q.id = h.questao_id
     WHERE h.user_id = $1
     ORDER BY h.data_resolucao DESC
     LIMIT $2 OFFSET $3`,
    [user.id, Number(limit), Number(offset)]
  )
  const data = rows.map(r => ({
    id: r.id,
    questao_id: r.questao_id,
    questao_tec_id: r.questao_tec_id,
    alternativa: r.alternativa,
    acertou: r.acertou,
    tempo_segundos: r.tempo_segundos,
    data_resolucao: r.data_resolucao,
    questao: r.q_id ? {
      id: r.q_id,
      questao_tec_id: r.q_tec,
      materia: r.materia,
      assunto: r.assunto,
      grupo: r.grupo,
      banca_texto: r.banca_texto,
      orgao: r.orgao,
      concurso: r.concurso,
      prova: r.prova,
      ano: r.ano,
      caderno_nome: r.caderno_nome,
      enunciado: r.enunciado,
      gabarito: r.gabarito,
      alternativas: r.alternativas,
      resolucao_professor: r.resolucao_professor,
    } : null,
  }))
  return reply.send(data)
})

// ─── Opções de filtro (distintos para filtros da página de questões) ──

app.get('/questoes/filtros', async (request, reply) => {
  const [materias, bancas, anos, orgaos, concursos] = await Promise.all([
    queryRows(`SELECT DISTINCT materia FROM questoes WHERE materia IS NOT NULL AND materia <> '' ORDER BY materia`),
    queryRows(`SELECT DISTINCT banca_texto FROM questoes WHERE banca_texto IS NOT NULL AND banca_texto <> '' ORDER BY banca_texto`),
    queryRows(`SELECT DISTINCT ano FROM questoes WHERE ano IS NOT NULL ORDER BY ano DESC`),
    queryRows(`SELECT DISTINCT orgao FROM questoes WHERE orgao IS NOT NULL AND orgao <> '' ORDER BY orgao`),
    queryRows(`SELECT DISTINCT concurso FROM questoes WHERE concurso IS NOT NULL AND concurso <> '' ORDER BY concurso`),
  ])
  return reply.send({
    materias: materias.map(r => r.materia),
    bancas: bancas.map(r => r.banca_texto),
    anos: anos.map(r => r.ano),
    orgaos: orgaos.map(r => r.orgao),
    concursos: concursos.map(r => r.concurso),
  })
})

// ─── Ranking (RPC) ────────────────────────────────────────────

app.post('/rpc/get_ranking_by_period', async (request, reply) => {
  const { p_days } = request.body || {}
  const rows = await queryRows(`SELECT * FROM get_ranking_by_period($1)`, [p_days ?? null])
  return reply.send(rows)
})

// ─── Health ───────────────────────────────────────────────────

app.get('/health', async (_request, reply) => {
  const dbOk = await queryOne('SELECT 1 AS ok').catch(() => null)
  return reply.send({ status: 'ok', db: dbOk?.ok === 1 ? 'up' : 'down' })
})

app.listen({ port: config.port, host: config.host }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
