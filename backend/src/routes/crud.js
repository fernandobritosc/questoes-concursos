/**
 * Roteador genérico de CRUD — compatível com a API REST do Supabase/PostgREST.
 * Registra as mesmas rotas em dois prefixos:
 *   - /:tabela           (API própria do backend)
 *   - /rest/v1/:tabela   (compatibilidade com a extensão / código legado)
 *
 * Suporte:
 *  - GET    com filtros (col=eq/neq/in/gt/gte/lt/lte/like/ilike/is/not.is),
 *           order=col.desc, offset, limit, count=true, select com JOIN aninhado
 *           no formato `filha!nome_da_fk(col1,col2)` ou `alias:filha!(...)`
 *  - POST   insert single/array; respeita Prefer: return=representation
 *  - POST   /upsert (on_conflict)
 *  - PATCH  /:id ou PATCH com filtros na query (estilo PostgREST)
 *  - DELETE /:id ou DELETE com filtros na query
 */

import { queryRows, queryOne } from '../db.js'

const PUBLIC_TABLES = new Set(['questoes', 'news_feed', 'ranking_geral', 'flashcards'])
const HIDDEN_COLUMNS = new Set(['password_hash'])
const USER_COLUMN = {
  historico_resolucoes: 'user_id',
  metas_concurso: 'user_id',
  profiles: 'id',
  study_materials: 'user_id',
  notifications: 'user_id',
  flashcards: 'user_id',
  registros_estudos: 'user_id',
  editais_materias: 'user_id',
  gabaritos_salvos: 'user_id',
  discursivas: 'user_id',
}
const ADMIN_WRITE_TABLES = new Set(['news_feed'])

function isPublicWrite(table) {
  return table === 'questoes'
}

/** Tabelas que aceitam INSERT anônimo (registro público, sem sessão). */
function isPublicInsert(table) {
  return table === 'questoes' || table === 'historico_resolucoes'
}

function safeIdent(name) {
  return /^[a-z_][a-z0-9_]*$/.test(name) ? name : null
}

/** Remove colunas sensíveis de linhas. */
function stripHidden(rows) {
  const arr = Array.isArray(rows) ? rows : [rows]
  for (const r of arr) {
    if (!r) continue
    for (const h of HIDDEN_COLUMNS) delete r[h]
  }
  return rows
}

/** Decodifica um operando (o shim do frontend duplica o encoding via URLSearchParams). */
function safeDecode(str) {
  try {
    return decodeURIComponent(str)
  } catch {
    return str
  }
}

/** Constrói WHERE a partir de query params estilo PostgREST. */
export function buildFilters(queryParams, { scopeByUser = false, userId = null } = {}) {
  const wheres = []
  const params = []
  let idx = 1
  if (scopeByUser && userId) {
    wheres.push(`user_id = $${idx++}`)
    params.push(userId)
  }
  const skipKeys = new Set(['select', 'order', 'offset', 'limit', 'count', 'on_conflict'])
  for (const [key, value] of Object.entries(queryParams)) {
    if (!key || skipKeys.has(key)) continue
    const col = safeIdent(key)
    if (!col) continue
    const match = /^(eq|neq|gt|gte|lt|lte|like|ilike|is|not\.is|in)\.(.*)$/s.exec(value)
    let operator, operand
    if (match) {
      operator = match[1]
      operand = match[2]
    } else {
      operator = 'eq'
      operand = value
    }
    switch (operator) {
      case 'eq': wheres.push(`${col} = $${idx++}`); params.push(safeDecode(operand)); break
      case 'neq': wheres.push(`${col} <> $${idx++}`); params.push(safeDecode(operand)); break
      case 'gt': wheres.push(`${col} > $${idx++}`); params.push(Number(operand)); break
      case 'gte': wheres.push(`${col} >= $${idx++}`); params.push(Number(operand)); break
      case 'lt': wheres.push(`${col} < $${idx++}`); params.push(Number(operand)); break
      case 'lte': wheres.push(`${col} <= $${idx++}`); params.push(Number(operand)); break
      case 'like': wheres.push(`${col} LIKE $${idx++}`); params.push(safeDecode(operand)); break
      case 'ilike': wheres.push(`${col} ILIKE $${idx++}`); params.push(safeDecode(operand)); break
      case 'is':
        if (operand === 'null') wheres.push(`${col} IS NULL`)
        else if (operand === 'true') wheres.push(`${col} IS TRUE`)
        else if (operand === 'false') wheres.push(`${col} IS FALSE`)
        else { wheres.push(`${col} IS DISTINCT FROM $${idx++}`); params.push(safeDecode(operand)) }
        break
      case 'not.is':
        if (operand === 'null') wheres.push(`${col} IS NOT NULL`)
        else if (operand === 'true') wheres.push(`${col} IS NOT TRUE`)
        else if (operand === 'false') wheres.push(`${col} IS NOT FALSE`)
        else { wheres.push(`${col} IS NOT DISTINCT FROM $${idx++}`); params.push(safeDecode(operand)) }
        break
      case 'in': {
        const inner = operand.startsWith('(') && operand.endsWith(')')
          ? operand.slice(1, -1)
          : operand
        const items = inner.split(',').filter(Boolean).map(safeDecode)
        const ph = items.map(() => `$${idx++}`).join(',')
        wheres.push(`${col} IN (${ph})`)
        params.push(...items)
        break
      }
    }
  }
  return { whereSql: wheres.length ? `WHERE ${wheres.join(' AND ')}` : '', params }
}

