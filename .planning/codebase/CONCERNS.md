# Codebase Concerns

**Analysis Date:** 2026-06-08

## Technical Debt

### 1. `any` Types Bypassing TypeScript Safety

**Severity: HIGH**

**43+ `any` annotations** across the codebase defeat TypeScript's type safety. These are documented and accepted as "known debt" in `AGENTS.md`, but they create blind spots.

| File | Lines | Issue |
|---|---|---|
| `src/lib/pdfParser.ts` | 1 (file-level) | Entire file disables `@typescript-eslint/no-explicit-any` |
| `src/services/supabase.service.ts` | 13, 50, 349, 357, 376 | `mapHistoricoToView(h: any)`, `fetchMentorPlano` returns `any`, etc. |
| `src/services/studyMaterial.service.ts` | 213, 286, 306 | IndexedDB operations typed as `any` |
| `src/pages/Mentor.tsx` | 89-171 | 7 ReactMarkdown custom renderers typed `any` |
| `src/pages/Simulados.tsx` | 73-74 | `selectedSimuladoForModal` state typed `any` |
| `src/api/gemini.ts` | 16-17 | Handler `req/res` typed `any` |
| `src/vite.config.ts` | 9-54 | API emulator server/req/res typed `any` |

**Impact:** Silent type mismatches reaching production; refactoring harder; IDE autocomplete unreliable.

**Fix approach:** Create concrete types for Supabase row responses (use `supabase-js` generated types via `supabase gen types`). Replace `mapHistoricoToView` with a typed mapper. Create proper Vercel request/response types.

---

### 2. Large Component Files

**Severity: MEDIUM**

Multiple page components exceed 500 lines, indicating insufficient decomposition:

| File | Lines | Status |
|---|---|---|
| `src/pages/Simulados.tsx` | ~917 | **Pending extraction** (4 render states inline) |
| `src/pages/MapaQuestoes.tsx` | ~807 | Not yet refactored |
| `src/pages/Revisao.tsx` | ~781 | Not yet refactored |
| `src/pages/Dashboard.tsx` | ~737 | Not yet refactored |
| `src/pages/EditalVerticalizado.tsx` | ~689 | Not yet refactored |
| `src/components/ImportPdfModal.tsx` | ~744 | Partially refactored (from 1053) |

`useQuestoes.ts` at 637 lines with **20+ individual state variables** (`useState` calls from line 71-123) is also oversized.

**Impact:** Hard to reason about, test, or modify individual behaviors. High merge conflict probability.

**Fix approach:** Extract sub-components from each page (following `Questoes.tsx` pattern). Extract domain logic from `useQuestoes.ts` into smaller hooks.

---

### 3. ESLint-Disable Proliferation

**Severity: MEDIUM**

**30 `eslint-disable` comments** across the codebase:

| Suppression | Count | Primary Locations |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | 14 | Services, pdfParser, MarkdownAI, Mentos |
| `react-hooks/set-state-in-effect` | 10 | useQuestoes, useRevisao, useSimulados, pages |
| `react-hooks/exhaustive-deps` | 2 | useQuestoes, useSimulados |
| `@typescript-eslint/no-unused-vars` | 1 | Mentor |
| `react-refresh/only-export-components` | 1 | AuthContext |
| `no-useless-assignment` | 3 | pdfParser |

**Impact:** Suppressions hide real bugs. The `set-state-in-effect` suppressions in particular (10 instances) indicate a systemic pattern of calling state setters inside `useEffect` without proper dependency management — the intentional pattern per AGENTS.md, but fragile.

**Fix approach:** For `set-state-in-effect`, use `key` prop to reset state instead. For `any`, use proper types. For `exhaustive-deps`, restructure dependencies.

---

### 4. Duplicated Validation Logic

**Severity: MEDIUM**

The `getQuestionValidation` function is duplicated:
- `src/components/ImportPdfModal.tsx` lines 37-45
- `src/hooks/useQuestoes.ts` lines 53-61

Also `formatarTempo` is imported from `useDashboard.ts` into `Simulados.tsx` (line 7), creating a cross-hook dependency.

**Impact:** Inconsistent validation behavior if one copy is updated but not the other.

