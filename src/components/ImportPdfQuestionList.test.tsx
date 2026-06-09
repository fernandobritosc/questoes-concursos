import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportPdfQuestionList } from './ImportPdfQuestionList'
import type { Resolucao } from '../types/database'

function makeQuestao(overrides: Partial<Resolucao> & { questao_tec_id: number }): Resolucao {
  return {
    id: -1,
    questao_id: -1,
    materia: 'Matéria',
    assunto: 'Assunto',
    banca_texto: 'CESPE',
    orgao: 'Órgão',
    concurso: 'Concurso',
    prova: 'Órgão / 2024',
    ano: 2024,
    caderno_nome: 'Caderno',
    enunciado: 'Enunciado da questão com mais de 10 caracteres',
    gabarito: 'A',
    alternativas: { A: 'Alt A', B: 'Alt B', C: 'Alt C', D: 'Alt D', E: 'Alt E' },
    resolucao_professor: null,
    alternativa: null,
    acertou: false,
    tempo_segundos: 0,
    data_resolucao: '1970-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('ImportPdfQuestionList', () => {
  const baseQuestions = [
    makeQuestao({ questao_tec_id: 101, enunciado: 'Primeira questão sobre direito constitucional' }),
    makeQuestao({ questao_tec_id: 102, enunciado: 'Segunda questão sobre direito administrativo' }),
    makeQuestao({ questao_tec_id: 103, enunciado: 'Terceira questão sobre direito civil' }),
  ]

  const defaultProps = {
    questions: baseQuestions,
    selectedIndex: 0,
    onSelectQuestion: vi.fn(),
    dbDuplicateCount: 0,
    localDuplicateCount: 0,
    onDiscardDbDuplicates: vi.fn(),
    onDiscardLocalDuplicates: vi.fn(),
    checkIsDbDuplicate: vi.fn(() => false),
    checkIsLocalDuplicate: vi.fn(() => false),
  }

  it('renders question count', () => {
    render(<ImportPdfQuestionList {...defaultProps} />)
    expect(screen.getByText('Lista de Questões (3)')).toBeInTheDocument()
  })

  it('renders all question cards', () => {
    render(<ImportPdfQuestionList {...defaultProps} />)
    expect(screen.getByText('Questão 1')).toBeInTheDocument()
    expect(screen.getByText('Questão 2')).toBeInTheDocument()
    expect(screen.getByText('Questão 3')).toBeInTheDocument()
  })

  it('shows Q-ID for each question', () => {
    render(<ImportPdfQuestionList {...defaultProps} />)
    expect(screen.getByText('Q101')).toBeInTheDocument()
    expect(screen.getByText('Q102')).toBeInTheDocument()
    expect(screen.getByText('Q103')).toBeInTheDocument()
  })

  it('shows banca badge', () => {
    render(<ImportPdfQuestionList {...defaultProps} />)
    const badges = screen.getAllByText('CESPE')
    expect(badges.length).toBeGreaterThanOrEqual(3)
  })

  it('shows empty state when no questions', () => {
    render(<ImportPdfQuestionList {...defaultProps} questions={[]} />)
    expect(screen.getByText('Nenhuma questão restante.')).toBeInTheDocument()
  })

  it('calls onSelectQuestion when card clicked', async () => {
    const onSelectQuestion = vi.fn()
    render(<ImportPdfQuestionList {...defaultProps} onSelectQuestion={onSelectQuestion} />)
    await userEvent.click(screen.getByText('Questão 2'))
    expect(onSelectQuestion).toHaveBeenCalledWith(1)
  })

  it('shows validation warning when questions have errors', () => {
    const invalidQuestao = makeQuestao({ questao_tec_id: 0, enunciado: 'Curto', gabarito: '' })
    render(<ImportPdfQuestionList {...defaultProps} questions={[invalidQuestao]} />)
    expect(screen.getByText(/Existem questões com alertas ou campos ausentes/)).toBeInTheDocument()
  })

  it('shows DB duplicate filter button', () => {
    render(<ImportPdfQuestionList {...defaultProps} dbDuplicateCount={2} />)
    expect(screen.getByText('2 já existem no banco')).toBeInTheDocument()
    expect(screen.getByText('Descartar')).toBeInTheDocument()
  })

  it('shows local duplicate filter button', () => {
    render(<ImportPdfQuestionList {...defaultProps} localDuplicateCount={1} />)
    expect(screen.getByText('1 duplicadas no PDF')).toBeInTheDocument()
  })

  it('calls onDiscardDbDuplicates when DB duplicate discard clicked', async () => {
    const onDiscardDbDuplicates = vi.fn()
    render(<ImportPdfQuestionList {...defaultProps} dbDuplicateCount={2} onDiscardDbDuplicates={onDiscardDbDuplicates} />)
    const discardButtons = screen.getAllByText('Descartar')
    await userEvent.click(discardButtons[0])
    expect(onDiscardDbDuplicates).toHaveBeenCalledOnce()
  })

  it('calls onDiscardLocalDuplicates when local duplicate discard clicked', async () => {
    const onDiscardLocalDuplicates = vi.fn()
    render(<ImportPdfQuestionList {...defaultProps} localDuplicateCount={1} onDiscardLocalDuplicates={onDiscardLocalDuplicates} />)
    const discardButtons = screen.getAllByText('Descartar')
    await userEvent.click(discardButtons[0])
    expect(onDiscardLocalDuplicates).toHaveBeenCalledOnce()
  })

  it('shows "Já existe no BD" badge for DB duplicates', () => {
    const checkIsDbDuplicate = vi.fn((q: Resolucao) => q.questao_tec_id === 101)
    render(<ImportPdfQuestionList {...defaultProps} checkIsDbDuplicate={checkIsDbDuplicate} />)
    expect(screen.getByText('Já existe no BD')).toBeInTheDocument()
  })

  it('shows "Alertas" badge for invalid questions', () => {
    const questions = [makeQuestao({ questao_tec_id: 0, enunciado: 'Curto', gabarito: '' })]
    render(<ImportPdfQuestionList {...defaultProps} questions={questions} />)
    expect(screen.getByText(/Alertas:/)).toBeInTheDocument()
  })
})
