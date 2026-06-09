import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestaoModalEdicao } from './QuestaoModalEdicao'
import type { ResolucaoView } from '../types/database'

const mockQuestao: ResolucaoView = {
  id: 1, questao_id: 100, questao_tec_id: 12345,
  materia: 'Direito Constitucional', assunto: 'Direitos e Garantias',
  banca_texto: 'CESPE', orgao: 'STF', concurso: 'STF',
  prova: 'STF / 2023', ano: 2023, caderno_nome: 'Caderno',
  enunciado: 'Qual o artigo fundamental?', gabarito: 'A',
  alternativas: { A: 'Art. 5º', B: 'Art. 6º', C: 'Art. 7º', D: 'Art. 8º', E: 'Art. 9º' },
  resolucao_professor: null, alternativa: 'A', acertou: true,
  tempo_segundos: 30, data_resolucao: '2024-01-01T00:00:00Z',
}

describe('QuestaoModalEdicao', () => {
  it('renders null when isOpen is false', () => {
    const { container } = render(
      <QuestaoModalEdicao isOpen={false} questao={mockQuestao} onClose={vi.fn()} onSave={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders form fields when open', () => {
    render(
      <QuestaoModalEdicao isOpen={true} questao={mockQuestao} onClose={vi.fn()} onSave={vi.fn()} />
    )
    expect(screen.getByText('Editar Dados da Questão')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Direito Constitucional')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Qual o artigo fundamental?')).toBeInTheDocument()
  })

  it('renders all 5 alternative inputs', () => {
    render(
      <QuestaoModalEdicao isOpen={true} questao={mockQuestao} onClose={vi.fn()} onSave={vi.fn()} />
    )
    expect(screen.getByDisplayValue('Art. 5º')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Art. 9º')).toBeInTheDocument()
  })

  it('calls onClose when Cancelar clicked', async () => {
    const onClose = vi.fn()
    render(
      <QuestaoModalEdicao isOpen={true} questao={mockQuestao} onClose={onClose} onSave={vi.fn()} />
    )
    await userEvent.click(screen.getByText('Cancelar'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onSave with form data when Confirmar clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(
      <QuestaoModalEdicao isOpen={true} questao={mockQuestao} onClose={vi.fn()} onSave={onSave} />
    )
    await userEvent.click(screen.getByText('Confirmar e Salvar'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledOnce()
    })
    expect(onSave.mock.calls[0][0].enunciado).toBe('Qual o artigo fundamental?')
    expect(onSave.mock.calls[0][0].materia).toBe('Direito Constitucional')
    expect(onSave.mock.calls[0][0].gabarito).toBe('A')
  })

  it('shows loading state while saving', async () => {
    const onSave = vi.fn().mockImplementation(() => new Promise(() => {}))
    render(
      <QuestaoModalEdicao isOpen={true} questao={mockQuestao} onClose={vi.fn()} onSave={onSave} />
    )
    await userEvent.click(screen.getByText('Confirmar e Salvar'))
    await waitFor(() => {
      expect(screen.getByText('Salvando...')).toBeInTheDocument()
    })
  })

  it('disables save button when enunciado is empty', () => {
    const emptyQuestao = { ...mockQuestao, enunciado: '' }
    render(
      <QuestaoModalEdicao isOpen={true} questao={emptyQuestao} onClose={vi.fn()} onSave={vi.fn()} />
    )
    expect(screen.getByText('Confirmar e Salvar').closest('button')).toBeDisabled()
  })

  it('calls onClose after successful save', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(true)
    render(
      <QuestaoModalEdicao isOpen={true} questao={mockQuestao} onClose={onClose} onSave={onSave} />
    )
    await userEvent.click(screen.getByText('Confirmar e Salvar'))
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  it('does not call onClose when save returns false', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(false)
    render(
      <QuestaoModalEdicao isOpen={true} questao={mockQuestao} onClose={onClose} onSave={onSave} />
    )
    await userEvent.click(screen.getByText('Confirmar e Salvar'))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalled()
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes modal when X button clicked', async () => {
    const onClose = vi.fn()
    render(
      <QuestaoModalEdicao isOpen={true} questao={mockQuestao} onClose={onClose} onSave={vi.fn()} />
    )
    const xButton = screen.getByRole('button', { name: '' })
    await userEvent.click(xButton)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
