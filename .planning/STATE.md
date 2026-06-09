---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-06-09T00:29:05.442Z"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 12
  completed_plans: 12
  percent: 100
---

# STATE.md — Questões Concursos

## Project Reference

| Field | Value |
|-------|-------|
| **Core Value** | Estudar questões de concursos de forma eficiente, com dados reais de desempenho e resoluções de qualidade, sem precisar ficar alternando entre abas do navegador. |
| **Current Focus** | Refatorar e estabilizar o código existente — 3 pendências de auditoria: paginação, extração de hooks, extração de sub-componentes. |
| **Mode** | YOLO |
| **Granularity** | Coarse |

## Current Position

| Phase | Status | Phase Goal |
|-------|--------|------------|
| 1 — Paginação de Questões | Completed | Fetch de questões usa paginação server-side |
| 2 — Extração de Hooks | In progress (2/3 plans) | useQuestoes.ts dividido em hooks menores |
| 3 — Extração de Sub-Componentes | In progress (4/6 plans) | 5 páginas grandes têm sub-componentes extraídos |

**Progress:** [██████████] 100%

**Active Plan:** Phase 3 — Extração de Sub-Componentes (6 plans planned, 6 executed)

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Phase 1 plans created | ≥1 | 3 ✓ |
| Phase 2 plans created | ≥1 | 1 ✓ |
| Phase 3 plans created | ≥1 | 0 |
| Requirement coverage | 100% | 4/4 ✓ |
| Phase 01-paginacao-de-questoes P03 | 6min | 1 tasks | 1 files |
| Phase 02-extracao-de-hooks P02 | 12min | 1 tasks | 1 files |
| Phase 02-extracao-de-hooks P01 | 4min | 2 tasks | 2 files |
| Phase 03-extracao-de-subcomponentes P05 | 15min | 3 tasks | 6 files |

## Accumulated Context

### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-08 | Ordem: Paginação → Hooks → Componentes | Dependency chain natural: dados → hooks → UI |
| 2026-06-08 | Phase 1 (REFAC-03) como primeira fase | Paginação altera a camada de dados que hooks e componentes consomem |
| 2026-06-08 | 3 fases com granularidade coarse | Apenas 3 requisitos v1 ativos; compressão natural sem artificialidades |
| 2026-06-08 | Sub-componentes extraídos seguem padrão Questoes.tsx | Padrão já provado: 1662→334 linhas, 11 sub-componentes |
| 2026-06-08 | buildServerFilters() traduz apenas metadata filters server-side | Assunto, carreira, status, objetivo remain client-side (dependem de fallback logic ou merged historico) |
| 2026-06-08 | PAGE_SIZE = 200 (D-01) | 200 questões por página mantém payload leve sem exigir muitas requisições |
| 2026-06-08 | QuestaoSkeleton renderizado inline no fluxo do conteúdo (não como overlay) | Preserva contexto visual durante transições de página |
| 2026-06-08 | pageLoadingError só exibido quando pageLoading é false | Evita flash de erro seguido de skeleton |
| 2026-06-08 | handleGerarCaderno retorna count — orquestrador faz trackEvent | Desacopla caderno hook do filter hook (totalFiltrosAtivos) |
| 2026-06-08 | handleConfirmarResposta(questao) e handleEditQuestao(questao, fields) recebem questão como parâmetro | Evita dependência de questoesExibidas[currentQuestaoIndex] dentro do hook |
| 2026-06-08 | useQuestoesFilter recebe ResolucaoView[] como parâmetro em vez de gerenciar dados internamente | Hook de filtro é puramente derivacional — não possui fonte própria de dados |
| 2026-06-08 | useQuestoesResolucao usa callback onQuestoesUpdated em vez de modificar cadernoQuestoes/resolucoes diretamente | Desacopla hook de resolução do orquestrador |
| 2026-06-08 | handleSaveResolucao(questaoId, text) aceita parâmetros explícitos | Evita dependência de questoesExibidas[currentQuestaoIndex]; orquestrador decide qual questão salvar |

### Open Todos

- [x] Phase 1: Definir tamanho do lote de paginação (D-01: 200)
- [x] Phase 1: Decidir estratégia de cache (D-03: flat progressivo, sem TTL)
- [x] Phase 2: Definir quais hooks extrair e suas responsabilidades
- [x] Phase 2: Criar useQuestoesCaderno hook (Plan 02-02)
- [x] Phase 2: Criar useQuestoesFilter + useQuestoesResolucao (Plan 02-01)
- [ ] Phase 2: Integrar hooks no orquestrador (Plan 02-03 -- pending)
- [x] Phase 2: Validar que hooks expõem actions, não setters
- [x] Phase 3: Identificar candidatos a sub-componente em cada página
- [ ] Phase 3: Executar Plan 01 — Simulados P1 (SimuladoSetup + SimuladoHistorico)
- [ ] Phase 3: Executar Plan 02 — MapaQuestoes (3 sub-componentes)
- [x] Phase 3: Executar Plan 03 — Revisao (3 sub-componentes)
- [ ] Phase 3: Executar Plan 04 — Simulados P2 (SimuladoExamView + SimuladoResultados)
- [x] Phase 3: Executar Plan 05 — Dashboard (3 sub-componentes)
- [x] Phase 3: Executar Plan 06 — EditalVerticalizado (3 sub-componentes)

