import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportPdfErrorState } from './ImportPdfErrorState'

describe('ImportPdfErrorState', () => {
  it('renders error title', () => {
    render(<ImportPdfErrorState errorMsg="Falha ao ler PDF" onRetry={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Falha na ingestão do PDF')).toBeInTheDocument()
  })

  it('shows error message when provided', () => {
    render(<ImportPdfErrorState errorMsg="Falha ao ler PDF" onRetry={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Falha ao ler PDF')).toBeInTheDocument()
  })

  it('shows default error when errorMsg is undefined', () => {
    render(<ImportPdfErrorState errorMsg={undefined} onRetry={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Erro desconhecido durante o processamento do documento.')).toBeInTheDocument()
  })

  it('calls onRetry when Tentar Novamente clicked', async () => {
    const onRetry = vi.fn()
    render(<ImportPdfErrorState errorMsg="Erro" onRetry={onRetry} onClose={vi.fn()} />)
    await userEvent.click(screen.getByText('Tentar Novamente'))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('calls onClose when Fechar clicked', async () => {
    const onClose = vi.fn()
    render(<ImportPdfErrorState errorMsg="Erro" onRetry={vi.fn()} onClose={onClose} />)
    await userEvent.click(screen.getByText('Fechar'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