**Fix approach:** Extract to `src/lib/validation.ts`. Move shared formatters to `src/lib/formatters.ts`.

---

### 5. Deprecated Types Still in Active Use

**Severity: LOW**

```typescript
// src/types/database.ts line 78-79
/** @deprecated Use ResolucaoView. Mantido para migração gradual. */
export type Resolucao = ResolucaoView
```

`Resolucao` (deprecated) is still used as the primary alias in `ImportPdfModal.tsx` (line 20), `useQuestoes.ts` (line 14), and in function signatures.

**Impact:** Confusion for new developers. Prevents cleanup and type renaming.

**Fix approach:** Remove deprecated alias, rename all usages to `ResolucaoView`.

---

## Performance

### 1. No Server-Side Pagination on Question Load

**Severity: HIGH**

`src/services/supabase.service.ts` line 181: `fetchAllQuestoes` loads ALL questions with `.limit(1000)`. This means:
- The entire question dataset is fetched in a single request
- All filtering is done client-side in `getFilteredQuestions()` (`src/hooks/useQuestoes.ts` lines 343-386)
- Memory grows linearly with question count

```typescript
.limit(1000)  // hardcoded limit — will fail silently when exceeded
```

**Impact:** Performance degrades as question count grows. Large datasets cause slow initial load and sluggish filtering (UI freezes during filter computation).

**Fix approach:** Implement server-side filtering with Supabase `.in()` filters. Add proper pagination with offset/limit. Remove the `limit(1000)` ceiling.

---

### 2. Missing ObjectURL Cleanup

**Severity: MEDIUM**

`src/services/studyMaterial.service.ts` lines 203, 227: `URL.createObjectURL()` is called to create blob URLs for PDF viewing, but `URL.revokeObjectURL()` is **never called**.

```typescript
const blobUrl = URL.createObjectURL(pdfBlob)  // created here
// ... but never revoked when the component unmounts
```

**Impact:** Memory leak — each PDF view leaks a blob URL until the browser tab is closed. Over time, this can cause degraded performance or browser crashes.

**Fix approach:** Track created blob URLs and revoke them in a cleanup function (e.g., `useEffect` return callback in consuming components).

---

### 3. DOM Polling in Browser Extension

**Severity: MEDIUM**

`extensao/content.js` line 283: The TEC Concursos content script uses a **500ms `setInterval`** to scan the DOM:

```javascript
const extractionInterval = setInterval(() => {
    const questionContainers = document.querySelectorAll(".questao");
    // ... full DOM scan every 500ms
}, 500);
```

Combined with a `MutationObserver` (lines 321-347) that triggers the same processing on DOM changes, this creates duplicate work.

**Impact:** Unnecessary CPU usage on the user's browser, especially on pages with many questions. Battery drain on laptops.

**Fix approach:** Remove the polling interval and rely solely on the `MutationObserver`, which is more efficient. If polling is needed, increase the interval to 2-3 seconds.

---

### 4. Unmemoized Expensive Operations in Render

**Severity: LOW**

`src/components/ui/MarkdownAI.tsx`: The `parseFormatting` function (line 248) runs regex splitting on every render for every text block. `cleanHtmlText` is called directly inside render loops in `Simulados.tsx` (lines 559, 589) and `Revisao.tsx`.

**Impact:** Unnecessary re-computation on every React re-render. May cause jank with large question lists.

**Fix approach:** Memoize `parseFormatting` results. Pre-process `cleanHtmlText` in data-loading phase rather than render phase.

---

### 5. recharts Bundle Size

**Severity: LOW**

`recharts` (~2MB bundled) is imported in both `Dashboard.tsx` and `Simulados.tsx`. This is a large visualization library used for relatively simple charts (area chart, bar chart, radar chart).

**Impact:** Increases JS bundle size significantly. Users pay the cost even if they never visit these pages.

**Fix approach:** Consider lighter alternatives (e.g., `lightweight-charts`, custom SVG as in `Sparkline` component in Dashboard). Lazy-load the component via `React.lazy()`.

---

## Security

### 1. Hardcoded Supabase Anon Key in Browser Extension

**Severity: HIGH**

`extensao/content.js` line 9:

```javascript
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const SUPABASE_URL = "https://dyxtalcvjcprmhuktyfd.supabase.co";
```

