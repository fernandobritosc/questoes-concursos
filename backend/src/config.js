import 'dotenv/config' // noop se ausente — ver abaixo

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgres://concursos_app:concursos_app_secret_2026@127.0.0.1:5432/concursos',
  jwtSecret: process.env.JWT_SECRET || 'troque-este-secret-na-producao-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
}
