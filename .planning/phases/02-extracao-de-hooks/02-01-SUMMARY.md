---
phase: 02-extracao-de-hooks
plan: 01
subsystem: hooks
tags:
  - refactor
  - extraction
  - filters
  - resolucao-professor
dependency-graph:
  requires: []
  provides:
    - useQuestoesFilter
    - useQuestoesResolucao
  affects:
    - src/hooks/useQuestoes.ts (orquestrador — Plan 02-03)
tech-stack:
  added:
    - src/hooks/useQuestoesFilter.ts
    - src/hooks/useQuestoesResolucao.ts
  patterns:
    - Hook recebe dados via parâmetro (não cria estado interno de dados)
    - Callback onQuestoesUpdated para sincronização bidirecional
key-files:
  created:
    - src/hooks/useQuestoesFilter.ts (293 linhas)
    - src/hooks/useQuestoesResolucao.ts (87 linhas)
  modified: []
decisions:
  - "useQuestoesFilter recebe ResolucaoView[] como parâmetro em vez de gerenciar dados internamente"
  - "useQuestoesResolucao usa callback onQuestoesUpdated em vez de modificar estados de cadernoQuestoes/resolucoes diretamente"
  - "handleSaveResolucao(questaoId, text) aceita parâmetros explícitos em vez de resolver de questoesExibidas[currentQuestaoIndex]"
  - "Setters de selectedMaterias, selectedBancas, selectedAnos, selectedOrgaos, selectedConcursos, selectedCarreiras, selectedEscolaridades, selectedFormacoes, selectedRegioes, selectedFavoritas, selectedEnunciados não são expostos publicamente (apenas via handleToggle*)"
metrics:
  duration: 4min
  completed_date: "2026-06-08"
  tasks_total: 2
  tasks_completed: 2
  files_total: 2
---

# Phase 02 Plan 01: Extrair useQuestoesFilter e useQuestoesResolucao

**One-liner:** Extraídos hooks de filtro (useQuestoesFilter) e resolução do professor/IA (useQuestoesResolucao) do monolítico useQuestoes.ts, preservando toda a lógica e compatibilidade de tipos.

## Context

O hook `useQuestoes.ts` (~847 linhas) gerencia 6 responsabilidades distintas. Este plano extraiu duas delas:

1. **useQuestoesFilter** — estado de filtros (22 pares de estado), dados derivados (5 listas únicas + filteredQuestions + totalFiltrosAtivos), toggles (13 handleToggle*), buildServerFilters, getFilteredQuestions
2. **useQuestoesResolucao** — estado de edição da resolução do professor, explicação IA (handleExplicacaoIA), salvamento (handleSaveResolucao)

## Tasks Executed

### Task 1: Criar useQuestoesFilter.ts ✅

| Field | Value |
|-------|-------|
| **Commit** | `1d8d778` |
| **Files** | `src/hooks/useQuestoesFilter.ts` |
| **Status** | `npx tsc -b --noEmit` ✅, `npx eslint .` ✅, `npm test` 38/38 ✅ |

**Extraído de useQuestoes.ts:**
- Tipos: `FilterTab`, `ObjetivoFilter`, `StatusFilter`
- Constantes: `CARREIRAS_DISPONIVEIS`, `ESCOLARIDADES_DISPONIVEIS`, `FORMACOES_DISPONIVEIS`, `REGIOES_DISPONIVEIS`, `FAVORITAS_OPCOES`, `ENUNCIADOS_OPCOES`
- Estado de filtros (22 estados + setters)
- `buildServerFilters()` — função interna de serialização de filtros
- Dados derivados: `materiasComAssuntos`, `materiasUnicas`, `bancasUnicas`, `anosUnicos`, `orgaosUnicos`, `concursosUnicos`
- Toggles: `handleToggleMateria`, `handleToggleAssunto`, `handleToggleBanca` (+ 10 toggles via `makeToggle`), `handleResetFilters`
- `getFilteredQuestions()` — lógica de filtragem com matching de carreiras
- `filteredQuestions`, `filteredCount`, `totalFiltrosAtivos` — valores computados memoizados

### Task 2: Criar useQuestoesResolucao.ts ✅

| Field | Value |
|-------|-------|
| **Commit** | `6a72bb5` |
| **Files** | `src/hooks/useQuestoesResolucao.ts` |
| **Status** | `npx tsc -b --noEmit` ✅, `npx eslint .` ✅, `npm test` 38/38 ✅ |

**Extraído de useQuestoes.ts:**
- Estado: `editingResolucao`, `resolucaoText`, `resolucaoExpanded`, `savingResolucao`, `explicacoes`, `loadingExplicacao`
- `handleSaveResolucao(questaoId, text)` — nova assinatura com parâmetros explícitos
- `handleExplicacaoIA(questao)` — preserva lógica de geração Gemini, salvamento automático via `updateResolucaoProfessor`, trackEvent
- Interface `UseQuestoesResolucaoOptions` com callback `onQuestoesUpdated`
- Removidas chamadas a `setCadernoQuestoes`/`setResolucoes` — substituídas por `options.onQuestoesUpdated`

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | ✅ Zero errors |
| `npx eslint . --max-warnings=200` | ✅ Zero errors |
| `npm test` (38 tests) | ✅ 38/38 passing |
| `src/hooks/useQuestoesFilter.ts` exports `useQuestoesFilter`, `FilterTab`, `ObjetivoFilter`, `StatusFilter` | ✅ |
| `src/hooks/useQuestoesResolucao.ts` exports `useQuestoesResolucao` | ✅ |
| `useQuestoes.ts` untouched | ✅ |
| `handleSaveResolucao(questaoId, text)` aceita parâmetros explícitos | ✅ |
| `handleExplicacaoIA` chama `options.onQuestoesUpdated` | ✅ |

## State Updates

- **STATE.md**: Plan counter advanced, progress recalculated
- **ROADMAP.md**: Plan progress updated

## Self-Check: PASSED

- ✅ `src/hooks/useQuestoesFilter.ts` exists (293 lines)
- ✅ `src/hooks/useQuestoesResolucao.ts` exists (87 lines)
- ✅ Commit `1d8d778` exists
- ✅ Commit `6a72bb5` exists
- ✅ `useQuestoes.ts` unmodified
