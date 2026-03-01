# Refine Mode

Get the current draft to Gemini with the right context for refinement.

## Goal

Assemble the draft, the user's refinement instruction, and relevant context into a payload, then send it through Gemini via the refine script. You are the orchestrator — you decide what context Gemini needs. The script is just a pipe.

## Context

The script at `~/.claude/skills/write/scripts/refine.py` takes:
- `--system-prompt` (optional) — path to a writing style prompt, used as Gemini's system instruction
- `--content` (required) — path to the assembled payload, or `-` for stdin

Writing style prompts live in `.artifacts/.writing/prompts/`. If one exists for the audience or a `default.md` is available, use it as the system instruction. If none exist, call without `--system-prompt` — Gemini will refine based on the content payload alone.

The script reads `GEMINI_API_KEY` from the `.env` file in the skill's root directory.

## What to send

Build a single content payload with:

**Always:** the draft and the user's refinement instruction (or "general polish" if none given).

**When relevant:** the story brief, specific framing decisions from the conversation, user feedback on previous versions, audience context not already in the style prompt.

**Don't include:** full conversation history, learnings files (baked into the style prompt already), or wholesale source material.

## Example

A well-assembled content payload:

```
## Instruction
Tighten the prose. The second paragraph is too abstract — make it more concrete.

## Draft
AI changed the way teams create. But it didn't change the way they coordinate.
When everyone generates work instantly but nobody shares context, speed becomes
the problem, not the solution.

Our product is the coordination layer. It keeps conversations, rules, decisions,
and the latest plan in one place so every teammate and every agent sees the same picture.

## Context
This is a cold email to pre-seed AI-focused funds. The story brief emphasizes
leading with the coordination problem, not the product. Keep it under 100 words.
```

Write this to a temp file, then call:

```bash
python3 ~/.claude/skills/write/scripts/refine.py \
  --system-prompt .artifacts/.writing/prompts/default.md \
  --content /tmp/refine-payload.md
```

Or without a style prompt:

```bash
python3 ~/.claude/skills/write/scripts/refine.py \
  --content /tmp/refine-payload.md
```

## Guardrails

- Never modify the draft yourself. Your job is to get it to Gemini with the right context.
- Don't over-stuff context. More isn't better — include only what shapes this specific refinement.
- Respect the writing prompt. Don't add instructions that contradict the style prompt.
- Clean up temp files after the script runs.

## Output

Present Gemini's full response. Note which style prompt was used (or that none was). If the output needs another pass, offer to refine again with adjusted instructions.
