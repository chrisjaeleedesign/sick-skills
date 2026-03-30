---
name: ask
description: "Get perspectives from external models, personas, or structured thinking flows. Use whenever the user wants a second opinion, fresh take, multi-model comparison, structured exploration, or says things like 'ask gpt5', 'what would a security engineer think', 'let's think through this', 'go wide', 'challenge this', or 'DeepThink'. Also use when another skill needs to call an external model."
---

# ask

Get a perspective — from an external model, through a persona lens, or via a structured thinking flow. One skill, one conversation log, composable pieces.

## Intent Routing

When `/ask` is invoked, figure out what the user needs before acting:

**Simple question, clear model preference** → just call the model and return the answer. No ceremony.
- "ask gpt5 if this function is safe" → `--model gpt5 --content "..."`

**Wants a specific perspective** → use a persona.
- "get a devil's advocate take on this" → `--persona devils-advocate`
- "what would a security engineer think" → `--persona "a senior security engineer focused on auth vulnerabilities"`

**Broad exploration, wants multiple angles** → suggest or start a flow.
- "let's think through how to handle auth" → suggest: "This feels like it'd benefit from multiple perspectives. Want me to go wide, or just give you my take first?"
- "DeepThink" or "UltraThink" → start a wide flow with parallel persona calls

**Ambiguous** → ask briefly. "Do you want me to call an external model for this, or just think through it? Any preference on which model or perspective?"

**Explicit flags** → respect them, skip the routing. `--model gpt5 --persona devils-advocate` means the user knows what they want.

**The principle: the simpler the ask, the less you bother the user.** Quick questions just go. Complex topics get a brief check-in before committing to a flow.

## Quick Reference

```bash
# Simple question
python3 ~/.claude/skills/ask/scripts/ask.py \
  --model gpt5 --content "What's the best approach for rate limiting?"

# With a persona
python3 ~/.claude/skills/ask/scripts/ask.py \
  --model gpt5 --persona devils-advocate \
  --content "Challenge this architecture decision" \
  --id arch-review --tag architecture

# Custom inline persona
python3 ~/.claude/skills/ask/scripts/ask.py \
  --model spark --persona "a grumpy DBA who hates unnecessary joins" \
  --content "Review this schema"

# With a flow (recorded in metadata — you orchestrate the steps)
python3 ~/.claude/skills/ask/scripts/ask.py \
  --flow wide --model gpt5 \
  --content "How should we handle caching?" \
  --id caching-exploration

# Continue a conversation
python3 ~/.claude/skills/ask/scripts/ask.py \
  --continue .agents/model-calls/2026-03-30_arch-review.jsonl \
  --content "What about the scaling concerns?"

# Branch from exchange 2
python3 ~/.claude/skills/ask/scripts/ask.py \
  --branch .agents/model-calls/2026-03-30_arch-review.jsonl \
  --from 2 --content "What if we used event sourcing instead?"

# Show a conversation
python3 ~/.claude/skills/ask/scripts/ask.py \
  --show .agents/model-calls/2026-03-30_arch-review.jsonl
```

## Models

| Alias | Provider | Model | Best for |
|-------|----------|-------|----------|
| `gpt5` | OpenAI | GPT-5.4 | Vision, multimodal, general reasoning (default) |
| `mini` | OpenAI | GPT-5.4-mini | Fast, efficient responses |
| `codex` | OpenAI | GPT-5.3-Codex | Complex software engineering |
| `spark` | OpenAI | GPT-5.3-Codex-Spark | Ultra-fast (1000+ tok/s), real-time iteration. Text-only. |
| `sonnet` | OpenRouter | Claude Sonnet 4.6 | Fast, balanced responses |
| `opus` | OpenRouter | Claude Opus 4.6 | Complex writing, nuanced analysis |
| `gemini` | OpenRouter | Gemini 3.1 Pro | Long context, multimodal |

You can also pass full model IDs: `--model openrouter/meta-llama/llama-3.3-70b`

## Personas

Personas shape how a model responds by setting a perspective lens.

**Pre-baked personas** (in `personas/` directory):
- `devils-advocate` — challenge assumptions, find holes
- `pragmatist` — feasibility, effort, what actually ships
- `visionary` — long-term implications, possibilities

**Custom personas** — pass any description inline:
- `--persona "a first-time user who's never seen this product"`
- `--persona "a compliance officer worried about GDPR"`

