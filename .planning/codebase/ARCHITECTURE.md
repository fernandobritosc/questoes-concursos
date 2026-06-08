<!-- refreshed: 2026-06-08 -->
# Architecture

**Analysis Date:** 2026-06-08

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        Presentation Layer (SPA)                          │
│  React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + React Router 7    │
│                     Deployed to Vercel (SPA)                             │
├──────────────────┬──────────────────┬──────────────────┬────────────────┤
│    Dashboard     │  Caderno Erros   │    Simulados IA   │  Mentor IA     │
│  `src/pages/`    │  `src/pages/`    │   `src/pages/`    │ `src/pages/`   │
├──────────────────┴──────────────────┴──────────────────┴────────────────┤
│                         Custom Hooks Layer                               │
│  useQuestoes │ useDashboard │ useRevisao │ useSimulados │ useMentor      │
│                        `src/hooks/`                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                         Service Layer                                    │
│  supabase.service.ts │ gemini.service.ts │ studyMaterial.service.ts      │
│  hermesTracker.ts                                                        │
│                        `src/services/`                                   │
├──────────────────────┬───────────────────────────────────────────────────┤
│   Supabase (BaaS)    │   Backend (Vercel Serverless) + Groq AI           │
│   - Auth             │   api/gemini.ts → Groq SDK → llama-3.3-70b        │
│   - Postgres DB      │   (local emulation via Vite middleware)           │
│   - Storage          │                                                   │
├──────────────────────┴───────────────────────────────────────────────────┤
│                         External Integrations                             │
│  Chrome Extension: `extensao/content.js` → Scrapes TEC Concursos         │
│  Hermes Relay: event tracking to local Python server                     │
│  PDF.js (CDN): client-side PDF parsing                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|---------------|------|
| `App` | Root: AuthProvider + BrowserRouter + Routes | `src/App.tsx` |
| `Layout` | Sidebar nav + theme toggle + mobile menu + `<Outlet />` | `src/components/Layout.tsx` |
| `ProtectedRoute` | Redirects unauthenticated users to /login | `src/components/ProtectedRoute.tsx` |
| `Questoes` | Main bank page; orchestrates 11 sub-components | `src/pages/Questoes.tsx` |
| `QuestaoVisualizador` | Question card renderer (enunciado, alternativas, actions) | `src/components/QuestaoVisualizador.tsx` |
| `QuestaoNavegacao` | Bottom nav (Anterior/Próxima/Aleatório/Limpar) | `src/components/QuestaoNavegacao.tsx` |
| `QuestaoTabs` | Top tab bar (Questões/Índice/Estatísticas/Gabarito) | `src/components/QuestaoTabs.tsx` |
| `QuestaoIndice` | Tree view index of questions | `src/components/QuestaoIndice.tsx` |
| `QuestaoGabarito` | Dedicated answer sheet view | `src/components/QuestaoGabarito.tsx` |
| `QuestaoEstatisticas` | Statistics tab for a question | `src/components/QuestaoEstatisticas.tsx` |
| `QuestaoModalEdicao` | Modal to edit question fields | `src/components/QuestaoModalEdicao.tsx` |
| `QuestaoResolucaoProfessor` | Teacher resolution card (editable Markdown) | `src/components/QuestaoResolucaoProfessor.tsx` |
| `QuestaoPrintView` | Hidden print layout (media query `print:block`) | `src/components/QuestaoPrintView.tsx` |
| `MeuDesempenho` | Performance history for a question | `src/components/MeuDesempenho.tsx` |
| `ImportPdfModal` | Full import wizard (PDF → parse → review → save) | `src/components/ImportPdfModal.tsx` |
| `MarkdownAI` | Custom ReactMarkdown renderer | `src/components/ui/MarkdownAI.tsx` |
| `CommandPalette` | Global keyboard command palette | `src/components/CommandPalette.tsx` |
| `AuthContext` | Supabase session provider | `src/contexts/AuthContext.tsx` |
| `ErrorBoundary` | React error boundary wrapper | `src/components/ErrorBoundary.tsx` |

## Pattern Overview

**Overall:** Monolithic SPA frontend with Supabase BaaS backend

**Key Characteristics:**
- **No global state library** — simple React Context for auth, all other state lives in custom hooks returned as plain objects
- **Hook-per-page** — each page has a dedicated hook (`useQuestoes`, `useSimulados`, `useRevisao`, `useDashboard`, `useMentor`) that owns all state and actions
- **Service layer abstraction** — all Supabase/API calls go through `src/services/*.service.ts`; pages and hooks never call `supabase` directly
- **In-memory cache with 60s TTL** in `supabase.service.ts` (`fetchAllQuestoes`) to avoid redundant DB queries
- **Client-side PDF parsing** via PDF.js (loaded from CDN, not bundled)
- **Backend-for-frontend** pattern for AI: `gemini.service.ts` POSTs to `/api/gemini` (Vercel serverless), which proxies to Groq SDK (llama-3.3-70b)

## Layers

