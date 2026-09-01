import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg

/**
 * Pool de conexões com o Postgres.
 * @type {import('pg').Pool}
 */
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
})

/**
 * Executa uma query e retorna o resultado cru do pg.
 * @param {string} text SQL com placeholders ($1, $2, ...)
 * @param {unknown[]} [params] Parâmetros da query
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  const res = await pool.query(text, params)
  return res
}

/**
 * Executa uma query e retorna as linhas (rows).
 * @param {string} text SQL com placeholders ($1, $2, ...)
 * @param {unknown[]} [params] Parâmetros da query
 * @returns {Promise<any[]>}
 */
export async function queryRows(text, params) {
  const res = await query(text, params)
  return res.rows
}

/**
 * Executa uma query e retorna apenas a primeira linha (ou null).
 * @param {string} text SQL com placeholders ($1, $2, ...)
 * @param {unknown[]} [params] Parâmetros da query
 * @returns {Promise<any | null>}
 */
export async function queryOne(text, params) {
  const rows = await queryRows(text, params)
  return rows[0] ?? null
}
