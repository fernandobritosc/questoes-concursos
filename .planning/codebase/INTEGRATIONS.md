# External Integrations

**Analysis Date:** 2026-06-08

## APIs & External Services

**LLM / AI (Groq Cloud):**
- **Service:** Groq Cloud (running `llama-3.3-70b-versatile`)
- **SDK:** `groq-sdk` ^1.2.1
- **Endpoint:** `/api/gemini` (Vercel Serverless function at `api/gemini.ts`, emulated locally via Vite middleware)
- **Auth:** Supabase JWT token in `Authorization: Bearer <token>` header
- **Key:** `GEMINI_API_KEY` (server-side env var only, never prefixed `VITE_`)
- **Usage:**
  - `gerarExplicacaoErro()` in `src/services/gemini.service.ts` — explains why the student's answer was wrong
  - `gerarResolucaoProfessor()` — generates full teacher-style resolution for a question
  - `gerarPlanoEstudos()` — creates weekly study plan (returns JSON for structured cronograma)
  - `gerarMentoriaAssunto()` — in-depth mentorship guide per weak subject
  - `gerarFeedbackSimulado()` — post-simulado performance diagnostic
  - `buildPdfParsingPrompt()` — generates prompt text for PDF parsing (note: this prompt is **not** sent to the API; parsing is done client-side)

**NOTE:** Despite the package `@google/generative-ai` being in `package.json`, it is **never imported** in the codebase. The actual LLM provider is **Groq**, not Google Gemini. The serverless function is named `gemini.ts` for legacy/backward-compatibility reasons.

## Data Storage

**Primary Database — Supabase (PostgreSQL):**
- **Client:** `@supabase/supabase-js` v2, created in `src/lib/supabase.ts`
- **Service layer:** `src/services/supabase.service.ts` (centralized access — no direct `supabase` calls in pages/hooks)
- **Tables:**
  - `questoes` — Question data (enunciado, alternativas, gabarito, materia, assunto, banca_texto, orgao, concurso, prova, ano, caderno_nome, resolucao_professor, questao_tec_id)
  - `historico_resolucoes` — Answer attempts (questao_id FK, questao_tec_id, alternativa, acertou, tempo_segundos, data_resolucao, user_id)
  - `profiles` — User profile (mentor_plano JSON, mentor_tarefas JSON)
  - `materiais_estudo` — Study material metadata (materia, assunto, file_name, file_url, original_size, compressed_size, updated_at)
- **Connections:** Reading `.env.example`, the Supabase project URL is expected at `VITE_SUPABASE_URL` and anon key at `VITE_SUPABASE_ANON_KEY`
- **Caching:** `supabase.service.ts` has an in-memory cache for `fetchAllQuestoes()` (1-minute TTL, concurrent-call dedup via Promise caching)

**File Storage — Supabase Storage:**
- **Bucket:** `materiais-estudo` — Stores gzip-compressed PDF study materials
- **Access:** Public URLs via `getPublicUrl()`
- **Integration:** `src/services/studyMaterial.service.ts` handles upload/download with gzip compression (`CompressionStream`/`DecompressionStream`)

**Local Storage — IndexedDB:**
- **Database:** `StudyMaterialsDB` with object store `materials`
- **Purpose:** Local fallback for study material PDFs when Supabase is unavailable
- **Service:** `src/services/studyMaterial.service.ts` — provides `saveStudyMaterial()`, `getStudyMaterial()`, `deleteStudyMaterial()`, `listAllStudyMaterialsMetadata()` with `mode: 'local' | 'cloud'`

**localStorage Usage:**
| Key | Purpose | Files |
|-----|---------|-------|
| `app-theme` | Dark/light theme preference | `src/components/Layout.tsx` |
| `concursos_spaced_repetition` | Spaced repetition schedule for error revision | `src/hooks/useRevisao.ts` |
| `concursos_simulado_historico` | Past simulado results | `src/hooks/useSimulados.ts` |
| `mentor_plano_geral` | Cached study plan from Mentor AI | `src/hooks/useMentor.ts` |
| `mentor_tarefas_concluidas` | Completed mentor tasks | `src/hooks/useMentor.ts` |
| `mentor_planos_assuntos` | Cached per-subject mentorship guides | `src/hooks/useMentor.ts` |
| `caderno_materias_assuntos_ordem` | Custom subject ordering in Edital | `src/pages/EditalVerticalizado.tsx` |
| `caderno_materias_adicionadas` | Added subjects | `src/pages/EditalVerticalizado.tsx` |
| `caderno_assuntos_estudados` | Studied topics tracking | `src/pages/EditalVerticalizado.tsx` |
| `mapa_storage_mode` | Study material storage mode (local/cloud) | `src/pages/MapaQuestoes.tsx` |

## Authentication & Identity

