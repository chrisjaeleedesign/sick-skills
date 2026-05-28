# sick-skills

Global agent skills. Each skill is a self-contained directory under `skills/`, or one namespace level below it, that gets symlinked into agent skill directories for global availability.

## Skills

- **ask** — External text-model perspectives with personas, flows, attachments, and JSONL conversation history.
- **design-studio** — Interactive UI prototype gallery and design exploration tools.
- **gws** — Google Workspace CLI wrapper for Drive, Docs, and Sheets operations.
- **kb** — Shared Google Drive knowledge-base lookup and update flow.
- **openrouter-image** — OpenRouter image generation and editing through the shared model runtime.
- **wiggum** — Autonomous development loop. Scaffolds phased implementation plans, runs workers, and commits per phase.
- **mattpocock/caveman** — Ultra-compressed communication mode.
- **mattpocock/design-an-interface** — Interface-design interview and planning workflow.
- **mattpocock/diagnose** — Disciplined diagnosis loop for bugs and regressions.
- **mattpocock/git-guardrails-claude-code** — Claude Code hooks for blocking dangerous git commands.
- **mattpocock/grill-me** — Stress-tests a plan or design one decision at a time.
- **mattpocock/grill-with-docs** — Stress-tests plans against domain docs and ADRs.
- **mattpocock/handoff** — Writes compact handoff documents for future agent sessions.
- **mattpocock/improve-codebase-architecture** — Finds deepening/refactor opportunities.
- **mattpocock/migrate-to-shoehorn** — Migrates test assertions to `@total-typescript/shoehorn`.
- **mattpocock/prototype** — Builds throwaway prototypes for design/state questions.
- **mattpocock/qa** — Files conversational QA reports as local artifact issues.
- **mattpocock/request-refactor-plan** — Produces tiny-commit refactor plans as local artifact issues.
- **mattpocock/scaffold-exercises** — Scaffolds exercise structures.
- **mattpocock/setup-matt-pocock-skills** — Sets up `.agents/docs` tracker/domain docs.
- **mattpocock/setup-pre-commit** — Sets up Husky/lint-staged pre-commit hooks.
- **mattpocock/tdd** — Runs a red-green-refactor workflow.
- **mattpocock/to-issues** — Breaks specs into vertical local artifact issues.
- **mattpocock/to-prd** — Publishes PRDs under `.agents/artifacts`.
- **mattpocock/triage** — Moves local artifact issues through triage states.
- **mattpocock/ubiquitous-language** — Writes `.agents/docs/ubiquitous-language.md`.
- **mattpocock/zoom-out** — Explains an unfamiliar code area from one abstraction layer higher.

## Attribution

Imported third-party or workspace-local skills should include an `ATTRIBUTION.md` file in the skill directory or namespace directory.

The skills under `skills/mattpocock/` are derived from Matt Pocock's MIT-licensed [mattpocock/skills](https://github.com/mattpocock/skills) repository. Attribution and local `.agents` modifications are documented in `skills/mattpocock/ATTRIBUTION.md`.

## Install

```bash
bash install.sh
```

This symlinks each skill in `skills/<name>/` and `skills/<namespace>/<name>/` to configured global skill directories. Installed skill names remain flat. Safe to re-run; already-linked skills are skipped.

## Adding a new skill

1. Create `skills/<name>/SKILL.md` or `skills/<namespace>/<name>/SKILL.md` with intent routing and instructions
2. Run `bash install.sh` to symlink it globally

## Archive

`archive/ralph/` contains experiment-mode files from the original ralph-loop-template. These have logic (experiment phases, auto-generated next steps) that wiggum may incorporate later.
