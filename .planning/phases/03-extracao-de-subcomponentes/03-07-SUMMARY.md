---
phase: 03-extracao-de-subcomponentes
plan: 07
subsystem: ImportPdfModal
tags:
  - refactor
  - component-extraction
  - import-pdf
dependency-graph:
  requires: []
  provides:
    - ImportPdfHeader
    - ImportPdfIdleStep
    - ImportPdfLoadingStep
    - ImportPdfQuestionList
    - ImportPdfQuestionEditor
    - ImportPdfSuccessState
    - ImportPdfErrorState
    - ImportPdfReviewFooter
  affects:
    - src/components/ImportPdfModal.tsx
    - src/components/ui/index.ts
tech-stack:
  added: []
  patterns:
    - "Componentes puramente de apresentação (props-only, sem hooks)"
    - "Callback handlers para navegação e ações no review mode"
key-files:
  created:
    - src/components/ImportPdfHeader.tsx
    - src/components/ImportPdfIdleStep.tsx
    - src/components/ImportPdfLoadingStep.tsx
    - src/components/ImportPdfQuestionList.tsx
    - src/components/ImportPdfQuestionEditor.tsx
    - src/components/ImportPdfSuccessState.tsx
    - src/components/ImportPdfErrorState.tsx
    - src/components/ImportPdfReviewFooter.tsx
  modified:
    - src/components/ImportPdfModal.tsx
    - src/components/ui/index.ts
decisions:
  - "ImportPdfQuestionEditor recebe checkIsDbDuplicate/checkIsLocalDuplicate como props em vez de computar internamente, pois dependem de existingQuestions/tempQuestions no escopo do pai"
  - "ImportPdfSuccessState e ImportPdfErrorState adicionados ao barrel export como componentes potencialmente reutilizáveis"
metrics:
  duration: 5min
  completed: 2026-06-08
  importpdfmodal_lines: "794 → 299"
  total_new_component_lines: 619
  tests_passing: 38
---

# Phase 03-07: Extrair sub-componentes do ImportPdfModal

**One-liner:** Extração de 8 sub-componentes do ImportPdfModal.tsx — header, idle step, loading step, question list, question editor, success state, error state e review footer — reduzindo o modal de 794 para 299 linhas.

## Objective

Isolar as 8 seções do ImportPdfModal em componentes dedicados com props tipadas, seguindo o mesmo padrão usado na extração do Questoes.tsx (11 sub-componentes). O modal (794 linhas) foi reduzido para 299 linhas com a criação de 8 novos componentes.

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Extrair ImportPdfHeader — modal header com título, subtítulo e botão X | ✅ | `53c7e93` |
| 2 | Extrair ImportPdfIdleStep — upload area com drag & drop, file info e caderno name | ✅ | `53c7e93` |
| 3 | Extrair ImportPdfLoadingStep — loading states com spinner, step messages e progress bar | ✅ | `53c7e93` |
| 4 | Extrair ImportPdfQuestionList — left panel com scrollable question list e validation badges | ✅ | `53c7e93` |
| 5 | Extrair ImportPdfQuestionEditor — right panel com form fields para edição de questão | ✅ | `53c7e93` |
| 6 | Extrair ImportPdfSuccessState — success check icon + message | ✅ | `53c7e93` |
| 7 | Extrair ImportPdfErrorState — error message + retry/close buttons | ✅ | `53c7e93` |
| 8 | Extrair ImportPdfReviewFooter — review navigation + save buttons | ✅ | `53c7e93` |

## Componentes Extraídos

### ImportPdfHeader (`src/components/ImportPdfHeader.tsx` — 35 linhas)
- Props: `step`, `tempQuestionsLength`, `onClose`, `disabled`
- Renderiza: título dinâmico (baseado no step), subtítulo, botão X com disable durante operações
- Zero hooks — componente puramente de apresentação

### ImportPdfIdleStep (`src/components/ImportPdfIdleStep.tsx` — 119 linhas)
- Props: `importFile`, `customCadernoName`, `onFileChange`, `onRemoveFile`, `onNameChange`, `onCancel`, `onAnalyze`
- Renderiza: drag & drop zone, file info card (nome + tamanho), input de nome do caderno, botões Cancelar/Analisar
- Zero hooks — componente puramente de apresentação

### ImportPdfLoadingStep (`src/components/ImportPdfLoadingStep.tsx` — 36 linhas)
- Props: `step`, `progress`, `total`
- Renderiza: Loader2 spinner, mensagem de passo atual, barra de progresso (reading_pages only), contador de progresso
- Mapa de mensagens por step em objeto `stepMessages` interno
- Zero hooks — componente puramente de apresentação

