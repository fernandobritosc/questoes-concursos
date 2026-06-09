---
phase: 03-extracao-de-subcomponentes
plan: 04
subsystem: Simulados
tags: [refactor, component-extraction, simulados, exam-view, results-view]
dependency-graph:
  requires: [03-01]
  provides: []
  affects: [Simulados.tsx]
tech-stack:
  added: []
  patterns: [component-extraction, props-only-no-hooks]
key-files:
  created:
    - src/components/SimuladoExamView.tsx
    - src/components/SimuladoResultados.tsx
  modified:
    - src/pages/Simulados.tsx
    - src/components/ui/index.ts
decisions:
  - "onFinalizarSimulado confirm dialog mantida no pai por flexibilidade de mensagens"
metrics:
  duration: 3m
  completed: 2026-06-08
---

# Phase 03 Plan 04: Simulados P2 Summary

Extração de `SimuladoExamView` e `SimuladoResultados` de `Simulados.tsx`, completando a refatoração da página do simulado.

## Result

| Métrica | Antes | Depois |
|---------|-------|--------|
| `Simulados.tsx` | 691 linhas | 233 linhas (–66%) |
| `SimuladoExamView.tsx` | — | 221 linhas (novo) |
| `SimuladoResultados.tsx` | — | 309 linhas (novo) |
| Sub-componentes extraídos | 2 (Setup + Historico do P1) | 4 (total no ecossistema) |

### Componentes Extraídos

| Componente | Linhas | O que contém |
|------------|--------|-------------|
| `SimuladoExamView` | 221 | Barra superior com cronômetro, enunciado, alternativas, grade de navegação |
| `SimuladoResultados` | 309 | Cabeçalho, cartões de desempenho, diagnóstico IA, revisão detalhada com accordions |

## Arquitetura

```
Simulados.tsx (233 linhas — orquestrador)
├── SimuladoSetup          ← 03-01
├── SimuladoHistorico      ← 03-01
├── SimuladoExamView       ← 03-04 (AGORA)
├── SimuladoResultados     ← 03-04 (AGORA)
└── submitting (inline — 19 linhas)
```

### Fluxo de dados
- `SimuladoExamView` recebe `questoes`, `questaoAtualIndex`, `respostasMarcadas`, `tempoRestante` + callbacks
- `SimuladoResultados` recebe `pontuacao`, `tempoGasto`, `questoes`, `respostasMarcadas`, `diagnosticoIA` + callbacks
- Callbacks retornam ao hook `useSimulados` via `Simulados.tsx`

### Interface de props
```typescript
interface SimuladoExamViewProps {
  questoes: ResolucaoView[]
  questaoAtualIndex: number
  onSetQuestaoAtualIndex: (index: number | ((prev: number) => number)) => void
  respostasMarcadas: Record<number, string>
  onMarcarResposta: (questaoId: number, letra: string) => void
  tempoRestante: number
  onFinalizarSimulado: () => void
}

interface SimuladoResultadosProps {
  pontuacao: { taxa: number; acertos: number; total: number }
  tempoGasto: number
  questoes: ResolucaoView[]
  respostasMarcadas: Record<number, string>
  diagnosticoIA: string | null
  loadingFeedback: boolean
  activeReviewIndex: number | null
  onToggleReview: (index: number | null) => void
  explicacoesRevisao: Record<number, string>
  loadingExplicacao: number | null
  onGerarExplicacao: (q: ResolucaoView) => void
  onReset: () => void
}
```

## Verification

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | ✅ Zero erros |
| `npx eslint . --max-warnings=200` | ✅ Zero erros |
| `npm test` | ✅ 38 testes passando |
| `Simulados.tsx` ≤ 350 linhas | ✅ 233 linhas |

## Deviations from Plan

None — plan executed exactly as written.

## Stub Tracking

No stubs found. Both components receive real data via props from `useSimulados()` hook.

## Key Decisions

1. **Confirm dialogs mantidos no pai**: `onFinalizarSimulado` é passado com `window.confirm` do `Simulados.tsx`, mantendo a lógica de diálogo perto do hook.
2. **`isApproved` local no `SimuladoResultados`**: Calculado inline (`pontuacao.taxa >= 70`) — não justifica prop separada.
3. **`formatCountdown` privado no `SimuladoExamView`**: Helper sem dependências externas, mantido como função não exportada no módulo.

## Self-Check: PASSED

- [x] `src/components/SimuladoExamView.tsx` — 221 linhas, zero erros
- [x] `src/components/SimuladoResultados.tsx` — 309 linhas, zero erros  
- [x] `src/pages/Simulados.tsx` — 233 linhas, zero erros
- [x] `src/components/ui/index.ts` — barrel export atualizado
- [x] Commits: `07a221c` (ExamView) + `5ddc59e` (Resultados)
