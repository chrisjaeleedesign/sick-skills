---
name: setup
description: Create and maintain concise project AGENTS.md guidance using Chris's default behavior, repository, technical-foundation, and deployment standards. Use only when explicitly invoked.
---

# Setup

Create or maintain the repository's `AGENTS.md` as a short operating contract for future agents. Infer the action from the request instead of making the user select a mode: set up a missing file when asked to set up the repository; update an existing file when the user gives clear feedback about agent behavior or project guidance; and remain read-only when the user explicitly asks only to inspect, explain, or audit. Ask before writing only when the requested guidance is materially ambiguous or would replace an established project decision.

## Workflow

1. Read the current `AGENTS.md` or `CLAUDE.md`, README, and the smallest set of project files needed to verify repository purpose, sources of truth, ownership boundaries, commands, stack, and deployment reality.
2. Read [assets/default-AGENTS.md](assets/default-AGENTS.md). Use it as a behavioral baseline, not a block to paste blindly. Preserve stronger project-specific guidance and avoid duplicating rules already inherited from a parent file.
3. Determine whether the repository contains code, is explicitly intended to gain code, or is non-code. Load only the relevant conditional references below.
4. Create or minimally update `AGENTS.md` when the request authorizes it. Clear feedback about how agents should behave is authorization to make the corresponding scoped update; do not force a separate audit-then-update cycle.
5. Report what changed, the evidence used, meaningful assumptions or deviations, and any remaining uncertainty. For a read-only request, report findings and suggested changes without editing.

## Content

Start with the default behavioral baseline, then add only verified project-specific guidance that future work needs. Useful sections may include:

- purpose and scope;
- read order and sources of truth;
- ownership and working boundaries;
- repository-specific reuse and modularity guidance;
- technical foundation, only for code repositories or repositories explicitly intended to gain code;
- commands and verification, only when they exist and have been checked;
- deployment guidance, only when deployment is relevant.

Keep `AGENTS.md` short enough to function as instructions. Move feature specifications, architecture explanations, inventories, transient status, and long procedures to their owning documents and link them. Omit empty or speculative sections. Do not copy the standards references into the file.

## Boundaries

- Existing working architecture, stack, and repository conventions override CJL defaults unless the user explicitly requests a migration.
- Do not scaffold code, migrate a stack, deploy, or change infrastructure merely because Setup was invoked.
- Preserve the user's wording, project-specific rules, and unresolved uncertainty.
- Do not add generic process, unrelated requirements machinery, research workflows, or handoff conventions.
- Do not turn every repeated line into an abstraction. Centralize behavior when it represents one responsibility with multiple real callers; keep distinct behavior separate when its requirements differ.

## References

- Read [references/technical-foundation.md](references/technical-foundation.md) only for a new code repository, a repository explicitly intended to gain code, or a direct question about CJL technical defaults.
- Read [references/deployment.md](references/deployment.md) only when deployment or hosted configuration belongs in the requested guidance.

State when a conditional reference caused a technical or deployment rule to enter `AGENTS.md`.