The Supabase anonymous key is **hardcoded in plain text** in the browser extension. This key is meant to be public, but the real concern is that the extension uses this key with **full anon access to the database**.

**Impact:** Anyone can reverse-engineer the extension and access the Supabase project with the anon key. While Supabase RLS policies should restrict access, hardcoded keys make the project URL+key permanently exposed.

**Fix approach:** Move the key to the extension's `manifest.json` or use a background script to fetch credentials. More importantly, ensure RLS policies are restrictive enough.

---

### 2. Authentication Token Stored in chrome.storage.local

**Severity: HIGH**

`extensao/content.js` lines 48-54: The Supabase session token is read from `localStorage` and written to `chrome.storage.local`:

```javascript
chrome.storage.local.set({
    supabase_token: token,
    supabase_user_id: userId
}, ...)
```

`chrome.storage.local` is **not encrypted** — any other extension or script running on the same machine can read it.

**Impact:** Session theft. If the user has a malicious extension, or if someone gains local access, the Supabase session token can be stolen and used to access the user's account.

**Fix approach:** Use `chrome.storage.session` (ephemeral, in-memory) instead of `chrome.storage.local` for tokens. Or use the `identity` API for secure token management.

---

### 3. Anonymous Key Used as Authorization Fallback

**Severity: HIGH**

`extensao/content.js` lines 586-588:

```javascript
if (token) {
    headers["Authorization"] = `Bearer ${token}`;
} else {
    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
}
```

When no user session is found, the script uses the anon key as the Bearer token for all subsequent requests. This means data can be written to Supabase without user authentication.

**Impact:** Data integrity risk — if RLS policies are not strict enough, anonymous writes could pollute the database.

**Fix approach:** Only allow authenticated requests. If no session, skip the write and queue it for when session is available.

---

### 4. Backend API Falls Back to Client-Side Env Vars

**Severity: MEDIUM**

`api/gemini.ts` lines 6-10:

```typescript
const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
```

The serverless function falls back to `VITE_`-prefixed variables, which are bundled into the frontend. This means if `GROQ_API_KEY` is not set in production, it will use `VITE_GROQ_API_KEY` which may not exist or may be insecure.

**Impact:** In production deployments, if environment variables aren't properly configured, the API may silently use less-secure fallback values. The `VITE_SUPABASE_ANON_KEY` fallback for `SUPABASE_SERVICE_ROLE_KEY` is particularly dangerous — the anon key has far fewer permissions than a service role key.

**Fix approach:** Remove the `VITE_` fallback from server-side code. Fail fast if required env vars are missing.

---

### 5. Missing Input Sanitization in LLM Prompts

**Severity: MEDIUM**

`src/services/gemini.service.ts`: User-submitted question data (enunciado, alternativas, etc.) is inserted directly into LLM prompts without sanitization:

```typescript
const prompt = `...${questao.enunciado}...${gabaritoTexto}...`
```

**Impact:** **Prompt injection vulnerability** — a malicious question imported from PDF could inject instructions into the LLM prompt, potentially causing the AI to produce harmful or misleading content.

**Fix approach:** Sanitize and delimit user input in prompts. Use structured output parsing. Add a system prompt boundary instruction.

---

### 6. Missing Revocation of ObjectURLs

**Severity: LOW**

`src/services/studyMaterial.service.ts`: `URL.createObjectURL()` is called but `URL.revokeObjectURL()` is never called (see Performance §2). This is also a security concern because ObjectURLs grant access to in-memory file data — if a user navigates away without cleanup, the URL remains valid.

---

## Maintainability

### 1. Overly Large Hook Return Values

**Severity: HIGH**

`src/hooks/useQuestoes.ts`: The hook returns **70+ values** (lines 604-712), including 20+ individual state values AND their setters exposed directly to the component.

```typescript
return {
    resolucoes, setResolucoes, loading, loadingError, cadernoQuestoes,
    setCadernoQuestoes, isCadernoActive, setIsCadernoActive,
    currentQuestaoIndex, setCurrentQuestaoIndex,
    // ... 40+ more lines
}
```

**Impact:** Impossible to reason about what the hook owns vs what the component owns. Any change to the hook potentially affects the consuming component. Violates separation of concerns.

