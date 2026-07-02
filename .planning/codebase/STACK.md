# Technology Stack

**Analysis Date:** 2026-06-08

## Languages

**Primary:**
- **TypeScript** ~6.0.2 — All application source code (`src/`, `api/`)
- **JavaScript (ESM)** — Build config (`vite.config.ts`), browser extension (`extensao/content.js`), Node scripts (`scripts/`, `tools/`)

## Runtime

**Environment:**
- **Node.js** (local dev & Vercel Serverless) — Required for Vite dev server and build
- **Browser** — App is a client-side SPA running in the user's browser

**Package Manager:**
- **npm** — Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- **React** ^19.2.6 — UI framework
- **React DOM** ^19.2.6 — DOM renderer
- **Vite** ^8.0.12 — Build tool and dev server
- **TypeScript** ~6.0.2 — Language, configured for strict type checking

**Testing:**
- **Vitest** ^4.1.8 — Test runner (fast, Vite-native)
- **@testing-library/react** ^16.3.2 — React component testing utilities
- **@testing-library/jest-dom** ^6.9.1 — Custom DOM matchers (via `vitest` setup)
- **@testing-library/user-event** ^14.6.1 — Simulated user events
- **jsdom** ^29.1.1 — DOM environment for tests

**Build/Dev:**
- **@vitejs/plugin-react** ^6.0.1 — React Fast Refresh + JSX transform for Vite

## Key Dependencies

**Critical:**
| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.106.1 | Supabase database + auth client |
| `groq-sdk` | ^1.2.1 | LLM access (Groq Cloud API, used in backend `api/gemini.ts`) |
| `react-router-dom` | ^7.15.1 | Client-side routing |
| `lucide-react` | ^1.16.0 | SVG icon library (used in every component) |
| `recharts` | ^3.8.1 | Charts (AreaChart, BarChart, RadarChart) on Dashboard and Simulados |
| `react-markdown` | ^10.1.0 | Markdown renderer (used in Mentor.tsx) |
| `tailwindcss` | ^4.3.0 | Utility-first CSS framework |
| `@tailwindcss/vite` | ^4.3.0 | Tailwind CSS Vite plugin |
| `@tailwindcss/typography` | ^0.5.19 | Typography plugin for Tailwind |

**Infrastructure:**
| Package | Version | Purpose |
|---------|---------|---------|
| `clsx` | ^2.1.1 | Conditional class merging (in deps but not currently imported in source) |
| `tailwind-merge` | ^3.6.0 | Tailwind class conflict resolution (in deps but not currently imported) |
| `pdf-parse` | ^2.4.5 | PDF text parsing (used in `tools/` scripts, not in app source) |
| `puppeteer` | ^25.0.4 | Headless browser (used in `tools/` scripts, not in app source) |
| `@google/generative-ai` | ^0.24.1 | Google Gemini SDK (declared in deps but **NOT imported anywhere** in source code) |

**Dev Only:**
| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | ^10.3.0 | Linter |
| `@eslint/js` | ^10.0.1 | ESLint recommended config |
| `typescript-eslint` | ^8.59.2 | TypeScript ESLint rules |
| `eslint-plugin-react-hooks` | ^7.1.1 | React Hooks lint rules |
| `eslint-plugin-react-refresh` | ^0.5.2 | React Refresh lint rules (enforces only-export-components) |
| `globals` | ^17.6.0 | Global variable definitions for ESLint |
| `@types/react` | ^19.2.14 | React type definitions |
| `@types/react-dom` | ^19.2.3 | ReactDOM type definitions |
| `@types/node` | ^24.12.3 | Node.js type definitions |
| `postcss` | ^8.5.15 | PostCSS processor (legacy, not actively used with Tailwind v4) |
| `autoprefixer` | ^10.5.0 | CSS vendor prefixes (legacy, not actively used with Tailwind v4) |

## Configuration

**Environment:**
- Variables loaded from `.env.local` file via `Vite.loadEnv()` in `vite.config.ts`
- Client-side vars must have `VITE_` prefix
- Server-side vars (`GEMINI_API_KEY`) are **not** prefixed with `VITE_` to prevent client-side leakage
- `.env.local` is gitignored; `.env.example` shows required vars

**Key env vars:**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous (public) key
- `GEMINI_API_KEY` — LLM API key (server-side only, renamed from Gemini to Groq but env var name kept for compatibility)

**Build:**
- `tsconfig.json` — Project references to `tsconfig.app.json` + `tsconfig.node.json`
- `tsconfig.app.json` — Targets ES2023, DOM lib, `react-jsx` JSX transform, bundler module resolution, strict mode
- `tsconfig.node.json` — For Node scripts (vite.config.ts), node types
- `vite.config.ts` — React plugin + Tailwind CSS plugin + custom `apiEmulatorPlugin` (SSR-loads `api/gemini.ts` for local dev)
- `vercel.json` — SPA rewrites (all paths → `/index.html`)

**Deployment:**
- **Vercel** — Production host
- `scripts.build`: `tsc -b && vite build`
- `vercel.json` rewrites all routes to `index.html` for SPA routing

## Platform Requirements

**Development:**
- Node.js (version determined by Vite 8.0 requirements)
- npm
- `.env.local` file with Supabase credentials
<!-- Hermes relay removed -->

**Production:**
- Hosted on Vercel (serverless)
- Supabase project (PostgreSQL database + Auth + Storage)
- Groq Cloud API key for LLM features

## CSS Approach

- **Tailwind CSS v4** (with `@tailwindcss/vite` plugin for Vite integration)
- **No CSS modules or styled-components** — all styling via Tailwind utility classes
- **Dark/light theme** via CSS custom properties (`.light` class on `<html>`) with `localStorage` persistence
- **Glassmorphism** design pattern with custom `glass-card` utility classes in `src/index.css`
- **Custom CSS** in `src/index.css` for keyframes, animation utilities, gradient backgrounds, progress bars
- `App.css` is mostly legacy (unused counter/hero styles from template)

---

*Stack analysis: 2026-06-08*
