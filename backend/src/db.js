import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
})

export async function query(text, params) {
  const res = await pool.query(text, params)
  return res
}

export async function queryRows(text, params) {
  const res = await query(text, params)
  return res.rows
}

export async function queryOne(text, params) {
  const rows = await queryRows(text, params)
  return rows[0] ?? null
}
