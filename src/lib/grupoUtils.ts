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

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function materiaKey(m: string): string {
  const resolved = MATERIA_ALIAS[m] ?? m
  return resolved.replace(/\s*\([^)]*\)/g, '').trim()
}

// Índice normalizado para matching flexível (ignora acentos, maiúsculas, parênteses)
const GRUPOS_NORMALIZED: Map<string, { materia: string; grupo: string | null }> = new Map()
for (const [assunto, entry] of Object.entries(GRUPOS)) {
  const key = normalizeText(assunto)
  if (!GRUPOS_NORMALIZED.has(key)) {
    GRUPOS_NORMALIZED.set(key, entry)
  }
}

// Fallback: quando o assunto não é encontrado, usa um grupo padrão da matéria
const MATERIA_FALLBACK: Record<string, string> = {
  'Administração Geral e Pública': 'Introdução à Administração',
  'Informática': 'Conceitos Gerais de Informática e Introdução',
  'Direito Constitucional': 'Teoria do Direito Constitucional',
  'AFO, Direito Financeiro e Contabilidade Pública': 'Introdução à Administração Financeira e Orçamentária',
  'Língua Portuguesa': 'Linguagem',
  'Direito Administrativo': 'Origem, Conceito e Fontes do Direito Administrativo',
  'Direito do Trabalho': 'Outros Temas e Questões Mescladas de Direito do Trabalho',
  'Direito Processual do Trabalho': 'Outros Temas e Questões Mescladas de Processo do Trabalho',
  'Direitos Humanos': 'Tratados Internacionais de Direitos Humanos',
  'Legislação Civil e Processual Civil Especial': 'Do Mandado de Segurança (Lei n° 12.016/2009 e CF/1988)',
  'Raciocínio Lógico': 'Proposições: Definição, Reconhecimento, Princípios Lógicos',
  'Direito Digital': 'Disposições Preliminares (arts. 1° a 6° da Lei n° 13.709/2018 - LGPD)',
  'Direito Civil': 'Das Associações (arts. 53 a 61)',
  'Direito Internacional Público e Privado': 'Migração e Condição Jurídica do Estrangeiro (Lei n° 13.445/2017)',
  'Outras Matérias': 'Sem classificação',
  'Engenharia Elétrica e Eletrônica': 'Redes de Dados e Comunicação',
}

export function getGrupo(materia: string | null, assunto: string | null): string | null {
  if (!materia || !assunto) return null

  // 1. Match exato por assunto
  const entry = GRUPOS[assunto]
  if (entry && materiaKey(entry.materia) === materiaKey(materia)) {
    return entry.grupo
  }

  // 2. Match normalizado (ignora acentos, maiúsculas, parênteses)
  const normKey = normalizeText(assunto)
  const normEntry = GRUPOS_NORMALIZED.get(normKey)
  if (normEntry && materiaKey(normEntry.materia) === materiaKey(materia)) {
    return normEntry.grupo
  }

  // 3. Fallback por matéria
  const materiaNorm = materiaKey(materia)
  const fallbackAssunto = MATERIA_FALLBACK[materiaNorm]
  if (fallbackAssunto) {
    const fbEntry = GRUPOS[fallbackAssunto]
    if (fbEntry) return fbEntry.grupo
  }

  return null
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
