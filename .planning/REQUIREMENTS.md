# Questões Concursos — Requirements

## Active (v1)

| ID | Description | Phase |
|----|-------------|-------|
| REFAC-01 | Extrair hooks menores de `useQuestoes.ts` (reduzir de ~701 linhas para ~3 hooks especializados) | Phase 2 |
| REFAC-02 | Extrair sub-componentes de 5 páginas grandes (Simulados ~983, MapaQuestoes ~892, Revisao ~845, Dashboard ~808, EditalVerticalizado ~748) | Phase 3 |
| REFAC-03 | Implementar paginação no fetch de questões (substituir carga única de 1000+ questões por lazy-load com `.range()`) | Phase 1 |

## Validated (existing functionality — must be preserved)

- [✓] Importação de PDF do TEC Concursos com parsing de questões
- [✓] Visualização de questões com alternativas A-E e gabarito
- [✓] Resolução do professor (extraída via extensão Chrome do TEC Concursos)
- [✓] Estatísticas de desempenho por questão
- [✓] Simulados com temporizador e feedback do Gemini/Groq
- [✓] Caderno de erros com revisão espaçada
- [✓] Mentor IA para plano de estudos personalizado
- [✓] Dashboard com métricas de desempenho
- [✓] Mapa de questões com materiais de estudo em PDF
- [✓] Edital verticalizado
- [✓] Autenticação via Supabase
- [✓] Armazenamento híbrido (Supabase + IndexedDB)
- [✓] Impressão de questões

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REFAC-01 | Phase 2 | Pending |
| REFAC-02 | Phase 3 | Pending |
| REFAC-03 | Phase 1 | Pending |

---

*Last updated: 2026-06-08*
