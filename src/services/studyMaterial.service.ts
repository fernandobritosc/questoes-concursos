/**
 * studyMaterial.service.ts
 * Serviço de armazenamento híbrido (Local via IndexedDB + Nuvem via Supabase)
 * com motor de compactação nativo Gzip de alta performance.
 */
import { supabase } from '../lib/supabase'

const DB_NAME = 'StudyMaterialsDB'
const STORE_NAME = 'materials'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

// ─── Motor de Compactação Gzip (Lossless) ───────────────────────────────────

async function compressBlob(blob: Blob): Promise<Blob> {
  const stream = blob.stream().pipeThrough(new CompressionStream('gzip'))
  return await new Response(stream).blob()
}

async function decompressBlob(blob: Blob): Promise<Blob> {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).blob()
}

// ─── Helper: Sanitização de Caminho do Supabase Storage (S3 Safe) ─────────────

/**
 * Remove acentos, caracteres especiais e espaços de nomes de matérias/assuntos
 * para gerar caminhos de S3 100% seguros e compatíveis com URL.
 */
function sanitizeStoragePath(materia: string, assunto: string): string {
  const clean = (text: string) => {
    return text
      .normalize("NFD") // Decompõe caracteres acentuados (ex: á -> a + ´)
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos fisicamente
      .replace(/[^a-zA-Z0-9\s-_]/g, "") // Remove caracteres especiais indesejados
      .trim()
      .replace(/\s+/g, "_") // Substitui espaços por underscores
  }
  
  const cleanMateria = clean(materia).toLowerCase()
  const cleanAssunto = clean(assunto).toLowerCase()
  
  return `${cleanMateria}/${cleanAssunto}.pdf.gz`
}

// ─── APIs do Serviço ─────────────────────────────────────────────────────────

interface StudyMaterialIndexedItem {
  id: string
  materia: string
  assunto: string
  fileName: string
  fileData: Blob
  originalSize: number
  compressedSize: number
  updatedAt: string
}

interface MateriaisEstudoRow {
  id: string
  materia: string
  assunto: string
  file_name: string
  file_url: string
  original_size: number
  compressed_size: number
  updated_at: string
}

export interface StudyMaterialMetadata {
  fileName: string
  originalSize: number
  compressedSize: number
  updatedAt: string
}

/**
 * Verifica se a tabela 'materiais_estudo' está acessível no Supabase.
 */
export async function checkCloudAvailability(): Promise<boolean> {
  try {
    const { error } = await supabase.from('materiais_estudo').select('id').limit(1)
    if (error) {
      console.warn('Tabela materiais_estudo indisponível no Supabase:', error.message)
      return false
    }
    return true
  } catch (err: unknown) {
    console.warn('Erro ao verificar disponibilidade do Supabase:', err)
    return false
  }
}

/**
 * Salva um PDF de estudo de forma compactada na Nuvem ou Localmente.
 */
