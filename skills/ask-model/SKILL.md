---
name: ask-model
description: "Call external models for fresh perspectives, multimodal analysis, and second opinions. Supports GPT-5.4, o3, Sonnet, Opus, Gemini via OpenRouter and OpenAI. Agent-first — always invoked through a coding agent."
---

# ask-model

Call an external model when you need a fresh perspective, a different model's strengths, or multimodal analysis. The called model gets zero context from your conversation — you control exactly what it sees.

## When to Use

- **Fresh perspective** — get a second opinion on architecture, approach, or tradeoffs without your coding context biasing the response
- **Model strengths** — use o3 for deep reasoning, GPT-5.4 for vision/multimodal, Gemini for long-context analysis
- **Multimodal input** — analyze screenshots, diagrams, videos
- **Another skill delegates** — other skills can call ask-model for model access

## When NOT to Use

- For tasks you can handle yourself with your existing context
- As a crutch — you should form your own opinion first, then use ask-model to pressure-test it

## Quick Reference

```bash
# Ask a question
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --model gpt5 --content "What's the best approach for rate limiting?"

# With a system prompt and attachments
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --model gpt5 \
  --system-prompt /path/to/instructions.md \
  --content "Review this UI design" \
  --attach screenshot.png \
  --id ui-review --tag design

# Continue a conversation
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --continue .agents/model-calls/2026-03-27_ui-review.jsonl \
  --content "What about mobile responsiveness?"

# Branch from exchange 2 to explore a different direction
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --branch .agents/model-calls/2026-03-27_ui-review.jsonl \
  --from 2 \
  --content "What if we used a card layout instead?"

# Show a conversation
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --show .agents/model-calls/2026-03-27_ui-review.jsonl
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

## Arguments

| Arg | Required | Description |
|-----|----------|-------------|
| `--model` | No | Model alias or `provider/model-id`. Default: `gpt5` |
| `--content` | Yes | The prompt. Literal string, file path (if exists), or `-` for stdin |
| `--system-prompt` | No | Path to system instruction file |
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
conversation: .agents/model-calls/2026-03-27_ui-review.jsonl
```

**Always capture the conversation file path** — you'll need it for `--continue` or `--branch`.

## Images and Attachments

When the user pastes or references an image in the chat (screenshot, diagram, photo), you can pass it to ask-model. The image arrives as a temp file path in your context. To use it:

1. **Copy the image to a stable location first.** Temp file paths (e.g. `/var/folders/...`) may be cleaned up. Copy to `.agents/media/` or `/tmp/` before calling the script.
2. **Pass it with `--attach`.**

```bash
# User pasted a screenshot — save it, then send it
cp /var/folders/.../paste-image.png .agents/media/screenshot.png
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --model gpt5 \
  --content "What do you think of this UI design? What would you improve?" \
  --attach .agents/media/screenshot.png \
  --id ui-feedback --tag design
```

Do this automatically whenever the user asks you to send an image to another model — don't ask them to provide the path manually. You already have it in your context.

## Important

1. **The called model has ZERO project context.** Include everything it needs in `--content` and `--system-prompt`. If asking about code, paste the relevant code. If asking about architecture, describe the system.

2. **Use `--system-prompt` to frame the role.** Write a short instruction file that sets the model's persona and constraints. Example: "You are a senior distributed systems architect. Be direct and opinionated. Point out risks I might be missing."

3. **Use `--continue` for follow-ups** rather than starting a new conversation. The model gets the full conversation history, so you can build on previous exchanges.

4. **Use `--branch` to explore alternatives.** If a conversation reached exchange 3 but you want to explore a different direction from exchange 2, branch it. The original stays untouched.

5. **Use `--tag` to categorize.** Tags make it easy to find past conversations later via grep.

## Thinking Mode

`--thinking high` or `--thinking xhigh` enables deep reasoning on models that support it (gpt5, codex). This is powerful for complex analysis but comes with tradeoffs:

- **Reasoning progress streams to stderr.** When thinking is enabled, the script prints `[thinking] ...` lines to stderr showing the model's reasoning summary in real time. This lets you confirm the model is actively working — not stalled.
- **Calls can take a long time.** This is normal. The script has no internal read timeout; it waits as long as the model needs.
- **Set a generous Bash timeout.** The Bash tool's default 2-minute timeout will cut off thinking-mode calls. Use `timeout=600000` (10 minutes) as a minimum when calling with `--thinking`. There is no harm in setting it even higher.
- **Tell the user it may take a moment.** Before running a thinking-mode call, let the user know you're about to make a call that may take a while.
- **Use thinking mode intentionally.** Reserve `high`/`xhigh` for problems that genuinely benefit from extended reasoning — complex architecture decisions, tricky debugging, nuanced analysis. For straightforward questions, skip `--thinking` entirely or use `--model spark` for speed.

## Conversation Files

Stored as JSONL in `.agents/model-calls/`. Each file has a metadata header with id, model, timestamps, tags, and exchange count. Use `--show` to read them in a friendly format.

## First-Time OpenAI Setup

The first time you use an OpenAI model (gpt5, o3), the script will initiate a device auth flow. It will print a URL and code to the terminal — relay these to the user so they can authorize. After that, tokens are stored and refreshed automatically.
