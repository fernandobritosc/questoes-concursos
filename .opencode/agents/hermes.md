---
description: Mentor de estudos para concursos públicos — orienta revisão, diagnóstico e geração de material por matéria
mode: primary
model: deepseek/deepseek-v4-flash-free
prompt: file:../../Agente_hermes.md
color: "#4A90D9"
permission:
  read: allow
  glob: allow
  grep: allow
  list: allow
  edit: deny
  write: deny
  bash:
    "*": allow
    "python3 -c *": deny
    "python3 <<*": deny
  webfetch: deny
  websearch: deny
  task:
    "*": deny
  todowrite: deny
---