export function buildOrder(queryParams) {
  const raw = queryParams.order
  if (!raw) return ''
  const parts = String(raw)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(part => {
      const [name, dirRaw] = part.split('.')
      const col = safeIdent(name)
      if (!col) return ''
      return `${col} ${dirRaw === 'desc' ? 'DESC' : 'ASC'}`
    })
    .filter(Boolean)
  return parts.length ? `ORDER BY ${parts.join(', ')}` : ''
}

function coerceValue(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return value
  if (value === '') return null
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+$/.test(value)) return Number(value)
  if (/^-?\d*\.\d+$/.test(value)) return Number(value)
  return value
}

function buildInsert(table, rows) {
  const cols = Object.keys(rows[0]).filter(c => c !== 'id' || rows[0][c] !== undefined)
  const safeCols = cols.map(c => safeIdent(c)).filter(Boolean)
  if (!safeCols.length) throw new Error('Nenhuma coluna válida para inserção')
  const values = []
  const placeholders = rows.map((row, rIdx) => {
    return `(${safeCols.map((c, cIdx) => {
      const val = coerceValue(row[c])
      values.push(val)
      return `$${rIdx * safeCols.length + cIdx + 1}`
    }).join(', ')})`
  })
  return { sql: `INSERT INTO ${table} (${safeCols.join(', ')}) VALUES ${placeholders.join(', ')} RETURNING *`, values }
}

