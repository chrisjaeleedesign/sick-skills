# Redesign: ask-model → ask (unified thinking skill)

**Date:** 2026-03-30
**Status:** Approved

## Purpose

Merge the `ask-model` and `discussion` skills into a single `ask` skill. The core insight: the conversation log is the artifact, not a separate discussion document. `ask` becomes the universal "get a perspective" skill — from external models, subagents with personas, or through structured thinking flows.

## What Changes

### Rename: `ask-model` → `ask`

- Directory: `skills/ask-model/` → `skills/ask/`
- Symlink: `~/.claude/skills/ask-model` → `~/.claude/skills/ask`
- Invocation: `/ask-model` → `/ask`
- Script stays at `scripts/ask.py`

### New: Personas

Composable `--persona` flag on the script. Works with or without `--model`:
- `--persona devils-advocate` → loads from `ask/personas/devils-advocate.md`
- `--persona "a senior security engineer"` → inline custom system prompt
- `--model gpt5 --persona devils-advocate` → external model with persona
- `--persona devils-advocate` alone → coding agent or subagent uses the persona lens

Pre-baked persona files are lightweight system prompts that also serve as examples of good persona design. Plus a crafting guide that teaches how to write good personas.

**Pre-baked personas:**
- `devils-advocate.md` — challenge assumptions, find holes
- `pragmatist.md` — feasibility, effort, constraints
- `visionary.md` — long-term possibilities

**`crafting-guide.md`** — how to write good personas: keep short, define the lens not the answers, stay open-ended.

### New: Flows

Composable `--flow` flag. Flows structure multi-step conversations. The agent manages flow state by announcing transitions as messages in the conversation log (no sidecar file).

- `--flow wide` → loads from `ask/flows/wide.md`
- `--flow challenge` → loads from `ask/flows/challenge.md`
- No `--flow` → freeform single exchange (default)

Pre-baked flow files define: when to use, steps, transitions. Plus a crafting guide.

**Pre-baked flows:**
- `wide.md` — get multiple perspectives in parallel, synthesize, ask user which resonates
- `challenge.md` — state position, get contrarian take, steelman the original
- `double-diamond.md` — discover → define → develop → deliver

**`crafting-guide.md`** — how to design flows: clear entry, defined steps, user decision points, natural exit.

### New: Sender Identity in JSONL

Messages get a `sender` field identifying who produced them:

```json
{"type": "user", "exchange": 1, "sender": "user", "content": "..."}
{"type": "assistant", "exchange": 1, "sender": "claude-code", "content": "..."}
{"type": "assistant", "exchange": 2, "sender": "gpt-5.4", "persona": "devils-advocate", "content": "..."}
```

### New: Intent Routing

The SKILL.md teaches the agent to infer intent from the user's input before acting:
- Quick factual question → direct call, default model, no flow
- Critique / second opinion → pick or suggest a persona
- Broad design question → suggest or start a flow
- "DeepThink" / "UltraThink" → wide flow with parallel personas
- Explicit flags → respect them, skip routing

When ambiguous, the agent asks brief clarifying questions: "Want me to go wide on this or just give you my take?" The simpler the ask, the less it bothers you.

### Delete: `discussion` skill

The old `discussion` skill gets archived. Everything it did is now covered by `ask`:
- Discussion documents → ask conversation logs
- Personas → ask personas
- Flows (double-diamond, diverge-converge, deep) → ask flows
- Session management → ask conversation management (continue, branch, show)
- DeepThink/UltraThink → ask wide flow with personas

## Skill Structure

```
skills/ask/
├── SKILL.md
├── config.yaml
├── scripts/
│   ├── ask.py
│   ├── requirements.txt
│   └── providers/
│       ├── __init__.py
│       ├── openrouter.py
│       └── openai_provider.py
├── personas/
│   ├── crafting-guide.md
│   ├── devils-advocate.md
│   ├── pragmatist.md
│   └── visionary.md
└── flows/
    ├── crafting-guide.md
    ├── wide.md
    ├── challenge.md
    └── double-diamond.md
```

## Script Changes (`ask.py`)

### New flags:
- `--persona <name or string>` — if it matches a file in `personas/`, load it; otherwise treat as inline system prompt
- `--flow <name>` — recorded in JSONL metadata; agent manages the actual flow logic

### JSONL changes:
- Add `sender` field to all message lines
- Add optional `persona` field to message lines
- Add optional `flow` field to metadata line

### Persona resolution:
If `--persona` is provided AND `--system-prompt` is not:
- Check `personas/{value}.md` — if exists, read as system prompt
- Otherwise treat value as inline system prompt text

If both `--persona` and `--system-prompt` are provided, combine them (persona framing + specific instructions).

## What Doesn't Change

- The Python script's core (CLI, providers, conversation management, streaming, thinking mode)
- config.yaml (model aliases, provider config)
- How providers work (openrouter.py, openai_provider.py)
- The .agents/model-calls/ directory for conversation storage
