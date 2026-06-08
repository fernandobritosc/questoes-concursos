# Testing Patterns

**Analysis Date:** 2026-06-08

## Test Framework

**Runner:**
- Vitest v4 (`"vitest": "^4.1.8"`)
- Config: `vitest.config.ts` at project root
- Globals enabled (`globals: true`) — `describe`, `it`, `expect` available without import (but imports are present in tests)

**Assertion Library:**
- Vitest built-in `expect` API
- `@testing-library/jest-dom` v6 for DOM matchers (`toBeInTheDocument`, `toHaveClass`, `toContainHTML`, etc.)
- Imported via setup file: `import '@testing-library/jest-dom/vitest'`

**Run Commands:**
```bash
npm test                # Run all tests (vitest run)
npm run test:watch      # Watch mode (vitest)
```

## Configuration

**`vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

Key settings:
- `environment: 'jsdom'` — DOM environment for component testing
- `setupFiles: ['./src/test/setup.ts']` — runs before each test file
- `include: ['src/**/*.test.{ts,tsx}']` — test discovery pattern

**Setup file `src/test/setup.ts`:**
```typescript
import '@testing-library/jest-dom/vitest'
```
This extends Vitest's `expect` with DOM-specific matchers like `toBeInTheDocument`, `toHaveClass`, `toBeVisible`, etc.

**Coverage Configuration:**
- **No coverage configuration** in `vitest.config.ts`
- No `coverage` property set — no coverage thresholds or reporters configured
- No coverage commands in `package.json`
- To view coverage: `npx vitest run --coverage` (requires additional setup)

## Test File Organization

**Location:** Co-located with source files, not in a separate test directory.

**Naming:**
- Pure function tests: `{sourceName}.test.ts` — e.g., `cleanHtml.test.ts`, `pdfParser.test.ts`
- Component tests: `{ComponentName}.test.tsx` — e.g., `MarkdownAI.test.tsx`

**Structure:**
```
src/
├── lib/
│   ├── cleanHtml.ts
│   ├── cleanHtml.test.ts          ✓ 17 tests
│   ├── pdfParser.ts
│   └── pdfParser.test.ts          ✓ 11 tests
└── components/
    └── ui/
        ├── MarkdownAI.tsx
        └── MarkdownAI.test.tsx     ✓ 10 tests
```

## Existing Tests

**Total: 38 tests across 3 files**

| File | Tests | Category | What it covers |
|------|-------|----------|----------------|
| `src/lib/cleanHtml.test.ts` | 17 | Pure function | `cleanHtmlText` — null/undefined/empty inputs, `<br>` replacement, `</p>` handling, HTML tag removal, HTML entity decoding (`&nbsp;`, `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`, `&#x27;`), whitespace trimming, complex HTML mix |
| `src/lib/pdfParser.test.ts` | 11 | Pure function | `parsePdfContent` — single/multiple questions, "Certo/Errado" gabarito mapping, 5 alternatives, exceptions (no Gabarito, no questions), page number/footer filtering, `caderno_nome` assignment, Gabarito suffix in text, Certo/Errado style questions |
| `src/components/ui/MarkdownAI.test.tsx` | 10 | Component | Rendering null/empty, plain text, bold (`**bold**`), italics (`*italic*` and `_italic_`), strikethrough (`~~text~~`), bullet lists, ordered lists, callout alerts (🚨), blockquotes, markdown tables with formatting |

## Test Patterns

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest'
// Component tests also import: import { render, screen } from '@testing-library/react'

describe('functionName', () => {
  it('describes expected behavior in Portuguese/English', () => {
    // arrange + act + assert
    expect(actual).toBe(expected)
  })
})
```

- `import { describe, it, expect } from 'vitest'` is explicit (not relying on globals)
- Component tests also import from `@testing-library/react`

**Setup/Teardown:**
- No `beforeEach`/`afterEach` in existing tests
- Test data is constructed inline within each test or via factory functions (see `makeQuestionBlock` in `pdfParser.test.ts`)

**Assertion Patterns:**
```typescript
// Pure function assertions
expect(cleanHtmlText(null)).toBe('')
expect(cleanHtmlText('Hello world')).toBe('Hello world')
expect(result[0].questao_tec_id).toBe(12345)

// DOM assertions
expect(screen.getByText('Hello world')).toBeInTheDocument()
expect(boldEl.tagName).toBe('STRONG')
expect(boldEl).toHaveClass('font-extrabold')
expect(tableEl).toBeInTheDocument()

// Exception testing
expect(() => parsePdfContent('some text', 'Test')).toThrow('Nao foi possivel encontrar a secao Gabarito')

