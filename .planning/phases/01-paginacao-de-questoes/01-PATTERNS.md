# Phase 1: Paginação de Questões — Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 4 (2 modify, 1 create, 1 modify)
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/services/supabase.service.ts` | service | CRUD | `src/services/supabase.service.ts` (self) | exact |
| `src/hooks/useQuestoes.ts` | hook | CRUD | `src/hooks/useQuestoes.ts` (self) | exact |
| `src/components/ui/QuestaoSkeleton.tsx` | component | N/A (pure UI) | `src/components/QuestaoVisualizador.tsx` | layout-match |
| `src/pages/Questoes.tsx` | page | request-response | `src/pages/Questoes.tsx` (self) | exact |

## Pattern Assignments

### `src/services/supabase.service.ts` (service, CRUD) — MODIFY

**Analog:** `src/services/supabase.service.ts` (self)
**Operation:** Add `fetchPaginatedQuestoes()`, `fetchFilterOptions()`, refactor cache

**Imports pattern** (lines 1-9):
```typescript
import { supabase } from '../lib/supabase'
import type { Questao, HistoricoResolucao, ResolucaoView } from '../types/database'
```

**Existing cache pattern** (lines 140-151, 157-246) — base for progressive cache refactor:
```typescript
// Module-level cache variables
let _questoesCache: ResolucaoView[] | null = null
let _questoesCachePromise: Promise<ResolucaoView[]> | null = null
let _questoesCacheTimestamp = 0
const CACHE_TTL_MS = 60000 // 1 minuto

export function clearQuestoesCache(): void {
  _questoesCache = null
  _questoesCachePromise = null
  _questoesCacheTimestamp = 0
}
```

**Concurrent call deduplication** (lines 157-169) — pattern to reuse:
```typescript
export async function fetchAllQuestoes(): Promise<ResolucaoView[]> {
  // Return cached if still valid
  if (_questoesCache && Date.now() - _questoesCacheTimestamp < CACHE_TTL_MS) {
    return _questoesCache
  }

  // Deduplicate concurrent calls
  if (_questoesCachePromise) {
    return _questoesCachePromise
  }

  _questoesCachePromise = (async (): Promise<ResolucaoView[]> => {
    // ... query logic ...
    _questoesCache = result
    _questoesCacheTimestamp = Date.now()
    return result
  })()

  try {
    return await _questoesCachePromise
  } finally {
    _questoesCachePromise = null
  }
}
```

**Query pattern: `.select()` with column list + `.order()` + `.limit()`** (lines 173-181):
```typescript
const { data: questoesData, error: qErr } = await supabase
  .from('questoes')
  .select(`
    id, questao_tec_id, materia, assunto, banca_texto, orgao,
    concurso, prova, ano, caderno_nome, enunciado, gabarito,
    alternativas, resolucao_professor, created_at
  `)
  .order('id', { ascending: false })
  .limit(1000)
```

**Error handling pattern** (lines 84, 136, 185):
```typescript
if (error) throw error
// Always after supabase calls — simple, consistent, no wrapping
```

**Data merge pattern (questoes + historico)** (lines 200-231) — relevant for paginated version:
```typescript
const historicoMap = new Map<number, HistoricoResolucao>()
for (const h of (historico || [])) {
  if (!historicoMap.has(h.questao_id)) {
    historicoMap.set(h.questao_id, h as HistoricoResolucao)
  }
}