### Known Blockers

- Nenhum bloqueador identificado no momento.

### Technical Debt (deferidos deste roadmap)

- `any` types em serviços (43+ anotações) — adiado para próximo milestone
- ESLint-disable proliferation (30 suppressions) — adiado
- `getQuestionValidation` duplicado — extrair para `src/lib/validation.ts` (pode ser feito no Phase 2)
- ObjectURL cleanup em `studyMaterial.service.ts` — pode ser incluído como bônus
- ErrorBoundary não usado nas rotas — pode ser incluído como bônus

## Session Continuity

### Last Session (2026-06-08 — Phase 3 Planning)

- **Plan 01 (Wave 1)** executed successfully:
  - `supabase.service.ts`: Added `fetchPaginatedQuestoes()` with `.range()` pagination, `fetchFilterOptions()`, progressive cache, `PaginatedResult`/`FilterOptions` types
  - `QuestaoSkeleton.tsx` created with 6 skeleton block types
  - Barrel export in `ui/index.ts`
  - `clearQuestoesCache()` extended to reset all caches
  - `fetchAllQuestoes()` completely untouched
  - Verification: tsc zero errors, ESLint zero errors, 38/38 tests passing
- **Plan 02 (Wave 2)** executed successfully:
  - `useQuestoes.ts` refactored with pagination state, `buildServerFilters()`, `AbortController`, `loadPage()`, `handleNavigatePage()`
  - `fetchAllQuestoes` import replaced with `fetchPaginatedQuestoes` + `fetchFilterOptions`
  - `materiasUnicas`, `bancasUnicas`, etc. now use `filterOptions` with fallback
  - `visibleQuestionsCount` reset effect removed (pagination now managed by filter-change effect)
  - All 7 new pagination fields added to return object (all existing exports preserved)
  - Verification: tsc zero errors, ESLint zero errors, 38/38 tests passing
- **Plan 03 (Wave 3)** executed successfully:
  - `Questoes.tsx` integrated with `QuestaoSkeleton` during page transitions
  - `LoadingSpinner` preserved for initial load (not replaced)
  - `pageLoading`, `pageLoadingError`, `page`, `totalPages`, `handleNavigatePage` destructured from `useQuestoes()`
  - `pageLoadingError` displayed as error banner when set (and not currently loading)
  - Verification: tsc zero errors, ESLint zero errors, 38/38 tests passing
- **Plan 02-02 (Wave 1)** executed successfully:
  - `useQuestoesCaderno.ts` created (193 lines) — extracted caderno state, navigation, answer confirmation, question editing, copy, history loading
  - Actions accept questao as explicit parameter instead of resolving from questoesExibidas
  - Timer and history-loading effects intentionally excluded (stay in orquestrador)
  - `useQuestoes.ts` untouched — zero modifications
  - Verification: tsc zero errors, ESLint zero errors, 38/38 tests passing
- **Plan 02-01 (Wave 1)** executed successfully:
  - `useQuestoesFilter.ts` created (293 lines) — extracted filter state, toggle actions, derived data (materiasUnicas, bancasUnicas, etc.), getFilteredQuestions, buildServerFilters, totalFiltrosAtivos
  - `useQuestoesResolucao.ts` created (87 lines) — extracted resolução professor state/actions and IA explanation logic
  - `handleSaveResolucao(questaoId, text)` accepts explicit parameters
  - `handleExplicacaoIA` uses `onQuestoesUpdated` callback for sync instead of direct state mutation
  - `useQuestoes.ts` untouched — zero modifications
  - Verification: tsc zero errors, ESLint zero errors, 38/38 tests passing

- **Phase 3 Planned (6 plans, 2 waves)**:
  - Plan 03-01: Simulados P1 — SimuladoSetup + SimuladoHistorico
  - Plan 03-02: MapaQuestoes — 3 sub-componentes
  - Plan 03-03: Revisao — 3 sub-componentes
  - Plan 03-04: Simulados P2 — SimuladoExamView + SimuladoResultados
  - Plan 03-05: Dashboard — 3 sub-componentes
  - Plan 03-06: EditalVerticalizado — 3 sub-componentes

- **Plan 03-05 (Wave 2)** executed successfully:
  - `DashboardMetricCard.tsx`, `DashboardResolucaoItem.tsx`, `DashboardStudyHeatmap.tsx` created
  - `Dashboard.tsx` reduced from 808 to 419 lines (-48%)
  - `CustomTooltip` exported from DashboardResolucaoItem for Recharts reuse
  - Barrel exports updated in `ui/index.ts`
  - `deferred-items.md` created with pre-existing TS6133 in EditalMateriaDetalhes.tsx
  - Verification: ESLint zero errors, 38/38 tests passing
  - Pre-existing TS error in EditalMateriaDetalhes.tsx (BookOpen unused import) — logged as deferred

### Next Session

- Phase 3: 2 plans remaining (Plan 04 — Simulados P2, Plan 06 — EditalVerticalizado)
- Phase 2 Plan 02-03 (orquestrador) remains pending

---

*Last updated: 2026-06-08*
