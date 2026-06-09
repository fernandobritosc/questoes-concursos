import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportPdfHeader } from './ImportPdfHeader'

describe('ImportPdfHeader', () => {
  it('renders default title when step is not review', () => {
    render(<ImportPdfHeader step="idle" tempQuestionsLength={0} onClose={vi.fn()} disabled={false} />)
    expect(screen.getByText('Importar PDF do TEC Concursos')).toBeInTheDocument()
  })

  it('renders review title when step is review', () => {
    render(<ImportPdfHeader step="review" tempQuestionsLength={3} onClose={vi.fn()} disabled={false} />)
    expect(screen.getByText('Revisão Interativa do Caderno')).toBeInTheDocument()
  })

  it('shows question count subtitle in review step', () => {
    render(<ImportPdfHeader step="review" tempQuestionsLength={5} onClose={vi.fn()} disabled={false} />)
    expect(screen.getByText('Revise e edite as 5 questões detectadas')).toBeInTheDocument()
  })

  it('shows default subtitle when not review', () => {
    render(<ImportPdfHeader step="idle" tempQuestionsLength={0} onClose={vi.fn()} disabled={false} />)
    expect(screen.getByText('Ingestão client-side ultra-rápida')).toBeInTheDocument()
  })

  it('calls onClose when X button clicked', async () => {
    const onClose = vi.fn()
    render(<ImportPdfHeader step="idle" tempQuestionsLength={0} onClose={onClose} disabled={false} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('disables X button when disabled is true', () => {
    render(<ImportPdfHeader step="idle" tempQuestionsLength={0} onClose={vi.fn()} disabled={true} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
