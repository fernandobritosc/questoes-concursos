import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestaoGabarito } from './QuestaoGabarito'
import type { ResolucaoView } from '../types/database'

const mockQuestao: ResolucaoView = {
  id: 1,
  questao_id: 100,
  questao_tec_id: 12345,
  materia: 'Direito Constitucional',
  assunto: 'Direitos e Garantias Fundamentais',
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
  alternativa: 'A',
  acertou: true,
  tempo_segundos: 30,
  data_resolucao: '2024-01-01T00:00:00Z',
}

describe('QuestaoGabarito', () => {
  it('renders empty state when totalQuestoes is 0', () => {
    render(<QuestaoGabarito questao={mockQuestao} explicacaoIA={undefined} totalQuestoes={0} onVoltar={vi.fn()} />)
    expect(screen.getByText('Nenhuma questão disponível')).toBeInTheDocument()
    expect(screen.getByText('Importe um PDF para ver o gabarito.')).toBeInTheDocument()
  })

  it('renders questao info when available', () => {
    render(<QuestaoGabarito questao={mockQuestao} explicacaoIA={undefined} totalQuestoes={5} onVoltar={vi.fn()} />)
    expect(screen.getByText(/Q12345/)).toBeInTheDocument()
    expect(screen.getByText(/Direito Constitucional/)).toBeInTheDocument()
    expect(screen.getByText('Gabarito Oficial')).toBeInTheDocument()
  })

  it('renders IA explanation when provided', () => {
    render(
      <QuestaoGabarito questao={mockQuestao} explicacaoIA="A resposta é A" totalQuestoes={5} onVoltar={vi.fn()} />
    )
    expect(screen.getByText('A resposta é A')).toBeInTheDocument()
  })

  it('calls onVoltar when button clicked', async () => {
    const onVoltar = vi.fn()
    render(<QuestaoGabarito questao={mockQuestao} explicacaoIA={undefined} totalQuestoes={5} onVoltar={onVoltar} />)
    await userEvent.click(screen.getByText('Voltar para a Questão'))
    expect(onVoltar).toHaveBeenCalledOnce()
  })
})
