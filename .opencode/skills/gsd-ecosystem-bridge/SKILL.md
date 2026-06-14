---
name: gsd-ecosystem-bridge
description: Ponte entre a metodologia GSD e o ecossistema ECC — mapeia fases GSD para agents, skills e comandos ECC
origin: ECC-GSD
---

# Ponte GSD ↔ ECC

Esta skill documenta como a metodologia **GSD (Get Shit Done)** se integra ao **ECC (Enhanced Codebase Companion)** — o sistema operacional para agent harnesses.

## Mapa Fase GSD → Recurso ECC

| Fase GSD | Agente ECC | Skill ECC Relacionada | Comando |
|---|---|---|---|
| **Discuss** | `gsd-discuss` | `gsd-discuss-phase` | `/gsd-discuss` |
| **Plan** | `planner` (ECC) + `gsd-planner` (GSD) | `gsd-plan-phase` | `/plan`, `/gsd plan` |
| **Execute** | `gsd-execute` + `build` (ECC) | `gsd-execute-phase`, `tdd-workflow` | `/gsd-execute`, `/tdd`, `/build-fix` |
| **Review** | `code-reviewer` (ECC) + `gsd-code-reviewer` | `gsd-code-review`, `security-review` | `/code-review`, `/gsd code-review` |
| **Verify** | `gsd-verifier` (GSD) | `gsd-verify-work`, `verification-loop` | `/gsd verify-work` |
| **Complete** | `gsd-orchestrator` | `gsd-complete-milestone`, `gsd-audit-milestone` | `/gsd complete-milestone` |

## Agents GSD Globais Disponíveis

O GSD fornece 33+ subagentes instalados globalmente em `~/.config/opencode/agents/`. Os principais:

| Agente | Função |
|---|---|
| `gsd-planner` | Cria planos executáveis com pesquisa integrada |
| `gsd-executor` | Executa planos com commits atômicos e checkpoints |
| `gsd-code-reviewer` | Revisa código, produz REVIEW.md |
| `gsd-verifier` | Verifica goal-backward, produz VERIFICATION.md |
| `gsd-codebase-mapper` | Explora código, produz PATTERNS.md |
| `gsd-debugger` | Investiga bugs com método científico |
| `gsd-ui-researcher` | Produz UI-SPEC.md para fases frontend |
| `gsd-security-auditor` | Verifica mitigações de ameaças |

## Workflows GSD (89 workflows)

Em `~/.config/opencode/get-shit-done/workflows/`:

```
discuss-phase.md    → Extrai decisões de gray areas
plan-phase.md       → Cria PLAN.md com research + verification
execute-phase.md    → Executa em waves paralelas
code-review.md      → Revisão especializada multi-agente
verify-work.md      → Verificação goal-backward
complete-milestone.md → Finalização com summary
```

## Como Usar a Ponte

### Fluxo Completo (Orquestrado)

```
/gsd "Implementar feature X"
```

O `gsd-orchestrator` gerencia automaticamente: Discuss → Plan → Execute → Review → Verify → Complete.

### Fases Individuais

```
/gsd-discuss "Fase 3: Autenticação"    # Apenas discuss
/plan "Implementar autenticação JWT"     # Apenas plano
/tdd "Criar hook useAuth"                # TDD para feature específica
/code-review "src/hooks/useAuth.ts"      # Revisão de código
```

### Subagentes GSD Diretos

Use `task` para invocar agentes GSD diretamente:

```
Use o task para delegar ao gsd-planner: "Crie PLAN.md para fase 3"
Use o task para delegar ao gsd-executor: "Execute plano da fase 3"
```

## ECC Skills Recomendadas

Skills do ECC que complementam o GSD:

| Skill ECC | Quando Usar |
|---|---|
| `tdd-workflow` | Durante EXECUTE — enforced RED-GREEN-REFACTOR |
| `security-review` | Durante REVIEW — checklist de segurança |
| `verification-loop` | Durante VERIFY — evals contínuos |
| `coding-standards` | Durante EXECUTE — padrões de código |
| `api-design` | Durante PLAN — design de APIs |
| `e2e-testing` | Durante EXECUTE — testes E2E com Playwright |
| `strategic-compact` | Durante qualquer fase — otimização de contexto |

## Integração com este Projeto (Questões Concursos)

Para questoes-concursos, o fluxo GSD típico:

1. **Discuss**: Discutir nova feature (ex: "modo offline", "hierarquia 3 níveis")
2. **Plan**: Criar PLAN.md com análise de dependências
3. **Execute**: Implementar em waves (backend → frontend → testes)
4. **Review**: Revisar com code-reviewer ou gsd-code-reviewer
5. **Verify**: Verificar cobertura de objetivos
6. **Complete**: Finalizar milestone e atualizar AGENTS.md

> **Nota**: Os comandos ECC (`/plan`, `/code-review`, `/tdd`, `/build-fix`, `/architect`) usam agentes locais definidos em `opencode.json`. Os comandos GSD (`/gsd`, `/gsd-discuss`, `/gsd-execute`) usam agentes locais que invocam os subagentes GSD globais via task.
