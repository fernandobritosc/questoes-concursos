import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestaoIndice } from './QuestaoIndice'
import type { ResolucaoView } from '../types/database'

function makeQuestao(overrides: Partial<ResolucaoView>): ResolucaoView {
  return {
    id: 1, questao_id: 100, questao_tec_id: 10001,
    materia: 'Direito Constitucional', assunto: 'Direitos e Garantias',
    banca_texto: 'CESPE', orgao: 'STF', concurso: 'STF',
    prova: 'STF / 2023', ano: 2023, caderno_nome: 'Caderno',
    enunciado: 'Questão exemplo', gabarito: 'A',
    alternativas: { A: 'a', B: 'b', C: 'c', D: 'd', E: 'e' },
    resolucao_professor: null, alternativa: null, acertou: false,
    tempo_segundos: 0, data_resolucao: '1970-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('QuestaoIndice', () => {
  it('renders empty state when no questions', () => {
    render(<QuestaoIndice questoes={[]} onNavigate={vi.fn()} />)
    expect(screen.getByText('Nenhuma questão no caderno para exibir o índice.')).toBeInTheDocument()
  })

  it('renders organize-by selector with default option selected', () => {
    const questoes = [makeQuestao({ materia: 'Dir. Constitucional', assunto: 'Direitos' })]
    render(<QuestaoIndice questoes={questoes} onNavigate={vi.fn()} />)
    const select = screen.getByDisplayValue('Matéria e Assunto') as HTMLSelectElement
    expect(select).toBeInTheDocument()
  })

  it('renders tree nodes with counts', async () => {
    const questoes = [
      makeQuestao({ materia: 'Dir. Constitucional', assunto: 'Direitos', banca_texto: 'CESPE' }),
      makeQuestao({ materia: 'Dir. Constitucional', assunto: 'Garantias', banca_texto: 'CESPE' }),
      makeQuestao({ materia: 'Dir. Administrativo', assunto: 'Licitações', banca_texto: 'FGV' }),
    ]
    render(<QuestaoIndice questoes={questoes} onNavigate={vi.fn()} />)
    expect(screen.getByText('Dir. Constitucional')).toBeInTheDocument()
    expect(screen.getByText('Dir. Administrativo')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Dir. Constitucional'))
    await userEvent.click(screen.getByText('Dir. Administrativo'))
    expect(screen.getAllByText('(sem grupo)')).toHaveLength(2)
    await userEvent.click(screen.getAllByText('(sem grupo)')[0])
    await userEvent.click(screen.getAllByText('(sem grupo)')[1])
    expect(screen.getByText('Direitos')).toBeInTheDocument()
    expect(screen.getByText('Garantias')).toBeInTheDocument()
    expect(screen.getByText('Licitações')).toBeInTheDocument()
  })

  it('shows percentage for each node', () => {
    const questoes = [
      makeQuestao({ materia: 'Dir. Constitucional', assunto: 'Direitos' }),
      makeQuestao({ materia: 'Dir. Administrativo', assunto: 'Licitações' }),
    ]
    render(<QuestaoIndice questoes={questoes} onNavigate={vi.fn()} />)
    expect(screen.getByText('Dir. Constitucional')).toBeInTheDocument()
    expect(screen.getByText('Dir. Administrativo')).toBeInTheDocument()
  })

  it('toggles children visibility when level-1 node clicked', async () => {
    const questoes = [makeQuestao({ materia: 'Dir. Constitucional', assunto: 'Direitos' })]
    render(<QuestaoIndice questoes={questoes} onNavigate={vi.fn()} />)
    expect(screen.queryByText('(sem grupo)')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('Dir. Constitucional'))
    expect(screen.getByText('(sem grupo)')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Dir. Constitucional'))
    expect(screen.queryByText('(sem grupo)')).not.toBeInTheDocument()
  })

  it('shows "Sem" fallback when field is null', () => {
    const questoes = [makeQuestao({ materia: null, assunto: null })]
    render(<QuestaoIndice questoes={questoes} onNavigate={vi.fn()} />)
    expect(screen.getByText('Sem materia')).toBeInTheDocument()
  })

  it('calls onNavigate when level-1 count clicked', async () => {
    const onNavigate = vi.fn()
    const questoes = [makeQuestao({ materia: 'Dir. Constitucional', assunto: 'Direitos' })]
    render(<QuestaoIndice questoes={questoes} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByTestId('count-materia'))
    expect(onNavigate).toHaveBeenCalledWith({ materia: 'Dir. Constitucional' })
  })

  it('calls onNavigate when level-2 node clicked', async () => {
    const onNavigate = vi.fn()
    const questoes = [makeQuestao({ materia: 'Dir. Constitucional', assunto: 'Direitos' })]
    render(<QuestaoIndice questoes={questoes} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByText('Dir. Constitucional'))
    await userEvent.click(screen.getByText('(sem grupo)'))
    await userEvent.click(screen.getByText('Direitos'))
    expect(onNavigate).toHaveBeenCalledWith({ materia: 'Dir. Constitucional', assunto: 'Direitos' })
  })

  it('changes organize-by when select changes', async () => {
    const questoes = [
      makeQuestao({ materia: 'Dir. Constitucional', banca_texto: 'CESPE' }),
      makeQuestao({ materia: 'Dir. Administrativo', banca_texto: 'FGV' }),
    ]
    render(<QuestaoIndice questoes={questoes} onNavigate={vi.fn()} />)
    const select = screen.getByDisplayValue('Matéria e Assunto')
    await userEvent.selectOptions(select, 'banca')
    expect(screen.getByText('CESPE')).toBeInTheDocument()
    expect(screen.getByText('FGV')).toBeInTheDocument()
  })

  it('shows expand and retrair buttons', () => {
    const questoes = [makeQuestao({ materia: 'Dir. Constitucional', assunto: 'Direitos' })]
    render(<QuestaoIndice questoes={questoes} onNavigate={vi.fn()} />)
    expect(screen.getByText('Expandir')).toBeInTheDocument()
    expect(screen.getByText('Retrair')).toBeInTheDocument()
  })

  it('shows "Remover questões" button', () => {
    const questoes = [makeQuestao({ materia: 'Dir. Constitucional' })]
    render(<QuestaoIndice questoes={questoes} onNavigate={vi.fn()} />)
    expect(screen.getByText('Remover questões')).toBeInTheDocument()
  })
})
