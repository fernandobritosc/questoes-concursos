# Questões Concursos

## Current State

**Shipped: v1.0 Refatoração** (2026-06-09)

3 fases, 13 plans, 14 tasks — 100% concluído.

- Paginação server-side com `.range()`, filtros server-side, cache progressivo
- `useQuestoes.ts` decomposto em 3 hooks especializados (847→253 linhas, −40%)
- 26+ sub-componentes extraídos de 6 páginas grandes (~4000 linhas reduzidas)
- ESLint 0 erros, TypeScript 0 erros, 251 testes passando
- Loop infinito e tremor visual corrigidos

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
- ✓ Paginação server-side com `.range()` — v1.0 (REFAC-03)
- ✓ Hooks especializados (useQuestoesFilter, useQuestoesCaderno, useQuestoesResolucao) — v1.0 (REFAC-01)
- ✓ Sub-componentes extraídos de 6 páginas grandes — v1.0 (REFAC-02)

### Active

(Vazio — aguardando definição do próximo milestone)

### Out of Scope

- Aplicativo mobile nativo — manter web-first
- Modo offline completo — apenas cache parcial via IndexedDB
- Suporte a múltiplos concurseiros (compartilhamento) — uso individual

## Context

Projeto em produção, refatorado completamente no milestone v1.0. Todos os 3 refactors maiores concluídos: paginação server-side, extração de hooks (useQuestoes 847→253 linhas), e extração de sub-componentes de 6 páginas grandes (~4000 linhas reduzidas). TypeScript, ESLint e 251 testes passando limpo. Próximo milestone focado em novas features — cadastro de usuários é a primeira prioridade.

## Constraints

- **Tech Stack**: React 19, TypeScript 6, Vite 8, Tailwind 4, Supabase, Groq AI — congelado
- **TypeScript**: Strict mode, zero errors no `tsc -b --noEmit`
- **ESLint**: Zero errors, máximo 200 warnings
- **Testes**: 38 testes existentes devem continuar passando

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Refatorar antes de novas features | Código identificado na auditoria como prioridade | ✓ Concluído v1.0 |
| Extrair hooks (useQuestoes) | 847 linhas com 20+ states viola SRP | ✓ Concluído v1.0 (253 linhas) |
| Extrair sub-componentes (6 páginas) | Reduzir ~4000 linhas combinadas | ✓ Concluído v1.0 |
| Paginação no fetch (PAGE_SIZE=200) | 1000+ questões por requisição = alto consumo de memória | ✓ Concluído v1.0 |
| Ordem: Paginação → Hooks → Componentes | Dependency chain natural: dados → hooks → UI | ✓ Concluído v1.0 |
| Sub-componentes puramente de apresentação | Props-only, zero hooks | ✓ Concluído v1.0 |

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
*Last updated: 2026-06-09 after v1.0 milestone*
