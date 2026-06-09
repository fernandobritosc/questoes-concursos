import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportPdfModal } from './ImportPdfModal'
import type { ResolucaoView } from '../types/database'

const mockLoadPdfJs = vi.fn()
const mockExtractPdfText = vi.fn()
const mockParsePdfContent = vi.fn()
const mockFetchQuestaoIds = vi.fn()
const mockInsertQuestoesBatch = vi.fn()
const mockFetchAllQuestoes = vi.fn()
const mockClearQuestoesCache = vi.fn()
const mockTrackEvent = vi.fn()

vi.mock('../lib/pdfParser', () => ({
  loadPdfJs: () => mockLoadPdfJs(),
  extractPdfText: (...args: unknown[]) => mockExtractPdfText(...args),
  parsePdfContent: (...args: unknown[]) => mockParsePdfContent(...args),
}))

vi.mock('../services/supabase.service', () => ({
  fetchQuestaoIds: () => mockFetchQuestaoIds(),
  insertQuestoesBatch: (...args: unknown[]) => mockInsertQuestoesBatch(...args),
  fetchAllQuestoes: () => mockFetchAllQuestoes(),
  clearQuestoesCache: () => mockClearQuestoesCache(),
}))

vi.mock('../services/hermesTracker', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

function makeParsedQuestao(overrides: Partial<ResolucaoView> & { questao_tec_id: number }): ResolucaoView {
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

describe('ImportPdfModal', () => {
  const onClose = vi.fn()
  const onImportSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchQuestaoIds.mockResolvedValue(new Set<number>())
    mockInsertQuestoesBatch.mockResolvedValue(2)
    mockFetchAllQuestoes.mockResolvedValue([])
    mockLoadPdfJs.mockResolvedValue({})
    mockExtractPdfText.mockResolvedValue({ fullText: 'texto do pdf', totalPages: 1 })
  })

  it('renders null when isOpen is false', () => {
    const { container } = render(
      <ImportPdfModal isOpen={false} onClose={onClose} onImportSuccess={onImportSuccess} existingQuestions={[]} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders ImportPdfIdleStep when isOpen is true', () => {
    render(
      <ImportPdfModal isOpen={true} onClose={onClose} onImportSuccess={onImportSuccess} existingQuestions={[]} />
    )
    expect(screen.getByText(/Arraste o PDF do caderno aqui/)).toBeInTheDocument()
  })

  it('shows loading step and transitions to review on successful parse', async () => {
    mockParsePdfContent.mockReturnValue([
      makeParsedQuestao({ questao_tec_id: 101 }),
      makeParsedQuestao({ questao_tec_id: 102 }),
    ])

    render(
      <ImportPdfModal isOpen={true} onClose={onClose} onImportSuccess={onImportSuccess} existingQuestions={[]} />
    )

    const dropZone = screen.getByText(/Arraste o PDF do caderno aqui/).closest('label')! as HTMLElement
    const fileInput = dropZone.querySelector('input[type="file"]')! as HTMLElement

    const file = new File(['dummy'], 'caderno.pdf', { type: 'application/pdf' })
    await userEvent.upload(fileInput, file)

    await userEvent.click(screen.getByText('Analisar PDF'))

    await waitFor(() => {
      expect(mockLoadPdfJs).toHaveBeenCalled()
      expect(mockExtractPdfText).toHaveBeenCalled()
      expect(mockParsePdfContent).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByText('Revisão Interativa do Caderno')).toBeInTheDocument()
    })
  })

  it('shows error state when PDF parsing fails', async () => {
    mockExtractPdfText.mockRejectedValue(new Error('Falha ao extrair texto'))

    render(
      <ImportPdfModal isOpen={true} onClose={onClose} onImportSuccess={onImportSuccess} existingQuestions={[]} />
    )

    const dropZone = screen.getByText(/Arraste o PDF do caderno aqui/).closest('label')! as HTMLElement
    const fileInput = dropZone.querySelector('input[type="file"]')! as HTMLElement
    await userEvent.upload(fileInput, new File(['dummy'], 'caderno.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByText('Analisar PDF'))

    await waitFor(() => {
      expect(screen.getByText('Falha na ingestão do PDF')).toBeInTheDocument()
    })
    expect(screen.getByText('Falha ao extrair texto')).toBeInTheDocument()
  })

  it('shows success state after handleConfirmSavePdf', async () => {
    mockParsePdfContent.mockReturnValue([
      makeParsedQuestao({ questao_tec_id: 101 }),
      makeParsedQuestao({ questao_tec_id: 102 }),
    ])

    render(
      <ImportPdfModal isOpen={true} onClose={onClose} onImportSuccess={onImportSuccess} existingQuestions={[]} />
    )

    const dropZone = screen.getByText(/Arraste o PDF do caderno aqui/).closest('label')! as HTMLElement
    const fileInput = dropZone.querySelector('input[type="file"]')! as HTMLElement
    await userEvent.upload(fileInput, new File(['dummy'], 'caderno.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByText('Analisar PDF'))

    await waitFor(() => {
      expect(screen.getByText('Confirmar e Gravar (2 questões)')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText(/Confirmar e Gravar/))

    await waitFor(() => {
      expect(mockFetchQuestaoIds).toHaveBeenCalled()
      expect(mockInsertQuestoesBatch).toHaveBeenCalled()
      expect(mockClearQuestoesCache).toHaveBeenCalled()
      expect(mockFetchAllQuestoes).toHaveBeenCalled()
      expect(onImportSuccess).toHaveBeenCalled()
      expect(mockTrackEvent).toHaveBeenCalledWith('importar_pdf', { questoes: 2 })
    })

    expect(screen.getByText('Importação concluída com sucesso!')).toBeInTheDocument()
  })

  it('filters out DB duplicates during save', async () => {
    mockParsePdfContent.mockReturnValue([
      makeParsedQuestao({ questao_tec_id: 101 }),
      makeParsedQuestao({ questao_tec_id: 102 }),
      makeParsedQuestao({ questao_tec_id: 103 }),
    ])
    mockFetchQuestaoIds.mockResolvedValue(new Set([101, 102]))

    render(
      <ImportPdfModal isOpen={true} onClose={onClose} onImportSuccess={onImportSuccess} existingQuestions={[]} />
    )

    const dropZone = screen.getByText(/Arraste o PDF do caderno aqui/).closest('label')! as HTMLElement
    const fileInput = dropZone.querySelector('input[type="file"]')! as HTMLElement
    await userEvent.upload(fileInput, new File(['dummy'], 'caderno.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByText('Analisar PDF'))

    await waitFor(() => {
      expect(screen.getByText('Confirmar e Gravar (3 questões)')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText(/Confirmar e Gravar/))

    await waitFor(() => {
      expect(mockInsertQuestoesBatch).toHaveBeenCalled()
    })

    const insertedPayload = mockInsertQuestoesBatch.mock.calls[0][0]
    expect(insertedPayload).toHaveLength(1)
    expect(insertedPayload[0].questao_tec_id).toBe(103)
  })

  it('handles zero new questions gracefully', async () => {
    mockParsePdfContent.mockReturnValue([
      makeParsedQuestao({ questao_tec_id: 101 }),
    ])
    mockFetchQuestaoIds.mockResolvedValue(new Set([101]))

    render(
      <ImportPdfModal isOpen={true} onClose={onClose} onImportSuccess={onImportSuccess} existingQuestions={[]} />
    )

    const dropZone = screen.getByText(/Arraste o PDF do caderno aqui/).closest('label')! as HTMLElement
    const fileInput = dropZone.querySelector('input[type="file"]')! as HTMLElement
    await userEvent.upload(fileInput, new File(['dummy'], 'caderno.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByText('Analisar PDF'))

    await waitFor(() => {
      expect(screen.getByText('Confirmar e Gravar (1 questões)')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText(/Confirmar e Gravar/))

    await waitFor(() => {
      expect(mockInsertQuestoesBatch).not.toHaveBeenCalled()
      expect(screen.getByText('Importação concluída com sucesso!')).toBeInTheDocument()
    })
  })

  it('shows error state when save fails', async () => {
    mockParsePdfContent.mockReturnValue([
      makeParsedQuestao({ questao_tec_id: 101 }),
    ])
    mockInsertQuestoesBatch.mockRejectedValue(new Error('Erro de conexão'))

    render(
      <ImportPdfModal isOpen={true} onClose={onClose} onImportSuccess={onImportSuccess} existingQuestions={[]} />
    )

    const dropZone = screen.getByText(/Arraste o PDF do caderno aqui/).closest('label')! as HTMLElement
    const fileInput = dropZone.querySelector('input[type="file"]')! as HTMLElement
    await userEvent.upload(fileInput, new File(['dummy'], 'caderno.pdf', { type: 'application/pdf' }))
    await userEvent.click(screen.getByText('Analisar PDF'))

    await waitFor(() => {
      expect(screen.getByText('Confirmar e Gravar (1 questões)')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText(/Confirmar e Gravar/))

    await waitFor(() => {
      expect(screen.getByText('Falha na ingestão do PDF')).toBeInTheDocument()
    })
    expect(screen.getByText('Erro de conexão')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', async () => {
    render(
      <ImportPdfModal isOpen={true} onClose={onClose} onImportSuccess={onImportSuccess} existingQuestions={[]} />
    )

    const closeBtn = screen.getByRole('button', { name: '' })
    await userEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
