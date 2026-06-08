# Questões Concursos — Roadmap

## Core Value

Estudar questões de concursos de forma eficiente, com dados reais de desempenho e resoluções de qualidade, sem precisar ficar alternando entre abas do navegador.

## Phases

- [ ] **Phase 1: Paginação de Questões** — Implementar paginação server-side no fetch de questões, substituindo a carga única de 1000+ registros
- [ ] **Phase 2: Extração de Hooks** — Dividir `useQuestoes.ts` (~701 linhas, 20+ estados) em hooks menores e especializados
- [ ] **Phase 3: Extração de Sub-Componentes** — Extrair sub-componentes de 5 páginas grandes seguindo o padrão estabelecido em Questoes.tsx

---

## Phase Details

### Phase 1: Paginação de Questões

**Goal**: Fetch de questões usa paginação server-side com `.range()` em vez de carga única com `.limit(1000)`, eliminando o gargalo de memória e permitindo escala para qualquer volume de questões.

**Depends on**: Nothing (first phase — altera camada de dados)

**Requirements**: REFAC-03

**Success Criteria** (what must be TRUE):
1. `fetchAllQuestoes()` carrega questões em lotes paginados via `.range(offset, offset + limit)` em vez de `.limit(1000)`
2. O limite arbitrário de 1000 questões é removido — qualquer volume de dados é suportado sem estourar memória
3. Filtros (banca, orgão, cargo, ano) são aplicados server-side com `.in()` em vez de filtragem pós-carga em `getFilteredQuestions()`
4. Cache in-memory (60s TTL) é adaptado ou substituído por um mecanismo que funciona com dados paginados
5. Todos os hooks consumidores (`useQuestoes`, `useSimulados`, `useRevisao`, `useDashboard`) funcionam corretamente com o novo fluxo paginado — nenhuma regressão funcional

**Plans**: 3 plans

```
Plans:
- [ ] 01-01-PLAN.md — Service layer: fetchPaginatedQuestoes, fetchFilterOptions, progressive cache; QuestaoSkeleton component
- [ ] 01-02-PLAN.md — Hook refactor: pagination state, filter-to-query, AbortController, cache integration
- [ ] 01-03-PLAN.md — Page integration: skeleton during page transitions, pageLoading states
```

---

### Phase 2: Extração de Hooks

**Goal**: `useQuestoes.ts` é decomposto em hooks menores e especializados, cada um com responsabilidade única e sem expor setters de estado diretamente aos componentes.

**Depends on**: Phase 1 (paginação afeta estrutura dos hooks que consomem dados)

**Requirements**: REFAC-01

**Success Criteria** (what must be TRUE):
1. `useQuestoes.ts` (~701 linhas) é substituído por pelo menos 3 hooks especializados (ex: `useQuestoesFilter`, `useQuestoesCaderno`, `useQuestoesResolucao`)
2. Cada novo hook expõe funções de ação (ex: `responderQuestao()`, `alternarCaderno()`) em vez de expor setters de estado diretamente
3. A página `Questoes.tsx` consome os novos hooks sem alteração de comportamento visível ao usuário
4. Os 38 testes existentes continuam passando sem modificações
5. TypeScript compila limpo (`tsc -b --noEmit` zero erros) e ESLint reporta zero erros

**Plans**: TBD

---

### Phase 3: Extração de Sub-Componentes

**Goal**: 5 páginas grandes têm sub-componentes extraídos seguindo o padrão estabelecido em Questoes.tsx (1662→334 linhas, 11 sub-componentes), reduzindo cada página para ~300-400 linhas.

**Depends on**: Phase 2 (hooks estáveis e bem definidos)

**Requirements**: REFAC-02

**Success Criteria** (what must be TRUE):
1. `Simulados.tsx` (~983 linhas) é reduzido para ~350 linhas com sub-componentes extraídos
2. `MapaQuestoes.tsx` (~892 linhas) é reduzido para ~350 linhas com sub-componentes extraídos
3. `Revisao.tsx` (~845 linhas) é reduzido para ~350 linhas com sub-componentes extraídos
4. `Dashboard.tsx` (~808 linhas) é reduzido para ~350 linhas com sub-componentes extraídos
5. `EditalVerticalizado.tsx` (~748 linhas) é reduzido para ~350 linhas com sub-componentes extraídos
6. Toda funcionalidade existente é preservada: importar PDF, visualizar questões, responder, navegar, imprimir, simulados, mentor IA, dashboard, mapa, edital verticalizado
7. TypeScript compila limpo, ESLint zero erros, 38+ testes passando

**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Paginação de Questões | 3/0 | Planned | - |
| 2. Extração de Hooks | 0/0 | Not started | - |
| 3. Extração de Sub-Componentes | 0/0 | Not started | - |

---

*Created: 2026-06-08*
