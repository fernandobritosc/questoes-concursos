---
name: gsd-cleanup
description: Implementação do comando gsd-cleanup
---

<objective>
Archive phase directories from completed milestones into `.planning/milestones/v{X.Y}-phases/`.

Use when `.planning/phases/` has accumulated directories from past milestones.
</objective>

<execution_context>
@$HOME/.config/opencode/get-shit-done/workflows/cleanup.md
</execution_context>

<process>
Follow the cleanup workflow at @$HOME/.config/opencode/get-shit-done/workflows/cleanup.md.
Identify completed milestones, show a dry-run summary, and archive on confirmation.
</process>
