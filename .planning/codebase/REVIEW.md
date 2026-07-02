---
status: issues_found
depth: deep
files_reviewed: 35
findings:
  critical: 5
  warning: 10
  info: 8
  total: 23
---

# Code Review: questoes-concursos (Full Codebase)

**Review Date:** 2026-06-08
**Depth:** deep (cross-file analysis)
**Files reviewed:** 35 (src/ + api/ + extensao/)

---

### Critical

**CR-001 — Supabase anon key hardcoded in browser extension**
- **File:** `extensao/content.js:1-2`
- **Risk:** The Supabase anonymous key and URL are hardcoded as string literals in the extension source. Anyone inspecting the extension source can extract these credentials. While anon keys are designed to be public, hardcoding them in extension code that ships to users makes key rotation impossible without an extension update.
- **Fix:** Fetch credentials from the React app's localStorage (already available in the sync module) or use `chrome.storage.sync` configured server-side.

**CR-002 — Auth token stored unencrypted in chrome.storage.local**
- **File:** `extensao/content.js:38-48`
- **Risk:** The Supabase JWT token is read from `localStorage` and persisted to `chrome.storage.local` in plaintext. Any other extension running in the browser with `storage` permission can read this token, granting full API access as the user.
- **Fix:** Use `chrome.storage.session` (ephemeral, not written to disk) or encrypt the token before storage.

**CR-003 — Backend falls back to client-exposed VITE_ env vars**
- **File:** `api/gemini.ts:6-10`
- **Risk:** The serverless function reads `process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY` (same pattern for Supabase URL/key). If `GROQ_API_KEY` is not set on the server, it falls back to `VITE_GROQ_API_KEY` — which is bundled into the client JS and publicly visible. This means a misconfigured server silently uses credentials any user can extract.
- **Fix:** Remove VITE_ fallbacks from backend code. Fail loudly if server env vars are missing, or use Vercel environment variables exclusively.

**CR-004 — ObjectURL memory leak (revokeObjectURL never called)**
- **File:** `src/services/studyMaterial.service.ts:203,227`
- **Risk:** `URL.createObjectURL(pdfBlob)` is called twice but `URL.revokeObjectURL` is never called. Each call creates a browser memory entry that persists until the document is unloaded. In a long-running SPA session where users open many PDFs, this leaks memory.
- **Fix:** Track created ObjectURLs and call `URL.revokeObjectURL(blobUrl)` in a `useEffect` cleanup or after the blob is consumed.

**CR-005 — Debug console.logs left in production Questoes.tsx**
- **File:** `src/pages/Questoes.tsx:22,173,200,203,207`
- **Risk:** `console.count` and `console.log` calls fire on every render in production. The `console.count` at line 22 increments on every React render call, which can mask performance issues and leaks internal component behavior. Debug logs in production add noise but are otherwise low-risk — however, `console.count` specifically can impact render performance in development tooling.
- **Fix:** Remove all `console.log`/`console.count` debug statements from `Questoes.tsx` (and verify other files have only error logging, not debug logging, in production paths).

---

### Warnings

**WR-001 — 30 eslint-disable suppressions across 14 files**
- **Files:** Multiple (see CONCERNS.md for full list)
- **Risk:** Disabling lint rules bypasses automated quality checks. `react-hooks/set-state-in-effect` (11 suppressions) is especially risky — it suppresses stale-closure and infinite-loop warnings. While documented as intentional in AGENTS.md, each suppression should have a specific rationale comment.
- **Fix:** Review each suppression. For `set-state-in-effect`, extract to a `useEffect` with proper dependencies. For `no-explicit-any`, add type annotations.

**WR-002 — useQuestoes.ts: 637 lines with 20+ useState calls**
- **File:** `src/hooks/useQuestoes.ts:71-123`
- **Risk:** A single hook managing 20+ state variables across 637 lines violates single-responsibility. State transitions are hard to trace, testing is impractical, and the file has 6+ eslint suppressions.
- **Fix:** Split into smaller hooks (e.g., `useQuestoesFiltro`, `useQuestoesResposta`, `useQuestoesResolucao`).

**WR-003 — Large component files pending extraction**
- **Files:** `src/pages/Simulados.tsx` (~917 lines), `src/pages/MapaQuestoes.tsx` (~807), `src/pages/Revisao.tsx` (~781), `src/pages/Dashboard.tsx` (~737), `src/pages/EditalVerticalizado.tsx` (~689)
- **Risk:** Large single-file components reduce maintainability, increase merge conflicts, and make testing specific behaviors difficult.
- **Fix:** Extract sub-components following the `Questoes.tsx` refactoring pattern (1662→334 lines, 11 extracted components).

**WR-004 — catch(err) without typing in several files**
- **Files:** `src/hooks/useQuestoes.ts:186,228,437,527,573`, `src/hooks/useSimulados.ts:67,128,172,349`, `src/pages/Simulados.tsx:96`, `src/services/studyMaterial.service.ts:82`, `src/pages/MapaQuestoes.tsx:101,252`, `src/pages/EditalVerticalizado.tsx:70`
- **Risk:** `catch(err)` defaults to `any` type unless TypeScript `useUnknownInCatchVariables` is enabled. This can silently swallow type errors.
- **Fix:** Use `catch (err: unknown)` pattern consistently (already done in ~14 other catch blocks).

