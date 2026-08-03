# Questões Concursos — Dev Log

## Goal
Sistema de importação e registro de metas semanais do LS Concurso, com página web e extensão de navegador para extração automática.

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

#### Importação de dados reais (Supabase → Postgres VM)
- **Dados exportados** para `export/`: `users.json` (2 usuários), `questoes_rows.csv` (2354), `historico_resolucoes_rows.csv` (2328), `metas_concurso_rows.csv` (12), `tarefas_meta_rows.csv` (120)
- **Importador** `backend/src/importarSupabase.mjs`: parser CSV RFC-4180 próprio, batches multi-row (500), preserva ids originais, senha provisória bcrypt `mudar123`, `ON CONFLICT DO NOTHING`, ajuste de sequences. Modo `--dry-run`
- **Órfãos**: 129 históricos sem `user_id` atribuídos ao fernandobritosc (usuário padrão)
- **Correções de integridade aplicadas**: seed antigo ocupava `questoes.id=1` (tec 999002) e bloqueou a questão real (tec 1140425) — corrigido com UPDATE (DELETE dispararia CASCADE no histórico); históricos `id=1,3,4` colididos pelo seed foram reinseridos; usuário `teste@teste.com` + 3 históricos removidos
- **Validação final**: 2 users, 2354 questões (0 conflitos id/tec_id), 2328 históricos (0 faltando/0 extras, 0 órfãos FK), 12 metas, 120 tarefas — tudo conferido vs CSV

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

#### Metas de Estudo (Página + Extensão LS Concurso)
- **SQL Migration** (`tools/create_metas_tables.sql`): tabelas `metas_concurso` (cabeçalho) + `tarefas_meta` (tarefas) com RLS, índices e constraints
- **Tipos**: `MetaConcurso` e `TarefaMeta` em `src/types/database.ts`
- **CRUD**: 10 funções em `src/services/supabase.service.ts`
- **Hook**: `src/hooks/useMetasConcurso.ts` com estado reativo
- **Página**: `src/pages/MetasConcurso.tsx` (~700 linhas) — listagem em cards expansíveis, 3 modais (criar meta, adicionar tarefas em lote, editar status/desempenho), barra de progresso, alternância de status em 1 clique
- **Rota**: `/app/metas` em `src/App.tsx` com lazy loading
- **Nav**: "Metas de Estudo" (ícone Target) em `src/components/Layout.tsx`
- **Extensão LS Concurso** (`extensao/ls-concurso/`): extrai metas semanais de `aluno.lsensino.com.br/#/app/metaAtual` — parseia `.v3-meta-titulo-pagina`, datas, tabela `.v3-table` com disciplinas/formato/descrição, e salva no Supabase via REST API

#### Migração Supabase → Backend Próprio (Fastify + Postgres na Oracle VM)
- **Backend CRUD compatível com PostgREST** (`backend/src/routes/crud.js`): registra rotas em `/:tabela` e `/rest/v1/:tabela`; filtros `eq/neq/in/gt/gte/lt/lte/like/ilike/is/not.is`, `order`, `offset`, `limit`, `count=true`, `select` com JOIN aninhado (`filha!nome_da_fk(cols)`), POST com `return=representation`, PATCH/DELETE por filtro, upsert com `on_conflict`
- **JOIN aninhado** (`historico_resolucoes!historico_resolucoes_questao_id_fkey(...)`): busca filhos agrupados por `ANY($1)`; escopado por `user_id` do usuário autenticado para não vazar histórico de terceiros
- **Storage** (`backend/src/routes/storage.js`): upload (multipart) / download / delete / public-url em disco (`./data/storage/<bucket>/<path>`), com sanitização de path traversal e auth obrigatória
- **IA (Groq)** (`backend/src/routes/gemini.js`): rota `/gemini` substitui a função serverless — valida JWT do backend e chama a API Groq via fetch (sem `groq-sdk` no backend)
- **Shim `src/lib/supabase.ts`**: substitui `@supabase/supabase-js` por fetch ao backend mantendo a API fluente (`from().select().eq().order().range().single().insert().update().delete().upsert()` + `auth.*` + `storage.*`) — **zero mudanças nos 58 pontos de uso** (supabase.service, grupoUtils, gemini.service, studyMaterial, AuthContext, Login, Layout)
- **Sessão**: JWT persistido em `localStorage` sob `monitorpro_session` (mesma chave lida pelas extensões); `/auth/login` e `/auth/register` emitem `SIGNED_IN`
- **Extensões adaptadas** (`extensao/content.js` + `extensao/ls-concurso/content.js`): `SUPABASE_URL`→`BACKEND_URL` (`http://204.216.111.13:3000`, interino), removida chave anon, storage keys `supabase_*`→`monitorpro_*`, sessão lida de `monitorpro_session`, manifests atualizados
- **Vite proxy** (`vite.config.ts`): `/api` → `http://127.0.0.1:3000` com rewrite (emulador local de `/api/gemini` continua funcionando — roda antes do proxy)
- **Validado E2E**: 6 testes temporários contra backend real (login, select aninhado, count+range, insert/update/delete, `not is null`, getSession) — todos passaram; removidos após a verificação
- **Correções de bugs reais encontrados**: GET enviava `body:null` no shim; `buildOrder` do backend tinha `.replace(/^/,...)` que nunca prefixava `ORDER BY`

