# Learn Mode

Extract writing preferences from conversations and persist them as reusable learnings.

## When to use

At the end of a writing session — after the user has iterated on copy, rejected drafts, refined tone, or made corrections that reveal preference patterns.

## Source material

Accept any of:
- **Current conversation** (default) — look back at the conversation for writing iterations
- **File path** — a transcript or session file the user points to
- **Before/after pair** — the user provides rejected and accepted copy directly
- **Freeform input** — the user states preferences directly ("I like X not Y")

## Extract candidate learnings

Read `.artifacts/.writing/registry.md` to find all current learnings files, then read each one so you know what's already captured. This prevents duplicates and lets you update existing entries with new examples.

Scan the source for writing iterations — rejections, corrections, preferences stated directly, tone shifts, audience calibrations, format preferences. For each pattern found, identify:

- **What was learned** — a clear, actionable rule or preference
- **Why it matters** — what problem it solves or what quality it protects
- **Concrete examples** — what was rejected vs. what was accepted (actual text when possible)
- **Scope** — universal, or audience-specific? Use this when / skip this when.

Each learning should have enough context that a future agent can apply it without the original conversation.

## Present candidates for approval

Show each candidate learning with:
- The rule/preference statement
- Before/after examples
- Whether it's universal or audience-specific
- Where you'd store it (root `learnings.md` or an audience-specific file)

Let the user pick which to save. They may accept, edit, reject, or merge with an existing learning. **Do not persist anything without user approval.**

## Decide where to persist

For each accepted learning:
- **Root `learnings.md`** — universal rules that apply across all audiences
- **Audience-specific file** — rules for one audience context only
- **Update existing entry** — if it reinforces an existing learning, add a new example rather than duplicating

Create a new audience-specific file when you have 3+ learnings for a specific audience not yet tracked.

## Write to markdown

Append to or update the appropriate learnings file. Follow the existing format patterns:

```markdown
### Rule: [Clear, actionable name]

**What was learned:** [1-2 sentence description]
**Why it matters:** [What problem this solves]

**Accepted example:**
> [The copy that worked, with context]

**Rejected example:**
> [The copy that was rejected, with context]

**What changed:**
- [Before] → [After] summary

**Use this when:** [Contexts where this applies]
**Skip this when:** [Contexts where this doesn't apply]
```

This is a guide, not a rigid template. Adapt the structure to what makes the learning clearest.

## Update registry

If new learnings files were created, add them to the "Learnings files" section of `.artifacts/.writing/registry.md` with a one-line summary of what the file covers.
