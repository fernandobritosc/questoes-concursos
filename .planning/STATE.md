# STATE.md — Questões Concursos

## Project Reference

| Field | Value |
|-------|-------|
| **Core Value** | Estudar questões de concursos de forma eficiente, com dados reais de desempenho e resoluções de qualidade, sem precisar ficar alternando entre abas do navegador. |
| **Current Focus** | Refatorar e estabilizar o código existente — 3 pendências de auditoria: paginação, extração de hooks, extração de sub-componentes. |
| **Mode** | YOLO |
| **Granularity** | Coarse |

## Current Position

| Phase | Status | Phase Goal |
|-------|--------|------------|
| 1 — Paginação de Questões | Not started | Fetch de questões usa paginação server-side |
| 2 — Extração de Hooks | Not started | useQuestoes.ts dividido em hooks menores |
| 3 — Extração de Sub-Componentes | Not started | 5 páginas grandes têm sub-componentes extraídos |

**Progress:** [###·················] 33% (1/3 phases planned)

**Active Plan:** Phase 1 — Paginação de Questões (3 plans created, ready for execution)

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Phase 1 plans created | ≥1 | 3 ✓ |
| Phase 2 plans created | ≥1 | 0 |
| Phase 3 plans created | ≥1 | 0 |
| Requirement coverage | 100% | 3/3 ✓ |

## Accumulated Context

### Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-08 | Ordem: Paginação → Hooks → Componentes | Dependency chain natural: dados → hooks → UI |
| 2026-06-08 | Phase 1 (REFAC-03) como primeira fase | Paginação altera a camada de dados que hooks e componentes consomem |
| 2026-06-08 | 3 fases com granularidade coarse | Apenas 3 requisitos v1 ativos; compressão natural sem artificialidades |
| 2026-06-08 | Sub-componentes extraídos seguem padrão Questoes.tsx | Padrão já provado: 1662→334 linhas, 11 sub-componentes |

### Open Todos

- [x] Phase 1: Definir tamanho do lote de paginação (D-01: 200)
- [x] Phase 1: Decidir estratégia de cache (D-03: flat progressivo, sem TTL)
- [ ] Phase 2: Definir quais hooks extrair e suas responsabilidades
- [ ] Phase 2: Validar que hooks expõem actions, não setters
- [ ] Phase 3: Identificar candidatos a sub-componente em cada página

### Known Blockers

- Nenhum bloqueador identificado no momento.

### Technical Debt (deferidos deste roadmap)

- `any` types em serviços (43+ anotações) — adiado para próximo milestone
- ESLint-disable proliferation (30 suppressions) — adiado
- `getQuestionValidation` duplicado — extrair para `src/lib/validation.ts` (pode ser feito no Phase 2)
- ObjectURL cleanup em `studyMaterial.service.ts` — pode ser incluído como bônus
- ErrorBoundary não usado nas rotas — pode ser incluído como bônus

## Session Continuity

### Last Session (2026-06-08)

- Roadmap criado com 3 fases para endereçar os 3 requisitos de refactoring
- REQUIREMENTS.md criado com traceability
- ROADMAP.md criado
- STATE.md criado
- **Plan 01 (Wave 1):** Service layer + skeleton — fetchPaginatedQuestoes, fetchFilterOptions, progressive cache, QuestaoSkeleton
- **Plan 02 (Wave 2):** Hook refactor — pagination state, filter-to-query, AbortController
- **Plan 03 (Wave 3):** Page integration — skeleton during page transitions

### Next Session

- Executar `/gsd-execute-phase 01-paginacao-de-questoes` para implementar os 3 planos

---

*Last updated: 2026-06-08*
