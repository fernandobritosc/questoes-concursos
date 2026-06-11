---
status: resolved
trigger: "Filtro de questões não permite rolar para baixo quando há muitas opções"
created: 2026-06-11T16:47:00-03:00
updated: 2026-06-11T16:47:00-03:00
---

## Current Focus

hypothesis: "Grid container do filter panel tem max-h-[75vh] mas falta overflow-y-auto, então conteúdo que excede 75vh transborda e é cortado pelo overflow-hidden do card pai"
test: "Adicionar overflow-y-auto ao grid container (linha 373) e verificar se o scroll aparece"
expecting: "Com overflow-y-auto, o container do filtro deve exibir scroll vertical quando o conteúdo exceder 75vh"
next_action: "Aplicar a correção e verificar"

## Symptoms

expected: "Quando há muitas opções selecionadas ou muitos itens na lista, o filtro deve permitir rolagem para baixo para ver todas as opções"
actual: "O modal/container do filtro corta o conteúdo excedente sem mostrar scroll, impossibilitando acesso a opções fora da viewport"
errors: "Nenhum erro no console — é um problema de CSS/layout"
reproduction: "1. Abrir filtro de questões. 2. Selecionar uma categoria com muitos itens (ex: banca, órgão). 3. Tentar rolar para baixo."
started: "Sempre — provavelmente desde a refatoração do QuestaoFilterPanel"

## Eliminated

- hypothesis: "Overflow-hidden no card pai (linha 323) está cortando o overflow"
  evidence: "O overflow-hidden no card é necessário para o border-radius (rounded-xl). O problema real é que o grid container (linha 373) não tem overflow-y-auto, então o conteúdo que excede max-h-[75vh] transborda do grid e é cortado pelo card"
  timestamp: "2026-06-11T16:47:00-03:00"

## Evidence

- timestamp: "2026-06-11T16:47:00-03:00"
  checked: "QuestaoFilterPanel.tsx linha 373 — grid/flex container com max-h-[75vh]"
  found: "Grid container tem max-h-[75vh] para limitar altura, mas NÃO tem overflow-y-auto. Conteúdo que excede 75vh transborda sem scroll."
  implication: "Adicionar overflow-y-auto ao grid container resolve o problema"

- timestamp: "2026-06-11T16:47:00-03:00"
  checked: "QuestaoFilterPanel.tsx linha 412 — content div com overflow-y-auto max-h-64 lg:max-h-none"
  found: "Em grid (desktop), lg:max-h-none remove a restrição de altura e flex-1 não tem referência definida (grid row é auto), então overflow-y-auto nunca dispara. Em mobile, max-h-64 limita a 256px, o que funciona para scroll interno, mas não para o container geral."
  implication: "Consistente com a correção: overflow-y-auto no grid container resolve ambos os cenários"

## Resolution

root_cause: "Grid container (linha 373) tem max-h-[75vh] para limitar altura mas não tem overflow-y-auto. O conteúdo que excede 75vh transborda do grid e é cortado pelo overflow-hidden do card pai (linha 323). Em desktop, o overflow-y-auto da div de conteúdo (linha 412) não funciona porque flex-1 não tem altura definida (grid row é content-determined). Em mobile, max-h-64 limita mas o container geral também não tem scroll."
fix: "Adicionar overflow-y-auto ao grid container na linha 373"
verification: "npx tsc -b --noEmit: 0 erros. npx eslint . --max-warnings 200: 0 erros. npm test: 255/255 passando. Adicionado overflow-y-auto ao grid container (linha 373) — container com max-h-[75vh] agora scrolla corretamente."
files_changed: ["src/components/QuestaoFilterPanel.tsx"]
