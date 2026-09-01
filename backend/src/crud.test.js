import { vi, describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'

const mockQueryRows = vi.fn()
const mockQueryOne = vi.fn()

vi.mock('./db.js', () => ({
  queryRows: (...args) => mockQueryRows(...args),
  queryOne: (...args) => mockQueryOne(...args),
}))

import { registerCrud } from './routes/crud.js'

const TABELA = 'questoes'

async function buildApp() {
  const app = Fastify({ logger: false })
  app.addHook('onRequest', async (request) => {
    request.authUser = null
  })
  registerCrud(app, [TABELA, 'historico_resolucoes'])
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
})

describe('PATCH /:tabela/:id — atualizar', () => {
  it('atualiza e retorna o registro', async () => {
    const app = await buildApp()
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
    const app = await buildApp()
    mockQueryRows.mockResolvedValue([])

    const res = await app.inject({
      method: 'PATCH',
      url: `/${TABELA}/999`,
      body: { materia: 'X' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /:tabela/:id — remover', () => {
  it('remove e retorna sucesso', async () => {
    const app = await buildApp()
    mockQueryRows.mockResolvedValue([])

    const res = await app.inject({ method: 'DELETE', url: `/${TABELA}/1` })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).success).toBe(true)
  })
})