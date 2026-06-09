import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestaoEstatisticas } from './QuestaoEstatisticas'
import type { ResolucaoView, HistoricoResolucao } from '../types/database'

const mockQuestao: ResolucaoView = {
  id: 1, questao_id: 100, questao_tec_id: 12345,
  materia: 'Direito Constitucional', assunto: 'Direitos e Garantias',
  banca_texto: 'CESPE', orgao: 'STF', concurso: 'STF',
  prova: 'STF / 2023', ano: 2023, caderno_nome: 'Caderno',
  enunciado: 'Qual o artigo?', gabarito: 'A',
  alternativas: { A: 'Art. 5º', B: 'Art. 6º', C: 'Art. 7º', D: 'Art. 8º', E: 'Art. 9º' },
  resolucao_professor: null, alternativa: 'A', acertou: true,
  tempo_segundos: 30, data_resolucao: '2024-01-01T00:00:00Z',
}

const mockHistorico: HistoricoResolucao[] = [
  { id: 1, questao_id: 100, questao_tec_id: 12345, alternativa: 'A', acertou: true, tempo_segundos: 30, data_resolucao: '2024-01-01T00:00:00Z' },
  { id: 2, questao_id: 100, questao_tec_id: 12345, alternativa: 'B', acertou: false, tempo_segundos: 45, data_resolucao: '2024-01-02T00:00:00Z' },
]

describe('QuestaoEstatisticas', () => {
  it('renders empty state when totalQuestoes is 0', () => {
    render(
      <QuestaoEstatisticas questao={mockQuestao} historico={[]} loading={false} totalQuestoes={0} onVoltar={vi.fn()} />
    )
    expect(screen.getByText('Nenhuma questão disponível')).toBeInTheDocument()
  })

  it('renders questao info when available', () => {
    render(
      <QuestaoEstatisticas questao={mockQuestao} historico={mockHistorico} loading={false} totalQuestoes={5} onVoltar={vi.fn()} />
    )
    expect(screen.getByText(/Q12345/)).toBeInTheDocument()
    expect(screen.getByText(/CESPE/)).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    render(
      <QuestaoEstatisticas questao={mockQuestao} historico={[]} loading={true} totalQuestoes={5} onVoltar={vi.fn()} />
    )
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows empty history message when no attempts', () => {
    render(
      <QuestaoEstatisticas questao={mockQuestao} historico={[]} loading={false} totalQuestoes={5} onVoltar={vi.fn()} />
    )
    expect(screen.getByText(/Você ainda não resolveu esta questão/)).toBeInTheDocument()
  })

  it('shows performance stats when history exists', () => {
    render(
      <QuestaoEstatisticas questao={mockQuestao} historico={mockHistorico} loading={false} totalQuestoes={5} onVoltar={vi.fn()} />
    )
    expect(screen.getByText('Taxa de Acerto')).toBeInTheDocument()
    expect(screen.getByText(/1 acerto e 1 erro de 2 tentativas/)).toBeInTheDocument()
  })

  it('shows historico de tentativas', () => {
    render(
      <QuestaoEstatisticas questao={mockQuestao} historico={mockHistorico} loading={false} totalQuestoes={5} onVoltar={vi.fn()} />
    )
    expect(screen.getByText('Histórico de Tentativas')).toBeInTheDocument()
  })

  it('calls onVoltar when button clicked', async () => {
    const onVoltar = vi.fn()
    render(
      <QuestaoEstatisticas questao={mockQuestao} historico={mockHistorico} loading={false} totalQuestoes={5} onVoltar={onVoltar} />
    )
    await userEvent.click(screen.getByText('Voltar para a Questão'))
    expect(onVoltar).toHaveBeenCalledOnce()
  })
})
