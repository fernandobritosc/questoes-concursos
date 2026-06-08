# Phase 1: Paginação de Questões - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Implementar paginação server-side no fetch de questões da tabela `questoes` no Supabase, substituindo a carga única de 1000+ registros por lotes paginados com `.range()`. Filtros passam a ser aplicados na query em vez de pós-carga. Cache adaptado para dados paginados.

</domain>

<decisions>
## Implementation Decisions

### Tamanho do lote
- **D-01:** 200 questões por página — equilíbrio entre número de requests e tamanho de payload

### UX de carregamento
- **D-02:** Skeleton loader enquanto nova página carrega — mostra formato das questões como fallback visual

### Estratégia de cache
- **D-03:** Cache flat progressivo — páginas buscadas são acumuladas num array único em memória. Navegar para páginas já visitadas é instantâneo. Sem TTL porque dados de questão são imutáveis.

### Filtros no servidor
- **D-04:** Formato `Record<string, string>` mantido (ex: `{ materia: "Direito", banca: "CESPE" }`), traduzido para `.in()`/`.eq()` do Supabase na query paginada em vez de filtragem pós-carga

### OpenCode's Discretion
- Estrutura exata do skeleton loader
- Nomes dos novos parâmetros no hook
- Tratamento de erro na paginação (timeout, falha de página específica)

</decisions>

<canonical_refs>
## Canonical References

### Data fetching atual
- `src/services/supabase.service.ts` — `fetchAllQuestoes` com cache e `.limit(1000)`, precisa ser refatorado para `.range()`

### Hooks consumidores
- `src/hooks/useQuestoes.ts` — Hook central que consome `fetchAllQuestoes`, precisa se adaptar a dados paginados
- `src/hooks/useSimulados.ts` — Também consome dados de questões
- `src/hooks/useRevisao.ts` — Também consome dados de questões
- `src/hooks/useDashboard.ts` — Também consome dados de questões

### Filtros atuais
- `src/hooks/useQuestoes.ts` — Lógica de `getFilteredQuestions()` que filtra pós-carga, precisa migrar para server-side

No external specs — requirements captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Cache in-memory pattern já existe em `supabase.service.ts` (60s TTL, deduplicação de chamadas concorrentes) — pode ser adaptado
- Tailwind animate classes (`animate-pulse`) para skeleton — já usado em outros loaders

### Established Patterns
- Data fetching via `supabase` client com `.from()` + `.select()` + `.limit()` — estender com `.range()`
- Estado de loading gerenciado via `useState` + `useEffect` nos hooks

### Integration Points
- `fetchAllQuestoes` é chamado em `useQuestoes.ts` (carga inicial) e potencialmente em outros hooks
- Filtros são aplicados em `getFilteredQuestions()` dentro de `useQuestoes.ts`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-paginacao-de-questoes*
*Context gathered: 2026-06-08*
