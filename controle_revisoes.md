# Controle de Revisões — Estado Confiável

**Regra:** este arquivo é a **fonte única da verdade** sobre revisões.

**Pasta dos arquivos:** `/mnt/c/Programação/questoes-concursos/revisoes/`

---

## Resumo Diário

| Data | Questões | Erros | Arquivo de Erros | Status Revisão | Data Revisão |
|------|----------|-------|------------------|----------------|--------------|
| 2026-06-11 | Direito Administrativo (Doutrina e Leis Federais) | 1 questões | 1 erros | `revisoes/Direito Administrativo (Doutrina e Leis Federais)/erros_2026-06-11.md` | ❌ PENDENTE | — |
| 2026-06-11 | Direito Constitucional (CF/1988 e Doutrina) | 8 questões | 8 erros | `revisoes/Direito Constitucional (CF_1988 e Doutrina)/erros_2026-06-11.md` | ❌ PENDENTE | — |
| 2026-06-11 | Legislação Civil e Processual Civil Especial | 2 questões | 2 erros | `revisoes/Legislação Civil e Processual Civil Especial/erros_2026-06-11.md` | ❌ PENDENTE | — |

---

## Guias de Revisão por Matéria (Consolidados)

Os erros pendentes acumulados são agrupados por matéria e atualizados em tempo real pelo `watcher_hermes.py` no seguinte formato:

- **Diretório:** `revisoes/<Nome_da_Materia>/revisao_pendentes.md`
- **Conteúdo:** Contém enunciados, alternativas (destacando a sua última resposta e o gabarito correto), comentários do professor e links diretos para a resolução no site do TEC Concursos.
- **Funcionamento:** Sempre que uma questão for respondida e acertada, ela sairá do respectivo guia automaticamente na próxima atualização do watcher.

---

## Regras de Estado

- **PENDENTE** = ainda há erro não reapresentado com acerto após revisão
- **REVIEWED** = questão reapresentada e acertada
- **NÃO pergunto** se você revisou. Eu marco automaticamente a partir do desempenho subsequente.

---

## Ação por dia

1. Executar `python3 scripts/revisar_erros_hoje.py` (já é chamado automaticamente pelo reconstruir_estado.py)
2. Revisar os arquivos gerados em `revisoes/<Materia>/erros_YYYY-MM-DD.md`
3. Quando todos os erros da data estiverem revisados e acertados, marcar REVIEWED

---

**Última atualização:** 2026-06-11 — Meta 22 concluída; Meta 23 iniciada (Tarefa 1: Direito Constitucional — Remédios Constitucionais).