import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardStudyHeatmap } from './DashboardStudyHeatmap'

const agora = new Date()
const dataResolucao = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12, 0, 0).toISOString()
const hojeFormatado = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toLocaleDateString('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function makeResolucao(overrides: {
  id: number
  materia: string | null
  assunto: string | null
  acertou: boolean
}) {
  return {
    alternativa: 'A',
    data_resolucao: dataResolucao,
    tempo_segundos: 60,
    ...overrides,
  }
}

async function abrirDetalheDoDia(totalDoDia: number) {
  await userEvent.click(screen.getByText('Visualizar'))
  const label = `${totalDoDia} ${totalDoDia === 1 ? 'questão' : 'questões'} em ${hojeFormatado}`
  await userEvent.click(screen.getByRole('button', { name: label }))
}

describe('DashboardStudyHeatmap', () => {
  it('mostra assuntos abaixo da matéria no detalhe do dia', async () => {
    render(
      <DashboardStudyHeatmap
        resolucoes={[
          makeResolucao({ id: 1, materia: 'Direito Constitucional (CF/1988 e Doutrina)', assunto: 'Direitos e Garantias Fundamentais', acertou: true }),
          makeResolucao({ id: 2, materia: 'Direito Constitucional (CF/1988 e Doutrina)', assunto: 'Organização do Estado', acertou: false }),
        ]}
      />
    )

    await abrirDetalheDoDia(2)

    expect(screen.getByText('Dia selecionado')).toBeInTheDocument()
    expect(screen.getByText('Por matéria')).toBeInTheDocument()
    expect(screen.getByText('Direito Constitucional (CF/1988 e Doutrina)')).toBeInTheDocument()
    expect(screen.getByText('1/2 · 50%')).toBeInTheDocument()
    expect(screen.getByText('Direitos e Garantias Fundamentais')).toBeInTheDocument()
    expect(screen.getByText('1/1 · 100%')).toBeInTheDocument()
    expect(screen.getByText('Organização do Estado')).toBeInTheDocument()
    expect(screen.getByText('0/1 · 0%')).toBeInTheDocument()
  })

  it('usa "Sem assunto" quando a questão não tem assunto', async () => {
    render(
      <DashboardStudyHeatmap
        resolucoes={[
          makeResolucao({ id: 1, materia: 'AFO', assunto: null, acertou: true }),
        ]}
      />
    )

    await abrirDetalheDoDia(1)

    expect(screen.getByText('AFO')).toBeInTheDocument()
    expect(screen.getByText('Sem assunto')).toBeInTheDocument()
    expect(screen.getAllByText('1/1 · 100%')).toHaveLength(2)
  })
})