export async function saveStudyMaterial(
  materia: string,
  assunto: string,
  fileName: string,
  fileData: Blob,
  mode: 'local' | 'cloud'
): Promise<{ originalSize: number; compressedSize: number }> {
  const originalSize = fileData.size
  const compressedBlob = await compressBlob(fileData)
  const compressedSize = compressedBlob.size

  if (mode === 'cloud') {
    const path = sanitizeStoragePath(materia, assunto)
    
    // 1. Remove qualquer arquivo antigo no Storage para evitar conflitos de cache
    await supabase.storage.from('materiais-estudo').remove([path])

    // 2. Faz o upload do PDF Gzipped
    const { error: uploadError } = await supabase.storage
      .from('materiais-estudo')
      .upload(path, compressedBlob, {
        contentType: 'application/x-gzip',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Erro ao enviar arquivo para o Storage: ${uploadError.message}`)
    }

    // 3. Busca a URL pública permanente do arquivo no Storage
    const { data: { publicUrl } } = supabase.storage
      .from('materiais-estudo')
      .getPublicUrl(path)

    // 4. Salva/atualiza a linha de metadados correspondente no banco de dados
    const metadata = {
      id: `${materia} | ${assunto}`,
      materia,
      assunto,
      file_name: fileName,
      file_url: publicUrl,
      original_size: originalSize,
      compressed_size: compressedSize,
      updated_at: new Date().toISOString()
    }

    const { error: dbError } = await supabase
      .from('materiais_estudo')
      .upsert(metadata)

    if (dbError) {
      throw new Error(`Erro ao salvar metadados no banco: ${dbError.message}`)
    }

  } else {
    // Salvamento local em IndexedDB
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      
      const item = {
        id: `${materia} | ${assunto}`,
        materia,
        assunto,
        fileName,
        fileData: compressedBlob,
        originalSize,
        compressedSize,
        updatedAt: new Date().toISOString()
      }
      
      const request = store.put(item)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  return { originalSize, compressedSize }
}

/**
 * Recupera e descompacta o material de estudo, gerando uma URL temporária para o iframe.
 */
export async function getStudyMaterial(
  materia: string,
  assunto: string,
  mode: 'local' | 'cloud'
): Promise<{ fileName: string; blobUrl: string } | null> {
  if (mode === 'cloud') {
    // 1. Busca metadados na tabela
    const { data: meta, error: dbError } = await supabase
      .from('materiais_estudo')
      .select('*')
      .eq('id', `${materia} | ${assunto}`)
      .single()

    if (dbError || !meta) return null

    // 2. Faz o download do arquivo compactado do Storage
    const path = sanitizeStoragePath(materia, assunto)
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('materiais-estudo')
      .download(path)

    if (downloadError || !fileBlob) {
      throw new Error(`Erro ao baixar PDF do Storage: ${downloadError?.message || 'Arquivo não encontrado'}`)
    }

    // 3. Descompacta e gera o visualizador
    const decompressed = await decompressBlob(fileBlob)
    const pdfBlob = new Blob([decompressed], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(pdfBlob)

    return {
      fileName: meta.file_name,
      blobUrl
    }

  } else {
    // Recupera do IndexedDB local
    const db = await openDB()
    const item = await new Promise<StudyMaterialIndexedItem | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(`${materia} | ${assunto}`)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })

    if (!item) return null

    // Descompacta e gera o visualizador
    const decompressed = await decompressBlob(item.fileData)
    const pdfBlob = new Blob([decompressed], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(pdfBlob)

    return {
      fileName: item.fileName,
      blobUrl
    }
  }
}

/**
 * Exclui fisicamente o material e seus metadados.
 */
export async function deleteStudyMaterial(
  materia: string,
  assunto: string,
  mode: 'local' | 'cloud'
): Promise<void> {
  if (mode === 'cloud') {
    const path = sanitizeStoragePath(materia, assunto)
    
    // Remove do Storage
    await supabase.storage.from('materiais-estudo').remove([path])

    // Remove da tabela de metadados
    const { error } = await supabase
      .from('materiais_estudo')
      .delete()
      .eq('id', `${materia} | ${assunto}`)

    if (error) throw error
  } else {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(`${materia} | ${assunto}`)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

/**
 * Revoga uma URL de objeto criada por getStudyMaterial.
 */
export function revokeStudyMaterialUrl(blobUrl: string) {
  URL.revokeObjectURL(blobUrl)
}

/**
 * Lista todos os metadados cadastrados para saber quais quadradinhos do Mapa possuem PDFs.
 */
export async function listAllStudyMaterialsMetadata(
  mode: 'local' | 'cloud'
): Promise<Record<string, StudyMaterialMetadata>> {
  if (mode === 'cloud') {
    const { data, error } = await supabase
      .from('materiais_estudo')
      .select('*')

    if (error) {
      console.warn("Erro ao buscar metadados na nuvem:", error.message)
      return {}
    }

    const metadata: Record<string, StudyMaterialMetadata> = {}
    ;(data || []).forEach((item: MateriaisEstudoRow) => {
      metadata[item.id] = {
        fileName: item.file_name,
        originalSize: item.original_size,
        compressedSize: item.compressed_size,
        updatedAt: item.updated_at
      }
    })
    return metadata;

  } else {
    const db = await openDB()
    return new Promise<Record<string, StudyMaterialMetadata>>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onsuccess = () => {
        const results: StudyMaterialIndexedItem[] = request.result || []
        const metadata: Record<string, StudyMaterialMetadata> = {}
        results.forEach((item) => {
          metadata[item.id] = {
            fileName: item.fileName,
            originalSize: item.originalSize || item.fileData.size,
            compressedSize: item.compressedSize || item.fileData.size,
            updatedAt: item.updatedAt
          }
        })
        resolve(metadata)
      }
      request.onerror = () => reject(request.error)
    })
  }
}
