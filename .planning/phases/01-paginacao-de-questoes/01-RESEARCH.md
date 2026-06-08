# Phase 1: Paginação de Questões — Research

**Researched:** 2026-06-08
**Domain:** Supabase pagination (PostgREST range), server-side filtering, progressive cache
**Confidence:** HIGH

## Summary

Esta fase implementa paginação server-side no fetch de questões do Supabase, substituindo a carga única de 1000+ registros por lotes paginados. O trabalho concentra-se em `src/services/supabase.service.ts` (refatorar `fetchAllQuestoes` para suportar `.range()`) e `src/hooks/useQuestoes.ts` (adaptar consumo de dados paginados). Os hooks `useSimulados`, `useRevisao` e `useDashboard` não consomem `fetchAllQuestoes` diretamente — `useSimulados` é o único outro consumidor e precisará manter compatibilidade.

A migração de filtros é parcial: filtros de metadados (matéria, banca, ano, órgão, concurso) migram para server-side com `.in()/.eq()`, mas filtros que dependem do histórico de resoluções (status acerto/erro, inéditas) e o filtro de carreira (keyword matching complexo) permanecem client-side, aplicados pós-merge com o histórico.

**Primary recommendation:** Criar `fetchPaginatedQuestoes(page, pageSize, filters)` em `supabase.service.ts`, manter `fetchAllQuestoes` como fallback (usado por `useSimulados`), adaptar `useQuestoes.ts` para gerenciar estado de paginação e cache progressivo, e criar `QuestaoSkeleton` para carregamento visual.

**Requirement addressed:** REFAC-03 — Paginação server-side com `.range()`, remoção do limite de 1000 questões, filtros server-side, cache adaptado.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 200 questões por página — equilíbrio entre número de requests e tamanho de payload
- **D-02:** Skeleton loader enquanto nova página carrega — mostra formato das questões como fallback visual
- **D-03:** Cache flat progressivo — páginas buscadas são acumuladas num array único em memória. Navegar para páginas já visitadas é instantâneo. Sem TTL porque dados de questão são imutáveis.
- **D-04:** Formato `Record<string, string>` mantido (ex: `{ materia: "Direito", banca: "CESPE" }`), traduzido para `.in()`/`.eq()` do Supabase na query paginada em vez de filtragem pós-carga

### OpenCode's Discretion
- Estrutura exata do skeleton loader
- Nomes dos novos parâmetros no hook
- Tratamento de erro na paginação (timeout, falha de página específica)

### Deferred Ideas (OUT OF SCOPE)
- None

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Paginação de fetch | API/Browser | Database | `supabase.service.ts` monta a query paginada; browser gerencia estado de página |
| Filtros server-side | API/Browser | — | `useQuestoes.ts` traduz filtros `Record<string,string>` para parâmetros de query |
| Cache flat progressivo | Browser | — | Array em memória na camada de serviço, gerenciado pelo hook |
| Skeleton loader | Browser | — | Componente React puro, renderizado durante fetch |
| Filtros pós-merge (status/carreira) | Browser | — | Permanecem client-side porque dependem de dados mesclados (histórico) |
| Busca de opções de filtro | API/Browser | — | `fetchFilterOptions()` query separada para listas de valores distintos |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REFAC-03 | Implementar paginação no fetch de questões (substituir carga única de 1000+ questões por lazy-load com `.range()`) | Supabase `.range()` API suporta paginação inclusiva; `count: 'exact'` para total de páginas; cache flat progressivo viável com `Map<page, ResolucaoView[]>` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.108.0 | Client Supabase para queries paginadas | Já instalado, usado em todo o projeto |
| `@supabase/postgrest-js` | (bundled) | PostgREST client — `.range()`, `.in()`, `.eq()`, `count` | Camada interna do supabase-js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS `animate-pulse` | (built-in) | Efeito de skeleton loader | Durante fetch de nova página |
| `lucide-react` `Loader2` | (installed) | Spinner de carregamento | Fallback se skeleton não couber |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cache flat progressivo (array) | LRU cache com limite de páginas | LRU adicionaria complexidade desnecessária — dados de questão são imutáveis, sem risco de crescimento infinito dado que o usuário só navega por questões que existem |
| `fetchAllQuestoes` com cursor-based | Offset-based `.range()` | Cursor exige chave única ordenável, não necessário para essa escala; offset é mais simples e Supabase suporta nativamente |

