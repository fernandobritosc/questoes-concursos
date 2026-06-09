import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportPdfQuestionEditor } from './ImportPdfQuestionEditor'
import type { Resolucao } from '../types/database'

function makeQuestao(overrides: Partial<Resolucao> = {}): Resolucao {
  return {
    id: -1,
    questao_id: -1,
    questao_tec_id: 12345,
    materia: 'Direito Constitucional',
    assunto: 'Direitos e Garantias',
    banca_texto: 'CESPE',
    orgao: 'STF',
    concurso: 'STF - Analista',
    prova: 'STF / 2023',
    ano: 2023,
    caderno_nome: 'Caderno Teste',
    enunciado: 'Qual o artigo fundamental da Constituição?',
    gabarito: 'A',
    alternativas: {
      A: 'Art. 5º',
      B: 'Art. 6º',
      C: 'Art. 7º',
      D: 'Art. 8º',
      E: 'Art. 9º',
    },
    resolucao_professor: null,
    alternativa: null,
    acertou: false,
    tempo_segundos: 0,
    data_resolucao: '1970-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ImportPdfQuestionEditor', () => {
  const defaultProps = {
    question: makeQuestao(),
    index: 0,
    totalQuestions: 5,
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    checkIsDbDuplicate: vi.fn(() => false),
    checkIsLocalDuplicate: vi.fn(() => false),
  }

  it('renders counter N de M', () => {
    render(<ImportPdfQuestionEditor {...defaultProps} />)
    expect(screen.getByText('1 de 5')).toBeInTheDocument()
  })

  it('renders all form fields', () => {
    render(<ImportPdfQuestionEditor {...defaultProps} />)
    expect(screen.getByDisplayValue('12345')).toBeInTheDocument()
    expect(screen.getByDisplayValue('CESPE')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Direito Constitucional')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Direitos e Garantias')).toBeInTheDocument()
    expect(screen.getByDisplayValue('STF')).toBeInTheDocument()
    expect(screen.getByDisplayValue('STF - Analista')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2023')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Qual o artigo fundamental da Constituição?')).toBeInTheDocument()
  })

  it('renders all 5 alternative inputs', () => {
    render(<ImportPdfQuestionEditor {...defaultProps} />)
    expect(screen.getByDisplayValue('Art. 5º')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Art. 6º')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Art. 7º')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Art. 8º')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Art. 9º')).toBeInTheDocument()
  })

  it('renders Gabarito select with current value', () => {
    render(<ImportPdfQuestionEditor {...defaultProps} />)
    const select = screen.getByDisplayValue('Alternativa A') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.value).toBe('A')
  })

  it('renders Descartar esta questão button', () => {
    render(<ImportPdfQuestionEditor {...defaultProps} />)
    expect(screen.getByText('Descartar esta questão')).toBeInTheDocument()
  })

  it('calls onDelete when Descartar clicked', async () => {
    const onDelete = vi.fn()
    render(<ImportPdfQuestionEditor {...defaultProps} onDelete={onDelete} />)
    await userEvent.click(screen.getByText('Descartar esta questão'))
    expect(onDelete).toHaveBeenCalledWith(0)
  })

  it('calls onUpdate when enunciado changes', async () => {
    const onUpdate = vi.fn()
    render(<ImportPdfQuestionEditor {...defaultProps} onUpdate={onUpdate} />)
    const textarea = screen.getByDisplayValue('Qual o artigo fundamental da Constituição?')
    await userEvent.type(textarea, '!')
    expect(onUpdate).toHaveBeenCalled()
  })

  it('calls onUpdate when gabarito select changes', async () => {
    const onUpdate = vi.fn()
    render(<ImportPdfQuestionEditor {...defaultProps} onUpdate={onUpdate} />)
    const select = screen.getByDisplayValue('Alternativa A')
    await userEvent.selectOptions(select, 'B')
    expect(onUpdate).toHaveBeenCalled()
  })

  it('calls onUpdate when banca_texto changes', async () => {
    const onUpdate = vi.fn()
    render(<ImportPdfQuestionEditor {...defaultProps} onUpdate={onUpdate} />)
    const input = screen.getByDisplayValue('CESPE')
    await userEvent.clear(input)
    await userEvent.type(input, 'FGV')
    expect(onUpdate).toHaveBeenCalled()
  })

  it('shows alert banner when validation errors exist', () => {
    const invalidQuestao = makeQuestao({ questao_tec_id: 0, enunciado: 'Curto', gabarito: '' })
    render(<ImportPdfQuestionEditor {...defaultProps} question={invalidQuestao} />)
    expect(screen.getByText('Alertas para esta Questão:')).toBeInTheDocument()
  })

  it('shows DB duplicate warning', () => {
    const checkIsDbDuplicate = vi.fn(() => true)
    render(<ImportPdfQuestionEditor {...defaultProps} checkIsDbDuplicate={checkIsDbDuplicate} />)
    expect(screen.getByText(/Esta questão já está registrada no seu banco de dados/)).toBeInTheDocument()
  })

  it('shows local duplicate warning', () => {
    const checkIsLocalDuplicate = vi.fn(() => true)
    render(<ImportPdfQuestionEditor {...defaultProps} checkIsLocalDuplicate={checkIsLocalDuplicate} />)
    expect(screen.getByText(/Há outra questão com o mesmo ID neste lote/)).toBeInTheDocument()
  })

  it('does not show alert banner when no issues', () => {
    render(<ImportPdfQuestionEditor {...defaultProps} />)
    expect(screen.queryByText('Alertas para esta Questão:')).toBeNull()
  })

  it('calls onUpdate when orgao changes', async () => {
    const onUpdate = vi.fn()
    render(<ImportPdfQuestionEditor {...defaultProps} onUpdate={onUpdate} />)
    const orgaoInput = screen.getByDisplayValue('STF')
    await userEvent.type(orgaoInput, 'X')
    expect(onUpdate).toHaveBeenCalled()
  })

  it('calls onUpdate when ano changes', async () => {
    const onUpdate = vi.fn()
    render(<ImportPdfQuestionEditor {...defaultProps} onUpdate={onUpdate} />)
    const anoInput = screen.getByDisplayValue('2023')
    await userEvent.type(anoInput, '0')
    expect(onUpdate).toHaveBeenCalled()
  })
})
