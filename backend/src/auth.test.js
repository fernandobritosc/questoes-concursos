import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, signToken, verifyToken, toPublicUser, getAuthUser } from './auth.js'
import { config } from './config.js'

describe('auth — hashPassword/verifyPassword', () => {
  it('hash gera hash que a verificação aceita', () => {
    const hash = hashPassword('minha-senha-123')
    expect(hash).not.toBe('minha-senha-123')
    expect(verifyPassword('minha-senha-123', hash)).toBe(true)
  })

  it('senha errada não passa na verificação', () => {
    const hash = hashPassword('correta')
    expect(verifyPassword('errada', hash)).toBe(false)
  })
})

describe('auth — signToken/verifyToken', () => {
  const user = { id: 'abc-123', email: 'a@b.com', name: 'Ana', is_admin: false }

  it('signToken gera token que verifyToken aceita com os dados', () => {
    const token = signToken(user)
    expect(token).toBeTruthy()
    const decoded = verifyToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded.sub).toBe('abc-123')
    expect(decoded.email).toBe('a@b.com')
  })

  it('verifyToken rejeita token inválido', () => {
    expect(verifyToken('token-invalido')).toBeNull()
    expect(verifyToken('')).toBeNull()
  })

  it('verifyToken rejeita token assinado com outro segredo', () => {
    const jwt = signToken(user)
    const outroSecret = jwt + 'x' // força falha
    expect(verifyToken(outroSecret)).toBeNull()
  })
})

describe('auth — toPublicUser', () => {
  it('remove password_hash e campos sensíveis', () => {
    const pub = toPublicUser({ id: '1', email: 'a@b.com', password_hash: 'hash', created_at: 'x' })
    expect(pub).toEqual({ id: '1', email: 'a@b.com', name: undefined, approved: undefined, is_admin: undefined, created_at: 'x' })
    expect(pub).not.toHaveProperty('password_hash')
  })

  it('retorna null para user nulo', () => {
    expect(toPublicUser(null)).toBeNull()
  })
})

describe('auth — getAuthUser', () => {
  it('retorna null sem header Authorization', () => {
    expect(getAuthUser({ headers: {} })).toBeNull()
  })

  it('retorna null com header não-Bearer', () => {
    expect(getAuthUser({ headers: { authorization: 'Basic abc' } })).toBeNull()
  })

  it('retorna null com token inválido', () => {
    expect(getAuthUser({ headers: { authorization: 'Bearer token-xyz' } })).toBeNull()
  })

  it('retorna o usuário com token válido', () => {
    const token = signToken({ id: 'u1', email: 'x@y.com', name: null, is_admin: false })
    const user = getAuthUser({ headers: { authorization: `Bearer ${token}` } })
    expect(user).not.toBeNull()
    expect(user.id).toBe('u1')
    expect(user.email).toBe('x@y.com')
  })
})