// Length/count assertions
expect(result).toHaveLength(1)
expect(Object.keys(result[0].alternativas)).toHaveLength(5)
```

## Mocking

**Framework:** Vitest built-in mocking (`vi.fn()`, `vi.mock()`) — available but **not yet used** in existing tests.

**Current State:**
- No mocks in any test file
- Pure functions tested directly without mocking
- Component test (`MarkdownAI.test.tsx`) tests only rendering logic with no external dependencies
- No mocked Supabase client
- No mocked Gemini API
- No mocked IndexedDB

**What Needs Mocking (identified gaps in AGENTS.md):**
- Supabase client calls (`fetchAllQuestoes`, `insertHistoricoResolucao`, etc.) for hook tests
- `window.pdfjsLib` for PDF import tests
- `fetch` for API calls (`/api/gemini`, hermes relay)

**Expected Pattern (for future tests):**
```typescript
import { vi } from 'vitest'
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        // chain
      }))
    }))
  }
}))
```

## Fixtures and Factories

**Current Pattern:**
Test data is built inline or via factory functions:

```typescript
// Factory pattern for complex fixtures (pdfParser.test.ts)
function makeQuestionBlock(overrides?: Partial<QuestionBlock>) {
  const id = overrides?.id ?? '12345'
  const banca = overrides?.banca ?? 'CESPE / CEBRASPE'
  // ...
  return block
}
```

**Location:** Test data lives inside each test file — no shared fixtures directory.

## Test Types

**Unit Tests (existing):**
- Pure utility functions (`cleanHtmlText`, `parsePdfContent`) — 28 tests
- Component rendering (`MarkdownAI`) — 10 tests

**Integration Tests:**
- None currently. Hooks (`useQuestoes`, `useSimulados`) and data flow are untested.

**E2E Tests:**
- Not used. No Playwright/Cypress configuration.

**What Exists vs. What's Missing:**

| Area | Test Coverage | Tests Needed |
|------|---------------|--------------|
| `src/lib/cleanHtml.ts` | ✓ 17 tests (full) | None |
| `src/lib/pdfParser.ts` | ✓ 11 tests (full) | None |
| `src/components/ui/MarkdownAI.tsx` | ✓ 10 tests (good) | Additional edge cases optional |
| `src/components/QuestaoNavegacao.tsx` | ✗ 0 tests | Button disable states, callback assertions |
| `src/components/QuestaoVisualizador.tsx` | ✗ 0 tests | Rendering, interaction, timer display |
| `src/components/QuestaoGabarito.tsx` | ✗ 0 tests | Gabarito display logic |
| `src/components/ImportPdfModal.tsx` | ✗ 0 tests | Flow states, file handling |
| `src/components/QuestaoIndice.tsx` | ✗ 0 tests | Tree filtering, navigation |
| `src/components/QuestaoResolucaoProfessor.tsx` | ✗ 0 tests | Edit/save/cancel flow |
| `src/components/QuestaoTabs.tsx` | ✗ 0 tests | Tab switching |
| `src/components/ui/Button.tsx` | ✗ 0 tests | Variants, loading state, click handlers |
| `src/components/ui/Card.tsx` | ✗ 0 tests | Padding variants, children rendering |
| `src/components/ui/LoadingSpinner.tsx` | ✗ 0 tests | Size variants, text display |
| `src/hooks/useQuestoes.ts` | ✗ 0 tests | Filtering logic, state management, Supabase calls |
| `src/hooks/useSimulados.ts` | ✗ 0 tests | Timer, question flow, quiz completion |
| `src/hooks/useDashboard.ts` | ✗ 0 tests | Stats computation, trend calculation |
| `src/hooks/useRevisao.ts` | ✗ 0 tests | Error review flow |
| `src/hooks/useMentor.ts` | ✗ 0 tests | Mentor plan generation |
| `src/services/supabase.service.ts` | ✗ 0 tests | Database operations, caching logic |
| `src/services/gemini.service.ts` | ✗ 0 tests | Prompt building, API communication |
| `src/services/studyMaterial.service.ts` | ✗ 0 tests | IndexedDB operations, compression |
| `src/pages/*.tsx` | ✗ 0 tests | Page rendering, routing |

## Testing Strategy

**Current Strategy:**
- Focus on pure functions (highest value per test effort)
- Component rendering tests for stable UI primitives
- **Goal** (from AGENTS.md): Expand to component tests (`QuestaoNavegacao`, `QuestaoVisualizador`, `QuestaoGabarito`) and hook tests (`useQuestoes`, `useSimulados`)

**Recommended Approach:**
1. **Pure functions** (existing) — test input/output combinations exhaustively ✓
2. **UI components** (planned) — test rendering with different props, user interactions via `@testing-library/user-event`
3. **Hook tests** (planned) — test state transitions by wrapping in a test component or using `renderHook`, mock Supabase responses
4. **Integration flows** (future) — test import PDF flow end-to-end with mocked file reader

## Areas Lacking Coverage

Identified gaps (from AGENTS.md "Pendente" section):

1. **`getQuestionValidation` duplication** — logic exists in both `useQuestoes.ts` and `ImportPdfModal.tsx`; should be extracted to `src/lib/validation.ts` and tested
2. **Component interaction tests** — `QuestaoNavegacao` button clicks, `QuestaoVisualizador` alternative selection
3. **Hook business logic** — `useQuestoes` filter chain, `useSimulados` timer + finalization
4. **Service layer** — `supabase.service.ts` query building (test with mocked client), `studyMaterial.service.ts` IndexedDB operations
5. **Edge cases** — empty states (no questions, no history), error states (network failure, API timeout), loading states

---

*Testing analysis: 2026-06-08*
