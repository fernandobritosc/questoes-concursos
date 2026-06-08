# Phase 2: Extração de Hooks — Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Extrair 3 hooks especializados de `useQuestoes.ts` (~847 linhas), mantendo-o como orquestrador que compõe os hooks menores e re-exporta a mesma interface. `Questoes.tsx` não muda — toda a refatoração é interna.

Hooks a extrair:
1. **`useQuestoesFilter`** — Estado de filtros, toggles, `buildServerFilters()`, `getFilteredQuestions()`, `materiasUnicas`/`bancasUnicas` etc.
2. **`useQuestoesCaderno`** — Caderno de estudo, navegação entre questões (`currentQuestaoIndex`), histórico da questão ativa, confirmação de resposta (`handleConfirmarResposta`), edição de questão (`handleEditQuestao`), timer
3. **`useQuestoesResolucao`** — Resolução do professor (`handleSaveResolucao`, `editingResolucao`, `resolucaoText`) + explicação IA (`handleExplicacaoIA`)

</domain>

<decisions>
## Implementation Decisions

### Extração de hooks
- **D-01:** 3 hooks extraídos: `useQuestoesFilter`, `useQuestoesCaderno`, `useQuestoesResolucao`
- **D-02:** `useQuestoes` vira orquestrador — compõe os 3 hooks e re-exporta a mesma interface (847 → ~30 linhas)

### Interface dos hooks
- **D-03:** Filter hook expõe apenas **actions** (`handleToggleMateria`, `handleResetFilters`), nunca setters de estado diretamente
- **D-04:** Caderno hook expõe tanto estado (para leitura) quanto actions (para mutação). Ex: `currentQuestaoIndex` (leitura) + `setCurrentQuestaoIndex` (setter, necessário para navegação externa)
- **D-05:** Resolução hook mantém interface atual (leitura + setters + actions)

### Compatibilidade
- **D-06:** `useQuestoes()` continua exportando EXATAMENTE os mesmos campos da interface atual. Nenhum componente consumidor precisa ser modificado.
- **D-07:** Os 3 hooks especializados são exportados individualmente para consumo futuro em sub-componentes (Phase 3)

### Responsabilidades de cada hook

#### `useQuestoesFilter`
- Estado: `objetivo`, `activeTab`, `searchTerm`, `showSearchBox`, `selectedMaterias`, `selectedAssuntos`, `selectedBancas`, `selectedAnos`, `selectedOrgaos`, `selectedConcursos`, `selectedCarreiras`, `selectedEscolaridades`, `selectedFormacoes`, `selectedRegioes`, `selectedFavoritas`, `selectedEnunciados`, `selectedStatus`, `isFilterExpanded`, `visibleQuestionsCount`, `expandedMateriaFolder`, `cadernoNome`, `pastaDestino`, `gerarEmSerie`, `filtros`
- Actions: `handleToggleMateria`, `handleToggleAssunto`, `handleToggleBanca`, `handleToggleAno`, `handleToggleOrgao`, `handleToggleConcurso`, `handleToggleCarreira`, `handleToggleEscolaridade`, `handleToggleFormacao`, `handleToggleRegiao`, `handleToggleFavorita`, `handleToggleEnunciado`, `handleResetFilters`
- Lógica: `buildServerFilters()`, `getFilteredQuestions()`
- Derivados: `materiasUnicas`, `materiasComAssuntos`, `bancasUnicas`, `anosUnicos`, `orgaosUnicos`, `concursosUnicos`, `filteredQuestions`, `filteredCount`, `totalFiltrosAtivos`
- Setters ainda expostos (para compatibilidade com QuestaoModalEdicao etc.): `setSelectedAssuntos`, `setActiveTab`, `setSearchTerm`, `setShowSearchBox`, `setSelectedStatus`, `setIsFilterExpanded`, etc.

#### `useQuestoesCaderno`
- Estado: `cadernoQuestoes`, `isCadernoActive`, `currentQuestaoIndex`, `alternativaSelecionada`, `revelado`, `tempoSegundos`, `salvandoResposta`, `historicoQuestaoAtiva`, `loadingHistoricoAtivo`, `copiedId`
- Actions: `handleGerarCaderno`, `handleConfirmarResposta`, `handleEditQuestao`, `handleCopy`, `loadHistoricoDaQuestao`
- Effects: timer (incrementa tempoSegundos), reset timer on navigation, load historico on navigation, sync resolução text on navigation

#### `useQuestoesResolucao`
- Estado: `editingResolucao`, `resolucaoText`, `resolucaoExpanded`, `savingResolucao`, `explicacoes`, `loadingExplicacao`
- Actions: `handleSaveResolucao`, `handleExplicacaoIA`
- Effeito: sync `resolucaoText` on navigation (recebe via param/callback)

### OpenCode's Discretion
- Estrutura exata dos arquivos (1 hook por arquivo em `src/hooks/`)
- Nomes internos de funções auxiliares
- Estratégia de tipagem das interfaces de parâmetros entre hooks

</decisions>

<canonical_refs>
## Canonical References

### Código atual
- `src/hooks/useQuestoes.ts` — Hook de 847 linhas a ser decomposto
- `src/pages/Questoes.tsx` — Consumidor principal (não deve mudar)
- `src/components/QuestaoVisualizador.tsx` — Consome parte do estado
- `src/components/QuestaoResolucaoProfessor.tsx` — Consome resolução + IA

### Hooks existentes (padrão a seguir)
- `src/hooks/useSimulados.ts` — Hook grande existente (padrão de organização)
- `src/hooks/useRevisao.ts` — Hook médio existente
- `src/hooks/useDashboard.ts` — Hook pequeno existente

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `makeToggle()` helper pattern (linha 437 de useQuestoes.ts) — genérico, portável para filter hook
- `abortControllerRef` pattern (já implementado na paginação) — reutilizado pelo orquestrador

### Established Patterns
- Hooks em `src/hooks/` — 1 arquivo por hook, PascalCase
- Tipos exportados junto com o hook (ex: `FilterTab`, `ObjetivoFilter`)
- State + actions + effects + return object

### Integration Points
- `Questoes.tsx` importa `useQuestoes` — ponto único de entrada
- `QuestaoResolucaoProfessor` consome `editingResolucao`, `resolucaoText`, `handleSaveResolucao` etc.
- `QuestaoVisualizador` consome `handleConfirmarResposta`, `alternativaSelecionada`, `revelado` etc.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-extracao-de-hooks*
*Context gathered: 2026-06-08*
