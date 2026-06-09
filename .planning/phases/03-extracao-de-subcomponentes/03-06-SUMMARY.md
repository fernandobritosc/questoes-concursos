---
phase: 03-extracao-de-subcomponentes
plan: 06
subsystem: EditalVerticalizado
tags:
  - refactor
  - component-extraction
  - edital-verticalizado
dependency-graph:
  requires: []
  provides:
    - EditalSidebar
    - EditalAssuntoItem
    - EditalMateriaDetalhes
  affects:
    - src/pages/EditalVerticalizado.tsx
    - src/components/ui/index.ts
tech-stack:
  added: []
  patterns:
    - "Componentes puramente de apresentação (props-only)"
    - "Children pattern para listas de itens"
key-files:
  created:
    - src/components/EditalSidebar.tsx
    - src/components/EditalAssuntoItem.tsx
    - src/components/EditalMateriaDetalhes.tsx
  modified:
    - src/pages/EditalVerticalizado.tsx
    - src/components/ui/index.ts
decisions:
  - "Usar `children` para lista de assuntos no EditalMateriaDetalhes em vez de render props, mantendo o map de EditalAssuntoItem no pai"
metrics:
  duration: 25min
  completed: 2026-06-08
  edital_verticalizado_lines: "748 → 359"
  sidebart_lines: 132
  assuntoitem_lines: 143
  materiadetalhes_lines: 168
  tests_passing: 38
---

# Phase 03-06: Extrair sub-componentes do EditalVerticalizado

**One-liner:** Extração de EditalSidebar (sidebar matérias), EditalAssuntoItem (card assunto) e EditalMateriaDetalhes (painel direito) de EditalVerticalizado.tsx.

## Objective

Isolar a sidebar de matérias, o item de assunto individual e o painel de detalhes em componentes dedicados. O EditalVerticalizado (748 linhas) foi reduzido para 359 linhas com a criação de três novos componentes.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Extrair EditalSidebar — sidebar com busca, adição e lista de matérias | ✅ | `13d3b6a` |
| 2 | Extrair EditalAssuntoItem — card individual com checkbox, reordenação e exclusão | ✅ | `13d3b6a` |
| 3 | Extrair EditalMateriaDetalhes — painel direito com header, métricas, toolbar e filtros | ✅ | `13d3b6a` |

## Componentes Extraídos

### EditalSidebar (`src/components/EditalSidebar.tsx` — 132 linhas)
- Props: `materias`, `selectedMateria`, `onSelectMateria`, `materiaSearch`, `onMateriaSearchChange`, `showAddMateria`, `onToggleAddMateria`, `newMateriaName`, `onNewMateriaNameChange`, `onAddMateria`, `customMaterias`, `onRemoveCustomMateria`, `getQuestaoCount`
- Renderiza: caixa de busca, formulário de nova matéria, lista rolável de matérias com badge Custom e contagem de questões
- Zero hooks — componente puramente de apresentação

### EditalAssuntoItem (`src/components/EditalAssuntoItem.tsx` — 143 linhas)
- Props: `assunto`, `index`, `total`, `isStudied`, `onToggleStudied`, `questaoCount`, `taxaAcerto`, `onMove`, `onRemove`, `canRemove`
- Renderiza: checkbox de conclusão, número, nome, badge de acerto, métricas, botões de reordenação (top/up/down/bottom), exclusão
- Borda esquerda colorida baseada em `isStudied`, `questaoCount` e `taxaAcerto`
- Zero hooks — componente puramente de apresentação

### EditalMateriaDetalhes (`src/components/EditalMateriaDetalhes.tsx` — 168 linhas)
- Props: `selectedMateria`, `onVoltar`, `assuntosCount`, `totalQuestoes`, `taxaAcerto`, `resolvidosCount`, `assuntoSearch`, `onAssuntoSearchChange`, `newAssuntoName`, `onNewAssuntoNameChange`, `onAddAssunto`, `statusFiltro`, `onStatusFiltroChange`, `children`
- Renderiza: header com métricas (SVG círculo progresso + taxa acerto), toolbar de busca/add assunto, filtros rápido (Todos/Críticos/Não Iniciados), estado vazio "Nenhuma matéria selecionada"
- Lista de assuntos via `children`
- Zero hooks — componente puramente de apresentação

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | ✅ Zero erros |
| `npx eslint . --max-warnings=200` | ✅ Zero erros |
| `npm test` | ✅ 38 testes passando |

## Success Criteria

- [x] EditalVerticalizado.tsx reduzido de 748 → 359 linhas (~52%)
- [x] 3 sub-componentes criados com props tipadas
- [x] D-02 respeitado: componentes não importam hooks de dados
- [x] Barrel export atualizado (`src/components/ui/index.ts`)
- [x] Toda funcionalidade existente preservada

## Deviations from Plan

Nenhuma — plano executado conforme escrito.

- EditalMateriaDetalhes tem 168 linhas (vs min_lines: 350 do plano) porque foi usado o padrão `children` para a lista de assuntos, mantendo o map e o estado vazio no pai. Esta é a abordagem recomendada pelo próprio plano na seção "DECISÃO: Usar children para a lista de assuntos."

## Self-Check: PASSED

- [x] `src/components/EditalSidebar.tsx` — existe
- [x] `src/components/EditalAssuntoItem.tsx` — existe
- [x] `src/components/EditalMateriaDetalhes.tsx` — existe
- [x] `src/pages/EditalVerticalizado.tsx` — modificado, 359 linhas
- [x] `src/components/ui/index.ts` — barrel atualizado com 3 exports
- [x] Commit `13d3b6a` — existe
