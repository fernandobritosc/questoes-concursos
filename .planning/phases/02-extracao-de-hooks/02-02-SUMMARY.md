---
phase: 02-extracao-de-hooks
plan: 02
subsystem: hooks
tags: [react, hooks, caderno, useCallback, state-management]

# Dependency graph
requires:
  - phase: 02-extracao-de-hooks
    provides: Context and decisions (02-CONTEXT.md) guiding hook extraction
provides:
  - "useQuestoesCaderno hook — caderno state, navigation, answer confirmation, question editing, history loading"
affects:
  - 03-integracao-dos-hooks (orquestrador useQuestoes consuming this hook)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Specialized hook accepting callback params (getFilteredQuestions, setResolucoes) instead of direct state dependency"
    - "Actions receive questao as explicit parameter rather than resolving from questeosExibidas[currentQuestaoIndex]"

key-files:
  created:
    - src/hooks/useQuestoesCaderno.ts
  modified: []

key-decisions:
  - "handleGerarCaderno returns count instead of calling trackEvent — orquestrador handles trackEvent with totalFiltrosAtivos from filter hook"
  - "handleConfirmarResposta(questao) accepts question as parameter — orquestrador resolves questoesExibidas[currentQuestaoIndex] and passes"
  - "handleEditQuestao(questao, updatedFields) accepts question + fields — same pattern"
  - "Timer effects (increment, reset) and history-loading effect stay in orquestrador, not in this hook"

patterns-established:
  - "Specialized hook composed via orchestrator pattern: state+setters exported for external control"

requirements-completed:
  - REFAC-01

# Metrics
duration: 12min
completed: 2026-06-08
---

# Phase 02 Plan 02: useQuestoesCaderno Hook Summary

**Caderno hook (useQuestoesCaderno) extracted from useQuestoes.ts — manages caderno state, navigation, answer confirmation, question editing, copy-to-clipboard, and history loading, accepting callbacks for coordination with the orchestrator**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-08T20:30:00Z
- **Completed:** 2026-06-08T20:42:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created `src/hooks/useQuestoesCaderno.ts` (193 lines) with all caderno state and actions extracted from `useQuestoes.ts`
- State: `cadernoQuestoes`, `isCadernoActive`, `currentQuestaoIndex`, `alternativaSelecionada`, `revelado`, `copiedId`, `tempoSegundos`, `salvandoResposta`, `historicoQuestaoAtiva`, `loadingHistoricoAtivo`
- Actions: `handleGerarCaderno`, `handleConfirmarResposta`, `handleEditQuestao`, `handleCopy`, `loadHistoricoDaQuestao`
- Actions accept explicit parameters (`questao`, `questaoId`, `updatedFields`) instead of resolving from enclosing scope
- `handleGerarCaderno` returns question count (orquestrador handles `trackEvent` + `totalFiltrosAtivos`)
- Timer effects and history-loading effect intentionally excluded (stay in orquestrador)

## Task Commits

Each task was committed atomically:

1. **Task 1: Criar useQuestoesCaderno.ts with state, navigation, resposta, edição e histórico** - `1a2e111` (feat)

## Files Created/Modified
- `src/hooks/useQuestoesCaderno.ts` — New hook managing caderno state and actions, accepting `UseQuestoesCadernoParams` with `getFilteredQuestions`, `resolucoes`, `setResolucoes`

## Decisions Made
- `handleGerarCaderno` uses `useCallback` with `[params.getFilteredQuestions]` (plan-specified), with eslint-disable for exhaustive-deps (same pattern as original useQuestoes.ts)
- Timer increment/reset effects and history-loading-on-navigation effect are NOT in this hook — they remain in the orchestrator (Plan 02-03) because they depend on `questoesExibidas` and other orchestrator state
- `handleConfirmarResposta` and `handleEditQuestao` receive `questao: ResolucaoView` as explicit parameter, decoupling from `questoesExibidas[currentQuestaoIndex]`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- ESLint warning on useCallback dependency array: `params.getFilteredQuestions` triggers `react-hooks/exhaustive-deps` because ESLint wants `params` as dependency. Suppressed with eslint-disable-next-line comment (same pattern used throughout original useQuestoes.ts).

## Next Phase Readiness
- `useQuestoesCaderno.ts` is ready to be consumed by the orquestrador hook (Plan 02-03)
- Original `useQuestoes.ts` remains unchanged — zero modifications
- All verifications pass: TS compiles clean, ESLint zero errors, 38/38 tests pass

---

*Phase: 02-extracao-de-hooks*
*Completed: 2026-06-08*
