# Controle de Revisões — Estado Confiável

**Regra:** este arquivo é a **fonte única da verdade** sobre revisões.

**Pasta dos arquivos:** `/mnt/c/Programação/questoes-concursos/revisoes/`

---

## Resumo Diário

| Data | Questões | Erros | Arquivo de Erros | Status Revisão | Data Revisão |
|------|----------|-------|------------------|----------------|--------------|
| 2026-06-05 | 16 | 16 | `revisoes/revisao_erros_2026-06-05.md` | ❌ PENDENTE | — |
| 2026-06-06 | 23 (Caderno 9) + 1 (Caderno 8) | 4 | `revisoes/revisao_erros_2026-06-06.md` | ❌ PENDENTE | — |

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

1. Gerar `revisoes/revisao_erros_YYYY-MM-DD.md`
2. Acompanhar as próximas resoluções para ver se os mesmos IDs passam a dar acerto
3. Quando todos os erros da data estiveremREENCHIDOS como acerto, marcar REVIEWED

---

**Última atualização:** 2026-06-06 — META 22 confirmada; meta atual corrigida para Direitos e Deveres Individuais e Coletivos (32/44).
