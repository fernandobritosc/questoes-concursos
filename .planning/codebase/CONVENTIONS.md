# Coding Conventions

**Analysis Date:** 2026-06-08

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` — e.g., `QuestaoNavegacao.tsx`, `MarkdownAI.tsx`, `ErrorBoundary.tsx`
- Hooks: `camelCase.ts` prefixed with `use` — e.g., `useQuestoes.ts`, `useSimulados.ts`
- Services: `camelCase.service.ts` — e.g., `supabase.service.ts`, `gemini.service.ts`
- Libraries/utilities: `camelCase.ts` — e.g., `cleanHtml.ts`, `pdfParser.ts`
- Page components: `PascalCase.tsx` inside `src/pages/` — e.g., `Dashboard.tsx`, `Questoes.tsx`
- UI primitives: `PascalCase.tsx` inside `src/components/ui/` — e.g., `Button.tsx`, `Card.tsx`
- Types: `camelCase.ts` inside `src/types/` — e.g., `database.ts`
- Test files: same name as source with `.test.ts` or `.test.tsx` suffix — e.g., `cleanHtml.test.ts`, `MarkdownAI.test.tsx`
- Config files: `kebab-case` — e.g., `tsconfig.app.json`, `eslint.config.js`, `vitest.config.ts`

**Functions:**
- Named function declarations (`export function ...`) for components and utility functions
- Arrow functions for callbacks, inline handlers, and `useCallback`/`useMemo` lambdas
- Event handlers prefixed with `handle` — e.g., `handleGerarCaderno`, `handleToggleMateria`, `handleConfirmarResposta`
- Boolean-returning helpers prefixed with `is`, `has`, `can` — e.g., `isCadernoActive`, `podeAnterior`, `hasMateriaFilter`

```typescript
// ✅ Correct — named export function
export function QuestaoNavegacao({ onAnterior, onProxima }: QuestaoNavegacaoProps) { ... }

// ✅ Correct — arrow for inline callbacks
const handleToggleMateria = (materia: string) => { ... }

// ✅ Correct — factory pattern with generics
const makeToggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (value: T) => ...
```

**Variables:**
- `camelCase` for local variables and state values
- `UPPER_SNAKE_CASE` for constants (e.g., `CARREIRAS_DISPONIVEIS`, `ESCOLARIDADES_DISPONIVEIS`)
- Boolean state variables use adjective names: `loading`, `revelado`, `isCadernoActive`, `isEditModalOpen`
- Descriptive Portuguese for domain-specific variables, English for generic programming concepts

**Types:**
- `PascalCase` for interfaces and type aliases
- Interface names are nouns describing the entity: `Questao`, `HistoricoResolucao`, `ResolucaoView`
- Props interfaces follow the pattern `ComponentNameProps` — e.g., `QuestaoNavegacaoProps`, `CardProps`, `ButtonProps`
- Type exports using `interface` by default, `type` for unions or complex types

```typescript
// ✅ Correct — Props interface
interface QuestaoNavegacaoProps {
  onAnterior: () => void
  onProxima: () => void
  podeAnterior: boolean
  podeProxima: boolean
}

