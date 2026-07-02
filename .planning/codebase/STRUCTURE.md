# Codebase Structure

**Analysis Date:** 2026-06-08

## Directory Layout

```
questoes-concursos/
├── api/                    # Vercel serverless functions (backend)
├── dist/                   # Build output (generated)
├── extensao/               # Chrome extension (Manifest V3)
├── public/                 # Vite static assets
├── scripts/                # Python/node automation scripts
├── src/                    # Application source code
│   ├── assets/             # Static images (hero.png, svg icons)
│   ├── components/         # React components
│   │   └── ui/             # Reusable UI primitives
│   ├── contexts/           # React Context providers
│   ├── hooks/              # Custom React hooks (page-level logic)
│   ├── lib/                # Utilities, parsers, clients
│   ├── pages/              # Top-level page components
│   ├── services/           # Data access & external API layer
│   ├── test/               # Test setup/config
│   └── types/              # TypeScript type definitions
├── tools/                  # Refactoring scripts, DB inspection tools
├── estudos/                # Study materials (PDFs, notes)
├── revisoes/               # Auto-generated review markdown files
├── metas_LS/               # Study goals/metadata
├── relatorios/             # Generated reports
├── Pdf/                    # Exported PDF files
├── logs/                   # Application logs
├── .planning/              # Orchestrator/Refactor planning documents
│   └── codebase/           # Codebase analysis output
├── .vscode/                # VS Code settings
├── index.html              # Vite HTML entry point
├── package.json            # Dependencies & scripts
├── vite.config.ts          # Vite configuration
├── vitest.config.ts        # Test framework configuration
├── eslint.config.js        # ESLint flat config
├── tsconfig.json           # Root TypeScript config
├── tsconfig.app.json       # App TypeScript config
├── tsconfig.node.json      # Node TypeScript config
├── vercel.json             # Vercel deployment config
└── package-lock.json       # Lockfile
```

## Directory Purposes

### Top-Level Directories

| Directory | Purpose | Key contents |
|-----------|---------|-------------|
| `api/` | Vercel serverless function — proxies Gemini AI calls via Groq SDK (1 file) | `gemini.ts` |
| `extensao/` | Chrome Extension (Manifest V3) for scraping TEC Concursos resolutions | `content.js` (782 lines), `manifest.json` |
| `scripts/` | Python automation (study agents, data loading, report generation) | `agente_*.py` |
| `tools/` | Refactoring & DB inspection helper scripts | `refactor-questoes.cjs`, `queryDb.cjs`, `testDb.cjs` |
| `src/` | Main application source code | 46 `.ts`/`.tsx` files |
| `estudos/` | Study PDF materials organized by subject | Subdirectories per subject |
| `revisoes/` | Auto-generated spaced-repetition review notes (markdown) | Subject-based `.md` files |
| `.planning/` | GSD orchestrator planning documents | `codebase/`, milestone records |

