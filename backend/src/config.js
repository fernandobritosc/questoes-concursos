import 'dotenv/config'

const isProd = process.env.NODE_ENV === 'production'

if (isProd && (!process.env.DATABASE_URL || !process.env.JWT_SECRET)) {
  throw new Error('DATABASE_URL e JWT_SECRET são obrigatórios em produção.')
}

/** @type {Readonly<{ port: number; host: string; databaseUrl: string; jwtSecret: string; jwtExpiresIn: string }>} */
export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgres://concursos_app:concursos_app_secret_2026@127.0.0.1:5432/concursos',
  jwtSecret: process.env.JWT_SECRET || 'troque-este-secret-na-producao-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
}
