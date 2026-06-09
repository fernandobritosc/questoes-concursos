import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportPdfSuccessState } from './ImportPdfSuccessState'

describe('ImportPdfSuccessState', () => {
  it('renders success message', () => {
    render(<ImportPdfSuccessState total={10} importedCount={7} onClose={vi.fn()} />)
    expect(screen.getByText('Importação concluída com sucesso!')).toBeInTheDocument()
  })

  it('shows total and imported counts', () => {
    render(<ImportPdfSuccessState total={10} importedCount={7} onClose={vi.fn()} />)
    expect(screen.getByText(/Foram processadas com sucesso 10 questões/)).toBeInTheDocument()
  })

  it('shows importedCount as 0 when undefined', () => {
    render(<ImportPdfSuccessState total={5} importedCount={undefined} onClose={vi.fn()} />)
    expect(screen.getByText('Concluir e Fechar')).toBeInTheDocument()
  })

  it('calls onClose when button clicked', async () => {
    const onClose = vi.fn()
    render(<ImportPdfSuccessState total={10} importedCount={7} onClose={onClose} />)
    await userEvent.click(screen.getByText('Concluir e Fechar'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
