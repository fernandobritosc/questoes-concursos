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

function mapHistoricoToView(h: {
  id: number
  questao_id: number
  questao_tec_id: number
  alternativa: string | null
  acertou: boolean
  tempo_segundos: number | null
  data_resolucao: string
  questao: Questao[] | Questao | null
}): ResolucaoView {
  const q = Array.isArray(h.questao) ? h.questao[0] ?? null : h.questao ?? null
  return {
    id: h.id,
    questao_id: h.questao_id,
    questao_tec_id: h.questao_tec_id,
    alternativa: h.alternativa,
    acertou: h.acertou,
    tempo_segundos: h.tempo_segundos ?? 0,
    data_resolucao: h.data_resolucao,
    materia: q?.materia ?? null,
    assunto: q?.assunto ?? null,
    banca_texto: q?.banca_texto ?? null,
    orgao: q?.orgao ?? null,
    concurso: q?.concurso ?? null,
    prova: q?.prova ?? null,
    ano: q?.ano ?? null,
    caderno_nome: q?.caderno_nome ?? null,
    enunciado: q?.enunciado ?? null,
    gabarito: q?.gabarito ?? null,
    alternativas: q?.alternativas ?? {},
    resolucao_professor: q?.resolucao_professor ?? null,
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
    (data || []).map((r: { questao_tec_id: number }) => r.questao_tec_id).filter(Boolean)
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

/** Atualiza todos os dados editáveis de uma questão. */
export async function updateQuestao(
  questaoId: number,
  payload: Partial<Questao>
): Promise<void> {
  const { error } = await supabase
    .from('questoes')
    .update(payload)
    .eq('id', questaoId)

  if (error) throw error
}

// ─── Historico Resolucoes ─────────────────────────────────────────────────────

/**
 * Busca todas as tentativas com JOIN nos dados da questão.
 * Ordena pela tentativa mais recente.
 */
export async function fetchAllResolucoes(): Promise<ResolucaoView[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return []

  const query = supabase
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
    .eq('user_id', userId)
    .order('data_resolucao', { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapHistoricoToView)
}

// Cache em memória para evitar chamadas duplicadas concorrentes
let _questoesCache: ResolucaoView[] | null = null
let _questoesCachePromise: Promise<ResolucaoView[]> | null = null
let _questoesCacheTimestamp = 0
const CACHE_TTL_MS = 60000 // 1 minuto

/** Invalida o cache de fetchAllQuestoes (chamado após importar PDF). */
export function clearQuestoesCache(): void {
  _questoesCache = null
  _questoesCachePromise = null
  _questoesCacheTimestamp = 0
  // Also clear progressive cache (new questions may have been imported)
  _progressiveCache = []
  _progressiveCachedPages.clear()
  _progressiveFilterHash = null
  _progressiveTotalCount = 0
  _progressiveTotalPages = 0
  _historicoCache = null
  _historicoCachePromise = null
  _filterOptionsCache = null
  _filterOptionsPromise = null
}

// ─── Tipos para paginação server-side ─────────────────────────────────────────

export interface PaginatedResult {
  data: ResolucaoView[]
  total: number
  totalPages: number
  page: number
}

export interface FilterOptions {
  materias: string[]
  bancas: string[]
  anos: number[]
  orgaos: string[]
  concursos: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashFilters(filters: Record<string, string[]>): string {
  const sorted = Object.entries(filters)
    .filter(([, v]) => v.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${[...v].sort().join(',')}`)
    .join('&')
  return sorted || '__all__'
}

// ─── Progressive flat cache para fetchPaginatedQuestoes ────────────────────────

let _progressiveCache: ResolucaoView[] = []
const _progressiveCachedPages = new Set<string>()
let _progressiveFilterHash: string | null = null
let _progressiveTotalCount = 0
let _progressiveTotalPages = 0

// Historico cache (fetched once, merged client-side with each page)
let _historicoCache: HistoricoResolucao[] | null = null
let _historicoCachePromise: Promise<void> | null = null

async function ensureHistoricoCached(): Promise<void> {
  if (_historicoCache) return
  if (_historicoCachePromise) {
    await _historicoCachePromise
    return
  }
  _historicoCachePromise = (async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) {
      _historicoCache = []
      return
    }
    const { data, error } = await supabase
      .from('historico_resolucoes')
      .select('id, questao_id, questao_tec_id, alternativa, acertou, tempo_segundos, data_resolucao')
      .eq('user_id', userId)
      .order('data_resolucao', { ascending: false })
    if (error) throw error
    _historicoCache = (data || []) as HistoricoResolucao[]
  })()
  try {
    await _historicoCachePromise
  } finally {
    _historicoCachePromise = null
  }
}

const PAGE_SIZE_DEFAULT = 200

export async function fetchPaginatedQuestoes(
  page: number,
  pageSize: number = PAGE_SIZE_DEFAULT,
  filters?: Record<string, string[]>,
  signal?: AbortSignal
): Promise<PaginatedResult> {
  // Ensure historico is cached (fetched once, reused across pages)
  await ensureHistoricoCached()

  const filterHash = hashFilters(filters || {})

  // Check progressive cache
  const cacheKey = `${filterHash}:${page}`
  if (_progressiveFilterHash === filterHash && _progressiveCachedPages.has(cacheKey)) {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    console.log(`[LOG fetchPaginatedQuestoes] Cache hit! page=${page}, totalCached=${_progressiveCache.length}`)
    return {
      data: _progressiveCache.slice(start, end),
      total: _progressiveTotalCount,
      totalPages: _progressiveTotalPages,
      page,
    }
  }

  // Filter change → reset progressive cache
  if (_progressiveFilterHash !== filterHash) {
    console.log(`[LOG fetchPaginatedQuestoes] Filter change: resetting cache (${_progressiveFilterHash} → ${filterHash})`)
    _progressiveCache = []
    _progressiveCachedPages.clear()
    _progressiveFilterHash = filterHash
    _progressiveTotalCount = 0
    _progressiveTotalPages = 0
  }

  // Build paginated query
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1  // range is INCLUSIVE on both ends

  const MAX_PER_REQUEST = 1_000
  const needsChunking = pageSize > MAX_PER_REQUEST && from < MAX_PER_REQUEST

  let questoesData: Questao[] | null = null // eslint-disable-line no-useless-assignment
  let count: number | null = null // eslint-disable-line no-useless-assignment

  if (needsChunking) {
    // Fetch in chunks of MAX_PER_REQUEST to work around Supabase's 1,000 row limit
    const allData: Questao[] = []
    let fetchFrom = 0
    let firstCount: number | null = null

    while (true) {
      const fetchTo = fetchFrom + MAX_PER_REQUEST - 1

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase
        .from('questoes')
        .select(`
          id, questao_tec_id, materia, assunto, banca_texto, orgao,
          concurso, prova, ano, caderno_nome, enunciado, gabarito,
          alternativas, resolucao_professor, created_at
        `, firstCount === null ? { count: 'exact' } : undefined)
        .order('id', { ascending: false })
        .range(fetchFrom, fetchTo)

      if (filters?.materia?.length)     q = q.in('materia', filters.materia)
      if (filters?.banca_texto?.length) q = q.in('banca_texto', filters.banca_texto)
      if (filters?.ano?.length)         q = q.in('ano', filters.ano)
      if (filters?.orgao?.length)       q = q.in('orgao', filters.orgao)
      if (filters?.concurso?.length)    q = q.in('concurso', filters.concurso)
      if (signal) q = q.abortSignal(signal)

      console.log(`[LOG fetchPaginatedQuestoes] Chunk range ${fetchFrom}-${fetchTo}`)
      const { data: chunk, error: chunkErr, count: chunkCount } = await q
      if (chunkErr) throw chunkErr

      if (firstCount === null) firstCount = chunkCount
      if (!chunk || chunk.length === 0) break

      allData.push(...chunk)
      if (chunk.length < MAX_PER_REQUEST) break
      fetchFrom = fetchTo + 1
    }

    questoesData = allData
    count = firstCount
    console.log(`[LOG fetchPaginatedQuestoes] Chunked fetch complete: ${allData.length} questions, total count=${count}`)
  } else {
    // Single request for small page sizes
    let query = supabase
      .from('questoes')
      .select(`
        id, questao_tec_id, materia, assunto, banca_texto, orgao,
        concurso, prova, ano, caderno_nome, enunciado, gabarito,
        alternativas, resolucao_professor, created_at
      `, { count: 'exact' })
      .order('id', { ascending: false })
      .range(from, to)

    if (filters?.materia?.length)     query = query.in('materia', filters.materia)
    if (filters?.banca_texto?.length) query = query.in('banca_texto', filters.banca_texto)
    if (filters?.ano?.length)         query = query.in('ano', filters.ano)
    if (filters?.orgao?.length)       query = query.in('orgao', filters.orgao)
    if (filters?.concurso?.length)    query = query.in('concurso', filters.concurso)
    if (signal) query = query.abortSignal(signal)

    console.log(`[LOG fetchPaginatedQuestoes] Fetching page ${page} (range ${from}-${to})${filters ? ` filters=${filterHash}` : ''}`)
    const { data, error, count: cnt } = await query
    if (error) throw error
    questoesData = data
    count = cnt
    console.log(`[LOG fetchPaginatedQuestoes] Received ${questoesData?.length ?? 0} questions, total count=${count}`)
  }

  // Merge with historico (same pattern as fetchAllQuestoes)
  const historicoMap = new Map<number, HistoricoResolucao>()
  for (const h of (_historicoCache || [])) {
    if (!historicoMap.has(h.questao_id)) {
      historicoMap.set(h.questao_id, h as HistoricoResolucao)
    }
  }

  const merged = (questoesData || []).map((q: Questao): ResolucaoView => {
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

  // Update progressive cache
  _progressiveCache.splice(from, merged.length, ...merged)
  _progressiveCachedPages.add(cacheKey)
  _progressiveTotalCount = count || 0
  _progressiveTotalPages = Math.ceil((count || 0) / pageSize)

  return {
    data: merged,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
    page,
  }
}

// ─── Filtros (cache, fetch-once) ──────────────────────────────────────────────

let _filterOptionsCache: FilterOptions | null = null
let _filterOptionsPromise: Promise<FilterOptions> | null = null

export async function fetchFilterOptions(): Promise<FilterOptions> {
  if (_filterOptionsCache) return _filterOptionsCache
  if (_filterOptionsPromise) return _filterOptionsPromise

  _filterOptionsPromise = (async () => {
    const [materiasRes, bancasRes, anosRes, orgaosRes, concursosRes] = await Promise.all([
      supabase.from('questoes').select('materia').not('materia', 'is', null),
      supabase.from('questoes').select('banca_texto').not('banca_texto', 'is', null),
      supabase.from('questoes').select('ano').not('ano', 'is', null),
      supabase.from('questoes').select('orgao').not('orgao', 'is', null),
      supabase.from('questoes').select('concurso').not('concurso', 'is', null),
    ])

    if (materiasRes.error) throw materiasRes.error
    if (bancasRes.error) throw bancasRes.error
    if (anosRes.error) throw anosRes.error
    if (orgaosRes.error) throw orgaosRes.error
    if (concursosRes.error) throw concursosRes.error

    const options: FilterOptions = {
      materias: Array.from(new Set((materiasRes.data || []).map(r => r.materia).filter(Boolean))).sort() as string[],
      bancas: Array.from(new Set((bancasRes.data || []).map(r => r.banca_texto).filter(Boolean))).sort() as string[],
      anos: Array.from(new Set((anosRes.data || []).map(r => r.ano).filter(Boolean))).sort((a, b) => (b as number) - (a as number)) as number[],
      orgaos: Array.from(new Set((orgaosRes.data || []).map(r => r.orgao).filter(Boolean))).sort() as string[],
      concursos: Array.from(new Set((concursosRes.data || []).map(r => r.concurso).filter(Boolean))).sort() as string[],
    }

    _filterOptionsCache = options
    return options
  })()

  try {
    return await _filterOptionsPromise
  } finally {
    _filterOptionsPromise = null
  }
}

/**
 * Busca todas as questões do banco com cache compartilhado.
 * Evita N chamadas concorrentes quando múltiplas páginas montam em paralelo.
 */
export async function fetchAllQuestoes(): Promise<ResolucaoView[]> {
  // Retorna cache se ainda válido
  if (_questoesCache && Date.now() - _questoesCacheTimestamp < CACHE_TTL_MS) {
    console.log('[LOG fetchAllQuestoes] Cache hit!')
    return _questoesCache
  }

  // Deduplica chamadas concorrentes (Promise cache)
  if (_questoesCachePromise) {
    console.log('[LOG fetchAllQuestoes] Aguardando chamada concorrente...')
    return _questoesCachePromise
  }

  console.log('[LOG fetchAllQuestoes] Iniciando busca de questões...')
  _questoesCachePromise = (async (): Promise<ResolucaoView[]> => {
    const t0 = performance.now()
    const { data: questoesData, error: qErr } = await supabase
      .from('questoes')
      .select(`
        id, questao_tec_id, materia, assunto, banca_texto, orgao,
        concurso, prova, ano, caderno_nome, enunciado, gabarito,
        alternativas, resolucao_professor, created_at
      `)
      .order('id', { ascending: false })
      .limit(1000)

    const t1 = performance.now()
    console.log(`[LOG fetchAllQuestoes] Query questoes: ${(t1 - t0).toFixed(0)}ms | qtd=${questoesData?.length ?? 0} | error=${qErr?.message ?? 'null'}`)
    if (qErr) throw qErr

    const { data: { session: histSession } } = await supabase.auth.getSession()
    const histUserId = histSession?.user?.id

    console.log('[LOG fetchAllQuestoes] Iniciando busca do histórico...')
    let histQuery = supabase
      .from('historico_resolucoes')
      .select(`
        id, questao_id, questao_tec_id, alternativa, acertou,
        tempo_segundos, data_resolucao
      `)
      .order('data_resolucao', { ascending: false })

    if (histUserId) histQuery = histQuery.eq('user_id', histUserId)

    const { data: historico, error: hErr } = await histQuery

    const t2 = performance.now()
    console.log(`[LOG fetchAllQuestoes] Query historico: ${(t2 - t1).toFixed(0)}ms | qtd=${historico?.length ?? 0} | error=${hErr?.message ?? 'null'}`)
    if (hErr) throw hErr

    console.log('[LOG fetchAllQuestoes] Mesclando dados...')
    const historicoMap = new Map<number, HistoricoResolucao>()
    for (const h of (historico || [])) {
      if (!historicoMap.has(h.questao_id)) {
        historicoMap.set(h.questao_id, h as HistoricoResolucao)
      }
    }

    const result = (questoesData || []).map((q: Questao): ResolucaoView => {
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

    const t3 = performance.now()
    console.log(`[LOG fetchAllQuestoes] Mesclagem concluída: ${(t3 - t2).toFixed(0)}ms | total=${result.length}`)

    _questoesCache = result
    _questoesCacheTimestamp = Date.now()
    return result
  })()

  try {
    return await _questoesCachePromise
  } finally {
    _questoesCachePromise = null
  }
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
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('historico_resolucoes')
    .select('*')
    .eq('questao_id', questaoId)
    .eq('user_id', userId)
    .order('data_resolucao', { ascending: true })

  if (error) throw error
  return (data || []) as HistoricoResolucao[]
}

// ─── Aliases de compatibilidade (legado) ──────────────────────────────────────

/** @deprecated Use fetchQuestaoIds */
export const fetchResolucaoIds = fetchQuestaoIds

/** @deprecated Use insertQuestoesBatch */
export async function insertResolucoesBatch(
  questoes: Questao[],
  onProgress?: (current: number, total: number) => void
): Promise<number> {
  return insertQuestoesBatch(questoes, onProgress)
}

/** Busca o plano de estudos e tarefas salvas no perfil do usuário no Supabase */
export async function fetchMentorPlano(): Promise<{ mentor_plano: unknown; mentor_tarefas: unknown } | null> {
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
export async function updateMentorPlano(planoJson: unknown, tarefasJson: unknown): Promise<void> {
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