const result = (questoesData || []).map((q: Questao): ResolucaoView => {
  const h = historicoMap.get(q.id!)
  return {
    id: h?.id ?? 0,
    questao_id: q.id!,
    questao_tec_id: q.questao_tec_id,
    alternativa: h?.alternativa ?? null,
    acertou: h?.acertou ?? false,
    // ... all fields mapped ...
  }
})
```

---

### `src/hooks/useQuestoes.ts` (hook, CRUD) — MODIFY

**Analog:** `src/hooks/useQuestoes.ts` (self)
**Operation:** Add pagination state, filter-to-query translation, cache integration

**Imports pattern** (lines 1-11):
```typescript
import { useEffect, useState, useMemo } from 'react'
import {
  fetchAllQuestoes,
  updateResolucaoProfessor,
  insertHistoricoResolucao,
  fetchHistoricoByQuestao,
  updateQuestao
} from '../services/supabase.service'
import { gerarResolucaoProfessor } from '../services/gemini.service'
import { trackEvent } from '../services/hermesTracker'
import type { ResolucaoView, HistoricoResolucao } from '../types/database'
```

**Initial load pattern with cancellation + timeout** (lines 148-192):
```typescript
useEffect(() => {
  let cancelled = false
  async function load() {
    setLoadingError(null)
    try {
      const data = await Promise.race([
        fetchAllQuestoes(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout (...)')), 30000)
        ),
      ])
      if (cancelled) return
      setResolucoes(data)
      setCadernoQuestoes(data)
    } catch (err: unknown) {
      if (!cancelled) {
        setLoadingError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar questões.')
      }
    } finally {
      if (!cancelled) setLoading(false)
    }
  }
  load()
  return () => { cancelled = true }
}, [])
```

**State pattern — individual useState for each filter** (lines 86-108):
```typescript
const [selectedMaterias, setSelectedMaterias] = useState<string[]>([])
const [selectedAssuntos, setSelectedAssuntos] = useState<string[]>([])
const [selectedBancas, setSelectedBancas] = useState<string[]>([])
const [selectedAnos, setSelectedAnos] = useState<number[]>([])
const [selectedOrgaos, setSelectedOrgaos] = useState<string[]>([])
const [selectedConcursos, setSelectedConcursos] = useState<string[]>([])
```

**Derived data pattern — useMemo for unique values from array** (lines 252-271):
```typescript
const materiasUnicas = useMemo(
  () => Array.from(new Set(resolucoes.map(r => r.materia).filter(Boolean))) as string[],
  [resolucoes]
)
const bancasUnicas = useMemo(
  () => Array.from(new Set(resolucoes.map(r => r.banca_texto).filter(Boolean))) as string[],
  [resolucoes]
)
```

**Filter logic pattern — client-side `getFilteredQuestions`** (lines 331-374) — partial migration target:
```typescript
const getFilteredQuestions = (): Resolucao[] => {
  return resolucoes.filter(q => {
    // Client-side filters that MUST remain (depend on merged data):
    if (objetivo === 'ineditas' && q.alternativa && q.alternativa !== '') return false

    // Filters that CAN migrate to server-side:
    let matchesMateria = true
    if (hasMateriaFilter) {
      // Complex: assunto fallback logic — stays client-side
      if (hasAssuntoFilter) {
        matchesMateria = selectedAssuntos.includes(q.assunto || '') ||
          (selectedMaterias.includes(q.materia || '') && !q.assunto)
      } else {
        matchesMateria = selectedMaterias.includes(q.materia || '')
      }
    }

    const matchesBanca = selectedBancas.length === 0 || selectedBancas.includes(q.banca_texto || '')
    // ... more filters ...

    // Carreira = keyword matching, stays client-side:
    if (selectedCarreiras.length > 0) {
      matchesCarreira = selectedCarreiras.some(car => {
        if (car === 'Policial') return concUpper.includes('POLICIA') || ...
      })
    }

    return matchesMateria && matchesBanca && ...
  })
}
```

**Toggle handler pattern** (lines 298-310):
```typescript
const makeToggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) => (value: T) =>
  setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])

const handleToggleBanca = makeToggle(setSelectedBancas)
const handleToggleAno = makeToggle(setSelectedAnos)
```

**Return object pattern** (lines 592-700):
```typescript
return {
  // State
  resolucoes, loading, loadingError,
  // Filter state
  selectedMaterias, selectedBancas, selectedAnos, ...
  // Derived
  materiasUnicas, bancasUnicas, anosUnicos, orgaosUnicos, concursosUnicos,
  filteredQuestions, filteredCount, totalFiltrosAtivos,
  // Actions
  handleToggleMateria, handleToggleBanca, handleGerarCaderno, ...
}
```

---

### `src/components/ui/QuestaoSkeleton.tsx` (component, N/A) — CREATE

**Analog:** `src/components/QuestaoVisualizador.tsx` (layout-match)
**Purpose:** Skeleton loader matching the QuestaoVisualizador card structure during pagination load.

**Card layout pattern from QuestaoVisualizador** (lines 43-44, 141-142, 190):
```typescript
// Outer card structure (lines 43-44)
<div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
  
  {/* ... header section ... */}

  {/* Content (lines 141-142) */}
  <div className="px-6 py-6 md:p-8 space-y-6">
    {/* enunciado */}
    {/* alternativas grid */}
  </div>

  {/* Footer (line 192) */}
  <div className="bg-muted/70 p-5 border-t border-border flex ...">
```

**Existing animate-pulse pattern** — used in 19 locations across codebase. Key examples:

From `src/pages/Mentor.tsx` (line 293):
```tsx
<Sparkles className="w-12 h-12 mb-4 text-primary animate-pulse" />
```

From `src/pages/Simulados.tsx` (line 422):
```tsx
<div className="w-14 h-14 rounded-full bg-muted/30 border border-border/50 ... animate-pulse" />
```

**Tailwind skeleton building blocks** (consolidated pattern from codebase):
```tsx
// Skeleton block pattern:
<div className="animate-pulse space-y-4 p-6 bg-card border border-border rounded-xl">
  <div className="h-4 bg-muted rounded w-3/4" />   {/* line */}
  <div className="h-4 bg-muted rounded w-1/2" />   {/* shorter line */}
  <div className="w-8 h-8 rounded-full bg-muted" /> {/* circle */}
  <div className="h-3 bg-muted rounded flex-1" />   {/* full-width line */}
