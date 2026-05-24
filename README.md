# sick-skills

Global agent skills. Each skill is a self-contained directory under `skills/` that gets symlinked into agent skill directories for global availability.

## Skills

- **ask** — External text-model perspectives with personas, flows, attachments, and JSONL conversation history.
- **design-studio** — Interactive UI prototype gallery and design exploration tools.
- **gws** — Google Workspace CLI wrapper for Drive, Docs, and Sheets operations.
- **kb** — Shared Google Drive knowledge-base lookup and update flow.
- **openrouter-image** — OpenRouter image generation and editing through the shared model runtime.
- **wiggum** — Autonomous development loop. Scaffolds phased implementation plans, runs workers, and commits per phase.

## Install

```bash
bash install.sh
```

This symlinks each skill in `skills/` to configured global skill directories. Safe to re-run; already-linked skills are skipped.

## Adding a new skill

1. Create `skills/<name>/SKILL.md` with intent routing and instructions
2. Run `bash install.sh` to symlink it globally

## Archive

`archive/ralph/` contains experiment-mode files from the original ralph-loop-template. These have logic (experiment phases, auto-generated next steps) that wiggum may incorporate later.