### Presentation Layer
- Purpose: Renders UI, handles user interaction
- Location: `src/pages/`, `src/components/`
- Contains: React components (TSX), UI primitives in `src/components/ui/`
- Depends on: Custom hooks, type definitions

### Hook Layer
- Purpose: Business logic, state management, orchestration of service calls
- Location: `src/hooks/`
- Contains: `useQuestoes`, `useSimulados`, `useRevisao`, `useDashboard`, `useMentor`
- Depends on: Service layer, type definitions
- Used by: Page components

### Service Layer
- Purpose: Database access, external API calls, analytics
- Location: `src/services/`
- Contains: `supabase.service.ts`, `gemini.service.ts`, `studyMaterial.service.ts`, `hermesTracker.ts`
- Depends on: `src/lib/supabase.ts` (Supabase client singleton)
- Used by: Hook layer

### Library Layer
- Purpose: Utilities, parser, Supabase client init
- Location: `src/lib/`
- Contains: `supabase.ts` (client), `pdfParser.ts`, `cleanHtml.ts`
- Depends on: npm packages, CDN scripts

## Data Flow

### Primary Request Path (Loading Questions)

1. User navigates to `/app/questoes` (`src/App.tsx:30`)
2. `Questoes` component mounts, calls `useQuestoes()` (`src/hooks/useQuestoes.ts:69`)
3. `useEffect` triggers `fetchAllQuestoes()` (`src/services/supabase.service.ts:157`)
4. `supabase.service.ts` queries Supabase:
   - `SELECT ... FROM questoes ORDER BY id DESC LIMIT 1000`
   - `SELECT ... FROM historico_resolucoes ORDER BY data_resolucao DESC`
5. Data is merged into `ResolucaoView[]` and cached in memory for 60s
6. Hook returns state to `Questoes` page component
7. Component renders sub-components: `QuestaoTabs`, `QuestaoVisualizador`, `QuestaoNavegacao`, etc.

### Answering a Question

1. User clicks an alternative → `setAlternativaSelecionada` (state update in `useQuestoes`)
2. User clicks "Resolver Questão" → `handleConfirmarResposta()` (`src/hooks/useQuestoes.ts:475`)
3. `insertHistoricoResolucao()` POSTs to Supabase `historico_resolucoes` table
4. Local state is updated optimistically (cadernoQuestoes + resolucoes)
5. `revelado` is set to `true` → UI shows correct/wrong feedback
6. Event tracked via `trackEvent('responder_questao', ...)` to Hermes relay

### AI Explanation Flow

1. User clicks "Minha Explicação (IA)" → `handleExplicacaoIA()` (`src/hooks/useQuestoes.ts:410`)
2. `gerarResolucaoProfessor()` called from `gemini.service.ts:120`
3. Constructs a prompt with question context, sends as POST to `/api/gemini`
4. Backend (`api/gemini.ts`) validates JWT via Supabase, then calls Groq SDK with llama-3.3-70b
5. Response text is stored in `explicacoes` state (local) AND persisted via `updateResolucaoProfessor()` to Supabase `questoes.resolucao_professor`
6. UI renders explanation via `MarkdownAI` component

### PDF Import Flow

1. User clicks "Importar PDF" → `ImportPdfModal` opens (`src/components/ImportPdfModal.tsx`)
2. User uploads a PDF file
3. PDF.js (loaded from CDN) extracts text page by page (`src/lib/pdfParser.ts:21`)
4. `parsePdfContent()` (`src/lib/pdfParser.ts:72`) splits text at "Gabarito" section, extracts individual questions via regex, parses TEC Concursos format
5. Parsed questions go through a review step inside the modal
6. On confirm: `insertQuestoesBatch()` inserts into Supabase `questoes` table (chunks of 50)
7. `clearQuestoesCache()` invalidates the in-memory cache
8. Modal calls `onImportSuccess(refreshedData)` → page re-renders with new questions

### Extension ↔ Web App Data Flow (Teacher Resolution Scraping)

1. Chrome extension (`extensao/content.js`) injects into TEC Concursos pages
2. On React app domain: syncs Supabase session token from localStorage to `chrome.storage.local`
3. On TEC domain: observes DOM for `.questao-complementos-comentario-conteudo-texto`
4. Extracts HTML content, converts to Markdown via `htmlToMarkdown()` function
5. Sends PATCH to Supabase `questoes` table via `supabase.from('questoes').update({ resolucao_professor: text }).eq('questao_tec_id', id)`
6. On next app load, `fetchAllQuestoes()` returns the updated `resolucao_professor` field

### Print Flow

1. User clicks "Imprimir" in `QuestaoTabs`
2. `QuestaoPrintView` (`src/components/QuestaoPrintView.tsx`) renders a full-resolution layout inside a `hidden print:block` div
3. Standard browser `window.print()` prints the hidden layout

## State Management

**Pattern:** Hook-local state with `useState` / `useMemo` / `useEffect`

**No external state library** (no Redux, Zustand, Jotai). Each hook manages its own state internally:

