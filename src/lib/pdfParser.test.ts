import { describe, it, expect } from 'vitest'
import { parsePdfContent } from './pdfParser'

interface QuestionBlock {
  id: string
  banca: string
  cargo: string
  orgao: string
  materia: string
  assunto: string
  enunciado: string
  altA: string
  altB: string
  altC: string
  altD: string
  altE?: string
}

function makeQuestionBlock(overrides?: Partial<QuestionBlock>) {
  const id = overrides?.id ?? '12345'
  const banca = overrides?.banca ?? 'CESPE / CEBRASPE'
  const cargo = overrides?.cargo ?? 'Analista Judiciário'
  const orgao = overrides?.orgao ?? 'TJ RJ'
  const materia = overrides?.materia ?? 'Direito Administrativo'
  const assunto = overrides?.assunto ?? 'Licitações'
  const enunciado = overrides?.enunciado ?? 'Assinale a alternativa correta sobre a Lei 8.666/93.'
  const altA = overrides?.altA ?? 'É dispensável a licitação para obras de até R$ 15.000,00.'
  const altB = overrides?.altB ?? 'A modalidade convite é cabível para qualquer valor.'
  const altC = overrides?.altC ?? 'O pregão é obrigatório para bens comuns.'
  const altD = overrides?.altD ?? 'Todas as licitações devem ter cláusula de recurso.'
  const altE = overrides?.altE

  const block = `www.tecconcursos.com.br/questoes/${id}
${banca} - ${cargo} / ${orgao} - 2023
${materia} - ${assunto}

${enunciado}
a) ${altA}
b) ${altB}
c) ${altC}
d) ${altD}${altE ? `\ne) ${altE}` : ''}`

  return block
}

const GABARITO_BLOCK = '\nGabarito\n1) C\n2) A\n'

describe('parsePdfContent', () => {
  it('parses a single question correctly', () => {
    const q1 = makeQuestionBlock({})
    const fullText = q1 + GABARITO_BLOCK
    const result = parsePdfContent(fullText, 'Meu Caderno')

    expect(result).toHaveLength(1)
    expect(result[0].questao_tec_id).toBe(12345)
    expect(result[0].banca_texto).toBe('CESPE / CEBRASPE')
    expect(result[0].orgao).toBe('TJ RJ - 2023')
    expect(result[0].materia).toBe('Direito Administrativo')
    expect(result[0].assunto).toBe('Licitações')
    expect(result[0].gabarito).toBe('C')
  })

  it('parses multiple questions', () => {
    const q1 = makeQuestionBlock({ id: '11111', enunciado: 'Q1?' })
    const q2 = makeQuestionBlock({ id: '22222', enunciado: 'Q2?' })
    const fullText = q1 + '\n' + q2 + '\nGabarito\n1) A\n2) B\n'
    const result = parsePdfContent(fullText, 'Test')

    expect(result).toHaveLength(2)
    expect(result[0].questao_tec_id).toBe(11111)
    expect(result[1].questao_tec_id).toBe(22222)
    expect(result[0].gabarito).toBe('A')
    expect(result[1].gabarito).toBe('B')
  })

  it('maps "Certo" gabarito to "C"', () => {
    const q1 = makeQuestionBlock({})
    const fullText = q1 + '\nGabarito\n1) Certo\n'
    const result = parsePdfContent(fullText, 'Test')
    expect(result[0].gabarito).toBe('C')
  })

  it('maps "Errado" gabarito to "E"', () => {
    const q1 = makeQuestionBlock({})
    const fullText = q1 + '\nGabarito\n1) Errado\n'
    const result = parsePdfContent(fullText, 'Test')
    expect(result[0].gabarito).toBe('E')
  })

  it('extracts 5 alternatives when present', () => {
    const q1 = makeQuestionBlock({ altE: 'Nenhuma das alternativas anteriores.' })
    const fullText = q1 + GABARITO_BLOCK
    const result = parsePdfContent(fullText, 'Test')

    expect(Object.keys(result[0].alternativas)).toHaveLength(5)
    expect(result[0].alternativas['A']).toBeTruthy()
    expect(result[0].alternativas['B']).toBeTruthy()
    expect(result[0].alternativas['C']).toBeTruthy()
    expect(result[0].alternativas['D']).toBeTruthy()
    expect(result[0].alternativas['E']).toBe('Nenhuma das alternativas anteriores.')
  })

  it('throws when no Gabarito section is found', () => {
    expect(() => parsePdfContent('some text without gabarito', 'Test')).toThrow(
      'Nao foi possivel encontrar a secao Gabarito'
    )
  })

  it('throws when no question chunks are found', () => {
    expect(() => parsePdfContent('some text\nGabarito\n1) A\n', 'Test')).toThrow(
      'Nenhuma questao encontrada'
    )
  })

  it('filters out page numbers and footer lines', () => {
    const fullText = [
      'www.tecconcursos.com.br/questoes/12345',
      'CESPE / CEBRASPE - Analista Judiciário / TJ RJ - 2023',
      'Direito Administrativo - Licitações',
      '',
      'Assinale a alternativa correta sobre a Lei 8.666/93.',
      'a) Alt A',
      'b) Alt B',
      'c) Alt C',
      'd) Alt D',
      'Página 1 de 10',
      '',
      'Gabarito',
      '1) C',
    ].join('\n')
    const result = parsePdfContent(fullText, 'Test')
    expect(result).toHaveLength(1)
  })

  it('assigns caderno_nome correctly', () => {
    const q1 = makeQuestionBlock({})
    const fullText = q1 + GABARITO_BLOCK
    const result = parsePdfContent(fullText, 'Meu Caderno Personalizado')
    expect(result[0].caderno_nome).toBe('Meu Caderno Personalizado')
  })

  it('parses alternatives with Gabarito suffix in question text', () => {
    const q1 = `www.tecconcursos.com.br/questoes/99999
FCC - Técnico / TRT 4 - 2022
Direito Constitucional - Princípios Fundamentais

Sobre a separação dos poderes:
a) São independentes
b) São harmônicos
c) Há hierarquia entre eles
d) O Judiciário subordina-se ao Executivo
Gabarito: A`
    const fullText = q1 + '\nGabarito\n1) A\n'
    const result = parsePdfContent(fullText, 'Test')
    expect(result[0].alternativas['A']).toBe('São independentes')
    expect(result[0].alternativas['D']).not.toContain('Gabarito')
  })

  it('handles "Certo" / "Errado" style questions (sem alternativas A-E)', () => {
    const q1 = `www.tecconcursos.com.br/questoes/77777
VUNESP - Agente / Polícia Civil SP - 2023
Direito Penal - Crimes Contra o Patrimônio

O furto privilegiado exige que o agente seja primário?
Certo
Errado`
    const fullText = q1 + '\nGabarito\n1) Certo\n'
    const result = parsePdfContent(fullText, 'Test')
    expect(result[0].alternativas['C']).toBe('Certo')
    expect(result[0].alternativas['E']).toBe('Errado')
    expect(result[0].gabarito).toBe('C')
  })
})
