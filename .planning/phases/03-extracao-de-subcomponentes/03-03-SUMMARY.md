---
phase: 03-extracao-de-subcomponentes
plan: 03
name: Extracao de subcomponentes da pagina Revisao
subsystem: pages/Revisao
tags:
  - refactor
  - component-extraction
  - revisao
  - focus-view
  - stats-cards
  - filter-bar
requires: []
provides:
  - RevisaoStatsCards
  - RevisaoFilterBar
  - RevisaoFocusView
affects:
  - src/pages/Revisao.tsx
  - src/components/RevisaoStatsCards.tsx
  - src/components/RevisaoFilterBar.tsx
  - src/components/RevisaoFocusView.tsx
  - src/components/ui/index.ts
tech-stack:
  added: []
  patterns:
    - "Componentes puros que recebem todo estado via props (D-02)"
    - "Navegação por callbacks mantendo lógica no pai"
key-files:
  created:
    - src/components/RevisaoStatsCards.tsx
    - src/components/RevisaoFilterBar.tsx
    - src/components/RevisaoFocusView.tsx
  modified:
    - src/pages/Revisao.tsx
    - src/components/ui/index.ts
decisions:
  - "RevisaoFocusView gerencia estado de resolucao via props do pai para preservar sincronização com navegação entre questões"
  - "Bloco 'Tópico Concluído' mantido inline em Revisao.tsx por ser pequeno e específico da página"
metrics:
  duration: 12m
  completed: 2026-06-08
  tasks: 3/3
  lines_removed_revisao: 428
  lines_final_revisao: 417
---

# Phase 3 Plan 3: Extração de Subcomponentes da Página Revisão — Summary

## One-liner
Extração de 3 sub-componentes de Revisao.tsx: RevisaoStatsCards, RevisaoFilterBar e RevisaoFocusView (modo de foco completo com questão, alternativas, resolução do professor, explicação IA, navegação e classificação SM-2).

## Summary
Revisao.tsx foi reduzido de **845 para 417 linhas** (–51%), com 3 novos componentes extraídos:
- **RevisaoStatsCards** (52 linhas): Grid de 4 cartões de estatísticas (erros pendentes, matérias, tópicos, método SM-2)
- **RevisaoFilterBar** (40 linhas): Barra de busca textual e seletor de ordenação
- **RevisaoFocusView** (387 linhas): Modo de foco completo — cabeçalho de navegação, enunciado, alternativas com feedback visual, resolução do professor (expandir/editar/salvar), explicação IA, navegação anterior/próxima, botão Responder e classificação SM-2 estilo Anki

Todos os componentes seguem a restrição D-02: recebem todo estado via props e não importam hooks de dados.

## Tasks Executed

| Task | Name              | Lines | Commit |
|------|-------------------|-------|--------|
| 1    | RevisaoStatsCards | 52    | 56c25ba |
| 2    | RevisaoFilterBar  | 40    | 24706ea |
| 3    | RevisaoFocusView  | 387   | 1cc0074 |

## Deviations from Plan

None — plan executed exactly as written.

### Auto-fixed Issues

| Rule | Issue | Fix |
|------|-------|-----|
| Rule 1 | Import `Search`, `Filter` unused after filter bar extraction | Removed unused imports |
| Rule 1 | Import `Button`, `MarkdownAI`, `cleanHtmlText`, `XCircle`, `ArrowRight`, `ArrowLeft`, `ChevronLeft`, `BrainCircuit`, `ExternalLink`, `Book`, `Pencil`, `Check`, `Loader2` unused after focus view extraction | Removed 13 unused imports |
| Rule 1 | `obterPrazosEstimados(questaoId: number)` type mismatch with prop `(questaoId: number \| undefined)` | Fixed prop type to match actual signature |

## Verification

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | ✅ Passed — zero errors |
| `npx eslint . --max-warnings=200` | ✅ Passed — zero errors |
| `npm test` | ✅ Passed — 38/38 tests |

## Self-Check: PASSED

- [x] RevisaoStatsCards.tsx created (52 lines)
- [x] RevisaoFilterBar.tsx created (40 lines)
- [x] RevisaoFocusView.tsx created (387 lines)
- [x] Revisao.tsx reduced to 417 lines (target: max 450)
- [x] Barrel export updated (ui/index.ts)
- [x] TypeScript zero errors
- [x] ESLint zero errors
- [x] 38 tests passing
