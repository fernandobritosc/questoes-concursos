# Questões Concursos — Dev Log

## Goal
Criar dicionário assunto → { materia, grupo } (`src/data/grupos.json`), exibir 3 níveis (matéria → grupo → assunto) no índice, e persistir coluna `grupo` no banco Supabase.

## Constraints & Preferences
- TypeScript compila limpo (`npx tsc -b --noEmit` zero erros)
- ESLint zero erros (`npx eslint . --max-warnings=200`)
- Toda funcionalidade existente preservada (import PDF, visualizar, responder, navegar, imprimir)
- Comunicação em português
- Dicionário em JSON estático no código (`src/data/grupos.json`), versionado no git
- Índice segue a ordem de estudo definida manualmente no JSON
- Usuário pode alternar entre "Ordem de Estudo", "Quantidade" e "Alfabética"

## Progress

### ✅ Concluído

#### Refactor de componentes
| O quê | De → Para |
|---|---|
| `Questoes.tsx` | 1662 → 334 linhas (–80%) |
| `ImportPdfModal.tsx` | 1053 → 797 linhas (–24%) |
| Componentes extraídos | 11 novos arquivos |
| Lógica de PDF isolada | `src/lib/pdfParser.ts` |

**11 sub-componentes extraídos de `Questoes.tsx`:**
- `QuestaoVisualizador` — card principal do visualizador
- `MeuDesempenho` — gráfico de desempenho + histórico
- `QuestaoEstatisticas` — aba de estatísticas
- `QuestaoGabarito` — aba de gabarito
- `QuestaoModalEdicao` — formulário de edição (gerencia 10 campos de estado)
- `QuestaoIndice` — visão em árvore (gerencia ordering/filter internos)
- `QuestaoTabs` — barra de abas superior
- `QuestaoResolucaoProfessor` — card de resolução do professor
- `QuestaoNavegacao` — navegação inferior (Anterior/Próxima/Aleatório/Limpar)
- `QuestaoPrintView` — layout oculto para impressão

#### Extração de Resoluções do Professor
- **Integração TEC Concursos**: A extensão do navegador (`extensao/content.js`) agora extrai as resoluções dos professores em tempo real a partir de `.questao-complementos-comentario-conteudo-texto`.
- **Conversão HTML para Markdown**: Criado um parser robusto em JS na extensão que preserva negritos, itálicos, listas, citações e textos riscados, salvando de forma limpa no campo `resolucao_professor` da tabela `questoes` no Supabase.
- **Sincronização Reativa**: Modificado o controle de envios para dar `PATCH` no comentário da questão caso ela já exista no banco, viabilizando o carregamento assíncrono das abas de comentários no TEC Concursos.
- **Suporte a Riscos (Strikethrough)**: Adicionado suporte à formatação `~~texto~~` em `MarkdownAI.tsx` com estilo line-through vermelho para simular a rasura de alternativas incorretas no site original.

#### Correções de ESLint (54 → 0 erros, 26 `eslint-disable` → 0)
| Arquivo | Correções |
|---|---|
| `QuestaoIndice.tsx` | `as any` → `as unknown as Record<string, unknown>` |
| `ImportPdfModal.tsx` | Removeu export de helper + 2 `catch(err: any)` → `unknown` |
| `useQuestoes.ts` | 4 `as any`/`any` → tipos concretos + 4 `set-state-in-effect` suprimidos |
| `useSimulados.ts` | **Bug real**: `handleFinalizarSimulado` movido antes do `useEffect` que o chamava (TDZ). `any` → tipos concretos |
| `Revisao.tsx` | **Bug real**: `questaoAtual.resolucao_professor = ...` (mutação de hook) removida. 3 `no-useless-assignment` + 2 `any` |
| `Dashboard.tsx` | `Math.random()` como key → `res.id \|\| \`res-$\{i\}\``. 4 `any` → tipos |
| `Mentor.tsx` | 7 `any` em renderers + 1 `node` não usado |
| `useRevisao.ts` | 4 `any` + 3 `no-useless-assignment` + 1 `set-state-in-effect` |
| `useMentor.ts` | 4 `any` + 1 `let` → `const` |
| `useDashboard.ts` | 1 `any` + `_` ignorado no destructuring |
| `CommandPalette.tsx` | 1 `set-state-in-effect` suprimido |
| `Card.tsx` | Interface vazia removida |
| `AuthContext.tsx` | `only-export-components` suprimido |
| `EditalVerticalizado.tsx` | 1 `set-state-in-effect` suprimido |
| `Login.tsx` / `MapaQuestoes.tsx` | `catch(err: any)` → `unknown` |
| `Simulados.tsx` | 2 `any` → tipos + suppress |
| `gemini.service.ts` | 1 `no-useless-assignment` |
| `studyMaterial.service.ts` | 3 `any` suprimidos |
| `supabase.service.ts` | 7 `any` suprimidos com eslint-disable |
| `vite.config.ts` | 6 `any` em bloco suprimido |
| `api/gemini.ts` | 4 `any` suprimidos |

