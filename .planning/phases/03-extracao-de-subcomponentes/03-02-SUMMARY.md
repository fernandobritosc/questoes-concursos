---
phase: 03-extracao-de-subcomponentes
plan: 02
name: "Extração MapaStatsCards, MapaMateriaAccordion, MapaSqlSetupModal"
subsystem: MapaQuestoes
tags: [refactor, extraction, components, sub-components, props-only]
requires: []
provides: [src/components/MapaStatsCards.tsx, src/components/MapaMateriaAccordion.tsx, src/components/MapaSqlSetupModal.tsx]
affects: [src/pages/MapaQuestoes.tsx, src/components/ui/index.ts]
tech-stack:
  added: [MapaStatsCards, MapaMateriaAccordion, MapaSqlSetupModal]
  patterns: [Props-only components - no data hooks, colocated type exports]
key-files:
  created:
    - src/components/MapaStatsCards.tsx
    - src/components/MapaMateriaAccordion.tsx
    - src/components/MapaSqlSetupModal.tsx
  modified:
    - src/pages/MapaQuestoes.tsx
    - src/components/ui/index.ts
decisions:
  - "SubTopicData e SubjectData interfaces colocated in MapaMateriaAccordion.tsx and exported"
  - "formatSize function moved to MapaMateriaAccordion.tsx as private unexported helper"
  - "sqlCode const + handleCopySql + copiedSql state internalized in MapaSqlSetupModal"
  - "Drop totalAcertos from MapaStatsCards props (not used in rendering)"
metrics:
  duration: "30min"
  completed: "2026-06-08"
---

# Phase 03 Plan 02: Extração MapaStatsCards, MapaMateriaAccordion, MapaSqlSetupModal Summary

**One-liner:** Extraídos 3 sub-componentes de MapaQuestoes.tsx — stats cards, accordion de matérias e modal SQL — reduzindo a página de 892 para 374 linhas (-58%).

## Tasks Executed

| # | Task | Status | Files |
|---|------|--------|-------|
| 1 | Extrair MapaStatsCards | ✅ | `MapaStatsCards.tsx` (84 linhas) |
| 2 | Extrair MapaMateriaAccordion | ✅ | `MapaMateriaAccordion.tsx` (286 linhas) + `SubjectData`/`SubTopicData` exports |
| 3 | Extrair MapaSqlSetupModal | ✅ | `MapaSqlSetupModal.tsx` (135 linhas) |

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | ✅ Zero erros (files modified by this plan) |
| `npx eslint . --max-warnings=200` | ✅ Zero erros |
| `npm test` | ✅ 38 testes passando (3 suites) |

## Detailed Changes

### Task 1: MapaStatsCards — Grid de 4 Cartões de Estatísticas

- **Criado:** `src/components/MapaStatsCards.tsx` (84 linhas)
- **Props:** `totalAssuntos`, `totalQuestoes`, `totalResolvidasUnicas`, `totalTentativas`, `aproveitamentoGeral`, `topAssuntoEstudado`, `subjectsCount`
- **Icons:** `Layers`, `CheckCircle2`, `Percent`, `TrendingUp` (lucide-react)
- **No MapaQuestoes.tsx:** Grid JSX substituído por `<MapaStatsCards .../>`
- **Nota:** `totalAcertos` omitido da interface — não usado em renderização

### Task 2: MapaMateriaAccordion — Accordion de Matérias com Sub-tópicos

- **Criado:** `src/components/MapaMateriaAccordion.tsx` (286 linhas)
- **Exports:** `SubjectData`, `SubTopicData` (interfaces colocated e exportadas)
- **Props:** `subjects`, `expandedSubjects`, `onToggleSubject`, `uploadingKey`, `materialsMetadata`, `onUploadPdf`, `onOpenPdf`, `onDeletePdf`, `onRevisar`
- **Helpers internos:** `formatSize()` (privada, não exportada)
- **Preserva:** Cores/badges por status (excelente/atencao/critico/nao_estudado), tooltips, animações, legenda no primeiro card expandido, estado vazio
- **No MapaQuestoes.tsx:** Listagem de matérias (245 linhas) substituída por `<MapaMateriaAccordion .../>`
- **Icons:** `ChevronDown`, `ChevronUp`, `HelpCircle`, `Award`, `AlertTriangle`, `ShieldAlert`, `FileText`, `BookOpen`, `Trash2`, `Upload`, `Play`, `Layers`

### Task 3: MapaSqlSetupModal — Modal Instrutivo de SQL para Nuvem

- **Criado:** `src/components/MapaSqlSetupModal.tsx` (135 linhas)
- **Props:** `isOpen`, `onClose`, `onRetry`
- **Internalizado:** `sqlCode` (const), `handleCopySql` (handler), `copiedSql` (useState)
- **No MapaQuestoes.tsx:** Modal SQL (95 linhas) substituído por `<MapaSqlSetupModal .../>`
- **Icons:** `Cloud`, `AlertCircle`, `X`, `Copy`, `Check` (lucide-react)

### Barrel Export

`src/components/ui/index.ts` atualizado com:

```typescript
export { MapaStatsCards } from '../MapaStatsCards'
export { MapaMateriaAccordion } from '../MapaMateriaAccordion'
export { MapaSqlSetupModal } from '../MapaSqlSetupModal'
```

## MapaQuestoes.tsx Line Count Reduction

| Section | Before | After |
|---------|--------|-------|
| Imports | 37 linhas | 17 linhas |
| Interfaces | 19 linhas | 0 (importadas) |
| formatSize/sqlCode/handleCopySql/tail | 63 linhas | 0 (movidos) |
| Stats grid JSX | 68 linhas | `<MapaStatsCards>` (9 linhas) |
| Accordion list JSX | 245 linhas | `<MapaMateriaAccordion>` (11 linhas) |
| SQL modal JSX | 95 linhas | `<MapaSqlSetupModal>` (16 linhas) |
| **Total** | **892 linhas** | **374 linhas** (-58%) |

## Deviations from Plan

None. Plan executed exactly as written.

## Known Stubs

None detected.

## Threat Flags

None — components are props-only with no new network endpoints, auth paths, or trust boundary changes.

## Commits

- `1632533`: feat(03-extracao-de-subcomponentes): extract MapaStatsCards, MapaMateriaAccordion, MapaSqlSetupModal

## Self-Check: PASSED

- [x] `src/components/MapaStatsCards.tsx` exists (84 linhas)
- [x] `src/components/MapaMateriaAccordion.tsx` exists (286 linhas)
- [x] `src/components/MapaSqlSetupModal.tsx` exists (135 linhas)
- [x] `src/pages/MapaQuestoes.tsx` exists (374 linhas, <500)
- [x] Commit `1632533` found in git log
