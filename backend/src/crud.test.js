import { vi, describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'

const mockQueryRows = vi.fn()
const mockQueryOne = vi.fn()

vi.mock('./db.js', () => ({
  queryRows: (...args) => mockQueryRows(...args),
  queryOne: (...args) => mockQueryOne(...args),
}))

import { registerCrud, buildFilters, buildOrder, buildUpdate } from './routes/crud.js'

const TABELA = 'questoes'
const USER = { id: 'u-1', email: 'u@teste.com', is_admin: false }
const OUTRO = { id: 'u-2', email: 'o@teste.com', is_admin: false }
const ADMIN = { id: 'u-admin', email: 'a@teste.com', is_admin: true }

async function buildApp(user = null) {
  const app = Fastify({ logger: false })
  app.addHook('onRequest', async (request) => {
    request.authUser = user
  })
  registerCrud(app, [TABELA, 'historico_resolucoes', 'profiles', 'users', 'tarefas_meta'])
  await app.ready()
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /:tabela — listar', () => {
  it('retorna dados do banco', async () => {
    const app = await buildApp()
    mockQueryRows.mockResolvedValue([{ id: 1, materia: 'Dir Const' }])

    const res = await app.inject({ method: 'GET', url: `/${TABELA}` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body).toHaveLength(1)
    expect(body[0].materia).toBe('Dir Const')
    expect(mockQueryRows).toHaveBeenCalledOnce()
  })

  it('aplica filtro eq via querystring', async () => {
    const app = await buildApp()
    mockQueryRows.mockResolvedValue([])

    await app.inject({ method: 'GET', url: `/${TABELA}?materia=eq.Inform%C3%A1tica` })
    const [, params] = mockQueryRows.mock.calls[0]
    expect(params).toContain('Informática')
  })

  it('retorna 401 para tabela escopada sem auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/historico_resolucoes' })
    expect(res.statusCode).toBe(401)
  })

  it('retorna 401 para users sem auth', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/users' })
    expect(res.statusCode).toBe(401)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('retorna 401 para tarefas_meta sem auth (dono herdado)', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/tarefas_meta' })
    expect(res.statusCode).toBe(401)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('escopa tarefas_meta pelas metas do usuário', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([])

    await app.inject({ method: 'GET', url: '/tarefas_meta' })

    const [sql, params] = mockQueryRows.mock.calls[0]
    expect(sql).toContain('meta_id IN (SELECT id FROM metas_concurso WHERE user_id = $1)')
    expect(params[0]).toBe(USER.id)
  })

  it('escopa profiles pelo próprio id para não-admin', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([])

    await app.inject({ method: 'GET', url: '/profiles' })

    const [sql, params] = mockQueryRows.mock.calls[0]
    expect(sql).toContain('WHERE id = $1')
    expect(params[0]).toBe(USER.id)
  })

  it('não escopa profiles para admin', async () => {
    const app = await buildApp(ADMIN)
    mockQueryRows.mockResolvedValue([])

    await app.inject({ method: 'GET', url: '/profiles' })

    const [sql, params] = mockQueryRows.mock.calls[0]
    expect(sql).not.toContain('WHERE id =')
    expect(params).not.toContain(ADMIN.id)
  })

  it('permite listar users autenticado', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([{ id: 'u-1' }])

    const res = await app.inject({ method: 'GET', url: '/users' })
    expect(res.statusCode).toBe(200)
  })

  it('retorna count=true com contagem', async () => {
    const app = await buildApp()
    mockQueryOne.mockResolvedValue({ total: 42 })
    mockQueryRows.mockResolvedValue([{ id: 1 }])

    const res = await app.inject({ method: 'GET', url: `/${TABELA}?count=true` })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.count).toBe(42)
    expect(body.data).toHaveLength(1)
  })
})

describe('GET /:tabela/:id — buscar por id', () => {
  it('retorna registro por id', async () => {
    const app = await buildApp()
    mockQueryOne.mockResolvedValue({ id: 5, materia: 'ADM' })

    const res = await app.inject({ method: 'GET', url: `/${TABELA}/5` })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).id).toBe(5)
  })

  it('retorna 404 se não encontrado', async () => {
    const app = await buildApp()
    mockQueryOne.mockResolvedValue(null)

    const res = await app.inject({ method: 'GET', url: `/${TABELA}/999` })
    expect(res.statusCode).toBe(404)
  })

  it('retorna 403 quando o registro pertence a outro usuário', async () => {
    const app = await buildApp(USER)
    mockQueryOne.mockResolvedValue({ id: 'h-1', user_id: OUTRO.id })

    const res = await app.inject({ method: 'GET', url: '/historico_resolucoes/h-1' })
    expect(res.statusCode).toBe(403)
  })
})