*(Nota: todos os `eslint-disable no-explicit-any` foram posteriormente eliminados — 0 restam no código fonte)*

#### Testes
- **Framework**: Vitest v4 (`npm test` / `npm run test:watch`)
- **Config**: `vitest.config.ts` (jsdom + `@testing-library/jest-dom`)
- **Setup**: `src/test/setup.ts`
- **ESLint config**: atualizado para reconhecer globals do vitest
- **Mocking de hooks**: `vi.hoisted()` + mutable ref para alternar estado entre testes

**251 testes passando (28 arquivos):**
| File | Tests | O que cobre |
|---|---|---|
| `src/lib/cleanHtml.test.ts` | 17 | `cleanHtmlText` — null, undefined, HTML stripping, decodificação de entidades, trimming |
| `src/lib/pdfParser.test.ts` | 11 | `parsePdfContent` — questão única, múltiplas, gabarito, exceções, footer, alternativas |
| `src/components/ui/MarkdownAI.test.tsx` | 10 | Renderização de markdown (negrito, itálico, strikethrough, listas, tabelas, caixas) |
| `src/components/QuestaoNavegacao.test.tsx` | 7 | Navegação: anterior, próxima, aleatório, limpar, desabilitar botões |
| `src/components/QuestaoGabarito.test.tsx` | 4 | Exibição de gabarito, informações da questão, botão voltar |
| `src/components/QuestaoVisualizador.test.tsx` | 17 | Renderização de enunciado, alternativas, estados revelado, interações |
| `src/pages/Questoes.test.tsx` | 6 | Página de questões: loading, erro, vazio, visualizador, erro de paginação, skeleton |
| `src/pages/Simulados.test.tsx` | 7 | Página de simulados: loading, erro, setup, active, submitting, results, null |
| `src/pages/Revisao.test.tsx` | 6 | Página Revisão: loading, vazio, grade, foco, foco vazio, filtros |
| `src/pages/Mentor.test.tsx` | 9 | Página Mentor: loading, sem fraquezas, lista, gerando, plano estruturado/string, mentoria |
| `src/pages/Dashboard.test.tsx` | 4 | Página Dashboard: loading, stats, vazio, seletor de período |

#### Performance: Lazy Loading + Code Splitting
- **`App.tsx`**: 9 imports estáticos substituídos por `React.lazy(() => import(...).then(m => ({ default: m.Nome })))`
- **Suspense**: Componente `SuspenseRoute` com fallback `<LoadingSpinner />` em cada rota
- **Build chunks**: `vite.config.ts` com `manualChunks` para vendor splitting (react, router, recharts, lucide, markdown)
- **Resultado**: 22 chunks separados (9 páginas lazy + 5 vendors + main + runtime + CSS)
- **Maiores vendors**: recharts 394 kB (112 kB gzip), react 182 kB (57 kB gzip), markdown 116 kB (35 kB gzip)
- **Maiores páginas**: Questoes 105 kB (23 kB gzip), Simulados 38 kB (9 kB gzip), Revisao 32 kB (8 kB gzip)
- **Main bundle (index)**: 219 kB (57 kB gzip) — Layout, App, componentes compartilhados

