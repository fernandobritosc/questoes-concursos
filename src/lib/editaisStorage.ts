import type { Edital, Cargo, MateriaEdital } from '../types/database'
import seedData from '../data/editais.json'

const STORAGE_KEY = 'editais_data'

let cached: Edital[] | null = null

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function load(): Edital[] {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      cached = JSON.parse(raw) as Edital[]
      return cached
    }
  } catch { /* ignorar */ }
  cached = seedData as Edital[]
  save(cached)
  return cached
}

function save(data: Edital[]) {
  cached = data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ─── Edital CRUD ──────────────────────────────────────────────

export function listEditais(): Edital[] {
  return JSON.parse(JSON.stringify(load()))
}

export function getEdital(id: string): Edital | undefined {
  const data = load()
  const found = data.find(e => e.id === id)
  return found ? JSON.parse(JSON.stringify(found)) : undefined
}

export function createEdital(orgao: string, sigla: string, banca: string, ano: number): Edital {
  const data = load()
  const edital: Edital = {
    id: genId(),
    orgao,
    sigla,
    banca,
    ano,
    cargos: [],
  }
  data.push(edital)
  save(data)
  return edital
}

export function updateEdital(id: string, fields: Partial<Pick<Edital, 'orgao' | 'sigla' | 'banca' | 'ano'>>): Edital | undefined {
  const data = load()
  const idx = data.findIndex(e => e.id === id)
  if (idx === -1) return undefined
  data[idx] = { ...data[idx], ...fields }
  save(data)
  return data[idx]
}

export function deleteEdital(id: string): boolean {
  const data = load()
  const idx = data.findIndex(e => e.id === id)
  if (idx === -1) return false
  data.splice(idx, 1)
  save(data)
  return true
}

// ─── Cargo CRUD ───────────────────────────────────────────────

export function addCargo(editalId: string, nome: string, nivel: string): Cargo | undefined {
  const data = load()
  const edital = data.find(e => e.id === editalId)
  if (!edital) return undefined
  const cargo: Cargo = { id: genId(), nome, nivel, materias: [] }
  edital.cargos.push(cargo)
  save(data)
  return cargo
}

export function updateCargo(editalId: string, cargoId: string, fields: Partial<Pick<Cargo, 'nome' | 'nivel'>>): Cargo | undefined {
  const data = load()
  const edital = data.find(e => e.id === editalId)
  if (!edital) return undefined
  const cargo = edital.cargos.find(c => c.id === cargoId)
  if (!cargo) return undefined
  Object.assign(cargo, fields)
  save(data)
  return cargo
}

export function deleteCargo(editalId: string, cargoId: string): boolean {
  const data = load()
  const edital = data.find(e => e.id === editalId)
  if (!edital) return false
  const idx = edital.cargos.findIndex(c => c.id === cargoId)
  if (idx === -1) return false
  edital.cargos.splice(idx, 1)
  save(data)
  return true
}

// ─── Matéria CRUD ─────────────────────────────────────────────

export function addMateria(editalId: string, cargoId: string, nome: string): MateriaEdital | undefined {
  const data = load()
  const edital = data.find(e => e.id === editalId)
  if (!edital) return undefined
  const cargo = edital.cargos.find(c => c.id === cargoId)
  if (!cargo) return undefined
  const materia: MateriaEdital = { id: genId(), nome, topicos: [] }
  cargo.materias.push(materia)
  save(data)
  return materia
}

export function updateMateria(editalId: string, cargoId: string, materiaId: string, nome: string): MateriaEdital | undefined {
  const data = load()
  const edital = data.find(e => e.id === editalId)
  if (!edital) return undefined
  const cargo = edital.cargos.find(c => c.id === cargoId)
  if (!cargo) return undefined
  const materia = cargo.materias.find(m => m.id === materiaId)
  if (!materia) return undefined
  materia.nome = nome
  save(data)
  return materia
}

export function updateMateriaTopicos(editalId: string, cargoId: string, materiaId: string, topicos: string[]): MateriaEdital | undefined {
  const data = load()
  const edital = data.find(e => e.id === editalId)
  if (!edital) return undefined
  const cargo = edital.cargos.find(c => c.id === cargoId)
  if (!cargo) return undefined
  const materia = cargo.materias.find(m => m.id === materiaId)
  if (!materia) return undefined
  materia.topicos = topicos
  save(data)
  return materia
}

// ─── Reorder ───────────────────────────────────────────────────

export function reorderCargo(editalId: string, fromIndex: number, toIndex: number): boolean {
  const data = load()
  const edital = data.find(e => e.id === editalId)
  if (!edital) return false
  if (fromIndex < 0 || fromIndex >= edital.cargos.length) return false
  if (toIndex < 0 || toIndex >= edital.cargos.length) return false
  const [moved] = edital.cargos.splice(fromIndex, 1)
  edital.cargos.splice(toIndex, 0, moved)
  save(data)
  return true
}

export function reorderMateria(editalId: string, cargoId: string, fromIndex: number, toIndex: number): boolean {
  const data = load()
  const edital = data.find(e => e.id === editalId)
  if (!edital) return false
  const cargo = edital.cargos.find(c => c.id === cargoId)
  if (!cargo) return false
  if (fromIndex < 0 || fromIndex >= cargo.materias.length) return false
  if (toIndex < 0 || toIndex >= cargo.materias.length) return false
  const [moved] = cargo.materias.splice(fromIndex, 1)
  cargo.materias.splice(toIndex, 0, moved)
  save(data)
  return true
}

export function deleteMateria(editalId: string, cargoId: string, materiaId: string): boolean {
  const data = load()
  const edital = data.find(e => e.id === editalId)
  if (!edital) return false
  const cargo = edital.cargos.find(c => c.id === cargoId)
  if (!cargo) return false
  const idx = cargo.materias.findIndex(m => m.id === materiaId)
  if (idx === -1) return false
  cargo.materias.splice(idx, 1)
  save(data)
  return true
}