describe('POST /:tabela — inserir', () => {
  it('insere e retorna o registro', async () => {
    const app = await buildApp()
    mockQueryRows.mockResolvedValue([{ id: 10, materia: 'Nova' }])

    const res = await app.inject({
      method: 'POST',
      url: `/${TABELA}`,
      body: { materia: 'Nova' },
    })
    expect(res.statusCode).toBe(201)
    expect(JSON.parse(res.body).id).toBe(10)
  })

  it('rejeita body vazio', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: `/${TABELA}`, body: {} })
    expect(res.statusCode).toBe(400)
  })

  it('mantém insert anônimo de questões e histórico (registro público)', async () => {
    const app = await buildApp()
    mockQueryRows.mockResolvedValue([{ id: 1 }])

    const questoes = await app.inject({ method: 'POST', url: `/${TABELA}`, body: { enunciado: 'x' } })
    const historico = await app.inject({
      method: 'POST',
      url: '/historico_resolucoes',
      body: { questao_id: 1, user_id: null },
    })

    expect(questoes.statusCode).toBe(201)
    expect(historico.statusCode).toBe(201)
  })

  it('retorna 401 para insert anônimo em tabela privada', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'POST', url: '/profiles', body: { username: 'x' } })
    expect(res.statusCode).toBe(401)
  })

  it('força o user_id do usuário autenticado', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([{ id: 1 }])

    await app.inject({ method: 'POST', url: '/historico_resolucoes', body: { questao_id: 1, user_id: 'spoof' } })
    const [, values] = mockQueryRows.mock.calls[0]
    expect(values).toContain(USER.id)
    expect(values).not.toContain('spoof')
  })
})

