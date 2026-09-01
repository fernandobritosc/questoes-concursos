import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestaoVisualizador } from './QuestaoVisualizador'
import type { ResolucaoView } from '../types/database'

const mockQuestao: ResolucaoView = {
  id: 1,
  questao_id: 100,
  questao_tec_id: 12345,
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
  resolucao_professor: 'A resposta é o Art. 5º',
  alternativa: null,
  acertou: false,
  tempo_segundos: 30,
  data_resolucao: '2024-01-01T00:00:00Z',
}

const defaultProps = {
  questao: mockQuestao,
  index: 0,
  total: 10,
  alternativaSelecionada: null,
  onSelectAlternativa: vi.fn(),
  revelado: false,
  onReset: vi.fn(),
  onConfirmarResposta: vi.fn(),
  copiedId: null,
  onCopyId: vi.fn(),
  tempoSegundos: 30,
  salvandoResposta: false,
  onEditar: vi.fn(),
  onAnterior: vi.fn(),
  onProxima: vi.fn(),
  podeAnterior: true,
  podeProxima: true,
}

describe('QuestaoVisualizador', () => {
  it('renders questao number and total', () => {
    render(<QuestaoVisualizador {...defaultProps} />)
    expect(screen.getByText('Questão 1 de 10')).toBeInTheDocument()
  })

  it('renders enunciado', () => {
    render(<QuestaoVisualizador {...defaultProps} />)
    expect(screen.getByText('Qual o artigo?')).toBeInTheDocument()
  })

  it('renders all alternatives', () => {
    render(<QuestaoVisualizador {...defaultProps} />)
    expect(screen.getByText('Art. 5º')).toBeInTheDocument()
    expect(screen.getByText('Art. 6º')).toBeInTheDocument()
    expect(screen.getByText('Art. 7º')).toBeInTheDocument()
    expect(screen.getByText('Art. 8º')).toBeInTheDocument()
    expect(screen.getByText('Art. 9º')).toBeInTheDocument()
  })

  it('renders RESOLVER QUESTÃO button when not revelado', () => {
    render(<QuestaoVisualizador {...defaultProps} />)
    expect(screen.getByText('RESOLVER QUESTÃO')).toBeInTheDocument()
  })

  it('shows acertou message when revelado and correct', () => {
    render(
      <QuestaoVisualizador
        {...defaultProps}
        revelado={true}
        alternativaSelecionada="A"
      />
    )
    expect(screen.getByText('Você acertou!')).toBeInTheDocument()
  })

  it('shows errou message when revelado and incorrect', () => {
    render(
      <QuestaoVisualizador
        {...defaultProps}
        revelado={true}
        alternativaSelecionada="B"
      />
    )
    expect(screen.getByText('Você errou!')).toBeInTheDocument()
  })

  it('shows Tentar Mais uma vez when revelado', () => {
    render(
      <QuestaoVisualizador
        {...defaultProps}
        revelado={true}
        alternativaSelecionada="A"
      />
    )
    expect(screen.getByText('Tentar Mais uma vez')).toBeInTheDocument()
  })

  it('calls onSelectAlternativa when alternative clicked', async () => {
    const onSelectAlternativa = vi.fn()
    render(<QuestaoVisualizador {...defaultProps} onSelectAlternativa={onSelectAlternativa} />)
    await userEvent.click(screen.getByText('Art. 5º'))
    expect(onSelectAlternativa).toHaveBeenCalledWith('A')
  })

  it('calls onConfirmarResposta when button clicked', async () => {
    const onConfirmarResposta = vi.fn()
    render(
      <QuestaoVisualizador
        {...defaultProps}
        alternativaSelecionada="A"
        onConfirmarResposta={onConfirmarResposta}
      />
    )
    await userEvent.click(screen.getByText('RESOLVER QUESTÃO'))
    expect(onConfirmarResposta).toHaveBeenCalledOnce()
  })

  it('calls onReset when Tentar Mais uma vez clicked', async () => {
    const onReset = vi.fn()
    render(
      <QuestaoVisualizador
        {...defaultProps}
        revelado={true}
        alternativaSelecionada="A"
        onReset={onReset}
      />
    )
    await userEvent.click(screen.getByText('Tentar Mais uma vez'))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('disables confirm button when no alternativa selecionada', () => {
    render(<QuestaoVisualizador {...defaultProps} />)
    expect(screen.getByText('RESOLVER QUESTÃO').closest('button')).toBeDisabled()
  })

  it('renders tempo display', () => {
    render(<QuestaoVisualizador {...defaultProps} tempoSegundos={125} />)
    expect(screen.getByText('Tempo Gasto: 2m 5s')).toBeInTheDocument()
  })

  it('renders materia and assunto in breadcrumb', () => {
    render(<QuestaoVisualizador {...defaultProps} />)
    expect(screen.getByText('Direito Constitucional')).toBeInTheDocument()
    expect(screen.getByText('Direitos e Garantias')).toBeInTheDocument()
  })

  it('calls onEditar when edit button clicked', async () => {
    const onEditar = vi.fn()
    render(<QuestaoVisualizador {...defaultProps} onEditar={onEditar} />)
    await userEvent.click(screen.getByText('Editar'))
    expect(onEditar).toHaveBeenCalledOnce()
  })
})