**Fix approach:** Split into smaller hooks (`useQuestoesFilter`, `useQuestoesCaderno`, `useQuestoesImport`, `useQuestoesResolucao`). Avoid exposing setters directly — expose action functions instead.

---

### 2. Callback-Hook Dependency Web

**Severity: MEDIUM**

`src/hooks/useSimulados.ts` line 187: `handleFinalizarSimulado` is called inside the cronômetro `useEffect` (line 187), but the function closure references `tempoGasto` and other state that may be stale:

```typescript
useEffect(() => {
    if (etapa === 'active') {
        timerRef.current = setInterval(() => {
            setTempoRestante(prev => {
                if (prev <= 1) {
                    handleFinalizarSimulado()  // stale closure
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }
}, [etapa, questoesSelected])  // missing: handleFinalizarSimulado, tempoGasto...
```

The `// eslint-disable-next-line react-hooks/exhaustive-deps` (line 199) acknowledges this but doesn't fix it.

**Impact:** The timer auto-submit may use outdated state values (e.g., incorrect `tempoGasto` calculation).

**Fix approach:** Use `useRef` for the state values needed inside the timer callback, or restructure with `useReducer`.

---

### 3. No ErrorBoundary in App.tsx Routing

**Severity: MEDIUM**

`src/App.tsx` does not wrap pages with the existing `ErrorBoundary` component (`src/components/ErrorBoundary.tsx`). The ErrorBoundary exists but is **not used** anywhere.

**Impact:** A JavaScript error in any page component crashes the entire app with a white screen, with no user-facing error recovery.

**Fix approach:** Wrap each route element with `<ErrorBoundary>`:

```tsx
<Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
```

---

### 4. localStorage-Only Simulado History

**Severity: MEDIUM**

`src/hooks/useSimulados.ts`: Simulado history is stored **only** in `localStorage` under `concursos_simulado_historico`. No cloud backup, no export, no sync.

**Impact:** Users lose all simulado history if they:
- Clear browser data
- Use a different device
- Switch browsers
- Use incognito/private mode

**Fix approach:** Sync simulado history to Supabase. Use localStorage as a cache, not the source of truth.

---

### 5. TypeScript Strict Mode Not Enabled

**Severity: MEDIUM**

`tsconfig.app.json` (lines 2-23) does NOT include:
```json
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true,
```

While `noUnusedLocals` and `noUnusedParameters` are enabled, the lack of strict mode allows implicit `any` types, null propagation issues, and other type-safety gaps to slip through.

**Impact:** The `any` annotations could be partially mitigated if strict mode caught implicit `any` cascades.

**Fix approach:** Enable `"strict": true` in `tsconfig.app.json` and fix the ~50-100 compilation errors that will surface.

---

### 6. Carreira Matching Hardcoded as String Heuristics

**Severity: LOW**

`src/hooks/useQuestoes.ts` lines 374-381: Carreira classification uses fragile string matching:

```typescript
if (car === 'Policial') return concUpper.includes('POLICIA') || orgUpper.includes('PC') ...
```

**Impact:** Matches are imprecise — "POLICIA" matches any mention of "Polícia" even in non-policial contexts. Adding new carreiras requires code changes.

**Fix approach:** Use a `keywords` configuration array or tag-based system.

---

## Reliability

### 1. Silent Failure on Hermes Relay

**Severity: LOW**

`src/services/hermesTracker.ts` line 47:

```typescript
fetch(`${RELAY_URL}/event`, { ... })
  .catch(() => {
    /* relay offline — silent fail */
  })
```

**Impact:** Events silently lost when the relay is unavailable. No retry, no queue, no user feedback.

**Fix approach:** Add a pending event queue that retries on next successful connection. Log the failure.

---

### 2. Stale Question Timer Averaging

**Severity: MEDIUM**

`src/hooks/useSimulados.ts` line 126:

```typescript
tempo_segundos: tempoMedioQuestao,  // same value for ALL questions
```

When submitting a simulado, every question receives the **same average time** instead of the actual time spent on that specific question.

**Impact:** Dashboard time-per-question statistics are meaningless — all questions show the same time.

**Fix approach:** Track per-question time using the `questionLoadTimes` pattern from the browser extension.

