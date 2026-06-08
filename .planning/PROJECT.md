# Questões Concursos

## What This Is

Plataforma web para estudar questões de concursos públicos brasileiros. O usuário importa PDFs do TEC Concursos, visualiza questões com alternativas, recebe resoluções de professores (extraídas via extensão Chrome), consulta estatísticas de desempenho, faz simulados com feedback de IA (Groq/Llama), e mantém um caderno de erros com revisão espaçada.

## Core Value

Estudar questões de concursos de forma eficiente, com dados reais de desempenho e resoluções de qualidade, sem precisar ficar alternando entre abas do navegador.

## Requirements

### Validated

- ✓ Importação de PDF do TEC Concursos com parsing de questões — existing
- ✓ Visualização de questões com alternativas A-E e gabarito — existing
- ✓ Resolução do professor (extraída via extensão Chrome do TEC Concursos) — existing
- ✓ Estatísticas de desempenho por questão — existing
- ✓ Simulados com temporizador e feedback do Gemini/Groq — existing
- ✓ Caderno de erros com revisão espaçada — existing
- ✓ Mentor IA para plano de estudos personalizado — existing
- ✓ Dashboard com métricas de desempenho — existing
- ✓ Mapa de questões com materiais de estudo em PDF — existing
- ✓ Edital verticalizado — existing
- ✓ Autenticação via Supabase — existing
- ✓ Armazenamento híbrido (Supabase + IndexedDB) — existing
- ✓ Impressão de questões — existing

### Active

- [ ] **REFAC-01**: Extrair hooks menores de `useQuestoes.ts` (reduzir de 637 linhas para ~3 hooks especializados)
- [ ] **REFAC-02**: Extrair sub-componentes de 5 páginas grandes (Simulados ~917, MapaQuestoes ~807, Revisao ~781, Dashboard ~737, EditalVerticalizado ~689)
- [ ] **REFAC-03**: Implementar paginação no fetch de questões (substituir carga única de 1000+ questões por lazy-load com `.range()`)

### Out of Scope

- Aplicativo mobile nativo — manter web-first
- Modo offline completo — apenas cache parcial via IndexedDB
- Suporte a múltiplos concurseiros (compartilhamento) — uso individual

## Context

Projeto em produção, já refatorado parcialmente (Questoes.tsx: 1662→334 linhas, ImportPdfModal.tsx: 1053→797 linhas). Código auditado com 23 achados em code review, dos quais 7 foram corrigidos nesta sessão. 3 refactors maiores pendentes. TypeScript, ESLint e testes (38) passando limpo.

## Constraints

- **Tech Stack**: React 19, TypeScript 6, Vite 8, Tailwind 4, Supabase, Groq AI — congelado
- **TypeScript**: Strict mode, zero errors no `tsc -b --noEmit`
- **ESLint**: Zero errors, máximo 200 warnings
- **Testes**: 38 testes existentes devem continuar passando

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Refatorar antes de novas features | Código identificado na auditoria como prioridade | — Pending |
| Extrair hooks (useQuestoes) | 637 linhas com 20+ states viola SRP | — Pending |
| Extrair sub-componentes (5 páginas) | Reduzir ~4000 linhas combinadas | — Pending |
| Paginação no fetch | 1000+ questões por requisição = alto consumo de memória | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-08 after initialization*
