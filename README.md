# sick-skills

Global agent skills. Each skill is a self-contained directory under `skills/`,
or one namespace level below it, that gets symlinked into agent skill
directories for global availability.

## Plugins

- **CJL** — Groups Work, Setup, and Handoff into one personal agent workflow. Source: `plugins/cjl/`.

Skills represent exceptional behavior or specialized access, not every useful
behavior an agent already knows. Ordinary requests should use no special skill.

## Skills

- **ask** — External text-model perspectives with personas, flows, attachments, and JSONL conversation history.
- **caveman** — Explicit-only compressed chat mode with normal-prose safety boundaries.
- **cjl-features** — Lightweight catalog of potential product capabilities, definitions, and value.
- **cjl-standards** — Explicit-only creation, audit, and update of concise project `AGENTS.md` guidance.
- **creator-content-scrape-store** — Operates the local X and Instagram ingestion store.
- **debug** — Explicit bug investigation that maintains a detailed repository issue through reproduction, diagnosis, and a proposed fix.
- **design-studio** — Interactive UI prototype gallery and design exploration tools.
- **handoff** — Compresses topic-relevant conversation context for another agent or conversation.
- **market-research** — Creates local, cited research artifacts for market decisions.
- **matter-of-fact-writing** — Explicit factual, neutral, low-rhetoric writing mode.
- **openrouter-image** — OpenRouter image generation and editing through the shared model runtime.
- **task** — Explicit personal and agent task tracking through the shared LifeOS service, with confirmed project assignment and agent ownership.
- **wiggum** — Autonomous development loop. Scaffolds phased implementation plans, runs workers, and commits per phase.
- **write-like-chris** — Writes reflective material in Chris's established voice.
- **mattpocock/design-an-interface** — Interface-design interview and planning workflow.
- **mattpocock/zoom-out** — Explains an unfamiliar code area from one abstraction layer higher.

## Attribution

Imported third-party or workspace-local skills should include an `ATTRIBUTION.md` file in the skill directory or namespace directory.

The retained skills under `skills/mattpocock/` are derived from Matt Pocock's
MIT-licensed [mattpocock/skills](https://github.com/mattpocock/skills)
repository. Caveman has separate attribution in `skills/caveman/ATTRIBUTION.md`.

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

`archive/retired-skills/` preserves previously unversioned skill sources removed
from active installation.