describe('PATCH /:tabela/:id — atualizar', () => {
  it('retorna 401 sem autenticação', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'PATCH', url: `/${TABELA}/1`, body: { materia: 'X' } })
    expect(res.statusCode).toBe(401)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('atualiza e retorna o registro', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([{ id: 1, materia: 'Atualizada' }])

    const res = await app.inject({
      method: 'PATCH',
      url: `/${TABELA}/1`,
      body: { materia: 'Atualizada' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).materia).toBe('Atualizada')
  })

  it('retorna 404 se id inexistente', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([])

    const res = await app.inject({
      method: 'PATCH',
      url: `/${TABELA}/999`,
      body: { materia: 'X' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('atualiza o próprio registro em tabela escopada', async () => {
    const app = await buildApp(USER)
    mockQueryOne.mockResolvedValue({ __owner: USER.id })
    mockQueryRows.mockResolvedValue([{ id: 'h-1', user_id: USER.id }])

    const res = await app.inject({
      method: 'PATCH',
      url: '/historico_resolucoes/h-1',
      body: { acertou: true },
    })
    expect(res.statusCode).toBe(200)
  })

  it('retorna 403 ao tentar atualizar registro de outro usuário (IDOR)', async () => {
    const app = await buildApp(USER)
    mockQueryOne.mockResolvedValue({ __owner: OUTRO.id })

    const res = await app.inject({
      method: 'PATCH',
      url: '/historico_resolucoes/h-1',
      body: { acertou: true },
    })
    expect(res.statusCode).toBe(403)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('permite admin atualizar registro de outro usuário', async () => {
    const app = await buildApp(ADMIN)
    mockQueryRows.mockResolvedValue([{ id: 'h-1', user_id: OUTRO.id }])

    const res = await app.inject({
      method: 'PATCH',
      url: '/historico_resolucoes/h-1',
      body: { acertou: true },
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('PATCH /:tabela — atualizar por filtro', () => {
  it('retorna 401 sem autenticação', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'PATCH', url: `/${TABELA}?id=eq.1`, body: { materia: 'X' } })
    expect(res.statusCode).toBe(401)
  })

  it('exige filtro para não atualizar a tabela inteira', async () => {
    const app = await buildApp(USER)
    const res = await app.inject({ method: 'PATCH', url: `/${TABELA}`, body: { materia: 'X' } })
    expect(res.statusCode).toBe(400)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('escopa a atualização pelo dono da linha', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([{ id: 'h-1' }])

    await app.inject({
      method: 'PATCH',
      url: '/historico_resolucoes?questao_id=eq.7',
      body: { acertou: true },
    })

    const [sql, params] = mockQueryRows.mock.calls[0]
    expect(sql).toContain('user_id = $1')
    expect(sql).toContain('questao_id = $2')
    expect(params[0]).toBe(USER.id)
  })
})

describe('DELETE /:tabela/:id — remover', () => {
  it('retorna 401 sem autenticação', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'DELETE', url: `/${TABELA}/1` })
    expect(res.statusCode).toBe(401)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('remove e retorna sucesso', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([])

    const res = await app.inject({ method: 'DELETE', url: `/${TABELA}/1` })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })

  it('retorna 403 ao tentar remover registro de outro usuário (IDOR)', async () => {
    const app = await buildApp(USER)
    mockQueryOne.mockResolvedValue({ __owner: OUTRO.id })

    const res = await app.inject({ method: 'DELETE', url: '/historico_resolucoes/h-1' })
    expect(res.statusCode).toBe(403)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('retorna 404 quando o registro não existe', async () => {
    const app = await buildApp(USER)
    mockQueryOne.mockResolvedValue(null)

    const res = await app.inject({ method: 'DELETE', url: '/historico_resolucoes/h-999' })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /:tabela — remover por filtro', () => {
  it('retorna 401 sem autenticação', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'DELETE', url: `/${TABELA}?id=eq.1` })
    expect(res.statusCode).toBe(401)
  })

  it('exige filtro para não apagar a tabela inteira', async () => {
    const app = await buildApp(USER)
    const res = await app.inject({ method: 'DELETE', url: `/${TABELA}` })
    expect(res.statusCode).toBe(400)
    expect(mockQueryRows).not.toHaveBeenCalled()
  })

  it('escopa a remoção pelo dono da linha', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([])

    await app.inject({ method: 'DELETE', url: '/historico_resolucoes?questao_id=eq.7' })

    const [sql, params] = mockQueryRows.mock.calls[0]
    expect(sql).toContain('user_id = $1')
    expect(params[0]).toBe(USER.id)
  })
})

describe('POST /:tabela/upsert', () => {
  it('monta o SQL com RETURNING apenas no final', async () => {
    const app = await buildApp()
    mockQueryRows.mockResolvedValue([{ id: 1 }])

    await app.inject({
      method: 'POST',
      url: `/${TABELA}/upsert?on_conflict=id`,
      body: { id: 1, materia: 'X' },
    })

    const [sql] = mockQueryRows.mock.calls[0]
    expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET')
    expect(sql.match(/RETURNING \*/g)).toHaveLength(1)
    expect(sql.indexOf('ON CONFLICT')).toBeLessThan(sql.indexOf('RETURNING *'))
  })

  it('rejeita on_conflict inválido', async () => {
    const app = await buildApp()
    const res = await app.inject({
      method: 'POST',
      url: `/${TABELA}/upsert?on_conflict=id;DROP`,
      body: { id: 1 },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('tarefas_meta — dono herdado de metas_concurso', () => {
  it('retorna 403 ao atualizar tarefa de meta de outro usuário', async () => {
    const app = await buildApp(USER)
    mockQueryOne.mockResolvedValue({ __owner: OUTRO.id })

    const res = await app.inject({
      method: 'PATCH',
      url: '/tarefas_meta/171',
      body: { status: 'concluida' },
    })
    expect(res.statusCode).toBe(403)
    expect(mockQueryRows).not.toHaveBeenCalled()

    const [sql] = mockQueryOne.mock.calls[0]
    expect(sql).toContain('JOIN metas_concurso')
  })

  it('permite atualizar tarefa da própria meta', async () => {
    const app = await buildApp(USER)
    mockQueryOne.mockResolvedValue({ __owner: USER.id })
    mockQueryRows.mockResolvedValue([{ id: 171, status: 'concluida' }])

    const res = await app.inject({
      method: 'PATCH',
      url: '/tarefas_meta/171',
      body: { status: 'concluida' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('escopa a remoção em massa pelas metas do usuário', async () => {
    const app = await buildApp(USER)
    mockQueryRows.mockResolvedValue([])

    await app.inject({ method: 'DELETE', url: '/tarefas_meta?status=eq.pendente' })

    const [sql, params] = mockQueryRows.mock.calls[0]
    expect(sql).toContain('meta_id IN (SELECT id FROM metas_concurso WHERE user_id = $1)')
    expect(params[0]).toBe(USER.id)
  })

  it('não escopa para admin', async () => {
    const app = await buildApp(ADMIN)
    mockQueryRows.mockResolvedValue([])

    await app.inject({ method: 'DELETE', url: '/tarefas_meta?status=eq.pendente' })

    const [sql, params] = mockQueryRows.mock.calls[0]
    expect(sql).not.toContain('meta_id IN')
    expect(params).not.toContain(ADMIN.id)
  })
})

describe('buildFilters / buildOrder / buildUpdate', () => {
  it('escopa por coluna customizada', () => {
    const { whereSql, params } = buildFilters({}, { scopeByUser: true, userId: 'abc', scopeColumn: 'id' })
    expect(whereSql).toBe('WHERE id = $1')
    expect(params).toEqual(['abc'])
  })

  it('ignora escopo sem userId', () => {
    const { whereSql } = buildFilters({}, { scopeByUser: true, userId: null })
    expect(whereSql).toBe('')
  })

  it('ignora o parâmetro head do PostgREST', () => {
    const { whereSql } = buildFilters({ head: 'true' })
    expect(whereSql).toBe('')
  })

  it('monta ORDER BY com direção', () => {
    expect(buildOrder({ order: 'ano.desc,materia' })).toBe('ORDER BY ano DESC, materia ASC')
  })

  it('rejeita payload vazio no update', () => {
    expect(() => buildUpdate('questoes', 1, {})).toThrow('Nenhum campo para atualizar')
  })
})
