---
name: cjl-features
description: Maintain a concise catalog of possible future product capabilities, defining what each feature is and why it matters. Use for future feature ideas or feature catalogs; do not use for task backlogs, issue tracking, implementation plans, or specifications.
---

# CJL Features

Maintain one lightweight, human-readable catalog of potential product capabilities. A catalog entry records an idea; it is not an implementation commitment.

## File

Update the repository's existing feature catalog when one is present. Otherwise create `FEATURES.md` at the repository root. Do not create a feature-document hierarchy.

## Entry Shape

```markdown
## <Feature name>

**What it is:** <clear capability definition>

**Why it matters:** <problem solved or value created>

**Important boundaries:** <optional clarification>

**Open questions:** <optional material unknowns>
```

Omit optional fields when they add no information.

## Workflow

1. Read the existing catalog, if any, and enough current product context to avoid duplication or contradiction.
2. Add a new entry or minimally clarify the matching entry.
3. Preserve the user's wording, distinctions, and uncertainty. State a material unknown as an open question rather than resolving it by invention.
4. Report which entry and file changed. If the request is actually a task, issue, plan, or specification, explain that it is outside this skill and do not create catalog content.

## Boundaries

- Do not invent IDs, versions, priorities, schedules, acceptance criteria, archive trees, or implementation commitments.
- Do not create REQ, PROD, project-foundation, or lifecycle documents.
- Do not expand a feature idea into an implementation plan or issue backlog.
- Do not treat catalog order as priority.

## Example

```markdown
## Offline capture

**What it is:** Let a user record a note without a network connection and synchronize it when connectivity returns.

**Why it matters:** Capture should not fail when the user is traveling or has unreliable service.

**Important boundaries:** This defines reliable note capture, not general offline access to every part of the product.

**Open questions:** How should conflicting edits be presented to the user?
```
