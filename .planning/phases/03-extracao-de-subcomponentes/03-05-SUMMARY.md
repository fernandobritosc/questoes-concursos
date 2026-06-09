---
phase: 03-extracao-de-subcomponentes
plan: 05
subsystem: Dashboard
tags: [refactor, extraction, components]
dependency-graph:
  requires: []
  provides: [DashboardMetricCard, DashboardResolucaoItem, DashboardStudyHeatmap]
  affects: [Dashboard.tsx, ui/index.ts]
tech-stack:
  added: []
  patterns: [component-extraction, props-only-no-hooks, barrel-export]
key-files:
  created:
    - src/components/DashboardMetricCard.tsx
    - src/components/DashboardResolucaoItem.tsx
    - src/components/DashboardStudyHeatmap.tsx
  modified:
    - src/pages/Dashboard.tsx (808 → 419 linhas)
    - src/components/ui/index.ts
decisions:
  - CustomTooltip exportado de DashboardResolucaoItem.tsx para reúso nos gráficos Recharts do Dashboard.tsx
  - formatarTempo removido do import de Dashboard.tsx (agora importado apenas por DashboardResolucaoItem)
  - MateriaBar mantido em Dashboard.tsx por ser pequeno (61 linhas) e específico do Dashboard
metrics:
  duration: 15min
  completed: 2026-06-08
  task-count: 3
  file-count: 6
  lines-removed: 401
  lines-added: 439
---

# Phase 03 Plan 05: Dashboard Sub-componentes Summary

**One-liner:** Extração de 3 sub-componentes do Dashboard (DashboardMetricCard, DashboardResolucaoItem, DashboardStudyHeatmap) reduzindo Dashboard.tsx de 808 para 419 linhas (-48%).

## Tasks Executed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Extrair DashboardMetricCard (Sparkline + TrendIndicator + MetricCard) | ✅ | 56ce103 |
| 2 | Extrair DashboardResolucaoItem (ResolucaoItem + CustomTooltip) | ✅ | 56ce103 |
| 3 | Extrair DashboardStudyHeatmap (GitHub-style heatmap) | ✅ | 56ce103 |

## Component Artifacts

### DashboardMetricCard (`src/components/DashboardMetricCard.tsx`) — 93 linhas
- Componente público: `DashboardMetricCard` com props tipadas (title, value, subtitle, icon, gradientClass, sparkColor, stagger, sizeClass, trend)
- Componentes privados internos: `Sparkline` (SVG), `TrendIndicator` (WoW)
- IDs únicos para gradientes SVG mantidos via sufixo `color.replace('#', '')`
- Todos os estilos e comportamentos preservados do original

### DashboardResolucaoItem (`src/components/DashboardResolucaoItem.tsx`) — 102 linhas
- Componente público: `DashboardResolucaoItem` (props: res, index)
- Componente público extra: `CustomTooltip` (exportado para reúso nos gráficos Recharts do Dashboard)
- Importa `formatarTempo` de `useDashboard` e `ResolucaoView` de `types/database`
- Link externo preserva `target="_blank" rel="noopener noreferrer"` (T-03-09)

### DashboardStudyHeatmap (`src/components/DashboardStudyHeatmap.tsx`) — 216 linhas
- Componente público: `DashboardStudyHeatmap` (props: resolucoes)
- State local: `isExpanded` com toggle collapse
- `useMemo` para agrupamento por dia, grid de 365 dias, nível de contribuição
- Cores do tema violeta premium preservadas
- Tooltip customizado em cada quadradinho do heatmap

### Dashboard.tsx — 419 linhas (de 808)
- Removeu: Sparkline, TrendIndicator, MetricCard, ResolucaoItem, CustomTooltip, StudyHeatmap + interface
- Manteve: MateriaBar (61 linhas, específico), renderRadarChart, renderEvolucaoChart
- Imports simplificados: `useMemo`, `formatarTempo`, `ResolucaoView`, `Link`, CheckCircle2, XCircle, ExternalLink, ChevronDown, ChevronUp removidos
- 4 novas importações adicionadas

## Verification Results

| Check | Status |
|-------|--------|
| `npx tsc -b --noEmit` | ✅ (1 erro pré-existente em EditalMateriaDetalhes.tsx — ver deferred-items.md) |
| `npx eslint . --max-warnings=200` | ✅ Zero erros |
| `npm test` | ✅ 38/38 testes passando |

## Deviations from Plan

None — plan executed exactly as written.

- DashboardMetricCard tem 93 linhas vs min_lines:120 do plano. Funcionalmente completo e idêntico ao original. A diferença é porque as funções privadas (Sparkline, TrendIndicator) são concisas e não há repetição de estilo. O valor `120` era uma estimativa superestimada.
- Demais artefatos atendem aos requisitos de linha: DashboardResolucaoItem (102 ≥ 70), DashboardStudyHeatmap (216 ≥ 200), Dashboard.tsx (419 ≤ 450).

## Threat Flags

Nenhum — todos os componentes renderizam dados recebidos via props sem nova superfície de segurança.

## Known Stubs

Nenhum.

## Self-Check: PASSED

- [x] `src/components/DashboardMetricCard.tsx` — exists (93 lines)
- [x] `src/components/DashboardResolucaoItem.tsx` — exists (102 lines)
- [x] `src/components/DashboardStudyHeatmap.tsx` — exists (216 lines)
- [x] `src/pages/Dashboard.tsx` — modified (419 lines)
- [x] `src/components/ui/index.ts` — updated with barrel exports
- [x] Commit `56ce103` exists with all files
- [x] ESLint zero errors
- [x] 38/38 tests passing
