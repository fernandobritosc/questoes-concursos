import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { config } from './config.js'
import { queryOne, queryRows } from './db.js'

const SALT_ROUNDS = 10

export function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS)
}

export function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash)
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, is_admin: user.is_admin },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret)
  } catch {
    return null
  }
}

export function toPublicUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    approved: user.approved,
    is_admin: user.is_admin,
    created_at: user.created_at,
  }
}

/** Busca ou cria o profile correspondente ao usuário. */
export async function ensureProfile(userId) {
  const profile = await queryOne('SELECT * FROM profiles WHERE id = $1', [userId])
  if (profile) return profile
  await queryRows(
    `INSERT INTO profiles (id, email, approved, is_admin)
     SELECT id, email, approved, is_admin FROM users WHERE id = $1
     ON CONFLICT (id) DO NOTHING`,
    [userId]
  )
  return queryOne('SELECT * FROM profiles WHERE id = $1', [userId])
}

export async function registerUser({ email, password, name }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail || !password) {
    const err = new Error('E-mail e senha são obrigatórios')
    err.statusCode = 400
    throw err
  }
  if (password.length < 6) {
    const err = new Error('A senha deve ter pelo menos 6 caracteres')
    err.statusCode = 400
    throw err
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalizedEmail])
  if (existing) {
    const err = new Error('E-mail já cadastrado')
    err.statusCode = 409
    throw err
  }

  const hash = hashPassword(password)
  const user = await queryOne(
    `INSERT INTO users (email, password_hash, name, approved, is_admin)
     VALUES ($1, $2, $3, true, false)
     RETURNING *`,
    [normalizedEmail, hash, name || null]
  )
  await ensureProfile(user.id)
  return { token: signToken(user), user: toPublicUser(user) }
}

export async function loginUser({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail || !password) {
    const err = new Error('E-mail e senha são obrigatórios')
    err.statusCode = 400
    throw err
  }

  const user = await queryOne('SELECT * FROM users WHERE email = $1', [normalizedEmail])
  if (!user || !verifyPassword(password, user.password_hash)) {
    const err = new Error('E-mail ou senha inválidos')
    err.statusCode = 401
    throw err
  }
  return { token: signToken(user), user: toPublicUser(user) }
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  if (!userId) {
    const err = new Error('Autenticação necessária')
    err.statusCode = 401
    throw err
  }
  if (!currentPassword || !newPassword) {
    const err = new Error('Senha atual e nova senha são obrigatórias')
    err.statusCode = 400
    throw err
  }
  if (newPassword.length < 6) {
    const err = new Error('A nova senha deve ter pelo menos 6 caracteres')
    err.statusCode = 400
    throw err
  }

  const user = await queryOne('SELECT * FROM users WHERE id = $1', [userId])
  if (!user) {
    const err = new Error('Usuário não encontrado')
    err.statusCode = 404
    throw err
  }
  if (!verifyPassword(currentPassword, user.password_hash)) {
    const err = new Error('Senha atual incorreta')
    err.statusCode = 401
    throw err
  }

  const hash = hashPassword(newPassword)
  await queryRows('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId])
  return { message: 'Senha alterada com sucesso' }
}

/** Extrai o usuário autenticado a partir do header Authorization. */
export function getAuthUser(request) {
  const header = request.headers.authorization || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  return { id: payload.sub, email: payload.email, name: payload.name, is_admin: payload.is_admin }
}
