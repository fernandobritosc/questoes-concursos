/**
 * supabase.service.ts
 * Camada centralizada de acesso ao banco de dados Supabase.
 * Modelo relacional: questoes + historico_resolucoes
 *
 * REGRA: Nunca chame `supabase` diretamente nas páginas ou hooks.
 */
import { supabase } from '../lib/supabase'
import type { Questao, HistoricoResolucao, ResolucaoView } from '../types/database'

// ─── Helper: mapeia o resultado do JOIN para ResolucaoView ────────────────────

function mapHistoricoToView(h: any): ResolucaoView {
  const q: Questao = h.questao ?? {}
  return {
    id: h.id,
    questao_id: h.questao_id,
    questao_tec_id: h.questao_tec_id,
    alternativa: h.alternativa,
    acertou: h.acertou,
    tempo_segundos: h.tempo_segundos ?? 0,
    data_resolucao: h.data_resolucao,
    // Campos da questão
    materia: q.materia ?? null,
    assunto: q.assunto ?? null,
    banca_texto: q.banca_texto ?? null,
    orgao: q.orgao ?? null,
    concurso: q.concurso ?? null,
    prova: q.prova ?? null,
    ano: q.ano ?? null,
    caderno_nome: q.caderno_nome ?? null,
    enunciado: q.enunciado ?? null,
    gabarito: q.gabarito ?? null,
    alternativas: q.alternativas ?? {},
    resolucao_professor: q.resolucao_professor ?? null,
  }
}

// ─── Questoes ─────────────────────────────────────────────────────────────────

/** Busca somente os questao_tec_ids existentes (usado para deduplicação no import). */
export async function fetchQuestaoIds(): Promise<Set<number>> {
  const { data, error } = await supabase
    .from('questoes')
    .select('questao_tec_id')

  if (error) throw error
  return new Set<number>(
    (data || []).map((r: any) => r.questao_tec_id).filter(Boolean)
  )
}

/** Insere um lote de questões em chunks. Retorna o total inserido. */
export async function insertQuestoesBatch(
  questoes: Questao[],
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  const chunkSize = 50
  let successCount = 0

  for (let i = 0; i < questoes.length; i += chunkSize) {
    const chunk = questoes.slice(i, i + chunkSize)
    const { error } = await supabase.from('questoes').insert(chunk)
    if (error) throw error
    successCount += chunk.length
    onProgress?.(successCount, questoes.length)
  }

  return successCount
}

/** Atualiza a resolução do professor de uma questão. */
export async function updateResolucaoProfessor(
  questaoId: number,
  texto: string
): Promise<void> {
  const { error } = await supabase
    .from('questoes')
    .update({ resolucao_professor: texto })
    .eq('id', questaoId)

  if (error) throw error
}

// ─── Historico Resolucoes ─────────────────────────────────────────────────────

/**
 * Busca todas as tentativas com JOIN nos dados da questão.
 * Ordena pela tentativa mais recente.
 */
export async function fetchAllResolucoes(): Promise<ResolucaoView[]> {
  const { data, error } = await supabase
    .from('historico_resolucoes')
    .select(`
      id,
      questao_id,
      questao_tec_id,
      alternativa,
      acertou,
      tempo_segundos,
      data_resolucao,
      questao:questoes!historico_resolucoes_questao_id_fkey (
        id,
        questao_tec_id,
        materia,
        assunto,
        banca_texto,
        orgao,
        concurso,
        prova,
        ano,
        caderno_nome,
        enunciado,
        gabarito,
        alternativas,
        resolucao_professor
      )
    `)
    .order('data_resolucao', { ascending: false })

  if (error) throw error
  return (data || []).map(mapHistoricoToView)
}

/**
 * Busca todas as questões do banco (da tabela questoes) com o último histórico.
 * Usado no Banco de Questões para listar todas as questões importadas.
 */
