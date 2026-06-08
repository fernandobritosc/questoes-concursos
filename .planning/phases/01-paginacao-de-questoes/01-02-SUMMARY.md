---
phase: 01-paginacao-de-questoes
plan: 02
subsystem: hooks
tags: [pagination, filter-to-query, abort-controller, react-hooks, supabase]

requires:
  - phase: 01-paginacao-de-questoes
    plan: 01
    provides: fetchPaginatedQuestoes, fetchFilterOptions, PaginatedResult, FilterOptions, progressive cache

provides:
  - Pagination state in useQuestoes (page, totalPages, totalCount)
  - Server-side filter translation (buildServerFilters)
  - Race condition prevention via AbortController
  - Separated pageLoading from loading state

affects:
  - 01-paginacao-de-questoes plan 03 (Questoes.tsx page integration)

tech-stack:
  added: []
  patterns:
    - "useCallback with AbortController for cancelable data fetches"
    - "Server-side filter translation via buildServerFilters() function"
    - "Progressive cache integration with flat array + .splice() overwrite"

key-files:
  created: []
  modified:
    - src/hooks/useQuestoes.ts

key-decisions:
  - "buildServerFilters() only translates materia, banca_texto, ano, orgao, concurso — assunto, carreira, status, objetivo remain client-side"
  - "Promise.race with timeout for initial load (parallel fetchPaginatedQuestoes + fetchFilterOptions)"
  - "filter-change effect uses `if (loading) return` guard to prevent double-fetch on mount"
  - "PAGE_SIZE = 200 (per D-01)"

requirements-completed:
  - REFAC-03

duration: 7min
completed: 2026-06-08
---

# Phase 01 Plan 02: Hook Pagination — Summary

**Substituição de `fetchAllQuestoes()` por `fetchPaginatedQuestoes()` no hook `useQuestoes`, com estado de paginação, tradução de filtros server-side, AbortController para race condition, e separação de `pageLoading` de `loading`**

## Performance

- **Duration:** 7 min
- **Started:** 2026-06-08T20:00:00Z
- **Completed:** 2026-06-08T20:05:28Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `fetchAllQuestoes` import removido de `useQuestoes.ts` — substituído por `fetchPaginatedQuestoes` + `fetchFilterOptions`
- Novo estado de paginação: `page`, `totalPages`, `totalCount`, `pageLoading`, `pageLoadingError`, `filterOptions`
- `buildServerFilters()` traduz filtros de metadados (matéria, banca, ano, órgão, concurso) para server-side com `.in()`
- `AbortController` via `useRef` previne race conditions em mudanças rápidas de filtro
- `loadPage(targetPage, replace)` com suporte a append para cache progressivo
- `handleNavigatePage` action exposta para navegação manual entre páginas
- Efeito de mudança de filtro reseta para página 1 e recarrega do servidor
- `materiasUnicas`, `bancasUnicas`, `anosUnicos`, `orgaosUnicos`, `concursosUnicos` usam `filterOptions` com fallback para dados locais
- Efeito deprecado de `visibleQuestionsCount` removido
- Todos os exports existentes preservados — `page`, `totalPages`, `totalCount`, `pageLoading`, `pageLoadingError`, `handleNavigatePage`, `PAGE_SIZE` adicionados ao return object

## Task Commits

1. **Task 1: Pagination state + filter-to-query + AbortController** - `7a5831e` (feat)
2. **Task 2: Final review pass** — included in task 1 commit (no additional changes needed)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/hooks/useQuestoes.ts` — Refatorado com paginação: +178 / −32 linhas

## Decisions Made

- `buildServerFilters()` inclui apenas `materia`, `banca_texto`, `ano`, `orgao`, `concurso` — os filtros `selectedAssuntos`, `selectedCarreiras`, `selectedStatus`, `objetivo` permanecem client-side (dependem de lógica de fallback ou merge de histórico)
- `PAGE_SIZE = 200` por decisão D-01 do research
- `loadPage` usa `replace=true` para novos filtros e `replace=false` para append de páginas (cache progressivo)
- Efeito de mudança de filtro usa `if (loading) return` como guard para evitar dupla execução no mount inicial
- ESLint `exhaustive-deps` suprimido nos efeitos onde as dependências dinâmicas (buildServerFilters, loading) são propositalmente excluídas

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Destructuring incorreta do Promise.race com Promise.all**

- **Found during:** task 1 (Initial load effect)
- **Issue:** O código do plano tentava fazer `const [result, opts] = paginatedResult`, mas `paginatedResult` já é o objeto `PaginatedResult` (não um array). TypeScript emitia erro TS2488.
- **Fix:** Substituído por `const result = paginatedResult; const opts = filterOpts`
- **Files modified:** `src/hooks/useQuestoes.ts`
- **Verification:** `npx tsc -b --noEmit` passa com zero erros
- **Committed in:** `7a5831e`

**2. [Rule 2 — Cleanup] Stale eslint-disable comments**

- **Found during:** review (task 2)
- **Issue:** Dois `// eslint-disable-next-line react-hooks/set-state-in-effect` estavam em comentários não-utilizados porque os `setState` estão dentro de uma `async function` interna (não diretamente no corpo do effect)
- **Fix:** Removidos os comentários eslint-disable não utilizados
- **Files modified:** `src/hooks/useQuestoes.ts`
- **Verification:** `npx eslint .` passa com zero warnings
- **Committed in:** `7a5831e`

---

**Total deviations:** 2 auto-fixed (1 bug, 1 cleanup)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- `Promise.race` com `Promise.all` duplo causou confusão de tipo — corrigido com destructuring direto
- ESLint `react-hooks/exhaustive-deps` emitiu warning para `buildServerFilters` (função plain) — suprimido com eslint-disable, pois a função recria a cada render e os valores de filtro já estão nas deps

## Verification Results

- ✅ `npx tsc -b --noEmit` — zero errors
- ✅ `npx eslint . --max-warnings=200` — zero errors
- ✅ `npm test` — 38/38 passing
- ✅ `fetchPaginatedQuestoes` imported in useQuestoes.ts
- ✅ `fetchAllQuestoes` removed from useQuestoes.ts (still exported from supabase.service.ts for other consumers)
- ✅ `AbortController` pattern present
- ✅ `buildServerFilters` function present
- ✅ `PAGE_SIZE = 200` constant present
- ✅ `pageLoading` state present

## Next Phase Readiness

- Hook `useQuestoes` now exposes pagination state ready for Plan 03 (Questoes.tsx integration with skeleton during page transitions)
- `handleNavigatePage` action ready for pagination UI controls
- `filterOptions` available for dropdowns in Questoes.tsx filter panel

---

*Phase: 01-paginacao-de-questoes*
*Completed: 2026-06-08*
