import type { Resolucao } from '../types/database'

export function getQuestionValidation(q: Resolucao): string[] {
  const errors: string[] = []
  if (!q.questao_tec_id || q.questao_tec_id <= 0) errors.push('ID da questão ausente ou inválido')
  if (!q.enunciado || q.enunciado.trim().length < 10) errors.push('Enunciado curto ou ausente')
  if (!q.gabarito) errors.push('Gabarito ausente')
  const validAlts = Object.values(q.alternativas || {}).filter(val => val && val.trim() !== '')
  if (validAlts.length < 2) errors.push('Alternativas insuficientes')
  return errors
}
