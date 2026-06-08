# Discussion Log: Phase 1 — Paginação de Questões

**Date:** 2026-06-08

## Areas Discussed

### Tamanho do lote
- **Options presented:** 50, 100, 200
- **Selected:** 200

### UX de carregamento
- **Options presented:** Loading spinner central, Skeleton loader, Incremental
- **Selected:** Skeleton loader

### Estratégia de cache
- **User deferred to OpenCode suggestion**
- **Selected:** Cache flat progressivo (acumulativo, sem TTL)

### Filtros no servidor
- **User deferred to OpenCode suggestion**
- **Selected:** Manter formato `Record<string, string>`, traduzir para `.in()`/`.eq()` na query

## Deferred Ideas

None.
