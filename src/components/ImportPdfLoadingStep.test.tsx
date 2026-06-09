import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImportPdfLoadingStep } from './ImportPdfLoadingStep'

describe('ImportPdfLoadingStep', () => {
  it('shows loading_engine message', () => {
    render(<ImportPdfLoadingStep step="loading_engine" progress={0} total={0} />)
    expect(screen.getByText('Inicializando motor de inteligência do PDF...')).toBeInTheDocument()
  })

  it('shows reading_pages message', () => {
    render(<ImportPdfLoadingStep step="reading_pages" progress={2} total={10} />)
    expect(screen.getByText('Extraindo textos e analisando páginas...')).toBeInTheDocument()
  })

  it('shows parsing message', () => {
    render(<ImportPdfLoadingStep step="parsing" progress={0} total={0} />)
    expect(screen.getByText('Mapeando gabarito e estruturando as questões...')).toBeInTheDocument()
  })

  it('shows checking_existing message', () => {
    render(<ImportPdfLoadingStep step="checking_existing" progress={0} total={0} />)
    expect(screen.getByText('Evitando duplicidade: verificando registros existentes no Supabase...')).toBeInTheDocument()
  })

  it('shows saving message', () => {
    render(<ImportPdfLoadingStep step="saving" progress={5} total={20} />)
    expect(screen.getByText('Gravando novas questões exclusivas no seu Banco de Dados...')).toBeInTheDocument()
  })

  it('renders progress bar only for reading_pages', () => {
    const { container, rerender } = render(<ImportPdfLoadingStep step="loading_engine" progress={0} total={0} />)
    expect(container.querySelector('.bg-primary.h-2')).toBeNull()

    rerender(<ImportPdfLoadingStep step="reading_pages" progress={5} total={10} />)
    expect(container.querySelector('.bg-primary.h-2')).not.toBeNull()
  })

  it('shows reading progress text for reading_pages', () => {
    render(<ImportPdfLoadingStep step="reading_pages" progress={5} total={10} />)
    expect(screen.getByText('Lendo página 5 de 10...')).toBeInTheDocument()
  })

  it('shows saving progress text for saving step', () => {
    render(<ImportPdfLoadingStep step="saving" progress={3} total={20} />)
    expect(screen.getByText('Gravando item 3 de 20...')).toBeInTheDocument()
  })

  it('does not show progress text for other steps', () => {
    render(<ImportPdfLoadingStep step="parsing" progress={0} total={0} />)
    expect(screen.queryByText(/Lendo página/)).toBeNull()
    expect(screen.queryByText(/Gravando item/)).toBeNull()
  })
})
