import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestaoNavegacao } from './QuestaoNavegacao'

describe('QuestaoNavegacao', () => {
  const defaultProps = {
    onAnterior: vi.fn(),
    onProxima: vi.fn(),
    onAleatorio: vi.fn(),
    onLimpar: vi.fn(),
    podeAnterior: true,
    podeProxima: true,
  }

  it('renders all four buttons', () => {
    render(<QuestaoNavegacao {...defaultProps} />)
    expect(screen.getByText('Anterior')).toBeInTheDocument()
    expect(screen.getByText('Próxima')).toBeInTheDocument()
    expect(screen.getByText('Aleatório')).toBeInTheDocument()
    expect(screen.getByText('Limpar')).toBeInTheDocument()
  })

  it('disables anterior button when podeAnterior is false', () => {
    render(<QuestaoNavegacao {...defaultProps} podeAnterior={false} />)
    expect(screen.getByText('Anterior').closest('button')).toBeDisabled()
  })

  it('disables proxima button when podeProxima is false', () => {
    render(<QuestaoNavegacao {...defaultProps} podeProxima={false} />)
    expect(screen.getByText('Próxima').closest('button')).toBeDisabled()
  })

  it('calls onAnterior when clicked', async () => {
    const onAnterior = vi.fn()
    render(<QuestaoNavegacao {...defaultProps} onAnterior={onAnterior} />)
    await userEvent.click(screen.getByText('Anterior'))
    expect(onAnterior).toHaveBeenCalledOnce()
  })

  it('calls onProxima when clicked', async () => {
    const onProxima = vi.fn()
    render(<QuestaoNavegacao {...defaultProps} onProxima={onProxima} />)
    await userEvent.click(screen.getByText('Próxima'))
    expect(onProxima).toHaveBeenCalledOnce()
  })

  it('calls onAleatorio when clicked', async () => {
    const onAleatorio = vi.fn()
    render(<QuestaoNavegacao {...defaultProps} onAleatorio={onAleatorio} />)
    await userEvent.click(screen.getByText('Aleatório'))
    expect(onAleatorio).toHaveBeenCalledOnce()
  })

  it('calls onLimpar when clicked', async () => {
    const onLimpar = vi.fn()
    render(<QuestaoNavegacao {...defaultProps} onLimpar={onLimpar} />)
    await userEvent.click(screen.getByText('Limpar'))
    expect(onLimpar).toHaveBeenCalledOnce()
  })

  it('does not call onAnterior when disabled', async () => {
    const onAnterior = vi.fn()
    render(<QuestaoNavegacao {...defaultProps} onAnterior={onAnterior} podeAnterior={false} />)
    await userEvent.click(screen.getByText('Anterior'))
    expect(onAnterior).not.toHaveBeenCalled()
  })
})