</div>
```

---

### `src/pages/Questoes.tsx` (page, request-response) — MODIFY

**Analog:** `src/pages/Questoes.tsx` (self)
**Operation:** Integrate QuestaoSkeleton, new hook API (pagination state)

**Import pattern** (lines 1-18):
```typescript
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuestoes } from '../hooks/useQuestoes'
import { ImportPdfModal } from '../components/ImportPdfModal'
import { QuestaoVisualizador } from '../components/QuestaoVisualizador'
// ... other component imports ...
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
```

**Loading state rendering** (lines 186-188) — current pattern, will be extended:
```tsx
if (loading) {
  return <LoadingSpinner />
}
```

**Error state rendering** (lines 169-184):
```tsx
if (loadingError) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-60px)] p-12 text-center">
      <AlertCircle className="w-16 h-16 text-destructive mb-4" />
      <h2 className="text-xl font-bold text-foreground mb-2">Erro ao carregar questões</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{loadingError}</p>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#1565c0] text-white rounded-lg text-sm font-bold transition-all cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        Tentar novamente
      </button>
    </div>
  )
}
```

**Visualizador rendering with skeleton insertion point** (lines 222-246):
```tsx
<div className="space-y-6 max-w-4xl mx-auto pb-12">
  <ErrorBoundary>
    <QuestaoVisualizador
      questao={questoesExibidas[currentQuestaoIndex]}
      index={currentQuestaoIndex}
      total={cadernoQuestoes.length}
      // ... props ...
    />
  </ErrorBoundary>
  {/* Skeleton will go here when loading new page */}
</div>
```

---

## Shared Patterns

### Cache with concurrent request deduplication
**Source:** `src/services/supabase.service.ts` (lines 140-246)
**Apply to:** `fetchPaginatedQuestoes()` in `supabase.service.ts`
```typescript
// Module-level cache variables
let _questoesCache: ResolucaoView[] | null = null
let _questoesCachePromise: Promise<ResolucaoView[]> | null = null
let _questoesCacheTimestamp = 0

// Cache check + dedup pattern:
if (_questoesCache && Date.now() - _questoesCacheTimestamp < CACHE_TTL_MS) {
  return _questoesCache
}
if (_questoesCachePromise) {
  return _questoesCachePromise
}
// ... new fetch ...
_questoesCache = result
_questoesCacheTimestamp = Date.now()
// After: clear promise in finally block
```

**Adaptation for progressive cache (new pattern):**
- Replace `_questoesCache` (single array) with `_progressiveCache: ResolucaoView[]`
- Replace `CACHE_TTL_MS` removal (D-03: no TTL for immutable data)
- Add `_cachedPages: Set<string>` to track which pages are cached
- Add filter-hash-based cache keys to differentiate filter sets

### Error handling
**Source:** `src/services/supabase.service.ts` (throughout)
**Apply to:** All new functions in `supabase.service.ts`
```typescript
const { data, error } = await supabase.from('questoes').select(...)
if (error) throw error  // Simple throw, caught by caller (hook)
return data
```

### Loading state in hooks
**Source:** `src/hooks/useQuestoes.ts` (lines 59, 148-192) and `src/hooks/useSimulados.ts` (lines 37, 73-86)
**Apply to:** Extended hook in `useQuestoes.ts`
```typescript
const [loading, setLoading] = useState(true)
const [loadingError, setLoadingError] = useState<string | null>(null)

// Pattern: try/catch/finally with cancelled flag
useEffect(() => {
  let cancelled = false
  async function load() {
    try { /* fetch */ } catch (err) {
      setLoadingError(err instanceof Error ? err.message : '...')
    } finally {
      if (!cancelled) setLoading(false)
    }
  }
  load()
  return () => { cancelled = true }
}, [])
```

### UI component index (barrel exports)
**Source:** `src/components/ui/index.ts`
**Apply to:** `QuestaoSkeleton` will be exported from same barrel
```typescript
export { Button } from './Button'
export { Card, CardHeader, CardBody } from './Card'
export { LoadingSpinner } from './LoadingSpinner'
export { MarkdownAI } from './MarkdownAI'
// + export { QuestaoSkeleton } from './QuestaoSkeleton'
```

### Tailwind shadow/border design tokens (from questao visualizer)
**Source:** `src/components/QuestaoVisualizador.tsx` (line 43)
**Apply to:** `QuestaoSkeleton` layout classes
```
bg-card border border-border rounded-xl shadow-lg
animate-in slide-in-from-bottom-4 duration-300
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None | — | — | All files have close analogs in the existing codebase |

## Metadata

**Analog search scope:** `src/services/`, `src/hooks/`, `src/components/ui/`, `src/pages/`, `src/components/`
**Files scanned:** supabase.service.ts, useQuestoes.ts, Questoes.tsx, QuestaoVisualizador.tsx, LoadingSpinner.tsx, Button.tsx, QuestaoNavegacao.tsx, useSimulados.ts, useRevisao.ts, useDashboard.ts, ui/index.ts
**Pattern extraction date:** 2026-06-08
