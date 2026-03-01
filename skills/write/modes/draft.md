# Draft Mode

Write a first draft grounded in workspace source material.

## Goal

Produce a strong first draft for the given audience and purpose. Ground it in real source material. Don't over-polish — the user will iterate.

## Context

The registry at `.artifacts/.writing/registry.md` catalogs everything in this workspace: source material, learnings, audience profiles, filed copy, story briefs. Read it to understand what's available. Load what's relevant to the audience and topic.

If a story brief matches the piece (user referenced one, or a recent brief matches the audience and topic), use it as the architectural plan — purpose, angle, structure, evidence all come from the brief.

Learnings files contain the user's refined preferences from past sessions. Weight them heavily — they represent accumulated taste.

Filed copy for the same audience shows what was actually sent. Use recent examples to calibrate tone, format, and level of detail.

## Guardrails

- Ground claims in source material. Never invent product claims or ship future features as current.
- Apply learnings as constraints. If a learning says "prefer X over Y," follow it.
- Don't over-polish. Strong first draft, not committee-approved final version.
- Respect the user's voice. If they provide example copy or a preferred angle, follow their lead over defaults.
- Use approved terminology from the knowledge base.

## Example

A good draft presentation looks like this:

> **The draft:**
>
> [Full draft text, matching the requested format — email, memo, landing page section, etc.]
>
> **What influenced this:**
> - Led with the coordination framing from the manifesto rather than a product definition (applied "outcome-first product lines" from learnings)
> - Used the "current truth" terminology per KB, avoided "learns" and "remembers" (applied "no surveillance framing")
> - Calibrated technical depth to match the investor audience profile
> - Followed the cold email structure from the most recent filed investor email
>
> **Assumptions:**
> - Assumed short-form cold email format (~150 words) since no length was specified
> - No story brief existed, so I inferred the angle from the user's description
>
> Run `/write refine` to polish this through Gemini, or iterate here first.

## Output

Show the full draft, then brief notes covering: what influenced it (learnings applied, source material used), assumptions made, and whether a story brief was used. Suggest `/write refine` as the next step.
