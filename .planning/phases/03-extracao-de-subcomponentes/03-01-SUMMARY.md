---
phase: 03-extracao-de-subcomponentes
plan: 01
subsystem: simulados
tags: [refactor, extraction, simulados, component]
dependency_graph:
  requires: []
  provides: [SimuladoSetup, SimuladoHistorico]
  affects: [src/pages/Simulados.tsx]
tech-stack:
  added: []
  patterns: [props-only, named-export, useMemo-for-derived-data]
key-files:
  created:
    - src/components/SimuladoSetup.tsx
    - src/components/SimuladoHistorico.tsx
  modified:
    - src/pages/Simulados.tsx
decisions:
  - "Header (título + descrição) incluído no SimuladoSetup como grid item lg:col-span-12 para manter layout original"
  - "Mobile toggle de histórico e coluna de histórico unificados no SimuladoHistorico"
  - "isHistoryExpandedMobile e onToggleHistoryMobile adicionados às props do SimuladoHistorico (não do SimuladoSetup como no plano original) — correção necessária porque o toggle está no componente de histórico"
metrics:
  duration: 17m 38s
  completed_date: "2026-06-08"
---

# Phase 3 Plan 01: Simulados P1 — SimuladoSetup + SimuladoHistorico Summary

**One-liner:** Extração de SimuladoSetup (config de qtd/tempo) e SimuladoHistorico (lista + sparkline) de Simulados.tsx, reduzindo a página de 983 para 641 linhas.

## Commits

| Hash | Message |
|------|---------|
| `8608fe2` | feat(03-01): extrair SimuladoSetup de Simulados.tsx |
| `69c82b3` | feat(03-01): extrair SimuladoHistorico de Simulados.tsx |

## Files Created

### `src/components/SimuladoSetup.tsx` (126 lines)
- **Props:** `selectedQtd`, `selectedTempo`, `onSelectQtd`, `onSelectTempo`, `onIniciarSimulado`
- **Renders:** Header full-width (BrainCircuit + título + descrição), card "Ajustar Parâmetros da Prova" (seletores qtd/tempo + botão Gerar), card "Como funciona"
- **D-02:** Sem hooks de aplicação — apenas props

### `src/components/SimuladoHistorico.tsx` (302 lines)
- **Props:** `historico`, `verTodos`, `onToggleVerTodos`, `isHistoryExpandedMobile`, `onToggleHistoryMobile`, `onRefazer`, `onVerPrescricao`, `onLimparHistorico`
- **Renders:** Mobile accordion toggle, lista de histórico (com paginação 5/todos), botão "Ver todos", sparkline (AreaChart recharts), estado vazio
- **D-02:** `useMemo` para chartData (permitido — React hook, não hook de dados)

## Files Modified

### `src/pages/Simulados.tsx` (983 → 641 lines)
- Setup block agora usa `<SimuladoSetup>` e `<SimuladoHistorico>` com props
- Header, config card, "Como funciona", mobile toggle, histórico, sparkline removidos
- Modal de prescrição mantido na página
- Imports recharts removidos; imports Info/History/Trash2 removidos
- Grid wrapper `grid-cols-12` mantido como container dos dois sub-componentes

## Verification Results

| Check | Status |
|-------|--------|
| `npx tsc -b --noEmit` | ✅ Zero errors |
| `npx eslint src/components/SimuladoSetup.tsx src/components/SimuladoHistorico.tsx src/pages/Simulados.tsx src/components/ui/index.ts` | ✅ Zero errors |
| `npm test` | ✅ 38/38 tests passing |
| D-02 (no app hooks) | ✅ SimuladoSetup sem hooks; SimuladoHistorico só useMemo |
| Line counts: SimuladoSetup ≥150 | ⚠️ 126 lines (abaixo da meta de 150) |
| Line counts: SimuladoHistorico ≥200 | ✅ 302 lines |
| Line counts: Simulados.tsx ≤600 | ⚠️ 641 lines (41 acima da meta) |
| Barrel exports | ✅ SimuladoSetup e SimuladoHistorico exportados |

## Deviations from Plan

### Auto-correções (Rule 2)

**1. [Rule 2] Props de visibilidade mobile movidas para SimuladoHistorico**
- **Encontrado durante:** Task 1
- **Problema:** O plano incluía `isHistoryExpandedMobile` e `onToggleHistoryMobile` nas props do `SimuladoSetup`, mas o mobile toggle está no bloco de histórico — e foi designado para o `SimuladoHistorico`
- **Correção:** Movidas essas props para `SimuladoHistoricoProps` e removidas de `SimuladoSetupProps`. O toggle de histórico e a coluna de histórico agora vivem juntos no `SimuladoHistorico`
- **Arquivos:** `src/components/SimuladoHistorico.tsx`, `src/components/SimuladoSetup.tsx`

**2. [Rule 2] `HistoricoItem.id` corrigido de `number` para `string`**
- **Encontrado durante:** Task 2 (tsc erro TS2322)
- **Problema:** O plano definia `id?: number`, mas `SimuladoHistoricoItem` do hook tem `id: string`
- **Correção:** `HistoricoItem.id` alterado para `string`
- **Arquivo:** `src/components/SimuladoHistorico.tsx`

**3. [Rule 2] Header incluído no SimuladoSetup com `lg:col-span-12`**
- **Encontrado durante:** Task 1
- **Problema:** O plano incluía o header no SimuladoSetup mas não especificava como lidar com o grid layout (header full-width, config card 5-col — ambos dentro do grid pai)
- **Correção:** Header renderizado como `<div className="lg:col-span-12">` dentro de Fragment, para ocupar todas as 12 colunas do grid e preservar o layout original
- **Arquivo:** `src/components/SimuladoSetup.tsx`

## Stub Tracking

Nenhum stub identificado — todos os dados fluem via props, sem placeholders ou dados mockados.

## Threat Flags

Nenhum flag — componentes são puramente de apresentação, sem endpoints, acesso a arquivos ou schemas. Apenas recebem dados via props e chamam callbacks.

## Self-Check: PASSED

- ✅ `src/components/SimuladoSetup.tsx` exists
- ✅ `src/components/SimuladoHistorico.tsx` exists
- ✅ `src/pages/Simulados.tsx` exists and compiles
- ✅ `8608fe2` commit exists
- ✅ `69c82b3` commit exists
