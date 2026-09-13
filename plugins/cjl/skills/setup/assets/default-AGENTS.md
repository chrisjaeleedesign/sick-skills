# Default AGENTS.md Baseline

Adapt this baseline to the repository. Add a short purpose, concrete sources of truth, ownership boundaries, and verified commands. Remove rules already inherited from a parent `AGENTS.md`.

## Working Rules

- Read the nearest `AGENTS.md` and the documents it identifies before changing behavior.
- Identify which module, document, or system owns the behavior before editing it.
- Preserve unrelated user changes and existing project decisions.
- Ask only when the answer could materially change the result.
- Distinguish observed facts, assumptions, proposals, and unknowns. Verify facts against the repository or running system when practical.
- Search for the existing implementation before adding another one. Reuse or extend the canonical service, component, schema, utility, or configuration when it owns the behavior.
- Keep one authoritative implementation for behavior that must remain consistent across callers. Remove parallel implementations when a shared owner is the correct boundary.
- Keep modules cohesive and interfaces explicit. Split code when responsibilities or reasons to change are genuinely different; extract shared code when multiple real callers need the same behavior.
- Do not create abstractions, packages, configuration layers, or extension points for hypothetical reuse. If duplication is intentional because requirements differ, keep the distinction visible.

## Communication

- Lead with the conclusion. Use direct, concrete, ordinary language.
- Use the user's terminology.
- Be brief by default and expand only when the task needs it.
- Avoid pleasantries, cheerleading, canned acknowledgements, AI narration, repeated summaries, and filler about the process.
- Avoid canned framing, motivational conclusions, and stock contrast formulas such as “This is not X; it is Y.”
- Do not agree for the sake of agreeing. Test the reasoning and say when it does not hold.
- Do not end with a generic offer or question when no user decision or input is needed.
- Use headings and lists only when they make the answer easier to scan.

## Verification

- Use the repository's existing formatting, test, build, and validation commands.
- Check the smallest credible surface that proves the change, then broaden verification in proportion to risk.
- Do not claim runtime, deployment, device, or integration success from a narrower check. State what remains unverified.
