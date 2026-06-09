import { useState, useEffect, useCallback } from 'react'

interface MetasData {
  metaQuestoes: number
  weekStart: string
}

function getMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function getWeekKey(): string {
  return getMonday()
}

function calcularProgresso(resolucoes: { data_resolucao: string }[]): number {
  const weekStart = getMonday()
  const weekStartMs = new Date(weekStart).getTime()
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000

  return resolucoes.filter(r => {
    const t = new Date(r.data_resolucao).getTime()
    return t >= weekStartMs && t < weekEndMs
  }).length
}

export function useMetasSemanais(resolucoes: { data_resolucao: string }[]) {
  const [metaQuestoes, setMetaQuestoesState] = useState(() => {
    try {
      const stored = localStorage.getItem('metas_semanais')
      if (stored) {
        const data: MetasData = JSON.parse(stored)
        if (data.weekStart === getWeekKey()) {
          return data.metaQuestoes
        }
      }
    } catch {
      /* ignore */
    }
    return 0
  })

  const progresso = calcularProgresso(resolucoes)

  useEffect(() => {
    const data: MetasData = { metaQuestoes, weekStart: getWeekKey() }
    localStorage.setItem('metas_semanais', JSON.stringify(data))
  }, [metaQuestoes])

  const setMetaQuestoes = useCallback((value: number) => {
    setMetaQuestoesState(Math.max(0, Math.round(value)))
  }, [])

  return {
    metaQuestoes,
    setMetaQuestoes,
    progresso,
    progressoPercentual: metaQuestoes > 0 ? Math.min(100, Math.round((progresso / metaQuestoes) * 100)) : 0,
  }
}