**When to use:** Whenever a different perspective would be valuable. Personas work with any model — they're just system prompts that frame the response.

For guidance on writing good personas, read `personas/crafting-guide.md`.

## Flows

Flows structure multi-step thinking conversations. The script records the flow name in metadata; you manage the actual steps by following the flow file and announcing transitions in the conversation.

**Pre-baked flows** (in `flows/` directory):
- `wide` — fan out for multiple perspectives, synthesize, ask user which resonates
- `challenge` — argue against a position, then steelman the result
- `double-diamond` — discover → define → develop → deliver

**Using a flow:**
1. Read the flow file (e.g. `flows/wide.md`) to understand the steps
2. Start the conversation with `--flow wide`
3. Follow the steps, announcing transitions as messages in the conversation
4. The conversation log becomes self-documenting — anyone reading it can see the flow's progression

For guidance on designing custom flows, read `flows/crafting-guide.md`.

## Arguments

| Arg | Required | Description |
|-----|----------|-------------|
| `--model` | No | Model alias or `provider/model-id`. Default: `gpt5` |
| `--content` | Yes | The prompt. Literal string, file path (if exists), or `-` for stdin |
| `--system-prompt` | No | Path to system instruction file |
| `--persona` | No | Persona name (from `personas/`) or inline description string |
| `--flow` | No | Flow name (recorded in metadata) |
| `--attach` | No | Repeatable. Path to image/video/file attachment |
| `--id` | No | Name for the conversation file |
| `--tag` | No | Repeatable. Categorization tag |
| `--continue` | No | Path to conversation file to continue |
| `--branch` | No | Path to conversation file to branch from |
| `--from` | With `--branch` | Exchange number to branch from |
| `--show` | No | Pretty-print a conversation file |
| `--thinking` | No | Reasoning effort: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`. See Thinking Mode below. |

## Output

The response prints directly to stdout. After the response, a separator line shows the conversation file path:

```
[model response here]

---
conversation: .agents/model-calls/2026-03-30_arch-review.jsonl
```

**Always capture the conversation file path** — you'll need it for `--continue` or `--branch`.

## Images and Attachments

When the user pastes or references an image in the chat, you can pass it to ask. The image arrives as a temp file path in your context. To use it:

1. **Copy the image to a stable location first.** Temp file paths may be cleaned up. Copy to `.agents/media/` or `/tmp/`.
2. **Pass it with `--attach`.**

```bash
cp /var/folders/.../paste-image.png .agents/media/screenshot.png
python3 ~/.claude/skills/ask/scripts/ask.py \
  --model gpt5 \
  --content "What do you think of this UI design?" \
  --attach .agents/media/screenshot.png \
  --id ui-feedback --tag design
```

Do this automatically when the user asks you to send an image to another model.

## Important

1. **The called model has ZERO project context.** Include everything it needs in `--content` and `--system-prompt`. If asking about code, paste the relevant code. If asking about architecture, describe the system.

2. **Use `--continue` for follow-ups** rather than starting a new conversation. The model gets the full conversation history.

3. **Use `--branch` to explore alternatives.** The original stays untouched.

4. **Use `--tag` to categorize.** Tags make it easy to find past conversations via grep.

## Thinking Mode

`--thinking high` or `--thinking xhigh` enables deep reasoning on models that support it (gpt5, codex).

- **Reasoning progress streams to stderr.** The script prints `[thinking] ...` lines showing the model's reasoning summary in real time.
- **Calls can take a long time.** This is normal. The script has no internal read timeout.
- **Set a generous Bash timeout.** Use `timeout=600000` (10 minutes) minimum. No harm in going higher.
- **Tell the user it may take a moment.**
- **Use intentionally.** Reserve for problems that benefit from extended reasoning. For quick questions, use `--model spark`.

## Conversation Files

Stored as JSONL in `.agents/model-calls/`. Each file has a metadata header with id, model, timestamps, tags, flow, persona, and exchange count. Messages include a `sender` field identifying who produced them (user, model ID, etc.) and an optional `persona` field.

Use `--show` to read them in a friendly format.

## First-Time OpenAI Setup

OpenAI models use tokens from `~/.codex/auth.json` (created by `codex login`). If tokens are expired, the script runs `codex login` automatically. No API key needed — uses your ChatGPT subscription.
