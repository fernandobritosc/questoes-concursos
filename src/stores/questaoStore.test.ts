import { describe, it, expect, beforeEach } from 'vitest'
import { useQuestaoStore } from './questaoStore'
import type { ResolucaoView } from '../types/database'

function makeView(overrides: Partial<ResolucaoView> = {}): ResolucaoView {
  return {
    id: 1,
    questao_id: 100,
    questao_tec_id: 1140425,
    materia: 'Informática',
    assunto: 'Protocolos de Redes',
    banca_texto: 'IBFC',
    orgao: 'TRE PA',
    concurso: 'TRE PA',
    prova: 'Técnico',
    ano: 2020,
    caderno_nome: 'Caderno',
    enunciado: 'Quanto à comunicação por voz...',
    gabarito: 'A',
    alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' },
    resolucao_professor: null,
    alternativa: null,
    acertou: false,
    tempo_segundos: 0,
    data_resolucao: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('questaoStore.patchQuestaoInCaches', () => {
  beforeEach(() => {
    useQuestaoStore.getState().invalidateQuestoesCache()
    useQuestaoStore.getState().resetProgressiveCache('all')
  })

  it('updates gabarito in progressiveCache and listing caches', () => {
    const store = useQuestaoStore.getState()
    const row = makeView({ questao_id: 100, gabarito: 'A' })
    store.setResolucoesCache([row])
    store.setProgressivePage('__all__', '__all__:1', [row], 1, 1)

    useQuestaoStore.getState().patchQuestaoInCaches(100, { gabarito: 'C' })

    const s = useQuestaoStore.getState()
    expect(s.resolucoesCache?.[0].gabarito).toBe('C')
    expect(s.progressiveCache[0].gabarito).toBe('C')
  })

  it('matches by historico id when questao_id does not match', () => {
    const row = makeView({ id: 42, questao_id: 100, gabarito: 'A' })
    useQuestaoStore.getState().setResolucoesCache([row])

    useQuestaoStore.getState().patchQuestaoInCaches(42, { gabarito: 'E' })

    expect(useQuestaoStore.getState().resolucoesCache?.[0].gabarito).toBe('E')
  })

  it('does not touch other questões', () => {
    const a = makeView({ questao_id: 1, gabarito: 'A' })
    const b = makeView({ questao_id: 2, gabarito: 'B', id: 9 })
    useQuestaoStore.getState().setResolucoesCache([a, b])

    useQuestaoStore.getState().patchQuestaoInCaches(1, { gabarito: 'D' })

    const list = useQuestaoStore.getState().resolucoesCache
    expect(list?.[0].gabarito).toBe('D')
    expect(list?.[1].gabarito).toBe('B')
  })

  it('patches resolucao_professor via updateResolucaoProfessor path', () => {
    const row = makeView({ questao_id: 7, resolucao_professor: null })
    useQuestaoStore.getState().setResolucoesCache([row])

    useQuestaoStore.getState().patchQuestaoInCaches(7, { resolucao_professor: 'Nova resolução' })

    expect(useQuestaoStore.getState().resolucoesCache?.[0].resolucao_professor).toBe('Nova resolução')
  })
})
