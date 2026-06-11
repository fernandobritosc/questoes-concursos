---
status: testing
phase: 01-paginacao-de-questoes
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md]
started: 2026-06-11T11:38:02Z
updated: 2026-06-11T11:41:00Z
---

## Current Test

number: 2
name: Esqueleto aparece ao aplicar filtro
expected: |
  Quando você aplica um filtro (ex: escolhe uma matéria), aparece uns quadrados cinzas piscando no lugar das questões enquanto carrega. Não aparece a roda girando de tela cheia — só o esqueleto.
awaiting: user response

## Tests

### 1. LoadingSpinner no carregamento inicial
expected: Ao visitar a página de Questões pela primeira vez, um spinner de tela cheia (classe animate-spin) aparece no centro da tela enquanto os dados são carregados do servidor.
result: pass

### 2. Esqueleto aparece ao aplicar filtro
expected: Quando você aplica um filtro (ex: escolhe uma matéria), aparece uns quadrados cinzas piscando no lugar das questões enquanto carrega. Não aparece a roda girando de tela cheia — só o esqueleto.
result: issue
reported: "no banco de questão os filtros não funciona."
severity: major

### 3. Aviso vermelho quando página falha
expected: Se uma página não carrega (ex: problema de rede), aparece um aviso vermelho em cima da questão com a mensagem de erro.
result: [pending]

### 4. Tela vazia quando não tem questões
expected: Quando você nunca importou questões, aparece um ícone de camadas, a mensagem "Nenhuma questão disponível" e um botão "Importar PDF do TEC".
result: [pending]

### 5. Filtro volta para o começo
expected: Quando você muda um filtro (ex: troca de matéria), o sistema volta automaticamente para o começo da lista e carrega os resultados novos. Aparece o esqueleto cinza piscando enquanto carrega.
result: [pending]

## Summary

total: 5
passed: 1
issues: 1
pending: 3
skipped: 0

## Gaps

- truth: "Quando você aplica um filtro, aparece uns quadrados cinzas piscando no lugar das questões enquanto carrega"
  status: failed
  reason: "User reported: no banco de questão os filtros não funciona."
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
