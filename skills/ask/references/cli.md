# CLI Reference

Full reference for calling external models via the `ask.py` script.

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
| `--thinking` | No | Reasoning effort: `none`, `minimal`, `low`, `medium`, `high`, `xhigh` |

## Examples

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

# With a flow
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

## Personas

Personas shape how a model responds by setting a perspective lens.

**Pre-baked personas** (in `personas/` directory):
- `devils-advocate` — challenge assumptions, find holes
- `pragmatist` — feasibility, effort, what actually ships
- `visionary` — long-term implications, possibilities

**Custom personas** — pass any description inline:
- `--persona "a first-time user who's never seen this product"`
- `--persona "a compliance officer worried about GDPR"`

For guidance on writing good personas, read `personas/crafting-guide.md`.

## Flows

Flows structure multi-step thinking conversations. The script records the flow name in metadata; you manage the actual steps by following the flow file.

**Pre-baked flows** (in `flows/` directory):
- `wide` — fan out for multiple perspectives, synthesize, ask user which resonates
- `challenge` — argue against a position, then steelman the result
- `double-diamond` — discover → define → develop → deliver

For guidance on designing custom flows, read `flows/crafting-guide.md`.

## Output

The response prints directly to stdout. After the response, a separator line shows the conversation file path:

```
[model response here]

---
conversation: .agents/model-calls/2026-03-30_arch-review.jsonl
```

**Always capture the conversation file path** — you'll need it for `--continue` or `--branch`.

## Images and Attachments

When the user pastes or references an image, copy it to a stable location first (temp paths get cleaned up), then pass with `--attach`:

```bash
cp /var/folders/.../paste-image.png .agents/media/screenshot.png
python3 ~/.claude/skills/ask/scripts/ask.py \
  --model gpt5 \
  --content "What do you think of this UI design?" \
  --attach .agents/media/screenshot.png
```

## Thinking Mode

`--thinking high` or `--thinking xhigh` enables deep reasoning on models that support it (gpt5, codex).

- Reasoning progress streams to stderr as `[thinking] ...` lines
- Calls can take a long time — set Bash `timeout=600000` (10 minutes)
- Reserve for problems that benefit from extended reasoning
