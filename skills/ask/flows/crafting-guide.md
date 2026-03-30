# Crafting Good Flows

A flow is a conversation template — a defined sequence of steps that structures how a thinking conversation unfolds. Good flows guide without constraining.

## What makes a good flow

- **Clear steps.** Each step has a purpose and a natural transition to the next.
- **Decision points.** The user should be able to redirect, skip, or go back at transition points.
- **Natural exits.** The flow should end when the thinking is done, not when the steps run out.
- **Right-sized.** 3-5 steps is the sweet spot. Fewer feels undirected, more feels bureaucratic.

## Anatomy of a flow

Each flow should define:
1. **When to use** — what kind of question or situation this flow fits
2. **Steps** — the sequence, with what happens at each step
3. **Transitions** — how you move between steps (announce the move, get user confirmation)
4. **Tips** — practical advice for running the flow well

## When to go parallel vs sequential

- **Parallel** (like the Wide flow): when you want diverse perspectives on the same question. Fan out, collect, synthesize.
- **Sequential** (like Double Diamond): when each step builds on the previous one. The order matters because understanding deepens at each stage.

## When to bring in external models

- When you want a genuinely fresh perspective (no context anchoring)
- When a specific model has strengths relevant to the question (vision, reasoning, speed)
- When running parallel perspectives in a Wide flow
- Not every step needs an external call — sometimes the agent thinking through it is enough

## Example: designing a custom flow

Say you're doing a "user story deep-dive" flow:
1. **Understand** — who's the user, what's the context?
2. **Map** — what's the current experience, step by step?
3. **Pain points** — where does it break down? (good spot for a devils-advocate call)
4. **Reimagine** — what would the ideal look like? (good spot for a visionary call)
5. **Scope** — what's the smallest version worth building?

That's a flow. Define it, use it, iterate on it.
