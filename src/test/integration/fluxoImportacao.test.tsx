import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { ImportPdfModal } from '../../components/ImportPdfModal'
import { QuestaoIndice } from '../../components/QuestaoIndice'
import { getGrupo } from '../../lib/grupoUtils'
import type { ResolucaoView } from '../../types/database'

// ─── Mock data ──────────────────────────────────────────────────────────────────

function makeQuestao(overrides: Partial<ResolucaoView> = {}): ResolucaoView {
  return {
    id: 1,
    questao_id: 100,
    questao_tec_id: 54321,
    materia: 'Direito Constitucional',
    assunto: 'Direitos e Garantias',
    banca_texto: 'CESPE',
    orgao: 'STF',
    concurso: 'STF',
    prova: 'STF / 2023',
    ano: 2023,
    caderno_nome: 'Caderno Teste',
    enunciado: 'Qual o artigo?',
    gabarito: 'A',
    alternativas: { A: 'Art. 5º', B: 'Art. 6º', C: 'Art. 7º', D: 'Art. 8º', E: 'Art. 9º' },
    resolucao_professor: null,
    alternativa: null,
    acertou: false,
    tempo_segundos: 0,
    data_resolucao: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── Mocks ───────────────────────────────────────────────────────────────────────

const mockLoadPdfJs = vi.fn()
const mockExtractPdfText = vi.fn()
const mockParsePdfContent = vi.fn()
const mockFetchQuestaoIds = vi.fn()
const mockInsertQuestoesBatch = vi.fn()
const mockFetchAllQuestoes = vi.fn()
const mockClearQuestoesCache = vi.fn()
const mockTrackEvent = vi.fn()

vi.mock('../../lib/pdfParser', () => ({
  loadPdfJs: () => mockLoadPdfJs(),
  extractPdfText: (...args: unknown[]) => mockExtractPdfText(...args),
  parsePdfContent: (...args: unknown[]) => mockParsePdfContent(...args),
}))

vi.mock('../../services/supabase.service', () => ({
  fetchQuestaoIds: () => mockFetchQuestaoIds(),
  insertQuestoesBatch: (...args: unknown[]) => mockInsertQuestoesBatch(...args),
  fetchAllQuestoes: () => mockFetchAllQuestoes(),
  clearQuestoesCache: () => mockClearQuestoesCache(),
  updateResolucaoProfessor: vi.fn(),
  updateQuestao: vi.fn(),
}))

vi.mock('../../services/hermesTracker', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}))

const mockQuestoesExistentes: ResolucaoView[] = []

// ─── Helper ──────────────────────────────────────────────────────────────────────

function renderModal() {
  return render(
    <BrowserRouter>
      <ImportPdfModal
        isOpen={true}
        onClose={vi.fn()}
        onImportSuccess={vi.fn()}
        existingQuestions={mockQuestoesExistentes}
      />
    </BrowserRouter>
  )
}

function renderIndice(questoes: ResolucaoView[]) {
  return render(
    <BrowserRouter>
      <QuestaoIndice
        questoes={questoes}
        onNavigate={vi.fn()}
      />
    </BrowserRouter>
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadPdfJs.mockResolvedValue({})
  mockExtractPdfText.mockResolvedValue({ fullText: 'conteudo pdf mockado' })
  mockFetchQuestaoIds.mockResolvedValue(new Set())
  mockInsertQuestoesBatch.mockResolvedValue(1)
})