### ImportPdfQuestionList (`src/components/ImportPdfQuestionList.tsx` — 113 linhas)
- Props: `questions`, `selectedIndex`, `onSelectQuestion`, `dbDuplicateCount`, `localDuplicateCount`, `onDiscardDbDuplicates`, `onDiscardLocalDuplicates`, `checkIsDbDuplicate`, `checkIsLocalDuplicate`
- Renderiza: header com contagem + alerta de validação, botões de descarte de duplicatas, lista rolável de itens com badge de status (erro/duplicata)
- Importa `getQuestionValidation` de `src/lib/validation.ts` como utility function
- Zero hooks — componente puramente de apresentação

### ImportPdfQuestionEditor (`src/components/ImportPdfQuestionEditor.tsx` — 192 linhas)
- Props: `question`, `index`, `totalQuestions`, `onUpdate`, `onDelete`, `checkIsDbDuplicate`, `checkIsLocalDuplicate`
- Renderiza: alertas de validação, formulário completo (ID, Banca, Gabarito, Matéria, Assunto, Órgão, Concurso, Ano, Enunciado, Alternativas A-E), botão descartar questão
- Computa validationErrors/isDbDup/isLocDup internamente a partir das props
- Zero hooks — componente puramente de apresentação

### ImportPdfSuccessState (`src/components/ImportPdfSuccessState.tsx` — 26 linhas)
- Props: `total`, `importedCount`, `onClose`
- Renderiza: check icon com bounce, mensagem de sucesso, botão "Concluir e Fechar"
- Zero hooks — componente puramente de apresentação

### ImportPdfErrorState (`src/components/ImportPdfErrorState.tsx` — 33 linhas)
- Props: `errorMsg`, `onRetry`, `onClose`
- Renderiza: alert triangle icon, mensagem de erro, botões "Tentar Novamente" e "Fechar"
- Zero hooks — componente puramente de apresentação

### ImportPdfReviewFooter (`src/components/ImportPdfReviewFooter.tsx` — 65 linhas)
- Props: `selectedIndex`, `totalQuestions`, `hasValidationErrors`, `hasLocalDuplicates`, `onPrevious`, `onNext`, `onDiscard`, `onSave`
- Renderiza: navegação Anterior/Próxima, botões "Descartar Lote" e "Confirmar e Gravar" com disable lógico
- `canSave` computado internamente: `totalQuestions > 0 && !hasValidationErrors && !hasLocalDuplicates`
- Zero hooks — componente puramente de apresentação

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc -b --noEmit` | ✅ Zero erros |
| `npx eslint . --max-warnings=200` | ✅ Zero erros |
| `npm test` | ✅ 38 testes passando |

## Success Criteria

- [x] ImportPdfModal.tsx reduzido de 794 → 299 linhas (~62%)
- [x] 8 sub-componentes criados com props tipadas
- [x] Sub-componentes não importam hooks (recebem tudo via props)
- [x] Barrel export atualizado com componentes reutilizáveis (`ImportPdfSuccessState`, `ImportPdfErrorState`)
- [x] Toda funcionalidade existente preservada (import PDF, editar questões, navegar, salvar)

## Deviations from Plan

Nenhuma — plano executado conforme escrito.

- ImportPdfQuestionEditor (192 linhas) é o maior componente extraído porque contém todo o formulário de edição (11 campos + 5 alternativas) que estava inline no modal original.

## Self-Check: PASSED

- [x] `src/components/ImportPdfHeader.tsx` — existe (35 linhas)
- [x] `src/components/ImportPdfIdleStep.tsx` — existe (119 linhas)
- [x] `src/components/ImportPdfLoadingStep.tsx` — existe (36 linhas)
- [x] `src/components/ImportPdfQuestionList.tsx` — existe (113 linhas)
- [x] `src/components/ImportPdfQuestionEditor.tsx` — existe (192 linhas)
- [x] `src/components/ImportPdfSuccessState.tsx` — existe (26 linhas)
- [x] `src/components/ImportPdfErrorState.tsx` — existe (33 linhas)
- [x] `src/components/ImportPdfReviewFooter.tsx` — existe (65 linhas)
- [x] `src/components/ImportPdfModal.tsx` — modificado, 299 linhas
- [x] `src/components/ui/index.ts` — barrel atualizado com 2 exports
- [x] Commit `53c7e93` — existe
- [x] Commit `600dfcb` — existe
