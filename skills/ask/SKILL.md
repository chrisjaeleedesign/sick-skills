---
name: ask
description: "Get text perspectives from external models, personas, or structured thinking flows. Use when the user explicitly wants a second opinion, a named model take, multi-model comparison, or a perspective such as devil's advocate, pragmatist, security reviewer, product thinker, or similar. Do not use for generic reasoning, browser chat UI, image generation, model registry maintenance, or broad phrases like 'let's think through this' unless the user clearly asks for an external model."
---

# ask

Get text-only perspective from external models. Keep this skill narrow: it is for asking another model, usually with enough context to make that model useful.

User's request: $ARGUMENTS

## Route

- If `$ARGUMENTS` is `help`, show the help text below.
- If the user asks to generate or edit an image, do not use this skill. Use `openrouter-image` only when the user specifically wants OpenRouter image models; otherwise use Codex's built-in image generation path.
- If the user asks for a browser chat UI, say this skill no longer owns one.
- If the user asks to update, refresh, or list available models, inspect `config/models.yaml` directly. Do not route through `ask`.
- If the user asks a normal question without requesting an external model or perspective, answer normally.
- If the user asks for a second opinion, named model, persona, comparison, or structured perspective, use the CLI.

## CLI

Read [references/cli.md](references/cli.md), then call:

```bash
python3 <ask-skill-dir>/scripts/ask.py --model gpt5 --content "Question here"
```

Use the real path to this skill directory. In this repo it is usually:

```bash
python3 /Volumes/Misc/sick-skills/skills/ask/scripts/ask.py --model gpt5 --content "Question here"
```

## Intent Handling

Simple second opinion:
- Call one model.
- Return the useful answer and the conversation file path.

Specific perspective:
- Use `--persona` with a built-in persona or a short inline description.

Comparison:
- Run separate calls for the requested models or personas.
- Synthesize the differences yourself after collecting outputs.

Flow:
- Use `--flow` only as metadata. Read the matching file in `flows/` and execute the steps yourself.

Attachments:
- Use `--attach` for screenshots, images, videos, or text files the external model needs.
- Copy unstable pasted-image temp files into a stable workspace path before attaching.

## Models

Text aliases live in `config/models.yaml`.

| Alias | Provider | Best for |
|-------|----------|----------|
| `gpt5` | OpenAI via Codex auth | Default reasoning and multimodal review |
| `mini` | OpenAI via Codex auth | Fast inexpensive summaries |
| `codex` | OpenAI via Codex auth | Software engineering analysis |
| `spark` | OpenAI via Codex auth | Fast iteration |
| `sonnet` | OpenRouter | Balanced external critique |
| `opus` | OpenRouter | Nuanced analysis and writing |
| `gemini` | OpenRouter | Long context and multimodal review |

Image aliases such as `nanobanana` and `gpt-image` are for `openrouter-image`, not `ask`.

## Important

1. The called model has no ambient project context. Put the needed facts in `--content`, `--system-prompt`, and `--attach`.
2. Use `--continue` for follow-ups rather than starting a new conversation.
3. Use `--branch` for alternative directions.
4. Conversation files are JSONL under `.agents/model-calls/`.

## First-Time Setup

OpenAI aliases use `~/.codex/auth.json` from `codex login`.
OpenRouter aliases require `OPENROUTER_API_KEY` in the repo `.env` or shell environment.

## HELP Text

> **ask** - external text-model perspectives
>
> ```bash
> /ask ask gpt5 to review this plan
> /ask what would a security engineer think about this auth flow?
> /ask go wide with pragmatist and devil's advocate takes
> ```
>
> Features:
> - Text model calls through shared runtime
> - Personas from `personas/`
> - Flow metadata from `flows/`
> - JSONL conversation history in `.agents/model-calls/`
> - Attachments via `--attach`
