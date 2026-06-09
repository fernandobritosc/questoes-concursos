import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportPdfReviewFooter } from './ImportPdfReviewFooter'

describe('ImportPdfReviewFooter', () => {
  const defaultProps = {
    selectedIndex: 0,
    totalQuestions: 5,
    hasValidationErrors: false,
    hasLocalDuplicates: false,
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    onDiscard: vi.fn(),
    onSave: vi.fn(),
  }

  it('renders navigation buttons', () => {
    render(<ImportPdfReviewFooter {...defaultProps} />)
    expect(screen.getByText('Anterior')).toBeInTheDocument()
    expect(screen.getByText('Próxima')).toBeInTheDocument()
  })

  it('disables Anterior when selectedIndex is 0', () => {
    render(<ImportPdfReviewFooter {...defaultProps} selectedIndex={0} />)
    expect(screen.getByText('Anterior').closest('button')).toBeDisabled()
  })

  it('enables Anterior when selectedIndex > 0', () => {
    render(<ImportPdfReviewFooter {...defaultProps} selectedIndex={2} />)
    expect(screen.getByText('Anterior').closest('button')).not.toBeDisabled()
  })

  it('disables Próxima when selectedIndex is last', () => {
    render(<ImportPdfReviewFooter {...defaultProps} selectedIndex={4} />)
    expect(screen.getByText('Próxima').closest('button')).toBeDisabled()
  })

  it('enables Próxima when not at last index', () => {
    render(<ImportPdfReviewFooter {...defaultProps} selectedIndex={2} />)
    expect(screen.getByText('Próxima').closest('button')).not.toBeDisabled()
  })

  it('calls onPrevious when Anterior clicked', async () => {
    const onPrevious = vi.fn()
    render(<ImportPdfReviewFooter {...defaultProps} selectedIndex={2} onPrevious={onPrevious} />)
    await userEvent.click(screen.getByText('Anterior'))
    expect(onPrevious).toHaveBeenCalledOnce()
  })

  it('calls onNext when Próxima clicked', async () => {
    const onNext = vi.fn()
    render(<ImportPdfReviewFooter {...defaultProps} selectedIndex={2} onNext={onNext} />)
    await userEvent.click(screen.getByText('Próxima'))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('renders Confirmar e Gravar with question count', () => {
    render(<ImportPdfReviewFooter {...defaultProps} totalQuestions={5} />)
    expect(screen.getByText('Confirmar e Gravar (5 questões)')).toBeInTheDocument()
  })

  it('enables save when canSave is true', () => {
    render(<ImportPdfReviewFooter {...defaultProps} />)
    expect(screen.getByText(/Confirmar e Gravar/).closest('button')).not.toBeDisabled()
  })

  it('disables save when totalQuestions is 0', () => {
    render(<ImportPdfReviewFooter {...defaultProps} totalQuestions={0} />)
    expect(screen.getByText(/Confirmar e Gravar/).closest('button')).toBeDisabled()
  })

  it('disables save when hasValidationErrors is true', () => {
    render(<ImportPdfReviewFooter {...defaultProps} hasValidationErrors={true} />)
    expect(screen.getByText(/Confirmar e Gravar/).closest('button')).toBeDisabled()
  })

  it('disables save when hasLocalDuplicates is true', () => {
    render(<ImportPdfReviewFooter {...defaultProps} hasLocalDuplicates={true} />)
    expect(screen.getByText(/Confirmar e Gravar/).closest('button')).toBeDisabled()
  })

  it('calls onSave when Confirmar e Gravar clicked', async () => {
    const onSave = vi.fn()
    render(<ImportPdfReviewFooter {...defaultProps} onSave={onSave} />)
    await userEvent.click(screen.getByText(/Confirmar e Gravar/))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('calls onDiscard when Descartar Lote clicked', async () => {
    const onDiscard = vi.fn()
    render(<ImportPdfReviewFooter {...defaultProps} onDiscard={onDiscard} />)
    await userEvent.click(screen.getByText('Descartar Lote'))
    expect(onDiscard).toHaveBeenCalledOnce()
  })
})
