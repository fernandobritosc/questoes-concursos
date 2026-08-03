/**
 * supabase.service.ts
 * Camada centralizada de acesso ao banco de dados Supabase.
 * Modelo relacional: questoes + historico_resolucoes
 *
 * REGRA: Nunca chame `supabase` diretamente nas páginas ou hooks.
 */
import { supabase } from '../lib/supabase'
import type { Questao, HistoricoResolucao, ResolucaoView, FilterOptions, MetaConcurso, TarefaMeta } from '../types/database'
import { useQuestaoStore } from '../stores/questaoStore'

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
    grupo: q?.grupo ?? null,
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

  const MAX_PER_REQUEST = 1_000
  const allData: ResolucaoView[] = []
  let fetchFrom = 0

  while (true) {
    const fetchTo = fetchFrom + MAX_PER_REQUEST - 1

    const { data: chunk, error } = await supabase
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
          grupo,
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
      .range(fetchFrom, fetchTo)

    if (error) throw error
    if (!chunk || chunk.length === 0) break

    allData.push(...chunk.map(mapHistoricoToView))
    if (chunk.length < MAX_PER_REQUEST) break
    fetchFrom = fetchTo + 1
  }

  return allData
}

/** Invalida o cache de fetchAllQuestoes (chamado após importar PDF). */
export function clearQuestoesCache(): void {
  useQuestaoStore.getState().invalidateQuestoesCache()
}

// ─── Tipos para paginação server-side ─────────────────────────────────────────