**WR-005 — api/gemini.ts uses `any` for request/response types**
- **File:** `api/gemini.ts:17,66`
- **Risk:** `req: any, res: any` and `options: any` bypass all type checking. The Groq SDK has typed request builders — using them would catch parameter errors at compile time.
- **Fix:** Type `req`/`res` as `VercelRequest`/`VercelResponse` from `@vercel/node`. Use `Groq.Chat.CompletionCreateParams` for options.

**WR-006 — FetchAllQuestoes fetches 1000+ questions without server pagination**
- **File:** `src/services/supabase.service.ts` (implied by LOG output showing batch fetch of questions + historico)
- **Risk:** Loading all questions in a single request creates high memory usage and slow initial load. With 1000+ questions each having resolucao_professor text, the payload can be several MB.
- **Fix:** Implement pagination with `.range()` and lazy-loading as the user browses.

**WR-007 — Multiple useEffect instances resetting state on navigation**
- **File:** `src/pages/Questoes.tsx:72-100` (3 useEffects)
- **Risk:** Multiple `useEffect` hooks with overlapping dependencies can cause cascading re-renders. The `targetId` and `materia` params effects both call `setCurrentQuestaoIndex` and `setFiltros`, which could race.
- **Fix:** Consolidate URL parameter handling into a single `useEffect` with a unified state reducer.

**WR-008 — Extension uses both Polling and MutationObserver redundantly**
- **File:** `extensao/content.js`
- **Risk:** The content script uses both a polling mechanism (`setInterval` at 3s) and MutationObservers to detect DOM changes. Using both simultaneously creates redundant work and potential race conditions.
- **Fix:** Use only MutationObserver for reactivity; remove polling interval.

**WR-009 — getQuestionValidation logic duplicated across files**
- **Files:** At least 2 locations (check `Questoes.tsx` and `Simulados.tsx` names suggest shared validation)
- **Risk:** Duplicated validation logic will inevitably diverge, causing inconsistent answer verification between question browsing and simulado modes.
- **Fix:** Extract to `src/lib/validation.ts` as noted in AGENTS.md.

**WR-010 — ErrorBoundary wraps route-level content but no per-component fallbacks**
- **File:** `src/components/ErrorBoundary.tsx` (usage in route components)
- **Risk:** Currently ErrorBoundary wraps entire page components. An error in any sub-component takes down the entire page. Users see a generic fallback instead of a degraded but usable UI.
- **Fix:** Wrap isolated sub-components (e.g., `QuestaoEstatisticas`, `MeuDesempenho`, `QuestaoGabarito`) in their own ErrorBoundaries for graceful degradation.

---

### Info

**IN-001 — Console.warn for expected fallback behavior**
- **File:** `src/lib/supabase.ts:7`, `src/services/studyMaterial.service.ts:78,281`
- **Detail:** These log warnings for expected conditions (env vars missing, Supabase table unavailable). Consider `.info()` or removing in production.

- **Detail:** `.catch(() => {})` silently swallows all errors. Add error logging or typed error handling.

**IN-003 — Recharts library (~2MB) used for simple bar charts**
- **File:** `src/pages/Dashboard.tsx` (imports recharts)
- **Detail:** Recharts adds significant bundle size for what could be CSS-only progress bars or a lightweight chart library. Consider replacing with a minimal bars implementation.

**IN-004 — `console.count` at render root of Questoes.tsx**
- **File:** `src/pages/Questoes.tsx:22`
- **Detail:** `console.count` at the top of a render function fires on every render, including re-renders from state changes. Useful in development but should be stripped for production.

**IN-005 — Multiple catch blocks log `err` without serialization**
- **File:** `src/pages/Simulados.tsx:97` (`console.error(err)`), several others
- **Detail:** `console.error(err)` passes the Error object directly. While acceptable in debugging, some environments (production monitoring) may not serialize Error objects properly. Use `err instanceof Error ? err.message : String(err)`.

**IN-006 — Prompt injection risk via question data sent to LLM**
- **File:** `src/hooks/useMentor.ts`, `src/hooks/useQuestoes.ts:467` (handleExplicacaoIA calls)
- **Detail:** Question content (enunciado, alternativas) is sent directly to the LLM in the prompt. A malicious question with prompt injection could alter AI behavior. Not easily exploitable (data is from trusted sources), but worth awareness.

**IN-007 — Race condition in fetchAllQuestoes cache**
- **File:** `src/services/supabase.service.ts` (implied by LOG: "Aguardando chamada concorrente")
- **Detail:** The cache appears to handle concurrent calls but the locking mechanism should be verified for edge cases (component unmount during fetch, rapid tab switching).

**IN-008 — `any` type in MarkdownAI custom renderers**
- **File:** `src/pages/Mentor.tsx:89` (block-level suppress for all custom renderers)
- **Detail:** ReactMarkdown `Components` type requires specific renderer signatures. Using `any` here means callback parameter changes won't be caught. Documented as "accepted debt" in AGENTS.md.