---

### 3. Race Condition in Cache Invalidation

**Severity: MEDIUM**

`src/services/supabase.service.ts` lines 141-151, 240-244: The `_questoesCachePromise` pattern has a flaw — when `clearQuestoesCache()` is called (line 147), it resets the promise but a concurrent request that started before the clear will still complete and overwrite the cache:

```typescript
export function clearQuestoesCache(): void {
  _questoesCache = null
  _questoesCachePromise = null  // Race: in-flight request may set _questoesCache later
  _questoesCacheTimestamp = 0
}
```

**Impact:** Stale data can appear after a cache clear. In-flight requests from before the clear can overwrite the cleared cache with old data.

**Fix approach:** Use a generation counter or AbortController to cancel in-flight requests when cache is cleared.

---

### 4. Missing Retry Logic on Network Failures

**Severity: MEDIUM**

All Supabase service functions (`supabase.service.ts`) throw on error with no retry logic. Network blips cause immediate failures visible to users as error states or `alert()` dialogs.

**Impact:** Poor offline/spotty connection experience. Users see "Erro ao conectar com o banco de dados" messages.

**Fix approach:** Add exponential backoff retry wrapper for Supabase calls. Graceful degradation with offline indicator.

---

### 5. Browser Extension Complex State Management

**Severity: MEDIUM**

`extensao/content.js` lines 98-99, 253-279, 567-781: The extension uses a hand-rolled state machine with `Set` objects (`sentAttempts`, `sentComments`, `pendingRequests`) and manual cleanup. Error recovery (lines 762-765) deletes from sets to allow retry:

```javascript
if (!hasAttemptSent) sentAttempts.delete(questaoTecId);
if (questaoPayload.resolucao_professor) sentComments.delete(questaoPayload.questao_tec_id);
```

**Impact:** Complex, fragile error recovery. Multiple async requests for the same question can overlap if timing is unlucky, causing duplicate writes.

**Fix approach:** Use a proper state machine with explicit states (idle, fetching, saving, done, error). Lock per-questaoTecId.

---

## Accessibility

### 1. Widespread Missing ARIA Attributes

**Severity: HIGH**

Throughout the codebase, interactive elements lack proper ARIA attributes:

- `ImportPdfModal.tsx`: Drag-and-drop zone (line 268-303) is a `<label>` with no `role="button"` or keyboard event handlers
- `Simulados.tsx`: Question option buttons (line 572) lack `aria-pressed` or `aria-selected`
- `Simulados.tsx`: Accordion toggles (lines 254, 844) lack `aria-expanded`
- `Dashboard.tsx`: Metric cards likely use click events on divs without `role` or `tabindex`
- All icon-only buttons (close, menu toggle, theme toggle) lack `aria-label`
- The `MarkdownAI` component renders semantic HTML but no `role="region"` or `aria-label` for sections

**Impact:** Screen reader users cannot navigate the app effectively. Keyboard-only users may be unable to access key features.

**Fix approach:** Add `aria-label` to all icon-only buttons. Add `role`, `aria-expanded`, `aria-selected` to interactive elements. Add keyboard event handlers to drag-and-drop zones. Conduct an accessibility audit.

---

### 2. Color-Only Error/Correct Indicators

**Severity: HIGH**

Throughout the codebase, question status is indicated **solely by color**:
- Red border/text for incorrect, green for correct (`Simulados.tsx` lines 576-591, `Revisao.tsx` lines 839-841)
- The `acertou` status in the review section (line 830) shows `ACERTOU`/`ERROU` text, but in many other places only color distinguishes state

**Impact:** Colorblind users (approximately 8% of male users) cannot distinguish correct from incorrect answers.

**Fix approach:** Add icons (already partially done with `CheckCircle2`/`XCircle` in some places) and text labels alongside all color indicators. Ensure text labels are always present.

---

### 3. Missing Focus Management in Modals

**Severity: MEDIUM**

`src/components/ImportPdfModal.tsx` lines 226-799: The modal does not implement:
- Focus trap (Tab cycling stays within modal)
- Focus restoration to trigger element when closed
- `aria-modal="true"` or proper `role="dialog"`

`Simulados.tsx` lines 438-479: The "Prescrição Tática" modal overlay has similar issues.

