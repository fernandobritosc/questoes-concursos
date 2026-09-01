import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'

// URL absoluta do config.js (robusta a caracteres especiais no caminho)
const CONFIG_URL = new URL('./config.js', import.meta.url).href

function runNode(env) {
  return spawnSync(process.execPath, ['-e', `import('${CONFIG_URL}')`], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  })
}

describe('config — validação de ambiente', () => {
  it('em produção sem DATABASE_URL/JWT_SECRET, lança erro claro', () => {
    const res = runNode({
      NODE_ENV: 'production',
      DATABASE_URL: '',
      JWT_SECRET: '',
    })
    expect(res.stderr).toContain('DATABASE_URL e JWT_SECRET são obrigatórios em produção')
  })

  it('em produção com as env vars, importa sem erro', () => {
    const res = runNode({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://x:x@localhost/db',
      JWT_SECRET: 'segredo-de-teste',
    })
    expect(res.stderr).not.toContain('obrigatórios')
  })

  it('em dev sem env vars, usa fallback (importa sem erro)', () => {
    const res = runNode({ NODE_ENV: 'development' })
    expect(res.stderr).not.toContain('obrigatórios')
  })
})
