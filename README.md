# sick-skills

Global skills for Claude Code. Each skill is a self-contained directory under `skills/` that gets symlinked into `~/.claude/skills/` for global availability.

## Skills

- **wiggum** — Autonomous development loop. Scaffolds phased implementation plans, runs headless workers, and commits per phase. Invoke with `/wiggum`.
- **discussion** — Thinking partner mode. Explore ideas, challenge assumptions, and design before writing code. Invoke with `/discussion`.

## Install

```bash
bash install.sh
```

This symlinks each skill in `skills/` to your global `~/.claude/skills/` directory. Safe to re-run — already-linked skills are skipped.

## Adding a new skill

1. Create `skills/<name>/SKILL.md` with intent routing and instructions
2. Run `bash install.sh` to symlink it globally

## Archive

`archive/ralph/` contains experiment-mode files from the original ralph-loop-template. These have logic (experiment phases, auto-generated next steps) that wiggum may incorporate later.