**Impact:** Keyboard users and screen reader users can tab behind the modal. Focus is lost when modal closes.

**Fix approach:** Implement focus trap via `useEffect` with `tabindex` management. Add `role="dialog"` and `aria-modal="true"`. Save and restore focus on open/close.

---

## Browser Extension

### 1. Cross-Origin Permission Scope Too Broad

**Severity: MEDIUM**

`extensao/manifest.json` lines 9-14:

```json
"host_permissions": [
    "*://www.tecconcursos.com.br/*",
    "https://dyxtalcvjcprmhuktyfd.supabase.co/*",
    "http://localhost/*",
    "http://127.0.0.1/*",
    "https://*.vercel.app/*"
]
```

The extension has access to `http://localhost/*` and `http://127.0.0.1/*` (all paths), not just the app's development server.

**Impact:** Any data on any localhost page is accessible to the content script. If the user has sensitive internal apps on localhost, the extension could read their DOM.

**Fix approach:** Narrow permissions to specific paths: `http://localhost:5173/*` or the specific Vite dev server port.

---

### 2. Content Script Runs on All Extension-Allowed URLs

**Severity: MEDIUM**

`extensao/manifest.json` lines 18-23:

```json
"content_scripts": [{
    "matches": [
        "*://www.tecconcursos.com.br/*",
        "http://localhost/*",
        "http://127.0.0.1/*",
        "https://*.vercel.app/*"
    ],
    "js": ["content.js"]
}]
```

The same content script runs on ALL matched URLs — both the TEC Concursos scraping module AND the React app session sync module. The code splits behavior based on `window.location.hostname` (lines 29-30), but the full script is injected everywhere.

**Impact:** The 719-line content script is injected into every localhost and Vercel app page, consuming resources. The session-sync polling interval runs continuously on these pages.

**Fix approach:** Split into two content scripts with different `matches` patterns — one for `tecconcursos.com.br` (scraping), one for localhost/Vercel (session sync).

---

## Data Integrity

### 1. Offline Writes Not Queued

**Severity: HIGH**

`src/services/studyMaterial.service.ts`: IndexedDB is used for local storage, but there is **no sync mechanism** between IndexedDB and Supabase. Data written offline is never pushed to the cloud when back online.

Similarly, `src/hooks/useSimulados.ts` stores simulado history only in `localStorage` — if the user clears storage or switches devices, data is lost.

**Impact:** Permanent data loss on browser data clear. No cross-device data portability.

**Fix approach:** Implement an online/offline sync manager. Use a write-ahead log (IndexedDB) with background sync to Supabase when online. Detect online status with `navigator.onLine`.

---

### 2. Simulado Timer Auto-Submit Without Confirmation

**Severity: LOW**

`src/hooks/useSimulados.ts` lines 184-188: When the timer reaches zero, the simulado is **automatically submitted** without user confirmation:

```typescript
if (prev <= 1) {
    clearInterval(timerRef.current)
    handleFinalizarSimulado()  // auto-submit without user consent
    return 0
}
```

**Impact:** Users who were in the middle of answering a question lose their partially-filled answer. No grace period or "time's up" warning.

**Fix approach:** Add a 30-second grace period with a warning toast. Flash the timer red and show a "Tempo Esgotado — Submetendo..." message before auto-submitting.

---

## Dependency Risks

### 1. Bleeding-Edge Dependencies

**Severity: MEDIUM**

The project uses very new, potentially unstable versions:

| Dependency | Version | Risk |
|---|---|---|
| `typescript` | `~6.0.2` | TypeScript 6 is unreleased as of 2025. May have breaking changes or compatibility issues. |
| `vite` | `^8.0.12` | Vite 8 is extremely new. Plugin compatibility issues possible. |
| `vitest` | `^4.1.8` | Vitest 4 is very new. |
| `eslint` | `^10.3.0` | ESLint 10 is very new. Config format changes. |
| `@vitejs/plugin-react` | `^6.0.1` | Vite 6 React plugin — tied to Vite 8. |
| `@tailwindcss/vite` | `^4.3.0` | Tailwind v4 with Vite plugin — very new. |

**Impact:** Risk of encountering unreported bugs. Difficulty finding community solutions. Some plugins may not be compatible.

