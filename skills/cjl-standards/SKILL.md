---
name: cjl-standards
description: Create, audit, or update concise project AGENTS.md guidance using Chris's repository, technical-foundation, and deployment standards. Use only when explicitly invoked as $cjl-standards.
disable-model-invocation: true
---

# CJL Standards

Maintain concise repository guidance for future coding agents. The primary artifact is the repository's `AGENTS.md`.

## Modes

- `audit`: Inspect the repository and report what its guidance says or should say. Never edit.
- `initialize`: Create `AGENTS.md` when the user clearly asks to initialize it.
- `update`: Minimally patch an existing `AGENTS.md` when the user clearly asks for changes.

If the invocation does not clearly authorize a mutation, use `audit` and propose any changes without writing them.

## Workflow

1. Read the current `AGENTS.md` or `CLAUDE.md`, README, and the smallest set of project files needed to verify repository purpose, commands, stack, and deployment reality.
2. Determine whether the repository contains code, is explicitly intended to gain code, or is non-code.
3. Load only the relevant reference below.
4. In `initialize` or `update`, write only applicable, verified guidance. In `audit`, compare current guidance with repository reality and report concise findings.
5. Report the mode, sources checked, assumptions, deviations, file changed or proposed, and remaining uncertainty.

## AGENTS.md Content

Use the smallest useful set of sections. Typical sections are:

- purpose;
- read order and sources of truth;
- working rules and boundaries;
- technical foundation, only for code repositories or repositories explicitly intended to gain code;
- commands and verification, only when verified from the repository;
- deployment guidance, only when deployment is relevant.

Omit empty or speculative sections. Do not copy the standards references into `AGENTS.md`. Non-code repositories should receive purpose, read order, source-of-truth, and working guidance without an invented stack.

Unless existing repository guidance overrides it, include this communication
baseline under working rules:

> Lead with the conclusion. Be concise and remove filler. Preserve grammar,
> necessary caveats, and exact technical meaning.

Do not make Caveman or another optional response mode an always-on repository
rule.

## Boundaries

- Existing working stack and repository conventions override CJL defaults unless the user explicitly requests a migration. Record the actual foundation and report meaningful deviations.
- Do not scaffold code, migrate a stack, deploy, or change infrastructure merely because this skill was invoked to create or update `AGENTS.md`.
- Preserve the user's wording, repository-specific instructions, and unresolved uncertainty.
- Do not add generic process, unrelated verification rules, requirements machinery, research workflows, or handoff conventions.
- Audit mode is read-only.

## References

- Read [references/technical-foundation.md](references/technical-foundation.md) only for a code repository, a repository explicitly intended to gain code, or a direct question about CJL technical defaults.
- Read [references/deployment.md](references/deployment.md) only when deployment or hosted configuration belongs in the requested `AGENTS.md` work.

Keep reference use visible: state when a reference caused a technical or deployment rule to enter the guidance.