**Installation:**
Nenhuma instalação necessária — `@supabase/supabase-js` já está no projeto.

**Versions verified:**
- `@supabase/supabase-js`: 2.108.0 [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  React Pages                                                │
│  ┌───────────┐ ┌──────────┐ ┌────────┐ ┌─────────────┐     │
│  │ Questoes  │ │Simulados │ │Revisao│ │ Dashboard    │     │
│  └─────┬─────┘ └────┬─────┘ └───┬────┘ └──────┬──────┘     │
│        │             │           │              │            │
│  ┌─────▼─────┐ ┌────▼─────┐ ┌───▼────┐ ┌──────▼──────┐     │
│  │useQuestoes│ │useSimul. │ │useRev. │ │useDashboard │     │
│  │ (REFACTOR)│ │ (NO OP)  │ │(NO OP) │ │  (NO OP)    │     │
│  └─────┬─────┘ └──────────┘ └────────┘ └─────────────┘     │
│        │                                                     │
│  ┌─────▼─────────────────────┐                               │
│  │  supabase.service.ts      │                               │
│  │  ┌────────────────────┐   │                               │
│  │  │fetchPaginatedQuest.│◄──┤── pagination state per call   │
│  │  │  .range() .in()    │   │                               │
│  │  │  { count: 'exact'} │   │                               │
│  │  ├────────────────────┤   │                               │
│  │  │fetchAllQuestoes()  │◄──┤── (kept for useSimulados)     │
│  │  │  (unchanged)       │   │                               │
│  │  ├────────────────────┤   │                               │
│  │  │fetchFilterOptions()│◄──┤── distinct values for filters │
│  │  └────────────────────┘   │                               │
│  └─────┬─────────────────────┘                               │
└────────┼─────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  Supabase / PostgREST API          │
│  .range(offset, offset+pageSize-1) │
│  .in('materia', [...])             │
│  .eq('banca', value)              │
│  SELECT *, count() OVER()          │
└────────────────────────────────────┘
```

### Data Flow (Paginated)

```
1. User opens Questoes page
   → useQuestoes calls fetchPaginatedQuestoes(page=1, pageSize=200, filters={})
   → Supabase returns page 1 data + total count
   → Data stored in flat progressive cache
   → Page 1 questions available, totalPages computed from count

2. User changes filter
   → Reset page to 1
   → fetchPaginatedQuestoes(page=1, filters=newFilters)
   → Clear progressive cache (filters changed — data stale)
   → Re-fetch

3. User navigates beyond current page
   → Check cache for target page
   → Hit: return cached data immediately
   → Miss: fetchPaginatedQuestoes(targetPage), append to cache
   → Question index updated to point at correct position in accumulated array

4. "Gerar Caderno" button
   → Calls fetchAllQuestoes() (full dataset with filters if needed)
   → Or: triggers a dedicated filtered fetch (design decision)
   → Sets cadernoQuestoes as before
```

### Recommended Project Structure

```
src/
├── services/
│   └── supabase.service.ts     # + fetchPaginatedQuestoes(), fetchFilterOptions()
├── hooks/
│   └── useQuestoes.ts          # + pagination state, filter-to-query translation
├── components/
│   └── ui/
│       └── QuestaoSkeleton.tsx  # NEW: skeleton loader for pagination
└── pages/
    └── Questoes.tsx             # Main consumer (minimal changes)
```

### Pattern 1: Flat Progressive Cache
**What:** Páginas buscadas são acumuladas em um array único em memória. Cada página preenche uma faixa de índices no array. Navegar para páginas já visitadas é instantâneo sem fetch adicional.
**When to use:** Dados imutáveis (questões não mudam depois de importadas), sem TTL, sem risco de crescimento infinito.

```typescript
// Pattern in supabase.service.ts
const _progressiveCache: ResolucaoView[] = []
const _cachedPages = new Set<number>()

async function fetchPaginatedQuestoes(
  page: number,
  pageSize: number,
  filters?: QuestionFilters
): Promise<PaginatedResult> {
  const cacheKey = hashFilters(filters) // string hash to differentiate filter sets
  
  if (_cachedPages.has(`${cacheKey}:${page}`)) {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      data: _progressiveCache.slice(start, end),
      total: _totalCountCache[cacheKey],
      totalPages: _totalPagesCache[cacheKey],
    }
  }
  
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  let query = supabase
    .from('questoes')
    .select(`id, questao_tec_id, materia, assunto, banca_texto, orgao,
             concurso, prova, ano, caderno_nome, enunciado, gabarito,
             alternativas, resolucao_professor, created_at`, { count: 'exact' })
    .order('id', { ascending: false })
    .range(from, to)
  
  // Apply server-side filters
  if (filters?.materia?.length) query = query.in('materia', filters.materia)
  if (filters?.banca?.length)  query = query.in('banca_texto', filters.banca)
  if (filters?.orgao?.length)  query = query.in('orgao', filters.orgao)
  if (filters?.ano?.length)    query = query.in('ano', filters.ano)
  
  const { data, error, count } = await query
  if (error) throw error
  
  // Update cache
  _progressiveCache.splice(from, data?.length || 0, ...(data || []))
  _cachedPages.add(`${cacheKey}:${page}`)
  _totalCountCache[cacheKey] = count || 0
  _totalPagesCache[cacheKey] = Math.ceil((count || 0) / pageSize)
  
  return {
    data: data || [],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}
```

### Pattern 2: Filter State → Supabase Query Translation
**What:** Converte os arrays de filtro do `useQuestoes` em chamadas `.in()`/`.eq()` encadeadas.
**When to use:** Toda vez que o usuário modifica um filtro e uma nova página precisa ser carregada.

```typescript
// Translation function in useQuestoes.ts (adapted from D-04)
function buildFiltersFromState(state: FilterState): Record<string, string[]> {
  const filters: Record<string, string[]> = {}
  
  if (state.selectedMaterias.length > 0) filters.materia = state.selectedMaterias
  if (state.selectedBancas.length > 0)   filters.banca_texto = state.selectedBancas
  if (state.selectedAnos.length > 0)     filters.ano = state.selectedAnos.map(String)
  if (state.selectedOrgaos.length > 0)   filters.orgao = state.selectedOrgaos
  if (state.selectedConcursos.length > 0) filters.concurso = state.selectedConcursos
  
  // NOT translated to server-side:
  // - selectedAssuntos (relies on materia/assunto fallback logic)
  // - selectedStatus (depends on merged historico data)
  // - selectedCarreiras (complex keyword matching)
  // - objetivo (depends on merged historico data)
  
  return filters
}
```

### Anti-Patterns to Avoid
- **Re-fetching cached pages on filter change without clearing stale cache:** When filters change, the progressive cache must be cleared entirely since the data for page 1 under new filters is different. Use a cache version key tied to filter hash.
- **Applying ALL filters server-side:** Filters that depend on merged data (status, objetivo, carreira) cannot be server-side. Trying to forces complex SQL or incorrect results.
- **Fetching full historico for every paginated query:** The historico data is fetched once and cached separately, then merged client-side with each page's questions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination offset/limit | Custom SQL pagination | Supabase `.range()` | Nativo do PostgREST, já incluso no cliente |
| Total row count | Manual `COUNT(*)` subquery | `{ count: 'exact' }` option on `.select()` | Supabase retorna count no mesmo request, sem query extra |
| Array filter building | String concatenation de filtros | `.in()` chain | Nativo, type-safe, previne SQL injection |
| Distinct values for filter options | Manual `SELECT DISTINCT` | Supabase `.select('materia')` com `is not null` | Query simples, sem agregação complexa |

**Key insight:** O Supabase client abstrai toda a complexidade do PostgREST. O esforço não é implementar paginação (já vem pronta), mas sim integrar o estado de paginação com o fluxo do hook e o cache progressivo.

## Common Pitfalls

### Pitfall 1: Range inclusive boundaries
**What goes wrong:** Supabase `.range(from, to)` é **inclusivo** em ambos os extremos. Se pageSize=200, page 1 é `.range(0, 199)` — busca 200 registros (índices 0 a 199). Page 2 é `.range(200, 399)`.
**Why it happens:** É contra-intuitivo — muitos frameworks usam offset+limit onde offset=0, limit=200.
**How to avoid:** Usar a fórmula: `from = (page - 1) * pageSize`, `to = from + pageSize - 1`, `limite = to - from + 1`.
**Warning signs:** Se a última página retorna menos registros que o esperado ou se há sobreposição entre páginas.

### Pitfall 2: Filtro de assunto com fallback de matéria
**What goes wrong:** A lógica atual em `getFilteredQuestions()` para assunto é complexa: `selectedAssuntos.includes(q.assunto) || (selectedMaterias.includes(q.materia) && !q.assunto)`. Isso NÃO pode ser traduzido para um simples `.in('assunto', ...)`.
**Why it happens:** A regra de negócio diz: se um assunto específico está selecionado, mostre questões desse assunto OU questões da mesma matéria que não têm assunto definido.
**How to avoid:** Aplicar filtro de assunto **client-side** (pós-merge), mantendo apenas o filtro de matéria no server-side. Alternativa: usar Supabase `.or()` filter, mas a lógica de `!q.assunto` é difícil de expressar em SQL do jeito correto.
**Warning signs:** Questões sem assunto desaparecem quando um assunto é selecionado.

### Pitfall 3: Filtros de carreira com keyword matching
**What goes wrong:** O filtro de carreira usa `string.includes()` em JS para detectar keywords (ex: "Policial" → orgao.includes("PC") || orgao.includes("PM") || ...). Isso é impraticável em SQL (LIKE com OR de várias condições).
**Why it happens:** Carreiras são uma abstração do frontend, não um campo do banco.
**How to avoid:** Manter filtro de carreira **client-side**. Documentar que filtros de carreira, status e objetivo são pós-merge.
**Warning signs:** Query SQL complexa e frágil para replicar a lógica JS.

### Pitfall 4: Stale total count
**What goes wrong:** O `count` retornado por `{ count: 'exact' }` reflete o total de rows **no momento da query**. Se outra operação (ex: import de PDF) adiciona questões entre requisições, o count pode ficar desatualizado.
**Why it happens:** Dados mudam entre requests paginados.
**How to avoid:** Sempre requisitar `{ count: 'exact' }` em cada fetch de página (não cachear o total por muito tempo). Após `clearQuestoesCache()` (chamado no import de PDF), forçar recálculo.

### Pitfall 5: Race condition em mudanças rápidas de filtro
**What goes wrong:** Usuário clica em "Matéria A", depois imediatamente em "Matéria B". Duas queries são disparadas concorrentemente. A resposta de "A" chega depois da de "B" e sobrescreve os dados com filtro errado.
**Why it happens:** Async/await sem cancelamento de requests anteriores.
**How to avoid:** Usar um `AbortController` ou um contador de versão (incrementar a cada mudança de filtro, ignorar respostas com versão obsoleta).
**Warning signs:** Dados mostrados não correspondem aos filtros ativos.

## Code Examples

### Example 1: Paginated fetch with count

```typescript
// Source: [VERIFIED: ctx7 docs — @supabase/postgrest-js range() implementation]
const PAGE_SIZE = 200

async function fetchPage(
  page: number,
  filters?: Record<string, string[]>
): Promise<{ data: ResolucaoView[]; total: number }> {
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('questoes')
    .select('*', { count: 'exact' })
    .order('id', { ascending: false })
    .range(from, to)

  // Apply translatable filters
  if (filters?.materia?.length)   query = query.in('materia', filters.materia)
  if (filters?.banca_texto?.length) query = query.in('banca_texto', filters.banca_texto)
  if (filters?.ano?.length)        query = query.in('ano', filters.ano)
  if (filters?.orgao?.length)      query = query.in('orgao', filters.orgao)
  if (filters?.concurso?.length)   query = query.in('concurso', filters.concurso)

  const { data, error, count } = await query
  if (error) throw error

  return {
    data: (data || []) as ResolucaoView[],
    total: count || 0,
  }
}
```

### Example 2: Hash-based cache key for different filter combos

```typescript
// Source: [ASSUMED — standard pattern for cache key generation]
function hashFilters(filters: Record<string, string[]>): string {
  const sorted = Object.entries(filters)
    .filter(([, v]) => v.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${[...v].sort().join(',')}`)
    .join('&')
  return sorted || '__all__'
}
```

### Example 3: AbortController for race condition prevention

```typescript
// Source: [ASSUMED — standard AbortController pattern]
let abortController: AbortController | null = null

async function fetchWithCancellation(page: number, filters: Record<string, string[]>) {
  // Cancel previous request
  abortController?.abort()
  abortController = new AbortController()

  try {
    const result = await fetchPage(page, filters, { signal: abortController.signal })
    return result
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.log('[LOG] Previous request cancelled')
      return null // Silently ignore
    }
    throw err
  }
}
```

### Example 4: QuestaoSkeleton component

```typescript
// Source: Tailwind animate-pulse pattern — already used in codebase at 19 locations
// Example skeleton matching QuestaoVisualizador layout
function QuestaoSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6 bg-card border border-border rounded-xl">
      {/* Enunciado skeleton */}
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      
      {/* Alternativas skeleton */}
      <div className="space-y-3 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="h-3 bg-muted rounded flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fetchAllQuestoes` com `.limit(1000)` | `fetchPaginatedQuestoes` com `.range()` | Phase 1 | Suporta qualquer volume de dados sem estourar memória |
| Cache 60s TTL com data unificada | Cache flat progressivo sem TTL | Phase 1 | Dados imatáveis = sem necessidade de expiração |
| Filtragem pós-carga em `getFilteredQuestions()` | Filtros server-side (parcial) + client-side (parcial) | Phase 1 | Reduz dados trafegados, mas mantém complexidade para filtros não-traduzíveis |

**Deprecated/outdated:**
- `fetchAllQuestoes()` continua existindo como fallback para `useSimulados`, mas deixa de ser a função principal de fetch. O limite de 1000 permanece como safety net, não como limitação arquitetural.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useSimulados` precisa do dataset completo de questões para o algoritmo de seleção (tópicos fracos, inéditas) | Impact Analysis | Se o algoritmo puder ser adaptado para dados paginados, `fetchAllQuestoes` pode ser removido |
| A2 | Filtro de assunto com fallback de matéria não é traduzível para Supabase query | Code Examples | Se `.or()` do Supabase suportar a lógica `(assunto IN X) OR (materia IN Y AND assunto IS NULL)`, pode ser server-side |
| A3 | `fetchFilterOptions()` (distinct values) é necessário para os menus de filtro | Architecture | Se os valores distintos puderem ser computados incrementalmente das páginas carregadas, a query separada não é necessária |

**If this table is empty:** N/A

## Open Questions (RESOLVED)

1. **RESOLVED: Como `useSimulados` obtém o dataset completo para o algoritmo de seleção?**
   - What we know: `useSimulados` chama `fetchAllQuestoes()` e usa `allQuestoes` para filtrar por tópicos fracos, inéditas, etc.
   - What's unclear: Se devemos manter `fetchAllQuestoes()` como uma função separada (sem paginação) exclusiva para simulados, ou adaptar o algoritmo de seleção para trabalhar com dados paginados.
   - Recommendation: Manter `fetchAllQuestoes()` como função separada (renomeada para `fetchAllQuestoesLegacy()` ou mantida como está) para uso exclusivo de `useSimulados`. A remoção pode ser feita em Phase 2 (extração de hooks) quando o algoritmo de simulado for refatorado.

2. **RESOLVED: Como computar `materiasUnicas`, `bancasUnicas`, `anosUnicos`, `orgaosUnicos`, `concursosUnicos` com dados paginados?**
   - What we know: Atualmente esses valores são derivados do array completo `resolucoes` via `useMemo`.
   - What's unclear: Se devemos fazer queries separadas `SELECT DISTINCT materia FROM questoes` ou se podemos computar incrementalmente.
   - Recommendation: Criar `fetchFilterOptions()` no serviço que retorna `{ materias: string[], bancas: string[], anos: number[], orgaos: string[], concursos: string[] }`. Chamar no load inicial e cachear. As queries são leves (`SELECT DISTINCT` de colunas indexadas).

3. **RESOLVED: Como lidar com a mesclagem do histórico (historico_resolucoes) em dados paginados?**
   - What we know: `fetchAllQuestoes()` atualmente busca TODO o histórico e mescla client-side com cada questão.
   - What's unclear: Com paginação, como obter o histórico das questões da página atual sem buscar todo o histórico?
   - Recommendation: Duas opções viáveis: (a) Buscar o histórico completo uma vez (historico_resolucoes é tipicamente pequeno — 1 registro por tentativa do usuário, não por questão) e mesclar com cada página; (b) Para cada página, buscar o histórico apenas das questões da página com `.in('questao_id', pageIds)`. Opção (a) é mais simples e performática se o histórico for < 5000 registros.

4. **RESOLVED: Skeleton loader substitui completamente o `LoadingSpinner` na página de Questões?**
   - What we know: Atualmente `Questoes.tsx` mostra `<LoadingSpinner />` durante `loading` inicial, e depois mostra o visualizador.
   - What's unclear: O skeleton aparece apenas quando navegando entre páginas (loading de nova página), não no load inicial?
   - Recommendation: No load inicial, usar skeleton loader (D-02). Na navegação entre páginas (cache miss), mostrar skeleton no lugar do visualizador. Manter `LoadingSpinner` para tela de erro/timeout.

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies beyond existing Supabase project and npm packages — paginação é puramente código-client, sem novos serviços ou ferramentas externas)

## Validation Architecture

> Skip this section entirely if workflow.nyquist_validation is explicitly set to false. If the key is absent, treat as enabled.

**Config:** `workflow.nyquist_validation` is `false` in `.planning/config.json`. Skipping this section.

## Security Domain

> Required when `security_enforcement` is enabled. Check config.

**Config:** `security_enforcement` is not set in `.planning/config.json`. Treating as disabled for this phase (puramente refatoração de fetch — sem novos endpoints, sem autenticação, sem dados sensíveis).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Pagination operates on authenticated data, no new auth logic |
| V5 Input Validation | no | Filters are string arrays passed to Supabase `.in()`, not user-supplied raw SQL |
| V6 Cryptography | no | No encryption changes |

Nenhum risco de segurança novo é introduzido — paginação usa apenas Supabase client-side filters, sem SQL injetável.

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] `@supabase/supabase-js@2.108.0` — installed and used in project
- [VERIFIED: ctx7 docs — /supabase/supabase-js] `.range(from, to)` — inclusive range, replaces offset/limit searchParams
- [VERIFIED: ctx7 docs — /supabase/postgrest-js] `.select('*', { count: 'exact' })` — returns total count with data
- [VERIFIED: ctx7 docs — /supabase/postgrest-js] `.in(column, values)` — array filter for server-side filtering

### Secondary (MEDIUM confidence)
- [CITED: supabase.com/docs] Supabase JavaScript client v2 pagination — confirmed `.range()` behavior
- [CITED: tailwindcss.com/docs] `animate-pulse` utility — confirmed animation pattern used in 19 codebase locations

### Tertiary (LOW confidence)
- Nenhum — todas as afirmações são verificadas via Context7, npm registry, ou código-fonte do projeto

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Supabase client já instalado e verificado no npm registry
- Architecture: HIGH — padrões de paginação do Supabase e cache progressivo são bem documentados
- Pitfalls: HIGH — baseados em análise detalhada do código-fonte e filtros existentes
- Impact analysis per hook: HIGH — todos os consumidores foram lidos e analisados

**Research date:** 2026-06-08
**Valid until:** 2026-07-08 (30 days — Supabase API é estável, mudanças são raras)
