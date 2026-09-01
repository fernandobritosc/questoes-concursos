import { describe, it, expect, vi } from 'vitest'
import { getGrupo } from './grupoUtils'

vi.mock('./supabase', () => ({
  supabase: {},
}))

describe('getGrupo', () => {
  it('returns null when materia or assunto is missing', () => {
    expect(getGrupo(null, 'Protocolos de Redes')).toBeNull()
    expect(getGrupo('Informática', null)).toBeNull()
    expect(getGrupo(null, null)).toBeNull()
  })

  it('returns null for empty strings', () => {
    expect(getGrupo('', 'Protocolos de Redes')).toBeNull()
    expect(getGrupo('Informática', '')).toBeNull()
  })

  it('returns exact match by assunto', () => {
    expect(getGrupo('Informática', 'Protocolos de Redes')).toBe('Redes de Computadores')
  })

  it('matches with accent-insensitive normalization', () => {
    expect(getGrupo('Língua Portuguesa (Português)', 'Conjunção')).toBe('Morfologia')
  })

  it('matches Direito Constitucional with full name', () => {
    expect(getGrupo(
      'Direito Constitucional (CF/1988 e Doutrina)',
      'Dos Direitos e Deveres Individuais e Coletivos (art. 5º da CF/1988)'
    )).toBe('Dos Direitos e Garantias Fundamentais (arts. 5º a 17 da CF/1988)')
  })

  it('resolves AFO materia alias to fallback group', () => {
    expect(getGrupo('AFO', 'Direito Financeiro e Contabilidade Pública'))
      .toBe('Introdução à Administração Financeira e Orçamentária')
  })

  it('resolves Administração Geral fallback by group name (not assunto key)', () => {
    // "Planejamento Estratégico" não é chave exata do fallback; o fallback busca pelo nome do grupo
    expect(getGrupo('Administração Geral e Pública', 'Planejamento Estratégico')).toBe('Processo de Planejamento')
  })

  it('resolves new materia Gestão de Projetos (PMBOK)', () => {
    expect(getGrupo('Gestão de Projetos (PMBOK)', 'Estrutura Organizacional na Gestão de Projetos'))
      .toBe('Gestão de Projetos')
  })

  it('resolves new materia Biblioteconomia', () => {
    expect(getGrupo('Biblioteconomia', 'Conceitos de Biblioteconomia')).toBe('Biblioteconomia')
  })

  it('returns null when materia has no fallback', () => {
    expect(getGrupo('Matéria Inexistente XYZ', 'Assunto Qualquer')).toBeNull()
  })
})