#### Dashboard — Melhorias nas Métricas
- **Streak removido**: badge "10 dias seguidos" + `Flame` import + `streak` do hook e testes (código morto)
- **Reordenação**: Matérias Estudadas + Últimas Resoluções movidos para abaixo de Evolução de Estudos e Radar de Competências
- **Órgãos categorizados**: `categorizarOrgao()` com NFD + regex (Tribunais, MPs, Executivo, Legislativo, Controle); `DashboardOrgaoCard` com seções por categoria, expand/recolher independente
- **Banca limitado a top 10** (`slice(0, 10)`)
- **Revisões Pendentes Hoje**: novo card clicável com `<Link to="/app/revisao">`
- **Seletor expandido**: Geral, Hoje, 7d, 30d — cada período recalcula métricas
- **StatsPeriodo refatorado**: `Stats24h` → `StatsPeriodo` exportado, `calcularStatsPeriodo()` reutilizável
- **Resoluções com limite + expand**: mostra 5 itens, botão "+ X mais / ▲ recolher"
- **Navegação corrigida**: `<Link to="/app/revisao">` em vez de `<a href="/revisao">`

#### Dicionário de Grupos (3 níveis: matéria → grupo → assunto)
- `src/data/grupos.json`: **1.007 assuntos** mapeados em **8 matérias** (Informática, Direito Constitucional, AFO/DF/Contabilidade, Língua Portuguesa, Adm. Geral e Pública, Direito Administrativo, Direito do Trabalho, Direito Processual do Trabalho)
- `QuestaoIndice.tsx`: reescrito para exibir 3 níveis com ordenação por estudo (default), quantidade ou alfabética; grupos colapsáveis
- `tsconfig.app.json`: adicionado `resolveJsonModule: true` para importar JSON
- **0 assuntos sem grupo** no banco (1232 questões, 156 assuntos únicos)

#### Coluna `grupo` no Supabase
- `ALTER TABLE questoes ADD COLUMN grupo text` + índice
- `grupo` populado via PATCH na API para todos os 1232 registros
- `QuestaoIndice` usa `q.grupo` do banco (removeu `GRUPO_MAP`)
- Tipo `Questao` e `ResolucaoView` atualizados com `grupo?: string | null`

#### Questões — Correção de Tremor/Loop
- **Sync effect** (`useQuestoes.ts:180`): removido `questoesExibidas` das dependências e os `setAlternativaSelecionada(null)` + `setRevelado(false)` desnecessários — eliminou cascata de re-renders em cada ação no caderno
- **Historico loading effect** (`useQuestoes.ts:318`): removido `questoesExibidas`, `caderno.loadHistoricoDaQuestao` e `caderno.setHistoricoQuestaoAtiva` das dependências — eliminou loop infinito (funções sem `useCallback` criavam nova referência a cada render → re-carregava histórico infinitamente)
- **Animações removidas**: `animate-in` removido de QuestaoVisualizador, MeuDesempenho, QuestaoResolucaoProfessor, caixa IA e container principal — slide/fade causavam empurrão visual no layout

### 🔄 Pendente
- **Modo claro**: ajuste das variáveis CSS `html.light` no `index.css` — usuário achou muito claro, dói a vista. Pendente de nova tentativa com paleta mais suave
- Features novas (estatísticas avançadas, modo offline, exportar dados, integração IA)
- Bundle analysis periódica (`VITE_ANALYZE=true` com `rollup-plugin-visualizer` — opcional)
- E2E com Playwright
- Segurança da extensão Chrome

## Key Decisions
- `ReactMarkdown` custom renderers usam `any` com eslint-disable porque o tipo `Components` é complexo — aceito como dívida técnica
- `set-state-in-effect` suprimido com eslint-disable onde o padrão é intencional (resetar estado ao navegar entre questões) — alternativa seria usar `key` prop (refactor maior)
- `supabase.service.ts` teve todos os 5 `eslint-disable no-explicit-any` substituídos por tipos concretos — `HistoricoResolucao`, inline types, e `unknown` para JSONB
- Efeito de carregar histórico (useQuestoes.ts:318) depende APENAS de `currentQuestaoIndex` — funções de callback NÃO entram nas deps para evitar loop de render por nova referência

## ECC ↔ GSD Integration

### O que é
Este projeto usa o **ECC** (Enhanced Codebase Companion, [github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)) como sistema de agent harness, integrado à metodologia **GSD** (Get Shit Done) para ciclo de desenvolvimento estruturado.

### Componentes Instalados

