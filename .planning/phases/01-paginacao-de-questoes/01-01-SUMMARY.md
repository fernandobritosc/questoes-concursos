---
phase: 01-paginacao-de-questoes
plan: 01
subsystem: api
tags: [supabase, postgrest, pagination, skeleton, react]
requires: []
provides:
  - fetchPaginatedQuestoes with .range()/.in() server-side pagination
  - fetchFilterOptions returning distinct filter column values
  - Progressive flat cache keyed by filter hash
  - QuestaoSkeleton placeholder component for loading states
affects: [02-consumo-paginacao]

tech-stack:
  added: []
  patterns:
    - Progressive flat cache with filter-hash key, no TTL
    - Promise deduplication for concurrent calls (_historicoCachePromise, _filterOptionsPromise)
    - Client-side historico merge (fetch once, merge per page)

key-files:
  created:
    - src/components/ui/QuestaoSkeleton.tsx
  modified:
    - src/services/supabase.service.ts
    - src/components/ui/index.ts

key-decisions:
  - "Progressive cache uses flat array with splice insertion, keyed by filter hash + page number"
  - "Historico fetched once and cached separately, merged client-side page-by-page"
  - "fetchAllQuestoes() left completely untouched — legacy consumers unchanged"
  - "FilterOptions cached with Promise deduplication pattern (same as fetchAllQuestoes)"

patterns-established:
  - "Range queries use inclusive bounds with `from = (page-1)*pageSize` and `to = from + pageSize - 1`"
  - "Filter application uses Record<string, string[]> with .in() type guard chain"
  - "AbortSignal forwarded to Supabase client when provided"

requirements-completed:
  - REFAC-03

duration: 3min
completed: 2026-06-08
---

# Phase 01: Paginação — Plan 01 Summary

**Server-side pagination service with progressive flat cache and skeleton placeholder component**

## Performance

- **Duration:** 3 min
- **Started:** 2026-06-08T19:55:58Z
- **Completed:** 2026-06-08T19:58:27Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `fetchPaginatedQuestoes()` with `.range()` pagination, `.in()` server-side filters, `{ count: 'exact' }` for total
- Progressive flat cache accumulated page-by-page, invalidated on filter change, keyed by `hashFilters()`
- `fetchFilterOptions()` with Promise-deduplicated cache returning distinct materias, bancas, anos, orgaos, concursos
- `ensureHistoricoCached()` for shared historico resolution across paginated pages
- `clearQuestoesCache()` extended to reset all progressive cache state
- `QuestaoSkeleton.tsx` with 6 skeleton block types matching `QuestaoVisualizador` card layout
- Barrel export of `QuestaoSkeleton` from `src/components/ui/index.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PaginatedResult type, fetchPaginatedQuestoes, progressive cache, and fetchFilterOptions** — `c6a8335` (feat)
2. **Task 2: Create QuestaoSkeleton.tsx and export from index.ts** — `90363f2` (feat)

## Files Created/Modified
- `src/services/supabase.service.ts` — Added `fetchPaginatedQuestoes`, `fetchFilterOptions`, `PaginatedResult`, `FilterOptions`, `hashFilters`, progressive cache, `ensureHistoricoCached`, updated `clearQuestoesCache`
- `src/components/ui/QuestaoSkeleton.tsx` — New skeleton loader component (62 lines, 6 block types)
- `src/components/ui/index.ts` — Added barrel export for `QuestaoSkeleton`

## Decisions Made
- Progressive cache uses a flat array with `splice` insertion (pages may arrive out of order); keyed by `hashFilters()` + page number
- Historico is fetched once per filter session via `ensureHistoricoCached()`, merged client-side — avoids N separate historico queries per page
- `fetchAllQuestoes()` completely untouched — legacy consumers (`useSimulados`, `EditalVerticalizado`, `MapaQuestoes`, `ImportPdfModal`) continue using the old full-load path
- `_progressiveCachedPages` uses `Set` for O(1) cache hit lookups; declared as `const` per ESLint strict mode

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

1. **ESLint: `_progressiveCachedPages` should be `const`** — Declared as `let` but never reassigned (only `.clear()` is called). Fixed by changing to `const`.
2. **TypeScript: unused `React` import in `QuestaoSkeleton.tsx`** — Importing `React` is unnecessary with the automatic JSX runtime. Removed the import.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- `fetchPaginatedQuestoes()` and `fetchFilterOptions()` ready for consumer components in Plan 02
- `QuestaoSkeleton` available for loading states in paginated views
- `clearQuestoesCache()` properly resets all caches when new questions are imported

---

## Self-Check: PASSED

- ✅ `src/services/supabase.service.ts` — exists
- ✅ `src/components/ui/QuestaoSkeleton.tsx` — exists
- ✅ `src/components/ui/index.ts` — exists
- ✅ `.planning/phases/01-paginacao-de-questoes/01-01-SUMMARY.md` — exists
- ✅ Commit `c6a8335` — Task 1
- ✅ Commit `90363f2` — Task 2
- ✅ `fetchPaginatedQuestoes` exported
- ✅ `fetchFilterOptions` exported
- ✅ `PaginatedResult` interface exported
- ✅ `FilterOptions` interface exported
- ✅ `QuestaoSkeleton` barrel exported from `index.ts`
- ✅ `npx tsc -b --noEmit` — zero errors
- ✅ `npx eslint . --max-warnings=200` — zero errors
- ✅ `npm test` — 38/38 passing

*Phase: 01-paginacao-de-questoes*
*Completed: 2026-06-08*
