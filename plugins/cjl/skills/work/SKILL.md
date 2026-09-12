---
name: work
description: Handle software work consistently by inferring whether the request is an idea, bug, implementation task, or issue batch; choose LifeOS or GitHub as the durable record; investigate, execute, and verify with the appropriate approval boundary. Use only when explicitly invoked.
---

# Work

Handle the user's request end to end without asking them to select a mode. Infer the behavior from their language and current context: something weird, broken, or inconsistent uses the debug flow; an idea or desired capability uses capture; a direct change request uses implementation; and issue references use issue execution. For an explicit handoff request, read and follow the bundled [Handoff](../handoff/SKILL.md) skill; for a repository setup, guidance audit, or guidance update, read and follow [Setup](../setup/SKILL.md). Combine compatible behaviors when the request contains more than one.

## Choose the durable record

Invocation signals that this work should leave an appropriate durable record. Use a LifeOS task for a meaningful life, product, or cross-repository outcome; use a GitHub issue for repository-specific investigation and implementation detail; link them when a high-level outcome has concrete repository work. Do not duplicate issue bodies in LifeOS or create a LifeOS task for every code change. For LifeOS mutations, read and follow the installed `task` skill, including its project-confirmation and write guards. Do not update a feature catalog unless the user explicitly asks for that artifact.

Before creating a GitHub issue, confirm the repository from the current checkout or user input and check for duplicates. Treat one issue as the durable work record and keep it current with the intent or report, impact, expected and actual behavior, environment or revision, evidence, unknowns, decisions, implementation plan, acceptance criteria, progress, result, verification, and limitations as applicable. Preserve the user's observations exactly enough that later investigation does not replace them with invented reproduction steps. Use existing labels and conventions; do not invent repository process.

## Debug flow

1. Clarify and understand the bug, asking only questions that materially block an accurate investigation.
2. Create or update the detailed GitHub issue.
3. Reproduce the bug with the smallest credible case and record exact evidence.
4. Trace the failing path and surrounding system, test competing explanations, and diagnose the root cause or best-supported cause.
5. Propose the fix at the correct architectural level, considering shared responsibilities, parallel implementations, canonical sources, affected callers, migration, risks, and verification.
6. If approval is needed, wait for it; once approved, add the approved plan to the issue before implementation.

## Autonomy

Implement without asking when the cause is understood and the fix is contained, reversible, consistent with the surrounding architecture, and does not require a product decision or material scope expansion. A narrow symptom patch is not preferable merely because it is smaller. Ask before implementing when the best fix introduces a meaningful architectural or product choice, broad migration, destructive action, or material expansion beyond the request. Explicit instructions such as “fix it,” “implement it,” “run it,” or “do not wait for approval” authorize implementation within the stated scope; do not ask again solely because the change is large.

## Capture and execution

For ideas, preserve the intended outcome and uncertainty, then create the appropriate LifeOS task, GitHub issue, or linked pair without prematurely expanding it into an implementation backlog. For direct implementation, inspect the relevant system, create or update the issue before substantial work, implement at the right boundary, run proportionate verification, and record the result. For a list of issues, inspect dependencies and overlapping files, then execute independent work in parallel when delegation is available; keep one clear owner and work context per issue. Create a persistent goal only when the user explicitly asks to run the issue list as a goal.

Close an issue only when its acceptance criteria are satisfied and the result and verification are recorded. Closing linked issues does not automatically complete a LifeOS task: judge the higher-level outcome separately. Write back only meaningful decisions, milestones, results, verification, and limitations; routine implementation chatter remains in the issue or agent session.
