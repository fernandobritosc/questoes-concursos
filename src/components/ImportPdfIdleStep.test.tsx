import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportPdfIdleStep } from './ImportPdfIdleStep'

function createMockFile(name = 'caderno.pdf'): File {
  return new File(['dummy content'], name, { type: 'application/pdf' })
}

describe('ImportPdfIdleStep', () => {
  const defaultProps = {
    importFile: null,
    customCadernoName: '',
    onFileChange: vi.fn(),
    onRemoveFile: vi.fn(),
    onNameChange: vi.fn(),
    onCancel: vi.fn(),
    onAnalyze: vi.fn(),
  }

  it('renders drop zone when no file selected', () => {
    render(<ImportPdfIdleStep {...defaultProps} />)
    expect(screen.getByText(/Arraste o PDF do caderno aqui/)).toBeInTheDocument()
  })

  it('renders file info when file is selected', () => {
    const file = createMockFile('prova.pdf')
    render(<ImportPdfIdleStep {...defaultProps} importFile={file} />)
    expect(screen.getByText('prova.pdf')).toBeInTheDocument()
    expect(screen.getByText(/\d+\.\d{2} MB/)).toBeInTheDocument()
  })

  it('calls onRemoveFile when Remover clicked', async () => {
    const onRemoveFile = vi.fn()
    const file = createMockFile()
    render(<ImportPdfIdleStep {...defaultProps} importFile={file} onRemoveFile={onRemoveFile} />)
    await userEvent.click(screen.getByText('Remover'))
    expect(onRemoveFile).toHaveBeenCalledOnce()
  })

  it('shows caderno name input when file selected', () => {
    const file = createMockFile()
    render(<ImportPdfIdleStep {...defaultProps} importFile={file} />)
    expect(screen.getByLabelText('Nome do Caderno no Sistema')).toBeInTheDocument()
  })

  it('calls onNameChange when name input changes', async () => {
    const onNameChange = vi.fn()
    const file = createMockFile()
    render(<ImportPdfIdleStep {...defaultProps} importFile={file} onNameChange={onNameChange} />)
    const input = screen.getByLabelText('Nome do Caderno no Sistema')
    await userEvent.type(input, 'Meu Caderno')
    expect(onNameChange).toHaveBeenCalled()
  })

  it('disables Analisar PDF button when no file', () => {
    render(<ImportPdfIdleStep {...defaultProps} />)
    expect(screen.getByText('Analisar PDF').closest('button')).toBeDisabled()
  })

  it('enables Analisar PDF button when file selected', () => {
    const file = createMockFile()
    render(<ImportPdfIdleStep {...defaultProps} importFile={file} />)
    expect(screen.getByText('Analisar PDF').closest('button')).not.toBeDisabled()
  })

  it('calls onAnalyze when Analisar PDF clicked', async () => {
    const onAnalyze = vi.fn()
    const file = createMockFile()
    render(<ImportPdfIdleStep {...defaultProps} importFile={file} onAnalyze={onAnalyze} />)
    await userEvent.click(screen.getByText('Analisar PDF'))
    expect(onAnalyze).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Cancelar clicked', async () => {
    const onCancel = vi.fn()
    render(<ImportPdfIdleStep {...defaultProps} onCancel={onCancel} />)
    await userEvent.click(screen.getByText('Cancelar'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('triggers file input when drop zone clicked', async () => {
    render(<ImportPdfIdleStep {...defaultProps} />)
    const dropZone = screen.getByText(/Arraste o PDF do caderno aqui/).closest('label')
    expect(dropZone).not.toBeNull()

    const fileInput = dropZone?.querySelector('input[type="file"]')
    expect(fileInput).not.toBeNull()
    expect(fileInput).toHaveAttribute('accept', '.pdf')
  })
})