#### Deploy Frontend no Vercel (proxy `/api` → VM)
- **`vercel.json`**: rewrite `/api/:path*` → `http://204.216.111.13:3000/:path*` (proxy server-side evita mixed content do backend http) + fallback SPA `/(.*)` → `/index.html`
- **`.vercelignore`**: exclui `api/` — a função serverless `api/gemini.ts` foi consolidada no backend da VM (`/gemini`); todo `/api/*` (rest, auth, storage, gemini) agora vai para a VM via rewrite
- **`VITE_API_URL=/api`** (default no shim `supabase.ts:30`) — sem mudanças no código do frontend
- Build/tsc/lint validados localmente

### 🔄 Pendente
- **Deploy na VM**: copiar `backend/` via scp, `npm install`, subir com pm2/systemd, Nginx (proxy `/api` → `127.0.0.1:3000`, servir build dos 2 frontends, TLS para extensões)
- **Deploy Vercel**: fazer commit/push para disparar o deploy, configurar `VITE_API_URL=/api` (não é estritamente necessário, é o default) e confirmar que o backend da VM está acessível publicamente em `http://204.216.111.13:3000`
- **Importar dados reais do Monitor Pro**: exportar do Supabase (CSV/SQL) e importar no banco `concursos` da VM (study_materials, notifications, flashcards, registros_estudos, editais_materias, gabaritos_salvos, discursivas, news_feed, ranking_geral)
- **Monitor Pro** (`C:\Users\uniao\OneDrive\Desktop\Projetos`): adaptar `src/lib/supabase.ts` + `src/services/queries/*` para o mesmo backend (mesmo padrão do shim)
- **Modo claro**: ajuste das variáveis CSS `html.light` no `index.css` — usuário achou muito claro, dói a vista. Pendente de nova tentativa com paleta mais suave
- **HTTPS + domínio**: necessário para a extensão funcionar no TEC Concursos (página https → fetch http é bloqueado como mixed content)
- Features novas (estatísticas avançadas, modo offline, exportar dados, integração IA)
- Bundle analysis periódica (`VITE_ANALYZE=true` com `rollup-plugin-visualizer` — opcional)
- E2E com Playwright
- Segurança da extensão Chrome
- **Validação da extensão LS Concurso**: testar extração com dados reais da LS
- Remover `@supabase/supabase-js` de `package.json` quando `tools/importPdfToDb.js` e `tools/testDb.js` forem substituídos

## Key Decisions
- `ReactMarkdown` custom renderers usam `any` com eslint-disable porque o tipo `Components` é complexo — aceito como dívida técnica
- `set-state-in-effect` suprimido com eslint-disable onde o padrão é intencional (resetar estado ao navegar entre questões) — alternativa seria usar `key` prop (refactor maior)
- `supabase.service.ts` teve todos os 5 `eslint-disable no-explicit-any` substituídos por tipos concretos — `HistoricoResolucao`, inline types, e `unknown` para JSONB
- Efeito de carregar histórico (useQuestoes.ts:318) depende APENAS de `currentQuestaoIndex` — funções de callback NÃO entram nas deps para evitar loop de render por nova referência
- **Shim de compatibilidade escolhido em vez de reescrever a camada de dados**: `src/lib/supabase.ts` replica a API fluente do supabase-js (query builder + auth + storage) → mantém os 58 pontos de uso e os 244 testes intactos; `any` no `PostgrestResponse.data` é dívida técnica (shim é inerentemente dinâmico)
- **`/api` same-origin via Nginx/Vite proxy** para os frontends (evita CORS/mixed content); extensões chamam o backend direto (`BACKEND_URL`) com CORS habilitado

## ECC ↔ GSD Integration

### O que é
Este projeto usa o **ECC** (Enhanced Codebase Companion, [github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)) como sistema de agent harness, integrado à metodologia **GSD** (Get Shit Done) para ciclo de desenvolvimento estruturado.

### Componentes Instalados

| Componente | Localização | Propósito |
|---|---|---|
| `opencode.json` | `.opencode/opencode.json` | Config principal — agents, commands, skills |
| Agentes ECC | `opencode.json → agent` | planner, code-reviewer, architect, tdd-guide, build-error-resolver |
| Agentes GSD | `~/.config/opencode/agents/` | 33 subagentes (gsd-planner, gsd-executor, etc.) |
| Skills GSD (locais) | `.opencode/skills/` | 13 skills sincronizadas do runtime canônico |
| Skills AAS (Awesome) | `.opencode/skills/` | 24 skills do Antigravity Awesome Skills (React, TS, testing, UI, PDF, Postgres, Supabase, etc.) |
| Workflows GSD | `~/.config/opencode/get-shit-done/workflows/` | 89 workflows |

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
| `/gsd-sync-skills` | `sync-skills` workflow | Sincroniza skills GSD do runtime canônico para o projeto |

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
  └── skills (locais): 13 skills GSD + 24 skills AAS (Antigravity Awesome Skills)

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
