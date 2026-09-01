/**
 * Roteador de Storage — armazenamento de arquivos em disco (substitui o Storage do Supabase).
 *
 * Buckets ficam em <root>/data/storage/<bucket>/<path>.
 * O caminho é sanitizado para evitar path traversal.
 *
 * Endpoints:
 *   POST   /storage/:bucket/upload?path=...  (multipart, campo "file")  -> { path, publicUrl, url }
 *   GET    /storage/:bucket/:path            (download / exibição)
 *   DELETE /storage/:bucket?path=...         (remove arquivo)           -> { success }
 *   GET    /storage/:bucket/public-url?path= -> { publicUrl }
 */

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'

const ROOT = path.resolve(process.env.STORAGE_ROOT || './data/storage')

export function bucketDir(bucket) {
  return path.join(ROOT, bucket)
}

export function resolveFilePath(bucket, filePath) {
  const safeBucket = /^[a-z0-9_-]+$/i.test(bucket) ? bucket : null
  if (!safeBucket) return null
  const safePath = String(filePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .join('/')
  if (!safePath) return null
  return path.join(bucketDir(safeBucket), safePath)
}

export function registerStorage(app, prefix = '') {
  app.post(`${prefix}/storage/:bucket/upload`, async (request, reply) => {
    const user = request.authUser
    if (!user) return reply.code(401).send({ message: 'Autenticação necessária' })

    const filePath = resolveFilePath(request.params.bucket, request.query.path)
    if (!filePath) return reply.code(400).send({ message: 'Caminho inválido' })

    let file
    try {
      const parts = await request.file()
      if (!parts || !parts.file) return reply.code(400).send({ message: 'Nenhum arquivo enviado (campo "file")' })
      file = parts
      const dir = path.dirname(filePath)
      await fsp.mkdir(dir, { recursive: true })
      await pipeline(file.file, fs.createWriteStream(filePath))
    } catch (err) {
      return reply.code(500).send({ message: `Falha no upload: ${err.message}` })
    }

    const url = `${prefix}/storage/${request.params.bucket}/${request.query.path}`
    return reply.send({ path: request.query.path, url, publicUrl: url, size: file?.file?.bytesRead ?? 0 })
  })

  app.get(`${prefix}/storage/:bucket/list`, async (request, reply) => {
    const safeBucket = /^[a-z0-9_-]+$/i.test(request.params.bucket) ? request.params.bucket : null
    if (!safeBucket) return reply.code(400).send({ message: 'Bucket inválido' })
    const prefixPath = String(request.query.prefix || '')
      .replace(/\\/g, '/')
      .split('/')
      .filter(part => part && part !== '.' && part !== '..')
      .join('/')
    const baseDir = bucketDir(safeBucket)
    const targetDir = prefixPath ? path.join(baseDir, prefixPath) : baseDir
    const search = String(request.query.search || '').toLowerCase()
    const limit = Math.min(Number(request.query.limit) || 1000, 5000)
    try {
      if (!fs.existsSync(targetDir)) return reply.send([])
      const entries = fs.readdirSync(targetDir, { withFileTypes: true })
      const files = entries
        .filter(e => e.isFile())
        .map(e => {
          const full = path.join(targetDir, e.name)
          const rel = prefixPath ? `${prefixPath}/${e.name}` : e.name
          let stat = null
          try { stat = fs.statSync(full) } catch { /* noop */ }
          return {
            name: rel,
            path: rel,
            type: 'FILE',
            size: stat?.size ?? 0,
            id: rel,
            last_accessed_at: stat?.atime?.toISOString() ?? null,
            created_at: stat?.birthtime?.toISOString() ?? null,
            updated_at: stat?.mtime?.toISOString() ?? null,
          }
        })
        .filter(f => !search || f.name.toLowerCase().includes(search))
        .sort((a, b) => b.name.localeCompare(a.name))
        .slice(0, limit)
      return reply.send(files)
    } catch (err) {
      return reply.code(500).send({ message: `Erro ao listar: ${err.message}` })
    }
  })

  app.get(`${prefix}/storage/:bucket/public-url`, async (request, reply) => {
    const filePath = resolveFilePath(request.params.bucket, request.query.path)
    if (!filePath) return reply.code(400).send({ message: 'Caminho inválido' })
    const url = `${prefix}/storage/${request.params.bucket}/${request.query.path}`
    return reply.send({ publicUrl: url })
  })

  app.get(`${prefix}/storage/:bucket/*`, async (request, reply) => {
    const filePath = resolveFilePath(request.params.bucket, request.params['*'])
    if (!filePath) return reply.code(400).send({ message: 'Caminho inválido' })
    try {
      const stat = await fsp.stat(filePath)
      if (!stat.isFile()) return reply.code(404).send({ message: 'Arquivo não encontrado' })
      const ext = path.extname(filePath).toLowerCase()
      const typeMap = {
        '.gz': 'application/x-gzip',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.txt': 'text/plain',
      }
      reply.type(typeMap[ext] || 'application/octet-stream')
      return reply.send(fs.createReadStream(filePath))
    } catch (err) {
      return reply.code(404).send({ message: 'Arquivo não encontrado' })
    }
  })

  app.delete(`${prefix}/storage/:bucket`, async (request, reply) => {
    const user = request.authUser
    if (!user) return reply.code(401).send({ message: 'Autenticação necessária' })
    const filePath = resolveFilePath(request.params.bucket, request.query.path)
    if (!filePath) return reply.code(400).send({ message: 'Caminho inválido' })
    try {
      await fsp.unlink(filePath)
      return reply.send({ success: true })
    } catch {
      return reply.send({ success: false, message: 'Arquivo não encontrado' })
    }
  })
}