**Fix approach:** Pin to stable, widely-adopted versions. Add `overrides` in `package.json` to prevent accidental upgrades.

---

### 2. Large Bundle Dependencies

**Severity: LOW**

| Package | Estimated Bundle Size | Usage |
|---|---|---|
| `recharts` | ~2 MB | Charts in Dashboard and Simulados |
| `groq-sdk` | ~500 KB | Only used in backend `api/gemini.ts`, but declared as frontend dependency |
| `@supabase/supabase-js` | ~400 KB | Used everywhere (acceptable) |
| `puppeteer` | ~300 MB (dev) | Dev dependency — very large for tooling |

`groq-sdk` being in `dependencies` instead of an optional dev-only or server-only concern is notable — it's bundled with the frontend build even though only `api/gemini.ts` uses it server-side.

**Impact:** Larger frontend bundle than necessary. Slower page loads.

**Fix approach:** Remove `groq-sdk` from `dependencies` (it's only used server-side). Lazily load `recharts` components. Move `puppeteer` to optional devDependencies if used only in scripts.

---

### 3. pdf-parse Library Maintainability

**Severity: LOW**

`pdf-parse` (`^2.4.5`) is imported dynamically via `pdfParser.ts` (line 4-6) and loaded at runtime from a CDN-like pattern:

```typescript
export async function loadPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) { return (window as any).pdfjsLib }
  // Falls back to loading from external source
```

The PDF parsing is entirely client-side, with the heavy pdf.js library loaded on demand.

**Impact:** PDF parsing reliability depends on the format of TEC Concursos PDF output, which may change. The fallback loading mechanism is fragile.

**Fix approach:** Add regression tests for PDF parsing (`pdfParser.test.ts` exists but could cover more edge cases). Pin the pdf.js version.

---

## Recommended Actions

### Priority 1: Critical (Address Immediately)

1. **Fix hardcoded Supabase anon key in browser extension** — Move to runtime config or background script. Ensure RLS policies are audited. (Security §1)

2. **Patch auth token storage in chrome.storage.local** — Use `chrome.storage.session` instead. (Security §2)

3. **Add ErrorBoundary to all routes** — Wrap each `<Route element>` in `App.tsx` with `ErrorBoundary`. (Maintainability §3)

4. **Implement focus management in modals** — Add focus trap to `ImportPdfModal` and simulado prescription modal. (Accessibility §3)

### Priority 2: High (Address This Sprint)

5. **Add ARIA attributes to interactive elements** — Start with modals, simulado option buttons, accordion toggles. (Accessibility §1)

6. **Fix color-only indicators** — Ensure all correct/incorrect states have text labels and icons, not just colors. (Accessibility §2)

7. **Implement retry logic on network failures** — Add exponential backoff to critical Supabase calls. (Reliability §4)

8. **Revoke ObjectURLs** — Add cleanup for blob URLs created in `studyMaterial.service.ts`. (Performance §2)

### Priority 3: Medium (This Milestone)

9. **Extract duplicate `getQuestionValidation`** — Move to `src/lib/validation.ts`. (Technical Debt §4)

10. **Split browser extension content scripts** — Separate tecconcursos scraping from React app session sync. (Browser Extension §2)

11. **Page component decomposition** — Extract sub-components from `Simulados.tsx`, `MapaQuestoes.tsx`, `Revisao.tsx`, `Dashboard.tsx`. (Technical Debt §2)

12. **Fix per-question timer in simulators** — Track individual question time instead of using average. (Reliability §2)

### Priority 4: Low (Next Quarter)

13. **Enable TypeScript strict mode** — Add `"strict": true` and fix compilation errors. (Maintainability §5)

14. **Replace `any` types with concrete types** — Start with `supabase.service.ts`, then `pdfParser.ts`. (Technical Debt §1)

15. **Remove VITE_ fallback from server-side API** — Hard-fail on missing env vars in `api/gemini.ts`. (Security §4)

16. **Sync simulado history to Supabase** — Stop relying solely on `localStorage`. (Maintainability §4)

17. **Evaluate recharts alternatives** — Consider lighter charting library. (Performance §5)

---

*Concerns audit: 2026-06-08*