// ✅ Correct — type alias for union
export type FilterTab = 'materia' | 'banca' | 'orgao' | 'ano'
export type StatusFilter = 'todos' | 'acertos' | 'erros'
```

## Code Style

**Formatting:**
- No Prettier config detected (no `.prettierrc` at project root)
- Formatting is implicit via ESLint + editor defaults
- 2-space indentation (TypeScript/ESLint default)
- Single quotes for strings (`'texto'`), double quotes for JSX attributes (`className="..."`)
- Semicolons are used (present in `cleanHtml.ts`, `pdfParser.ts`) though some files omit them — inconsistency exists
- Trailing commas in multiline objects/arrays (observed pattern)

**Linting:**
- ESLint v10 with flat config (`eslint.config.js`)
- Rules configured (all via presets):
  - `@eslint/js` recommended — base JS rules
  - `typescript-eslint` recommended — TS-specific rules (no-explicit-any, no-unused-vars)
  - `react-hooks` flat recommended — hooks rules (exhaustive-deps, rules-of-hooks)
  - `react-refresh/vite` — refresh export rules
- Test files (`src/**/*.test.{ts,tsx}`): `react-refresh/only-export-components` is off
- Known suppressed rules (recorded in `AGENTS.md`):
  - `react-hooks/set-state-in-effect` — suppressed intentionally for navigation/reset patterns
  - `@typescript-eslint/no-explicit-any` — suppressed in `supabase.service.ts`, `pdfParser.ts` (data layer), `vite.config.ts`, `api/gemini.ts`
  - `react-refresh/only-export-components` — suppressed in `AuthContext.tsx` for `useAuth` export

## Import Organization

**Order:**
1. React/library imports (blank line after)
2. External package imports (blank line after)
3. Internal module imports (relative paths)
4. Type-only imports (may be combined with value imports or separate `import type`)

```typescript
import { useState, useEffect, useMemo } from 'react'   // 1. React
import { supabase } from '../lib/supabase'              // 2. Internal lib
import { fetchAllQuestoes } from '../services/supabase.service'  // 3. Services
import type { ResolucaoView, HistoricoResolucao } from '../types/database'  // 4. Types
```

**Path Aliases:**
- No path aliases configured (all imports use relative paths with `../` traversal)
- Maximum observed depth: `../../../` in some cases

## Component Patterns

**Functional Components Only:**
- All components are functional (`export function ComponentName` — no class components except `ErrorBoundary`)
- `ErrorBoundary.tsx` uses class component pattern (required for `componentDidCatch`)
- Named exports preferred over default exports for components (except `App.tsx` uses `export default App`)

**Props Typing:**
- Every component defines an interface for its props
- Props interface is co-located in the same file (above the component definition)
- Destructuring in function signature with defaults where needed

```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export function LoadingSpinner({ size = 'lg', text, className = '' }: LoadingSpinnerProps) { ... }
```

**UI Component Library (`src/components/ui/`):**
- Atomic design: `Button`, `Card`, `LoadingSpinner`, `MarkdownAI`
- Barrel file `index.ts` re-exports all UI components
- `Button` uses `forwardRef` for ref forwarding
- Variant pattern: `type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline'`
- Size pattern: `type Size = 'sm' | 'md' | 'lg' | 'icon'`

**Hooks:**
- All hooks use `use` prefix: `useQuestoes`, `useSimulados`, `useDashboard`, `useRevisao`, `useMentor`
- Hooks return state + handlers in a single object
- No custom hook test files exist yet

## Error Handling

**Patterns:**
- `try/catch` blocks in all async operations
- Error state variables (`loadingError`) displayed as UI fallback
- Console errors with `[LOG ...]` prefix for debug logging
- `err: unknown` type annotation in catch clauses (ESLint enforced — `any` was corrected)

```typescript
try {
  const data = await fetchAllQuestoes()
  setResolucoes(data)
} catch (err) {
  console.error('[LOG useQuestoes] Erro:', err)
  setLoadingError(err instanceof Error ? err.message : 'Erro desconhecido')
}
```

- `ErrorBoundary` class component catches rendering errors in component tree
- No custom error classes — errors are plain `Error` instances
- API errors surface user-friendly messages via `errorData.error || 'Erro ao obter resposta...'`
- Network timeouts via `Promise.race` with a rejection delay

## Logging

**Framework:** `console.log` / `console.error` (no structured logging library)

**Patterns:**
- `[LOG ComponentName]` prefix for debug logs — e.g., `[LOG useQuestoes]`, `[LOG Questoes]`
- `[DEBUG ComponentName]` prefix for verbose render tracing
- Performance logging with `performance.now()` — e.g., `[LOG fetchAllQuestoes] Query questoes: ${(t1 - t0).toFixed(0)}ms`
- Error logs with `console.error`

## Comments

**JSDoc/TSDoc:**
- Used for service files and complex modules
- `@deprecated` tag for legacy type aliases
- Section dividers with emoji/symbols in some files

```typescript
/**
 * supabase.service.ts
 * Camada centralizada de acesso ao banco de dados Supabase.
 * Modelo relacional: questoes + historico_resolucoes
 *
 * REGRA: Nunca chame `supabase` diretamente nas páginas ou hooks.
 */

/** @deprecated Use ResolucaoView. Mantido para migração gradual. */
export type Resolucao = ResolucaoView
```