### `src/` Subdirectories

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/pages/` | 9 | Top-level route pages. Each page corresponds to a route in `App.tsx` |
| `src/components/` | 16 | Shared and feature-specific components. 11 are Questoes sub-components extracted during refactor |
| `src/components/ui/` | 5 | Generic UI primitives (Button, Card, LoadingSpinner, MarkdownAI, barrel index) |
| `src/hooks/` | 5 | Custom hooks — one per page: useQuestoes, useRevisao, useDashboard, useSimulados, useMentor |
| `src/services/` | 3 | Data service layer: supabase.service, gemini.service, studyMaterial.service |
| `src/lib/` | 5 | Utilities: supabase client, pdfParser, cleanHtml, plus 3 test files |
| `src/types/` | 1 | TypeScript interfaces: Questao, HistoricoResolucao, ResolucaoView |
| `src/contexts/` | 1 | AuthContext — Supabase session provider |
| `src/test/` | 1 | Vitest setup file |
| `src/assets/` | 3 | Static images (hero.png, react.svg, vite.svg) |

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React DOM mount, imports `App`
- `src/App.tsx`: Root component: AuthProvider → BrowserRouter → Routes
- `index.html`: Vite HTML shell (`<div id="root">`)

**Configuration:**
- `vite.config.ts`: Vite build config, React + Tailwind plugins, local API emulator middleware
- `vitest.config.ts`: Test runner config (jsdom, globals, setup file)
- `eslint.config.js`: ESLint flat config (React hooks + refresh rules)
- `tsconfig.json`: Root TS config (references app + node configs)
- `vercel.json`: Vercel SPA deployment config
- `package.json`: npm scripts, dependencies

**Core Logic:**
- `src/hooks/useQuestoes.ts`: Central hook for Banco de Questões (637 lines)
- `src/services/supabase.service.ts`: All Supabase DB access (346 lines)
- `src/services/gemini.service.ts`: Gemini AI prompt builder & API calls (287 lines)
- `src/lib/pdfParser.ts`: PDF text extraction & parsing (229 lines)
- `src/types/database.ts`: Data models (70 lines)
- `src/contexts/AuthContext.tsx`: Auth provider (32 lines)

**Testing:**
- `src/test/setup.ts`: Vitest imports `@testing-library/jest-dom`
- `src/lib/cleanHtml.test.ts`: 17 tests
- `src/lib/pdfParser.test.ts`: 11 tests
- `src/components/ui/MarkdownAI.test.tsx`: 10 tests

**Extension:**
- `extensao/content.js`: Content script — session sync + resolution extraction (782 lines)
- `extensao/manifest.json`: MV3 manifest

**Backend:**
- `api/gemini.ts`: Vercel serverless function — JWT validation → Groq SDK → AI response (87 lines)

## Largest Files (Lines of Code)

| File | Lines | Category | Notes |
|------|-------|----------|-------|
| `src/pages/Simulados.tsx` | 917 | Page | **Refactoring target** — all logic inlined |
| `src/pages/MapaQuestoes.tsx` | 807 | Page | **Refactoring target** — all logic inlined |
| `src/pages/Revisao.tsx` | 781 | Page | **Refactoring target** — all logic inlined |
| `src/components/ImportPdfModal.tsx` | 744 | Component | **Refactoring target** — complex import wizard |
| `src/pages/Dashboard.tsx` | 737 | Page | Large but mostly presentation + Recharts |
| `src/pages/EditalVerticalizado.tsx` | 689 | Page | **Refactoring target** — all logic inlined |
| `src/hooks/useQuestoes.ts` | 637 | Hook | Central hook — 40+ state vars, memoized filters |
| `src/pages/Mentor.tsx` | 498 | Page | Large but mostly presentation |
| `src/hooks/useDashboard.ts` | 353 | Hook | Statistical computations |
| `src/services/supabase.service.ts` | 346 | Service | All DB queries with cache layer |
| `src/pages/Questoes.tsx` | 337 | Page | Orchestrates 11 sub-components (post-refactor) |
| `src/hooks/useSimulados.ts` | 325 | Hook | Simulado state machine logic |
| `src/components/CommandPalette.tsx` | 302 | Component | Global keyboard palette |
| `src/services/gemini.service.ts` | 287 | Service | Prompt construction + API calls |
| `src/services/studyMaterial.service.ts` | 283 | Service | IndexedDB + Supabase Storage hybrid |
| `src/components/ui/MarkdownAI.tsx` | 270 | Component | Custom ReactMarkdown renderer |
| `src/hooks/useMentor.ts` | 265 | Hook | Fraqueza detection + plan management |
| `src/extensao/content.js` | 782 | Extension | Session sync + resolution scraping (not in src/) |

**Total source files:** 46 `.ts`/`.tsx` in `src/` + 1 in `api/` + 1 in `extensao/` = 48 files
**Total lines (src only):** ~12,500 lines

## Naming Conventions

**Files:**
- **Components:** PascalCase (`QuestaoVisualizador.tsx`, `ImportPdfModal.tsx`)
- **Hooks:** camelCase with `use` prefix (`useQuestoes.ts`, `useSimulados.ts`)
- **Services:** camelCase with `.service.ts` suffix (`supabase.service.ts`, `gemini.service.ts`)
- **Libraries:** camelCase (`supabase.ts`, `pdfParser.ts`, `cleanHtml.ts`)
- **Types:** kebab-case (`database.ts`)
- **Tests:** co-located with source, `.test.ts`/`.test.tsx` suffix (`pdfParser.test.ts`)
- **UI primitives:** PascalCase in `ui/` subdirectory (`Button.tsx`, `LoadingSpinner.tsx`)

**Directories:**
- `src/pages/`, `src/components/`, `src/hooks/`, `src/services/`, `src/lib/`, `src/types/`, `src/contexts/`, `src/test/`, `src/assets/`

## Where to Add New Code

**New Feature/Page:**
- Page component: `src/pages/<FeatureName>.tsx`
- Hook: `src/hooks/use<FeatureName>.ts`
- Service methods (if needed): `src/services/supabase.service.ts` or new service file
- Type definitions: `src/types/database.ts` (if DB-related)
- Tests: co-located with source, e.g. `src/hooks/use<FeatureName>.test.ts`

**New Component:**
- Feature-specific: `src/components/<ComponentName>.tsx`
- Reusable UI primitive: `src/components/ui/<ComponentName>.tsx`
- Export from barrel if in `ui/`: update `src/components/ui/index.ts`

**New Route:**
1. Add route in `src/App.tsx` (inside `<Route path="/app">` for authenticated routes)
2. Create page component in `src/pages/`
3. Add nav link in `src/components/Layout.tsx` `navItems` array
4. Add ProtectedRoute wrapper if needed

**New Service:**
- Create file at `src/services/<name>.service.ts`
- Import `supabase` client from `src/lib/supabase.ts` if DB access needed
- All functions should be `async` and throw on error

**New Test:**
- Co-located: `src/<area>/<name>.test.ts` or `.test.tsx`
- Import test utilities from `src/test/setup.ts` (auto-included via vitest config)

## Special Directories

**`api/`:**
- Purpose: Vercel serverless function for Gemini AI proxy
- Generated: No
- Committed: Yes
- Deployed as separate function on Vercel

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes (`npm run build`)
- Committed: No (in `.gitignore`)

**`extensao/`:**
- Purpose: Chrome extension for scraping teacher resolutions from TEC Concursos
- Generated: No
- Committed: Yes
- Loaded unpacked in Chrome

**`scripts/`:**
- Purpose: Python automation scripts (data loading, study agents)
- Generated: No
- Committed: Yes

**`estudos/`, `revisoes/`, `metas_LS/`, `relatorios/`, `Pdf/`, `logs/`:**
- Purpose: User-generated content (study materials, reviews, goals, reports, exported PDFs, logs)
- Generated: Yes (user uploads, auto-generated reviews)
- Committed: Mixed (study materials likely not committed)

---

*Structure analysis: 2026-06-08*
