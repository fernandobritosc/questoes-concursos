# Deferred Items — Phase 03

## Pre-existing Issues (not caused by current plan)

### TS6133: Unused import `BookOpen` in `EditalMateriaDetalhes.tsx`

- **File:** `src/components/EditalMateriaDetalhes.tsx` (line 1)
- **Error:** `'BookOpen' is declared but its value is never read.`
- **Found during:** Plan 03-05 (Dashboard) verification
- **Root cause:** Another plan's extraction introduced an unused import
- **Fix:** Remove `BookOpen` from the import statement in that file
- **Deferred because:** Out of scope — not caused by Plan 03-05 changes

## Previous Plans

*(Append new findings here)*
