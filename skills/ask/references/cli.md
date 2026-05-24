# CLI Reference

Full reference for calling external text models through `ask.py`.

## Arguments

| Arg | Required | Description |
|-----|----------|-------------|
| `--model` | No | Model alias or `provider/model-id`. Default comes from `config/models.yaml` |
| `--content` | Yes | Prompt: literal string, file path, or `-` for stdin |
| `--system-prompt` | No | Path to system instruction file |
| `--persona` | No | Persona name from `personas/` or inline description |
| `--flow` | No | Flow name recorded in metadata |
| `--attach` | No | Repeatable attachment path |
| `--id` | No | Conversation file id |
| `--title` | No | Human-readable conversation title |
| `--tag` | No | Repeatable categorization tag |
| `--continue` | No | Conversation file to continue |
| `--branch` | No | Conversation file to branch from |
| `--from` | With `--branch` | Exchange number to branch from |
| `--show` | No | Pretty-print a conversation file |
| `--thinking` | No | Reasoning effort: `none`, `minimal`, `low`, `medium`, `high`, `xhigh` |

## Examples

```bash
# Simple question
python3 /Volumes/Misc/sick-skills/skills/ask/scripts/ask.py \
  --model gpt5 --content "What's the best approach for rate limiting?"

# Built-in persona
python3 /Volumes/Misc/sick-skills/skills/ask/scripts/ask.py \
  --model sonnet --persona devils-advocate \
  --content "Challenge this architecture decision" \
  --id arch-review --tag architecture

# Custom inline persona
python3 /Volumes/Misc/sick-skills/skills/ask/scripts/ask.py \
  --model spark --persona "a grumpy DBA who hates unnecessary joins" \
  --content "Review this schema"

# Flow metadata
python3 /Volumes/Misc/sick-skills/skills/ask/scripts/ask.py \
  --flow wide --model gpt5 \
  --content "How should we handle caching?" \
  --id caching-exploration

# Continue a conversation
python3 /Volumes/Misc/sick-skills/skills/ask/scripts/ask.py \
  --continue .agents/model-calls/2026-03-30_arch-review.jsonl \
  --content "What about the scaling concerns?"

# Branch from exchange 2
python3 /Volumes/Misc/sick-skills/skills/ask/scripts/ask.py \
  --branch .agents/model-calls/2026-03-30_arch-review.jsonl \
  --from 2 --content "What if we used event sourcing instead?"

# Show a conversation
python3 /Volumes/Misc/sick-skills/skills/ask/scripts/ask.py \
  --show .agents/model-calls/2026-03-30_arch-review.jsonl
```

## Personas

Personas shape the response lens.

Built-ins:
- `devils-advocate` - challenge assumptions and find holes
- `pragmatist` - feasibility, effort, what actually ships
- `visionary` - long-term implications and possibilities

Custom personas can be inline:

```bash
--persona "a first-time user who's never seen this product"
```

For persona-writing guidance, read `personas/crafting-guide.md`.

## Flows

Flows are lightweight orchestration notes. The script records the flow name in metadata; the calling agent still reads and executes the flow file.

Built-ins:
- `wide` - fan out for multiple perspectives and synthesize
- `challenge` - argue against a position, then steelman
- `double-diamond` - discover, define, develop, deliver

For flow guidance, read `flows/crafting-guide.md`.

## Output

The response prints to stdout. The final line includes the conversation file path:

```text
[model response here]

---
conversation: .agents/model-calls/2026-03-30_arch-review.jsonl
```

Keep the conversation path for `--continue` or `--branch`.

## Attachments

When the user references an image or file, attach a stable path:

```bash
mkdir -p .agents/media
cp /var/folders/.../paste-image.png .agents/media/screenshot.png
python3 /Volumes/Misc/sick-skills/skills/ask/scripts/ask.py \
  --model gpt5 \
  --content "Review this UI." \
  --attach .agents/media/screenshot.png
```

## Thinking Mode

`--thinking high` or `--thinking xhigh` enables deeper reasoning on models that support it.

- Reasoning progress may stream to stderr.
- Calls can take a long time.
- Reserve this for problems that benefit from extended reasoning.