export async function fetchAllQuestoes(): Promise<ResolucaoView[]> {
  // Busca todas as questões
  const { data: questoesData, error: qErr } = await supabase
    .from('questoes')
    .select('*')
    .order('created_at', { ascending: false })

  if (qErr) throw qErr

  // Busca o histórico mais recente de cada questão
  const { data: historico, error: hErr } = await supabase
    .from('historico_resolucoes')
    .select('*')
    .order('data_resolucao', { ascending: false })

  if (hErr) throw hErr

  // Mapeia: para cada questão, pega o último histórico (se houver)
  const historicoMap = new Map<number, HistoricoResolucao>()
  for (const h of (historico || [])) {
    if (!historicoMap.has(h.questao_id)) {
      historicoMap.set(h.questao_id, h)
    }
  }

  return (questoesData || []).map((q: Questao): ResolucaoView => {
    const h = historicoMap.get(q.id!)
    return {
      id: h?.id ?? 0,
      questao_id: q.id!,
      questao_tec_id: q.questao_tec_id,
      alternativa: h?.alternativa ?? null,
      acertou: h?.acertou ?? false,
      tempo_segundos: h?.tempo_segundos ?? 0,
      data_resolucao: h?.data_resolucao ?? q.created_at ?? new Date().toISOString(),
      materia: q.materia,
      assunto: q.assunto,
      banca_texto: q.banca_texto,
      orgao: q.orgao,
      concurso: q.concurso,
      prova: q.prova,
      ano: q.ano,
      caderno_nome: q.caderno_nome,
      enunciado: q.enunciado,
      gabarito: q.gabarito,
      alternativas: q.alternativas ?? {},
      resolucao_professor: q.resolucao_professor ?? null,
    }
  })
}

export async function fetchResolucoeComErros(): Promise<ResolucaoView[]> {
  const { data, error } = await supabase
    .from('historico_resolucoes')
    .select(`
      id,
      questao_id,
      questao_tec_id,
      alternativa,
      acertou,
      tempo_segundos,
      data_resolucao,
      questao:questoes!historico_resolucoes_questao_id_fkey (
        id,
        questao_tec_id,
        materia,
        assunto,
        banca_texto,
        orgao,
        concurso,
        prova,
        ano,
        caderno_nome,
        enunciado,
        gabarito,
        alternativas,
        resolucao_professor
      )
    `)
    .not('alternativa', 'is', null)
    .neq('alternativa', '')
    .order('data_resolucao', { ascending: false })

  if (error) throw error
  const mapped = (data || []).map(mapHistoricoToView)

  // Agrupa por questao_tec_id e mantém apenas a tentativa mais recente (a primeira encontrada, pois já está ordenado decrescente por data_resolucao)
  const latestAttemptsMap = new Map<number, ResolucaoView>()
  for (const item of mapped) {
    if (item.questao_tec_id && !latestAttemptsMap.has(item.questao_tec_id)) {
      latestAttemptsMap.set(item.questao_tec_id, item)
    }
  }

  // O Caderno de Erros contém apenas as questões cuja última tentativa foi incorreta
  const errosUnicos = Array.from(latestAttemptsMap.values()).filter(item => !item.acertou)
  return errosUnicos
}


/**
 * Insere uma nova tentativa no histórico de resoluções.
 * Cada resposta do usuário gera uma nova linha (histórico completo).
 */
export async function insertHistoricoResolucao(payload: {
  questao_id: number
  questao_tec_id: number
  alternativa: string
  acertou: boolean
  tempo_segundos: number
}): Promise<HistoricoResolucao> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  const { data, error } = await supabase
    .from('historico_resolucoes')
    .insert({
      ...payload,
      user_id: userId,
      data_resolucao: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as HistoricoResolucao
}

/**
 * Busca o histórico completo de tentativas de uma questão específica.
 * Ordenado da mais antiga para a mais recente (linha do tempo).
 */
export async function fetchHistoricoByQuestao(
  questaoId: number
): Promise<HistoricoResolucao[]> {
  const { data, error } = await supabase
    .from('historico_resolucoes')
    .select('*')
    .eq('questao_id', questaoId)
    .order('data_resolucao', { ascending: true })

  if (error) throw error
  return (data || []) as HistoricoResolucao[]
}

// ─── Aliases de compatibilidade (legado) ──────────────────────────────────────

/** @deprecated Use fetchQuestaoIds */
export const fetchResolucaoIds = fetchQuestaoIds

/** @deprecated Use insertQuestoesBatch */
export async function insertResolucoesBatch(
  questoes: any[],
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  return insertQuestoesBatch(questoes, onProgress)
}

/** Busca o plano de estudos e tarefas salvas no perfil do usuário no Supabase */
export async function fetchMentorPlano(): Promise<{ mentor_plano: any; mentor_tarefas: any } | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('mentor_plano, mentor_tarefas')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }
  return data
}

/** Salva o plano de estudos e as tarefas concluídas no perfil do usuário no Supabase */
export async function updateMentorPlano(planoJson: any, tarefasJson: any): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return

  const { error } = await supabase
    .from('profiles')
    .update({
      mentor_plano: planoJson,
      mentor_tarefas: tarefasJson
    })
    .eq('id', userId)

  if (error) {
    throw error
  }
}