export interface PaginatedResult {
  data: ResolucaoView[]
  total: number
  totalPages: number
  page: number
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

// ─── Historico cache ──────────────────────────────────────────────────────────

async function ensureHistoricoCached(): Promise<void> {
  if (useQuestaoStore.getState().historicoCache) return
  if (useQuestaoStore.getState().historicoCachePromise) {
    while (useQuestaoStore.getState().historicoCachePromise) {
      await new Promise(r => setTimeout(r, 50))
    }
    return
  }
  useQuestaoStore.getState().setHistoricoCachePromise(true)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) {
      useQuestaoStore.getState().setHistoricoCache([])
      return
    }
    const { data, error } = await supabase
      .from('historico_resolucoes')
      .select('id, questao_id, questao_tec_id, alternativa, acertou, tempo_segundos, data_resolucao')
      .eq('user_id', userId)
      .order('data_resolucao', { ascending: false })
    if (error) throw error
    useQuestaoStore.getState().setHistoricoCache((data || []) as HistoricoResolucao[])
  } catch (e) {
    useQuestaoStore.getState().setHistoricoCachePromise(false)
    throw e
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
  const pp = useQuestaoStore.getState().getProgressivePage(filterHash, cacheKey)
  if (pp !== null) {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    console.log(`[LOG fetchPaginatedQuestoes] Cache hit! page=${page}, totalCached=${pp.data.length}`)
    return {
      data: pp.data.slice(start, end),
      total: pp.totalCount,
      totalPages: pp.totalPages,
      page,
    }
  }

  // Filter change → reset progressive cache
  if (useQuestaoStore.getState().progressiveFilterHash !== filterHash) {
    console.log(`[LOG fetchPaginatedQuestoes] Filter change: resetting cache (${useQuestaoStore.getState().progressiveFilterHash} → ${filterHash})`)
    useQuestaoStore.getState().resetProgressiveCache(filterHash)
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
          id, questao_tec_id, materia, assunto, grupo, banca_texto, orgao,
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
        id, questao_tec_id, materia, assunto, grupo, banca_texto, orgao,
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
  const historicoCache = useQuestaoStore.getState().historicoCache
  const historicoMap = new Map<number, HistoricoResolucao>()
  for (const h of (historicoCache || [])) {
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
      grupo: q.grupo,
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
  useQuestaoStore.getState().setProgressivePage(filterHash, cacheKey, merged, count || 0, Math.ceil((count || 0) / pageSize))

  return {
    data: merged,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
    page,
  }
}

// ─── Filtros (cache, fetch-once) ──────────────────────────────────────────────

export async function fetchFilterOptions(): Promise<FilterOptions> {
  const cached = useQuestaoStore.getState().getFilterOptionsCache()
  if (cached) return cached
  if (useQuestaoStore.getState().filterOptionsPromise) {
    while (useQuestaoStore.getState().filterOptionsPromise) {
      await new Promise(r => setTimeout(r, 50))
    }
    return useQuestaoStore.getState().getFilterOptionsCache()!
  }

  useQuestaoStore.getState().setFilterOptionsPromise(true)
  try {
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
      materias: Array.from(new Set((materiasRes.data || []).map((r: { materia: string }) => r.materia).filter(Boolean))).sort() as string[],
      bancas: Array.from(new Set((bancasRes.data || []).map((r: { banca_texto: string }) => r.banca_texto).filter(Boolean))).sort() as string[],
      anos: Array.from(new Set((anosRes.data || []).map((r: { ano: number }) => r.ano).filter(Boolean))).sort((a, b) => (b as number) - (a as number)) as number[],
      orgaos: Array.from(new Set((orgaosRes.data || []).map((r: { orgao: string }) => r.orgao).filter(Boolean))).sort() as string[],
      concursos: Array.from(new Set((concursosRes.data || []).map((r: { concurso: string }) => r.concurso).filter(Boolean))).sort() as string[],
    }

    useQuestaoStore.getState().setFilterOptionsCache(options)
    return options
  } catch (e) {
    useQuestaoStore.getState().setFilterOptionsPromise(false)
    throw e
  }
}

/**
 * Busca todas as questões do banco com cache compartilhado.
 * Evita N chamadas concorrentes quando múltiplas páginas montam em paralelo.
 */
export async function fetchAllQuestoes(): Promise<ResolucaoView[]> {
  // Retorna cache se ainda válido
  if (useQuestaoStore.getState().isQuestoesCacheValid(60000)) {
    console.log('[LOG fetchAllQuestoes] Cache hit!')
    return useQuestaoStore.getState().questoesCache!
  }

  // Deduplica chamadas concorrentes (Promise cache)
  if (useQuestaoStore.getState().questoesCachePromise) {
    console.log('[LOG fetchAllQuestoes] Aguardando chamada concorrente...')
    while (useQuestaoStore.getState().questoesCachePromise) {
      await new Promise(r => setTimeout(r, 50))
    }
    return useQuestaoStore.getState().questoesCache!
  }

  console.log('[LOG fetchAllQuestoes] Iniciando busca de questões...')
  useQuestaoStore.getState().setQuestoesCachePromise(true)
  try {
    const t0 = performance.now()
    const MAX_PER_REQUEST = 1_000
    const questoesData: Questao[] = []
    let fetchFromQuestoes = 0

    while (true) {
      const fetchTo = fetchFromQuestoes + MAX_PER_REQUEST - 1
      const { data: chunk, error: qErr } = await supabase
        .from('questoes')
        .select(`
          id, questao_tec_id, materia, assunto, grupo, banca_texto, orgao,
          concurso, prova, ano, caderno_nome, enunciado, gabarito,
          alternativas, resolucao_professor, created_at
        `)
        .order('id', { ascending: false })
        .range(fetchFromQuestoes, fetchTo)

      if (qErr) throw qErr
      if (!chunk || chunk.length === 0) break
      questoesData.push(...chunk)
      if (chunk.length < MAX_PER_REQUEST) break
      fetchFromQuestoes = fetchTo + 1
    }

    const t1 = performance.now()
    console.log(`[LOG fetchAllQuestoes] Query questoes: ${(t1 - t0).toFixed(0)}ms | qtd=${questoesData.length}`)

    const { data: { session: histSession } } = await supabase.auth.getSession()
    const histUserId = histSession?.user?.id

    console.log('[LOG fetchAllQuestoes] Iniciando busca do histórico...')
    const historico: HistoricoResolucao[] = []
    let fetchFromHist = 0

    while (true) {
      const fetchTo = fetchFromHist + MAX_PER_REQUEST - 1
      let histQuery = supabase
        .from('historico_resolucoes')
        .select(`
          id, questao_id, questao_tec_id, alternativa, acertou,
          tempo_segundos, data_resolucao
        `)
        .order('data_resolucao', { ascending: false })
        .range(fetchFromHist, fetchTo)

      if (histUserId) histQuery = histQuery.eq('user_id', histUserId)

      const { data: histChunk, error: hErr } = await histQuery
      if (hErr) throw hErr
      if (!histChunk || histChunk.length === 0) break
      historico.push(...histChunk as HistoricoResolucao[])
      if (histChunk.length < MAX_PER_REQUEST) break
      fetchFromHist = fetchTo + 1
    }

    const t2 = performance.now()
    console.log(`[LOG fetchAllQuestoes] Query historico: ${(t2 - t1).toFixed(0)}ms | qtd=${historico.length}`)

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
        grupo: q.grupo,
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

    useQuestaoStore.getState().setQuestoesCache(result)
    return result
  } catch (e) {
    useQuestaoStore.getState().setQuestoesCachePromise(false)
    throw e
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
        grupo,
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

// ─── Metas de Concurso ───────────────────────────────────────

export async function fetchMetasConcurso(): Promise<MetaConcurso[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('metas_concurso')
    .select('*')
    .eq('user_id', userId)
    .order('semana_numero', { ascending: false })

  if (error) throw error
  return (data || []) as MetaConcurso[]
}

export async function fetchMetaConcursoPorId(id: number): Promise<MetaConcurso | null> {
  const { data, error } = await supabase
    .from('metas_concurso')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as MetaConcurso | null
}

export async function insertMetaConcurso(meta: Omit<MetaConcurso, 'id' | 'user_id' | 'created_at'>): Promise<MetaConcurso> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('metas_concurso')
    .insert({ ...meta, user_id: userId })
    .select()
    .single()

  if (error) throw error
  return data as MetaConcurso
}

export async function updateMetaConcurso(id: number, payload: Partial<MetaConcurso>): Promise<void> {
  const { error } = await supabase
    .from('metas_concurso')
    .update(payload)
    .eq('id', id)

  if (error) throw error
}

export async function deleteMetaConcurso(id: number): Promise<void> {
  const { error } = await supabase
    .from('metas_concurso')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Tarefas da Meta ─────────────────────────────────────────

export async function fetchTarefasDaMeta(metaId: number): Promise<TarefaMeta[]> {
  const { data, error } = await supabase
    .from('tarefas_meta')
    .select('*')
    .eq('meta_id', metaId)
    .order('ordem', { ascending: true })

  if (error) throw error
  return (data || []) as TarefaMeta[]
}

export async function fetchTarefaById(id: number): Promise<TarefaMeta | null> {
  const { data, error } = await supabase
    .from('tarefas_meta')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as TarefaMeta | null
}

export async function insertTarefaMeta(tarefa: Omit<TarefaMeta, 'id' | 'created_at'>): Promise<TarefaMeta> {
  const { data, error } = await supabase
    .from('tarefas_meta')
    .insert(tarefa)
    .select()
    .single()

  if (error) throw error
  return data as TarefaMeta
}

export async function insertTarefasMetaBatch(tarefas: Omit<TarefaMeta, 'id' | 'created_at'>[]): Promise<TarefaMeta[]> {
  const { data, error } = await supabase
    .from('tarefas_meta')
    .insert(tarefas)
    .select()

  if (error) throw error
  return (data || []) as TarefaMeta[]
}

export async function updateTarefaMeta(id: number, payload: Partial<TarefaMeta>): Promise<void> {
  const { error } = await supabase
    .from('tarefas_meta')
    .update(payload)
    .eq('id', id)

  if (error) throw error
}

export async function deleteTarefaMeta(id: number): Promise<void> {
  const { error } = await supabase
    .from('tarefas_meta')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function fetchTarefasComMetas(): Promise<(TarefaMeta & { meta_titulo: string; meta_semana: number; meta_data_inicio: string | null; meta_data_fim: string | null })[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return []

  const { data, error } = await supabase
    .from('tarefas_meta')
    .select(`
      *,
      metas_concurso!inner(
        titulo,
        semana_numero,
        data_inicio,
        data_fim
      )
    `)
    .eq('metas_concurso.user_id', userId)

  if (error) throw error

  return ((data || []) as Array<Record<string, unknown>>).map((t: Record<string, unknown>) => {
    const meta = t.metas_concurso as Record<string, unknown> || {}
    return {
      ...t,
      meta_titulo: meta.titulo as string || '',
      meta_semana: meta.semana_numero as number || 0,
      meta_data_inicio: meta.data_inicio as string | null || null,
      meta_data_fim: meta.data_fim as string | null || null,
    } as TarefaMeta & { meta_titulo: string; meta_semana: number; meta_data_inicio: string | null; meta_data_fim: string | null }
  })
}

export async function updateTarefaMetaStatus(id: number, status: TarefaMeta['status']): Promise<void> {
  const { error } = await supabase
    .from('tarefas_meta')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}
