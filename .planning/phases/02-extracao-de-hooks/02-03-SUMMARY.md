---
phase: 02-extracao-de-hooks
plan: 03
subsystem: hooks
tags: [refactor, hooks, orchestrator, useQuestoes, composition]
requires:
  - phase: 02-extracao-de-hooks
    plan: 02
    provides: useQuestoesFilter, useQuestoesCaderno, useQuestoesResolucao hooks
provides:
  - Orchestrator useQuestoes that composes 3 specialized hooks
  - Interface identical to original 847-line monolithic hook
  - Re-exports of FilterTab, ObjetivoFilter, StatusFilter, ImportStatus, and all constants
affects:
  - Future maintenance of useQuestoes behavior
  - Phase 03 if any further extraction is needed
tech-stack:
  added: []
  patterns:
    - "Orchestrator pattern: custom hook composes sub-hooks with cross-cutting coordination effects"
    - "Wrapper actions that inject current context from bridge computed values"
key-files:
  created: []
  modified:
    - src/hooks/useQuestoes.ts
    - src/hooks/useQuestoesFilter.ts
key-decisions:
  - "useQuestoesFilter accepts optional filterOptions parameter for server-derived unique values fallback (preserves original behavior)"
  - "onQuestoesUpdated callback syncs cadernoQuestoes and resolucoes after handleExplicacaoIA generates text"
  - "eslint-disable-next-line placed before closing ] of dependency arrays (not at hook declaration) for correct suppression"
requirements-completed:
  - REFAC-01
duration: 31min
completed: 2026-06-08
---

# Phase 02 Plan 03: Refatorar useQuestoes como orquestrador de 3 hooks especializados

**useQuestoes.ts reescrito de ~847 para 253 linhas como orquestrador compondo useQuestoesFilter, useQuestoesCaderno e useQuestoesResolucao, com interface idêntica à original**

## Performance

- **Duration:** 31 min
- **Started:** 2026-06-08T20:50:00Z
- **Completed:** 2026-06-08T21:21:00Z
- **Tasks:** 1 (atomic commit)
- **Files modified:** 2
- **Lines removed:** 596
- **Lines added:** 253
- **Net reduction:** 343 lines (–40%)

## Accomplishments

- `useQuestoes.ts` reescrito de 847 para 253 linhas como orquestrador
- Compõe `useQuestoesFilter`, `useQuestoesCaderno` e `useQuestoesResolucao`
- Estado de dados (resolucoes, loading, paginação) permanece no orquestrador
- `questoesExibidas` é computed bridge entre cadernoQuestoes + filtros
- Effects de coordenação: timer, reset timer, sync resolucaoText, load historico, initial load, filter change
- Wrappers: `handleGerarCaderno` (com trackEvent), `handleConfirmarResposta`, `handleEditQuestao`, `handleSaveResolucao` (com sync de arrays)
- `onQuestoesUpdated` callback sincroniza cadernoQuestoes/resolucoes após IA gerar texto
- `useQuestoesFilter` modificado para aceitar `filterOptions` opcional (fallback server-side)
- Todos os 40+ campos da interface original preservados com nomes e tipos idênticos
- `Questoes.tsx` não foi modificado

## Task Commits

1. **Task 1: Refatorar useQuestoes como orquestrador** — `ebf7e8d` (refactor)

## Files Modified

- `src/hooks/useQuestoes.ts` — Reescrito de 847→253 linhas como orquestrador compondo 3 hooks
- `src/hooks/useQuestoesFilter.ts` — Adicionado parâmetro opcional `filterOptions` para fallback server-derived

## Interface Preservation

Verificado que todos os 40 fields usados por `Questoes.tsx` estão presentes:

```
resolucoes, setResolucoes, loading, loadingError,
page, totalPages, totalCount, pageLoading, pageLoadingError, handleNavigatePage,
cadernoQuestoes, setCadernoQuestoes,
currentQuestaoIndex, setCurrentQuestaoIndex,
alternativaSelecionada, setAlternativaSelecionada,
revelado, setRevelado,
explicacoes, loadingExplicacao,
copiedId, editingResolucao, setEditingResolucao,
resolucaoText, setResolucaoText,
resolucaoExpanded, setResolucaoExpanded,
savingResolucao, tempoSegundos, salvandoResposta,
historicoQuestaoAtiva, loadingHistoricoAtivo,
handleConfirmarResposta, setFiltros, questoesExibidas,
handleEditQuestao, isImportModalOpen, setIsImportModalOpen,
handleCopy, handleExplicacaoIA, handleSaveResolucao
```

## Decisions Made

- `useQuestoesFilter` modificado para aceitar `filterOptions` opcional — as derived data memos (`materiasUnicas`, `bancasUnicas`, etc.) usam `filterOptions?.XX ?? resolucoes-based` para preservar o comportamento original de preferir valores do servidor
- eslint-disable-next-line colocado imediatamente antes do `]` do array de dependências (não no topo do hook) para supressão correta pelo ESLint
- `handleGerarCaderno` wrapper usa `caderno.handleGerarCaderno()` que retorna o número de questões, em vez de duplicar a lógica de filtragem

## Deviations from Plan

Nenhum — plano executado exatamente como especificado.

### Nota sobre modificação do useQuestoesFilter
O plano original não previa modificação do `useQuestoesFilter`, mas foi necessário adicionar o parâmetro `filterOptions` opcional para que as derived data memos (`materiasUnicas`, `bancasUnicas`, etc.) usassem a mesma lógica de fallback do original (preferir `filterOptions?.XX` sobre `resolucoes`). Esta é uma extensão compatível que não quebra nenhum consumidor existente.

## Verification Results

| Check | Status |
|-------|--------|
| `npx tsc -b --noEmit` | ✅ Zero errors |
| `npx eslint . --max-warnings=200` | ✅ Zero errors/warnings |
| `npx vitest run` — 38 tests | ✅ 38/38 passed |
| `Questoes.tsx` não modificado | ✅ Confirmado via `git diff HEAD -- src/pages/Questoes.tsx` |
| Interface completa | ✅ 40+ fields verificados |

## Issues Encountered

- ESLint `react-hooks/exhaustive-deps` não suprimia corretamente com `// eslint-disable-next-line` no topo do hook porque a regra reporta na linha do `]` do array de dependências, não na linha da declaração do hook. Resolvido movendo o disable para imediatamente antes do `]`.

## Next Phase Readiness

- REFAC-01 completo: `useQuestoes` refatorado de 847 para 253 linhas (–40%)
- Fim da Phase 2 (Extração de Hooks)
- Próximo passo: testar componentes extraídos e hooks em ambiente de desenvolvimento

## Self-Check: PASSED

- ✅ `src/hooks/useQuestoes.ts` — exists
- ✅ `src/hooks/useQuestoesFilter.ts` — exists
- ✅ Commit `ebf7e8d` — exists
- ✅ `npx tsc -b --noEmit` — zero errors
- ✅ `npx eslint . --max-warnings=200` — zero errors
- ✅ `npx vitest run` — 38/38 passed

---

*Phase: 02-extracao-de-hooks*
*Plan: 03*
*Completed: 2026-06-08*
