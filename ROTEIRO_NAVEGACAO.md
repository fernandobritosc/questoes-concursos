# 🗂️ Roteiro do Projeto

Estrutura definitiva do `questoes-concursos`. Use este arquivo como mapa de navegação.

## Raiz (arquivos fixos do sistema)

- `AGENTS.md` — Dev log do app (refatoração, testes, decisões técnicas)
- `README.md` — Documentação oficial do app (stack, setup, features)
- `ROTEIRO_NAVEGACAO.md` — este arquivo
- `controle_revisoes.md` — **fonte única da verdade** das revisões (não mexer manualmente; o agente atualiza)
- `meta22_referencia.md` — referência estruturada da mentoria Meta 22
- `estudo_tarefa<n>_<materia>.md` — transcrições de aulas (PDF → Markdown)

## Pastas

- `estudos/<materia>/` — planos e arquivos de estudo por matéria
- `revisoes/` — análise de erros e guias de revisão
  - `revisao_erros_YYYY-MM-DD.md`
  - `guia_revisao_final.md` (guia consolidado)
- `relatorios/` — relatórios automáticos de desempenho por data
  - `relatorio_YYYY-MM-DD.md`
- `logs/` — logs técnicos (relay, erros de execução)
- `scripts/` — utilitários (manter fala_do_hermes removido por ruído)

## Fluxo rápido

1. Transcrever PDF de aula → salvar em `estudos/<materia>/estudo_tarefa<n>_<materia>.md`
2. Resolver questões → erros viram arquivo em `revisoes/revisao_erros_YYYY-MM-DD.md`
3. Revisão concluída → `controle_revisoes.md` é atualizado automaticamente para REVIEWED
4. Relatórios diários automáticos → pasta `relatorios/`

## Convenções

- Nomes de arquivo de estudo: `estudo_tarefa<n>_<materia>.md`
- Nomes de revisão: revisao_erros_YYYY-MM-DD.md com checklist final
- Nunca gerar PDFs com caracteres Unicode especiais (em-dash etc) — usar Markdown apenas
- Tudo em pt-BR, estilo enxuto para reduzir carga cognitiva do TDAH
