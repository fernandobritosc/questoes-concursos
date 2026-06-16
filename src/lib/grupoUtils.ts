import gruposData from '../data/grupos.json'
import { supabase } from './supabase'

type GrupoEntry = { materia: string; grupo: string | null }
const GRUPOS = gruposData as Record<string, GrupoEntry>

const MATERIA_ALIAS: Record<string, string> = {
  'TI - Redes de Computadores': 'Informática',
  'TI - Engenharia de Software': 'Informática',
  'TI - Banco de Dados': 'Informática',
  'TI - Segurança da Informação': 'Informática',
  'TI - Desenvolvimento de Sistemas': 'Informática',
  'TI - Sistemas Operacionais': 'Informática',
  'TI - Governança de TI': 'Informática',
  'Direito Constitucional (CF/1988 e Doutrina)': 'Direito Constitucional',
  'Direito Administrativo (Doutrina e Leis Federais)': 'Direito Administrativo',
  'Direito do Trabalho para Concursos': 'Direito do Trabalho',
}

function materiaKey(m: string): string {
  const resolved = MATERIA_ALIAS[m] ?? m
  return resolved.replace(/\s*\([^)]*\)/g, '').trim()
}

export function getGrupo(materia: string | null, assunto: string | null): string | null {
  if (!materia || !assunto) return null
  const entry = GRUPOS[assunto]
  if (!entry) return null
  if (materiaKey(entry.materia) !== materiaKey(materia)) return null
  return entry.grupo
}

export async function backfillGrupos(): Promise<{ updated: number; skipped: number; errors: string[] }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('questoes')
    .select('id, materia, assunto')
    .is('grupo', null)

  if (error) throw error
  if (!data || data.length === 0) return { updated: 0, skipped: 0, errors: [] }

  const result = { updated: 0, skipped: 0, errors: [] as string[] }

  for (const q of data) {
    const grupo = getGrupo(q.materia, q.assunto)
    if (!grupo) {
      result.skipped++
      continue
    }
    const { error: updateErr } = await supabase
      .from('questoes')
      .update({ grupo })
      .eq('id', q.id)

    if (updateErr) {
      result.errors.push(`id=${q.id}: ${updateErr.message}`)
    } else {
      result.updated++
    }
  }

  return result
}

export async function diagnosticGrupos(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('questoes')
    .select('materia, assunto')
    .is('grupo', null)

  if (error) throw error
  if (!data || data.length === 0) {
    console.log('Nenhuma questão sem grupo!')
    return
  }

  const grupos = gruposData as Record<string, { materia: string; grupo: string | null }>
  const agg: Record<string, { materia: string; assuntos: Record<string, number> }> = {}

  for (const q of data) {
    const m = q.materia || '(sem materia)'
    const a = q.assunto || '(sem assunto)'
    if (!agg[m]) agg[m] = { materia: m, assuntos: {} }
    agg[m].assuntos[a] = (agg[m].assuntos[a] || 0) + 1
  }

  for (const materia of Object.keys(agg).sort()) {
    console.group(`📁 ${materia} (${Object.values(agg[materia].assuntos).reduce((a, b) => a + b, 0)} questões)`)
    for (const [assunto, count] of Object.entries(agg[materia].assuntos).sort()) {
      const entry = grupos[assunto]
      if (!entry) {
        console.log(`⚠️  [${count}] "${assunto}" — NÃO EXISTE em grupos.json`)
      } else if (entry.materia !== materia) {
        console.log(`⚠️  [${count}] "${assunto}" — matéria difere: grupos.json tem "${entry.materia}"`)
      } else if (!entry.grupo) {
        console.log(`ℹ️  [${count}] "${assunto}" — grupo é null no JSON`)
      }
    }
    console.groupEnd()
  }
}

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>
  w.__BACKFILL_GRUPOS = backfillGrupos
  w.__DIAGNOSTIC_GRUPOS = diagnosticGrupos
}
