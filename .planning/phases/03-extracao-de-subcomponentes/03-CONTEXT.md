# Phase 3: Extração de Sub-Componentes — Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Extrair sub-componentes de 5 páginas grandes seguindo o padrão estabelecido em Questoes.tsx (1662→334 linhas, 11 sub-componentes). Reduzir cada página para ~300-400 linhas.

**Ordem:** Simulados → MapaQuestoes → Revisao → Dashboard → EditalVerticalizado

</domain>

<decisions>
## Implementation Decisions

### Padrão de extração
- **D-01:** Seguir o padrão Questoes.tsx: identificar seções visuais autônomas (cards, tabelas, modais, painéis laterais) e extrair para `src/components/` com props tipadas
- **D-02:** Cada sub-componente recebe dados via props, nunca importa hooks diretamente (a página pai injeta os dados)
- **D-03:** Manter barrel exports em `src/components/ui/index.ts` para componentes compartilhados

### Escopo
- **D-04:** Extrair primeiro de Simulados.tsx (maior, 983 linhas), depois seguir ordem decrescente de tamanho
- **D-05:** Extração por página: 3-5 sub-componentes por página, suficientes para atingir ~350 linhas cada

### OpenCode's Discretion
- Nomes e estrutura exata dos sub-componentes
- Quantos sub-componentes extrair por página
- Pasta de destino (pasta por página ou plana em components/)

</decisions>

<canonical_refs>
## Canonical References

### Padrão estabelecido
- `src/components/QuestaoVisualizador.tsx` — Exemplo de sub-componente extraído de Questoes.tsx
- `src/components/QuestaoTabs.tsx` — Exemplo de sub-componente de UI
- `src/components/QuestaoNavegacao.tsx` — Exemplo de sub-componente com props
- `src/pages/Questoes.tsx` — Página de referência: 392 linhas após refactor

### Páginas-alvo
- `src/pages/Simulados.tsx` — 983 linhas
- `src/pages/MapaQuestoes.tsx` — 892 linhas
- `src/pages/Revisao.tsx` — 845 linhas
- `src/pages/Dashboard.tsx` — 808 linhas
- `src/pages/EditalVerticalizado.tsx` — 748 linhas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Barrel exports em `src/components/ui/index.ts`
- ErrorBoundary pattern usado em Questoes.tsx
- Componentes já extraídos: QuestaoVisualizador, QuestaoTabs, QuestaoNavegacao, QuestaoGabarito, QuestaoEstatisticas, QuestaoIndice, QuestaoResolucaoProfessor, QuestaoPrintView, MeuDesempenho, QuestaoModalEdicao, QuestaoSkeleton

### Estabilished Patterns
- 1 arquivo por componente
- Props tipadas com interface no mesmo arquivo
- Export nomeado (não default)

</code_context>