**Section Comments:**
- Emoji + section dividers in files with many states: `// ─── Dados Principais ────`, `// ─── Actions ────`
- Inline comments for complex logic (e.g., filter matching, PDF parsing)
- No auto-generated documentation (no typedoc config)

## CSS/Styling Conventions

**Framework:** Tailwind CSS v4 (`@tailwindcss/vite` plugin)

**Patterns:**
- Utility classes applied directly in JSX via `className`
- `@theme` directive in `index.css` for custom CSS variables (colors, radius, fonts)
- Light/dark mode via CSS custom properties on `:root` and `html.light`
- CSS animation keyframes defined in `index.css` (fadeInUp, scaleIn, slideInRight, shimmer, etc.)
- Custom utility classes in `@layer utilities` (`.glass-card`, `.progress-bar`, `.nav-glow`, `.gradient-*`)
- No CSS modules, no styled-components, no CSS-in-JS
- `clsx` and `tailwind-merge` available but not widely used — most classes are inline strings with template literals
- Print styles via `.print:*` variants (e.g., `print:hidden`, `print:text-neutral-900`)

## Module Design

**Exports:**
- Named exports for all components and functions (`export function` not `export default`)
- Single exception: `App.tsx` uses `export default App`
- Barrel file at `src/components/ui/index.ts` re-exports all UI components

```typescript
// src/components/ui/index.ts
export { Button } from './Button'
export { Card, CardHeader, CardBody } from './Card'
export { LoadingSpinner } from './LoadingSpinner'
export { MarkdownAI } from './MarkdownAI'
```

**No Index Barrel in `src/components/`:**
- Components in `src/components/` are imported directly by file path (e.g., `'../components/QuestaoNavegacao'`)

## TypeScript Usage

**Strictness Level:**
- `noUnusedLocals: true` — catches unused variables
- `noUnusedParameters: true` — catches unused parameters
- `verbatimModuleSyntax: true` — requires `import type` for type-only imports
- `noFallthroughCasesInSwitch: true` — prevents switch fallthrough
- `erasableSyntaxOnly: true` — enforces erasable type syntax (no enums, no namespaces, no parameter properties)
- **No** `strict: true` — so `noImplicitAny` is not enabled globally
- `skipLibCheck: true` — skips type checking of `.d.ts` files
- Target: `es2023`, JSX: `react-jsx`
- Module: `esnext` with bundler resolution

**Types vs Interfaces:**
- `interface` preferred for object shapes, props, and database models
- `type` used for unions, mapped types, and function signatures
- `Record<string, string>` pattern for dynamic key-value maps (alternativas, filter state)

**Generics:**
- Used sparingly — `makeToggle<T>` factory pattern in `useQuestoes.ts`
- `React.Dispatch<React.SetStateAction<T[]>>` for setter argument types
- `Record<string, T>` for dynamic dictionaries

## File Organization

**Directory Structure:**
```
src/
├── components/       # Reusable components (flat, no subfolders except ui/)
│   └── ui/           # Atomic UI primitives + barrel index.ts
├── hooks/            # Custom React hooks (one per file)
├── lib/              # Utilities, pure functions, Supabase client init
├── pages/            # Page-level route components
├── services/         # API/data layer (Supabase, Gemini, IndexedDB, tracking)
├── test/             # Test setup files
└── types/            # Shared TypeScript types/interfaces
```

**Rules:**
- One component per file
- One hook per file
- Pure utility functions can be grouped (e.g., `cleanHtml.ts` exports one function, `pdfParser.ts` exports three)
- Services are grouped by domain (`supabase.service.ts`, `gemini.service.ts`, `studyMaterial.service.ts`)

## Commit Message Conventions

- No `husky` or `commitlint` configured
- Git history shows descriptive messages in Portuguese
- Pattern observed: `[type] [scope]: [description in Portuguese]`

## Git Hooks / Lint-Staged

- No `.husky/` directory present
- No `lint-staged` configuration
- No pre-commit hooks

---

*Convention analysis: 2026-06-08*
