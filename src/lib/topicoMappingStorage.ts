const STORAGE_KEY = 'edital_topico_mapping'

function load(): Record<string, Record<string, string[]>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function save(data: Record<string, Record<string, string[]>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getTopicoMapping(materiaId: string): Record<string, string[]> {
  return load()[materiaId] ?? {}
}

export function setTopicoAssuntos(materiaId: string, topico: string, assuntos: string[]) {
  const data = load()
  if (!data[materiaId]) data[materiaId] = {}
  data[materiaId][topico] = assuntos
  save(data)
}

export function getAssuntosDoTopico(materiaId: string, topico: string): string[] {
  const map = getTopicoMapping(materiaId)
  return map[topico] ?? []
}

export function clearTopicoMapping(materiaId: string) {
  const data = load()
  delete data[materiaId]
  save(data)
}