| Hook | Key State | Size |
|------|-----------|------|
| `useQuestoes` | resolucoes, cadernoQuestoes, filters, current index, AI explanations | ~40 state variables |
| `useSimulados` | questions selected, answers, timer, etapa (setup/active/results) | ~20 state variables |
| `useRevisao` | errors list, current, explanations, SM-2 schedule | ~15 state variables |
| `useDashboard` | resolucoes, computed stats | ~5 state variables |
| `useMentor` | fraquezas, plano, tarefas, planosAssuntos | ~10 state variables |

**Cross-hook shared data:**
- `fetchAllQuestoes()` data is cached at service layer (in-memory, 60s TTL) — multiple hooks calling it in parallel share the same promise/cache
- Auth state is shared via `AuthContext`
- Simulado historical data persisted in `localStorage` (`concursos_simulado_historico`)
- Spaced repetition schedule persisted in `localStorage` (`concursos_spaced_repetition`)

## Routing Structure

```
/                              → Landing (public marketing page)
/login                         → Login/SignUp page

/app (protected by ProtectedRoute → Layout → <Outlet />)
  /app/dashboard               → Dashboard
  /app/revisao                 → Revisao (Caderno de Erros)
  /app/simulados               → Simulados
  /app/mentor                  → Mentor IA
  /app/questoes?id=123         → Questoes (with optional ID param)
  /app/edital                  → EditalVerticalizado
  /app/mapa                    → MapaQuestoes

/dashboard                     → Redirect to /app/dashboard (legacy compat)
```

Protected via `ProtectedRoute` component (`src/components/ProtectedRoute.tsx`): checks `useAuth().session`, redirects to `/login` if null.

## Authentication Flow

1. `AuthProvider` (`src/contexts/AuthContext.tsx`) initializes on mount:
   - Calls `supabase.auth.getSession()` to check existing session
   - Subscribes to `supabase.auth.onAuthStateChange()` for login/logout events
2. Session token stored in localStorage key `sb-<project-ref>-auth-token`
3. Login page (`src/pages/Login.tsx`): email/password via `supabase.auth.signInWithPassword()` or `signUp()`
4. `ProtectedRoute` redirects to `/login` if no session
5. Gemini API calls pass session JWT as `Authorization: Bearer <token>` header to `/api/gemini`

## Key Abstractions

**ResolucaoView (`src/types/database.ts`):**
- Purpose: Composite type joining `Questao` + `HistoricoResolucao` fields
- Used throughout hooks, components, and service layer
- Maps from Supabase JOIN queries or manual merge in `fetchAllQuestoes()`

**Service Function Pattern:**
- All service functions are async, throw on error
- Pages/hooks catch and handle errors locally
- Naming: `fetch*`, `insert*`, `update*`, `delete*`

**Hook Return Pattern:**
- Hooks return a plain object with spread state values + action functions
- No context, no reducer — simple `useState` per variable
- Pages destructure the returned object directly

## Architectural Constraints

- **Threading:** Single-threaded browser event loop. Web Workers not used. PDF.js runs on main thread (CDN script, no worker configured beyond the standard pdf.worker.min.js).
- **Global state (cache):** `_questoesCache`, `_questoesCachePromise`, `_questoesCacheTimestamp` are module-level singletons in `supabase.service.ts`. Two hooks calling `fetchAllQuestoes` concurrently share the same promise.
- **Circular imports:** None detected. Layered architecture (page → hook → service → lib) prevents cycles.
- **CDN dependency:** PDF.js is loaded dynamically from CDN at runtime (`src/lib/pdfParser.ts:8-18`). No fallback if CDN is unavailable.
- **PDF parser limitations:** `parsePdfContent()` assumes TEC Concursos PDF format. Parser is line-based with position-aware sorting; fragile to formatting changes.

## Error Handling

**Strategy:** Service layer throws, hooks catch, pages display

**Patterns:**
- Service functions: `if (error) throw error` — Supabase errors propagate as-is
- Hooks: `try/catch` around service calls, set error state, log to console
- Pages: conditional rendering for loading/error states (e.g., `Questoes.tsx:183-197` shows error UI with retry button)
- Global: `ErrorBoundary` wraps `Questoes` page for uncaught errors

## Cross-Cutting Concerns

**Logging:** `console.log` with `[LOG useQuestoes]` / `[LOG fetchAllQuestoes]` / `[DEBUG Questoes]` prefixes. Chatty in dev; no log level filtering.

**Validation:** `getQuestionValidation()` in `useQuestoes.ts:53` validates question integrity (ID, enunciado length, gabarito, alternatives). Used during import review.

**Authentication:** Supabase JWT session. All `/api/gemini` calls include Bearer token. Extension syncs token via chrome.storage.

**Event Tracking:** `hermesTracker.ts` sends POST to local Hermes relay at `VITE_HERMES_RELAY_URL` (default `http://127.0.0.1:3333`). Silent fail on connection error. Used for: question answers, PDF imports, simulado results, AI generations.

---

*Architecture analysis: 2026-06-08*