**Auth Provider — Supabase Auth:**
- **Implementation:** Email/password authentication (`supabase.auth.signUp()`, `supabase.auth.signInWithPassword()`)
- **Context:** `src/contexts/AuthContext.tsx` wraps the app, provides `session` and `user`
- **Protected routes:** `src/components/ProtectedRoute.tsx` redirects to `/login` if no session
- **Session persistence:** Handled by Supabase client (uses localStorage token under key `sb-<project-ref>-auth-token`)
- **Backend auth:** API function `api/gemini.ts` validates the JWT token via `supabase.auth.getUser(token)` before processing requests
- **Extension integration:** The TEC Concursos browser extension (`extensao/content.js`) reads the Supabase auth token from localStorage and syncs it to `chrome.storage.local` for use when extracting resolutions on tecconcursos.com.br

## Monitoring & Observability

**Event Tracking — Hermes Relay:**
- **Service:** Custom Node.js HTTP relay (`scripts/hermes-relay.mjs`)
- **Client:** `src/services/hermesTracker.ts` — sends POST events to `VITE_HERMES_RELAY_URL` (default `http://127.0.0.1:3333`)
- **Events tracked:** Responding questions, importing PDF, generating explanations, creating simulado, finishing simulado, editing questions, toggling tasks, generating study plans
- **Logfile:** `hermes_events.jsonl` (with daily rotation + gzip compression)
- **Reliability:** Uses `keepalive: true`; silent fail if relay is offline
- **Supabase sync:** `scripts/hermes_supabase.py` syncs events to Supabase periodically
- **Auto-launch:** Hermes watcher (`scripts/watcher_hermes.py`) auto-restarts the relay on crash

## CI/CD & Deployment

**Hosting:**
- **Vercel** — SPA hosting with `vercel.json` rewrite rules
- Serverless function at `/api/gemini` (does not exist as a file in `api/` for Vercel — currently the file is at `api/gemini.ts` and used only for local dev emulation)

**CI Pipeline:**
- Not detected (no GitHub Actions, no CI config files)

## Environment Configuration

**Required env vars (from `.env.example`):**
| Variable | Scope | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Client + Server | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key |
| `GEMINI_API_KEY` | Server only | Groq Cloud API key (kept server-side, no `VITE_` prefix) |

**Secrets storage:**
- `.env.local` (gitignored) — local development
- Vercel Environment Variables — production

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Hermes relay POST events to `VITE_HERMES_RELAY_URL` (optional, local analytics only)

## PDF Import Pipeline

**Flow:**
1. User opens `ImportPdfModal` (`src/components/ImportPdfModal.tsx`)
2. User selects a PDF file and optionally names the "caderno" (notebook)
3. PDF.js library is loaded dynamically from CDN (`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js`) via `loadPdfJs()` in `src/lib/pdfParser.ts`
4. Text is extracted page-by-page with position-aware sorting (`extractPdfText()`)
5. Full text is parsed client-side by `parsePdfContent()` in `src/lib/pdfParser.ts` using regex-based rules:
   - Splits by `www.tecconcursos.com.br/questoes/` markers
   - Parses the Gabarito section for answer keys
   - Extracts per-question metadata (ID, banca, orgao, materia, assunto, year)
   - Extracts enunciado and alternatives (A-E or Certo/Errado)
6. Extracted questions are shown in a review step (user can edit/delete before saving)
7. Validated questions are uploaded to Supabase in chunks of 50 via `insertQuestoesBatch()`
8. Cache is invalidated via `clearQuestoesCache()`
9. Existing questions are deduplicated by `questao_tec_id`
10. Optional: parsed text can be sent to Groq AI for AI-assisted extraction (prompt building only in `src/services/gemini.service.ts`, actual AI-assisted flow handled in UI)

## Browser Extension (TEC Concursos Integration)

**Files:** `extensao/manifest.json`, `extensao/content.js`

**Manifest:**
- Chrome Manifest V3
- Runs on `*://www.tecconcursos.com.br/*`, `http://localhost/*`, `http://127.0.0.1/*`, `https://*.vercel.app/*`
- Permission: `storage`

**Two modules:**

1. **Session Sync Module** (runs on localhost/vercel.app):
   - Detects Supabase auth token in `localStorage` (key: `sb-dyxtalcvjcprmhuktyfd-auth-token`)
   - Syncs `access_token` and `user.id` to `chrome.storage.local`
   - Polls every 3 seconds to capture login/logout in real time
   - Clears stored session when user logs out

2. **Extraction Module** (runs on tecconcursos.com.br):
   - Scans `.questao` containers every 500ms
   - Detects when a question has been answered (checks for `li.correcao`, `.resolucao-visivel`, etc.)
   - Extracts question ID from `input[id-questao]`
   - Extracts the teacher's resolution from `.questao-complementos-comentario-conteudo-texto`
   - Converts DOM HTML to Markdown via recursive `htmlToMarkdown()` (handles bold, italic, strikethrough, lists, blockquotes, tables, headings, paragraphs)
   - Sends data to Supabase:
     - `POST /rest/v1/questoes` — upserts question data
     - `PATCH /rest/v1/questoes` — updates `resolucao_professor` field
     - `POST /rest/v1/historico_resolucoes` — inserts answer attempt
   - Deduplicates via in-memory `sentAttempts` and `sentComments` Sets
   - Tracks time spent per question for analysis

---

*Integration audit: 2026-06-08*