describe('Fluxo de Importacao de PDF (integracao)', () => {

  it('1. parseia PDF e extrai materia/assunto corretamente', async () => {
    const parsed = [makeQuestao({
      questao_tec_id: 1001,
      materia: 'Direito Constitucional',
      assunto: 'Direitos e Garantias',
    })]
    mockParsePdfContent.mockReturnValue(parsed)
    mockFetchAllQuestoes.mockResolvedValue([])

    renderModal()

    const file = new File(['dummy'], 'simulado.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/clique para procurar/i)
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByText(/analisar/i))

    await waitFor(() => {
      expect(mockParsePdfContent).toHaveBeenCalledWith('conteudo pdf mockado', 'simulado')
    })

    expect(screen.getByDisplayValue('Direitos e Garantias')).toBeInTheDocument()
  })

  it('2. salva questoes no banco e chama insertQuestoesBatch', async () => {
    const parsed = [makeQuestao({
      questao_tec_id: 1002,
      materia: 'Direito Constitucional',
      assunto: 'Direitos e Garantias',
    })]
    mockParsePdfContent.mockReturnValue(parsed)
    mockFetchAllQuestoes.mockResolvedValue([])

    renderModal()

    const file = new File(['dummy'], 'simulado.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/clique para procurar/i)
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByText(/analisar/i))

    await waitFor(() => {
      expect(screen.getByText(/confirmar e gravar/i)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText(/confirmar e gravar/i))

    await waitFor(() => {
      expect(mockFetchQuestaoIds).toHaveBeenCalled()
      expect(mockInsertQuestoesBatch).toHaveBeenCalled()
    })
  })

  it('3. getGrupo retorna grupo correto para materia/assunto conhecido', () => {
    const grupo = getGrupo('Direito Constitucional', 'Características (Direitos Fundamentais)')
    expect(grupo).toBe('Dos Direitos e Garantias Fundamentais (arts. 5º a 17 da CF/1988)')
  })

  it('4. getGrupo retorna null para materia/assunto desconhecido', () => {
    const grupo = getGrupo('Matéria Inexistente', 'Assunto Inexistente')
    expect(grupo).toBeNull()
  })

  it('5. indice agrupa questoes por materia com grupo preenchido', async () => {
    const questoes = [
      makeQuestao({
        questao_tec_id: 2001,
        materia: 'Direito Constitucional',
        assunto: 'Características (Direitos Fundamentais)',
        grupo: 'Dos Direitos e Garantias Fundamentais (arts. 5º a 17 da CF/1988)',
      }),
      makeQuestao({
        questao_tec_id: 2002,
        materia: 'Direito Constitucional',
        assunto: 'Ação Popular',
        grupo: 'Dos Direitos e Garantias Fundamentais (arts. 5º a 17 da CF/1988)',
      }),
      makeQuestao({
        questao_tec_id: 2003,
        materia: 'Informática',
        assunto: 'Cloud Computing (Computação em Nuvem)',
        grupo: 'Redes de Computadores',
      }),
    ]

    renderIndice(questoes)

    expect(screen.getByText('Direito Constitucional')).toBeInTheDocument()
    expect(screen.getByText('Informática')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Informática'))
    expect(screen.getByText('Redes de Computadores')).toBeInTheDocument()
  })

  it('6. questoes sem grupo aparecem como (sem grupo) no indice', async () => {
    const questoes = [
      makeQuestao({
        questao_tec_id: 3001,
        materia: 'Direito Constitucional',
        assunto: 'Assunto Sem Mapeamento',
        grupo: null,
      }),
    ]

    renderIndice(questoes)

    expect(screen.getByText('Direito Constitucional')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Direito Constitucional'))
    expect(screen.getByText('(sem grupo)')).toBeInTheDocument()
  })

  it('7. import define grupo automaticamente via getGrupo', async () => {
    const parsed = [makeQuestao({
      questao_tec_id: 4001,
      materia: 'Direito Constitucional',
      assunto: 'Características (Direitos Fundamentais)',
    })]
    mockParsePdfContent.mockReturnValue(parsed)
    mockFetchAllQuestoes.mockResolvedValue([])

    renderModal()

    const file = new File(['dummy'], 'simulado.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/clique para procurar/i)
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByText(/analisar/i))

    await waitFor(() => {
      expect(screen.getByText(/confirmar e gravar/i)).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText(/confirmar e gravar/i))

    await waitFor(() => {
      expect(mockInsertQuestoesBatch).toHaveBeenCalled()
    })

    const payload = mockInsertQuestoesBatch.mock.calls[0][0]
    expect(payload[0].grupo).toBe('Dos Direitos e Garantias Fundamentais (arts. 5º a 17 da CF/1988)')
  })
})
