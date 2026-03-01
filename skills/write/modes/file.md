# File Mode

Save finished copy to the writing system so future agents can find and reference it.

## When to use

After copy is finished — sent, submitted, published, or approved as final. This captures what actually went out, not drafts or works in progress.

## Identify the copy

If the user provided a file path, read that file. Otherwise, find the final version in the conversation — the last accepted, explicitly finalized, or approved draft. If unclear, ask: "Which piece of copy would you like to file?"

## Collect metadata

Gather or infer from context:
- **Audience** — investor, customer, technical, or general
- **Format** — cold email, landing page section, fund application, pitch deck slide, one-pager, blog post, etc.
- **Summary** — one-line description of what this is and why it was written
- **Context** (optional) — outcome or destination ("sent to Basis Set Ventures", "published on homepage v2.3")

If you can infer any from the conversation, pre-fill and confirm rather than asking from scratch.

## Save to filed copy directory

Save to `.artifacts/.writing/filed/` with this filename pattern:

**Filename:** `YYYY-MM-DD-<audience>-<format-slug>.md`

Format slugs: lowercase, hyphenated, concise — `cold-email`, `landing-page-hero`, `fund-application`, `pitch-deck`, `one-pager`, `blog-post`.

If a file with the same name exists, append a short disambiguator:
- `2026-02-27-investor-cold-email-basis-set.md`

**File format:**

```markdown
---
date: YYYY-MM-DD
audience: <audience>
format: <format>
summary: <one-line summary>
context: <optional context/outcome>
---

<the actual copy, exactly as sent/published>
```

Preserve the copy exactly as finalized. Do not edit, reformat, or improve it.

Create the `filed/` directory if it doesn't exist.

## Update registry

Add an entry to the "Filed copy" section of `.artifacts/.writing/registry.md`:

```markdown
| `.artifacts/.writing/filed/<filename>` | YYYY-MM-DD | <audience> | <format> | <summary> |
```

Append at the bottom so the list stays chronologically sorted.

## Confirm and suggest next step

Confirm what was saved (file path + metadata summary). If the conversation involved writing iterations worth capturing, suggest `/write learn`.

## Guardrails

- **Never edit the copy.** File it exactly as finalized. This is an archive, not an editing step.
- **One piece per file.** If filing multiple pieces, run the workflow for each.
- **Don't file drafts.** If the copy wasn't approved or sent, suggest finalizing first.