export function buildUpdate(table, id, payload) {
  const entries = Object.entries(payload).filter(([c]) => c !== 'id' && safeIdent(c))
  if (!entries.length) throw new Error('Nenhum campo para atualizar')
  const sets = []
  const values = []
  let idx = 1
  for (const [col, val] of entries) {
    sets.push(`${col} = $${idx++}`)
    values.push(coerceValue(val))
  }
  values.push(id)
  return { sql: `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, values }
}

/**
 * Interpreta o parâmetro `select` do PostgREST.
 * Retorna { cols: string[], embeds: [{ alias, child, childCols, fkName, joinCol }] }
 */
function splitSelect(selectStr) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of String(selectStr || '*')) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function parseSelect(selectStr) {
  const cols = []
  const embeds = []
  for (let raw of splitSelect(selectStr)) {
    raw = raw.trim()
    if (!raw) continue
    let m = /^([\w]+):([\w]+)!([\w]+)\s*\(([^)]*)\)\s*$/.exec(raw) // alias:child!fk(cols)
    if (m) {
      embeds.push({ alias: m[1], child: m[2], fkName: m[3], childCols: m[4] })
      continue
    }
    m = /^([\w]+)!([\w]+)\s*\(([^)]*)\)\s*$/.exec(raw) // child!fk(cols)
    if (m) {
      embeds.push({ alias: m[1], child: m[1], fkName: m[2], childCols: m[3] })
      continue
    }
    const col = safeIdent(raw)
    if (col) cols.push(col)
  }
  return { cols, embeds }
}

/** Interpreta o nome da FK para descobrir o dono da constraint e a coluna de join. */
function parseFk(fkName, parentTable, childTable) {
  const base = String(fkName || '').replace(/_fkey$/, '')
  if (base.startsWith(parentTable + '_')) {
    return { owner: 'parent', column: base.slice(parentTable.length + 1) }
  }
  if (base.startsWith(childTable + '_')) {
    return { owner: 'child', column: base.slice(childTable.length + 1) }
  }
  return null
}

function makeCrudRouter(app, table, prefix = '') {
  const col = safeIdent(table)
  if (!col) return
  const base = `${prefix}/${col}`

  app.get(base, async (request, reply) => {
    const user = request.authUser
    const isPublic = PUBLIC_TABLES.has(col)
    const needsScope = USER_COLUMN[col] && !isPublic
    if (needsScope && !user) return reply.code(401).send({ message: 'Autenticação necessária' })

    const { cols, embeds } = parseSelect(request.query.select)
    for (const emb of embeds) {
      const fk = emb.fkName && parseFk(emb.fkName, col, emb.child)
      if (!fk) continue
      const need = fk.owner === 'parent' ? fk.column : 'id'
      const safe = safeIdent(need)
      if (safe && !cols.includes(safe)) cols.push(safe)
    }
    const selectSql = cols.length ? cols.join(', ') : '*'

    const { whereSql, params } = buildFilters(request.query, {
      scopeByUser: needsScope && USER_COLUMN[col] !== 'id',
      userId: user?.id,
    })
    const orderSql = buildOrder(request.query)
    const offset = Number(request.query.offset) || 0
    const limit = Math.min(Number(request.query.limit) || 1000, 5000)
    const wantCount = request.query.count === 'true'

    let countResult = null
    if (wantCount) {
      const cr = await queryOne(`SELECT COUNT(*)::int AS total FROM ${col} ${whereSql}`, params)
      countResult = cr?.total ?? 0
    }

    const rows = await queryRows(
      `SELECT ${selectSql} FROM ${col} ${whereSql} ${orderSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    // JOINs aninhados (embedded resources) — busca filhos agrupados
    if (embeds.length && rows.length) {
      for (const emb of embeds) {
        const childCol = safeIdent(emb.child)
        const fk = emb.fkName && parseFk(emb.fkName, col, emb.child)
        if (!childCol || !fk) continue
        // Quando a FK pertence à tabela pai, a coluna de join fica no pai e o
        // filho casa pela PK (id). Caso contrário, a coluna de join fica na
        // filha e o pai casa pela PK (id).
        const parentJoinCol = fk.owner === 'parent' ? safeIdent(fk.column) : 'id'
        const childJoinCol = fk.owner === 'parent' ? 'id' : safeIdent(fk.column)
        if (!parentJoinCol || !childJoinCol) continue
        const selectChild = emb.childCols
          ? emb.childCols.split(',').map(s => safeIdent(s.trim())).filter(Boolean).join(', ')
          : '*'
        const childUserCol = USER_COLUMN[emb.child] && USER_COLUMN[emb.child] !== 'id'
        const childWhere = childUserCol && user
          ? ` WHERE ${childJoinCol} = ANY($1) AND ${USER_COLUMN[emb.child]} = $2`
          : ` WHERE ${childJoinCol} = ANY($1)`
        const parentJoinValues = [...new Set(rows.map(r => r[parentJoinCol]).filter(v => v != null))]
        if (!parentJoinValues.length) continue
        const childParams = childUserCol && user ? [parentJoinValues, user.id] : [parentJoinValues]
        const children = await queryRows(
          `SELECT ${selectChild}, ${childJoinCol} AS __parent FROM ${childCol}${childWhere}`,
          childParams
        )
        const grouped = new Map()
        for (const c of children) {
          const p = c.__parent
          delete c.__parent
          if (!grouped.has(p)) grouped.set(p, [])
          grouped.get(p).push(c)
        }
        for (const r of rows) r[emb.alias] = grouped.get(r[parentJoinCol]) || []
      }
    }

    stripHidden(rows)
    if (countResult !== null) return reply.send({ data: rows, count: countResult })
    return reply.send(rows)
  })

  app.get(`${base}/:id`, async (request, reply) => {
    const user = request.authUser
    const isPublic = PUBLIC_TABLES.has(col)
    const needsScope = USER_COLUMN[col] && !isPublic
    if (needsScope && !user) return reply.code(401).send({ message: 'Autenticação necessária' })
    const row = await queryOne(`SELECT * FROM ${col} WHERE id = $1`, [request.params.id])
    if (!row) return reply.code(404).send({ message: 'Registro não encontrado' })
    if (needsScope && user) {
      const ownerCol = USER_COLUMN[col]
      const ownerValue = ownerCol === 'id' ? row.id : row.user_id
      if (String(ownerValue) !== String(user.id)) return reply.code(403).send({ message: 'Sem permissão' })
    }
    return reply.send(stripHidden(row))
  })

  app.post(base, async (request, reply) => {
    const user = request.authUser
    const body = request.body
    if (!isPublicInsert(col) && !user) return reply.code(401).send({ message: 'Autenticação necessária' })
    if (ADMIN_WRITE_TABLES.has(col) && !user?.is_admin) return reply.code(403).send({ message: 'Somente admin pode escrever' })

    const rows = Array.isArray(body) ? body : [body]
    if (!rows.length || typeof rows[0] !== 'object') return reply.code(400).send({ message: 'Body vazio' })

    if (user && USER_COLUMN[col] && USER_COLUMN[col] !== 'id') {
      for (const r of rows) r[USER_COLUMN[col]] = user.id
    }

    try {
      const { sql, values } = buildInsert(col, rows)
      const result = await queryRows(sql, values)
      stripHidden(result)
      // PostgREST retorna array quando Prefer: return=representation está presente
      if (request.headers.prefer?.includes('return=representation')) {
        return reply.code(201).send(result)
      }
      return reply.code(201).send(result.length === 1 ? result[0] : result)
    } catch (err) {
      return reply.code(400).send({ message: err.message })
    }
  })

  app.post(`${base}/upsert`, async (request, reply) => {
    const user = request.authUser
    const body = request.body
    if (!isPublicInsert(col) && !user) return reply.code(401).send({ message: 'Autenticação necessária' })
    const rows = Array.isArray(body) ? body : [body]
    const onConflict = request.query.on_conflict || 'id'
    const conflictCols = String(onConflict).split(',').map(s => safeIdent(s.trim())).filter(Boolean)
    if (!conflictCols.length) return reply.code(400).send({ message: 'on_conflict inválido' })
    if (user && USER_COLUMN[col] && USER_COLUMN[col] !== 'id') {
      for (const r of rows) r[USER_COLUMN[col]] = user.id
    }
    const { sql: insertSql, values } = buildInsert(col, rows)
    const conflictTarget = conflictCols.join(', ')
    const updates = conflictCols
      .map(c => `${c} = EXCLUDED.${c}`)
      .concat(Object.keys(rows[0] || {}).filter(c => !conflictCols.includes(c) && safeIdent(c)).map(c => `${c} = EXCLUDED.${c}`))
      .join(', ')
    try {
      const result = await queryRows(`${insertSql} ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates} RETURNING *`, values)
      stripHidden(result)
      if (request.headers.prefer?.includes('return=representation')) return reply.send(result)
      return reply.send(result.length === 1 ? result[0] : result)
    } catch (err) {
      return reply.code(400).send({ message: err.message })
    }
  })

  app.patch(`${base}/:id`, async (request, reply) => {
    const user = request.authUser
    if (!user && !isPublicWrite(col)) return reply.code(401).send({ message: 'Autenticação necessária' })
    try {
      const { sql, values } = buildUpdate(col, request.params.id, request.body || {})
      const result = await queryRows(sql, values)
      if (!result.length) return reply.code(404).send({ message: 'Registro não encontrado' })
      return reply.send(stripHidden(result[0]))
    } catch (err) {
      return reply.code(400).send({ message: err.message })
    }
  })

  // PATCH por filtro (PostgREST): PATCH /:tabela?col=eq.x
  app.patch(base, async (request, reply) => {
    const user = request.authUser
    if (!user && !isPublicWrite(col)) return reply.code(401).send({ message: 'Autenticação necessária' })
    const { whereSql, params } = buildFilters(request.query, {
      scopeByUser: USER_COLUMN[col] && USER_COLUMN[col] !== 'id',
      userId: user?.id,
    })
    const payload = request.body || {}
    const entries = Object.entries(payload).filter(([c]) => c !== 'id' && safeIdent(c))
    if (!entries.length) return reply.code(400).send({ message: 'Nenhum campo para atualizar' })
    const sets = entries.map(([c], i) => `${c} = $${params.length + i + 1}`)
    const values = entries.map(([, v]) => coerceValue(v))
    const result = await queryRows(
      `UPDATE ${col} SET ${sets.join(', ')} ${whereSql} RETURNING *`,
      [...params, ...values]
    )
    stripHidden(result)
    return reply.send(result.length === 1 ? result[0] : result)
  })

  app.delete(`${base}/:id`, async (request, reply) => {
    const user = request.authUser
    if (!user && !isPublicWrite(col)) return reply.code(401).send({ message: 'Autenticação necessária' })
    await queryRows(`DELETE FROM ${col} WHERE id = $1`, [request.params.id])
    return reply.send({ success: true })
  })

  // DELETE por filtro (PostgREST)
  app.delete(base, async (request, reply) => {
    const user = request.authUser
    if (!user && !isPublicWrite(col)) return reply.code(401).send({ message: 'Autenticação necessária' })
    const { whereSql, params } = buildFilters(request.query, {
      scopeByUser: USER_COLUMN[col] && USER_COLUMN[col] !== 'id',
      userId: user?.id,
    })
    await queryRows(`DELETE FROM ${col} ${whereSql}`, params)
    return reply.send({ success: true })
  })
}

export function registerCrud(app, tables, prefix = '') {
  for (const t of tables) makeCrudRouter(app, t, prefix)
}
