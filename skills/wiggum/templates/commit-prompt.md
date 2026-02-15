# Commit Prompt Template

This is the reference for generating `.wiggum/prompts/commit.md`.

## Prompt

```
Read `.wiggum/IMPLEMENTATION_PLAN.md` to understand what phase just completed.

Stage changes with `git add .` (scope to project directory only) and create a commit with a descriptive message.

Format: "Phase N: [Phase Name] — [brief description of what was implemented]"

Include all changed files. Do NOT push — just commit locally.
```