| Componente | Localização | Propósito |
|---|---|---|
| `opencode.json` | `.opencode/opencode.json` | Config principal — agents, commands, skills |
| Bridge skill | `.opencode/skills/gsd-ecosystem-bridge/SKILL.md` | Ponte ECC ↔ GSD |
| Agentes ECC | `opencode.json → agent` | planner, code-reviewer, architect, tdd-guide, build-error-resolver |
| Agentes GSD | `~/.config/opencode/agents/` | 33 subagentes (gsd-planner, gsd-executor, etc.) |
| Skills GSD | `~/.config/opencode/skills/` | 12 skills (gsd-plan-phase, gsd-execute-phase, etc.) |
| Workflows GSD | `~/.config/opencode/get-shit-done/workflows/` | 89 workflows |
| Agent Hermes | `.opencode/agents/hermes.md` | Mentor de estudos IA |

### Comandos Disponíveis

| Comando | Delegado a | O que faz |
|---|---|---|
| `/gsd` | `gsd-orchestrator` | Ciclo GSD completo (discuss→plan→execute→review→verify→complete) |
| `/plan` | `planner` | Plano de implementação detalhado |
| `/code-review` | `code-reviewer` | Revisão de código (bugs, segurança, qualidade) |
| `/build-fix` | `build-error-resolver` | Corrige erros de build/TypeScript |
| `/tdd` | `tdd-guide` | Ciclo TDD (RED→GREEN→REFACTOR) |
| `/architect` | `architect` | Decisões de arquitetura e design |
| `/gsd-discuss` | `gsd-discuss` | Fase DISCUSS — extrai decisões de gray areas |
| `/gsd-execute` | `gsd-execute` | Fase EXECUTE — executa planos em waves |

### Fluxo de Trabalho Típico

```bash
# 1. Discutir uma nova feature
/gsd-discuss "Fase 4: Modo offline para questões"

# 2. Criar plano de implementação
/plan "Implementar cache local com IndexedDB"

# 3. Executar com TDD
/tdd "Criar hook useOfflineCache"

# 4. Revisar o código
/code-review "src/hooks/useOfflineCache.ts"

# 5. Ou usar o orquestrador para tudo
/gsd "Implementar modo offline completo"
```

### Arquitetura

```
opencode.json (config)
  ├── agent: build (primary) — agente padrão de desenvolvimento
  ├── agent: planner — planejamento (subagent, sem write/edit)
  ├── agent: code-reviewer — revisão (subagent, sem write/edit)
  ├── agent: architect — arquitetura (subagent, sem write/edit)
  ├── agent: tdd-guide — TDD (subagent com write/edit)
  ├── agent: build-error-resolver — correção de build (subagent)
  ├── agent: gsd-orchestrator — orquestrador GSD (subagent)
  ├── agent: gsd-discuss — fase discuss (subagent)
  ├── agent: gsd-execute — fase execute (subagent)
  └── skill: gsd-ecosystem-bridge — ponte ECC ↔ GSD

Agentes GSD Globais (~/.config/opencode/agents/)
  ├── gsd-planner, gsd-executor, gsd-code-reviewer
  ├── gsd-verifier, gsd-debugger, gsd-ui-researcher
  ├── gsd-security-auditor, gsd-codebase-mapper
  └── +25 outros

Workflows GSD Globais (~/.config/opencode/get-shit-done/workflows/)
  └── 89 workflows (discuss, plan, execute, review, verify, etc.)
```

### Skills ECC Relevantes

Skills do ECC disponíveis para carregar como instrução adicional em `opencode.json`:

| Skill | Arquivo | Quando usar |
|---|---|---|
| TDD Workflow | `skills/tdd-workflow/SKILL.md` | Durante EXECUTE |
| Security Review | `skills/security-review/SKILL.md` | Durante REVIEW |
| Verification Loop | `skills/verification-loop/SKILL.md` | Durante VERIFY |
| Coding Standards | `skills/coding-standards/SKILL.md` | Durante EXECUTE |
| API Design | `skills/api-design/SKILL.md` | Durante PLAN |
| E2E Testing | `skills/e2e-testing/SKILL.md` | Durante EXECUTE |

## How to run
```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run lint       # Verificação ESLint
npm test           # Rodar testes (vitest)
npm run test:watch # Modo observação
npx tsc -b --noEmit # Verificação TypeScript
```
