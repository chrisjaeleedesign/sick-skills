---
name: plan-feature
description: Plan a new feature by updating the Implementation Plan and Specs
---

Plan a new feature for the Pebbles landing page.

User's request: $ARGUMENTS

Follow this workflow exactly:

## 1. Context & Understanding
- Read `IMPLEMENTATION_PLAN.md` to see the last completed Phase.
- Read `SPECS/landing_stream_landing_page.md` to understand the current defined behavior.
- Identify what specific changes effectively translate the user's request into actionable engineering tasks.

## 2. Update Implementation Plan
- Edit `IMPLEMENTATION_PLAN.md`.
- **NEVER DELETE** or remove existing completed phases. The plan is a robust history.
- Always **APPEND** new Phases at the very bottom of the file.
- If the request contains multiple distinct features, create separate Phases (e.g., Phase N, Phase N+1) to keep execution atomic.
- Use this format:

```markdown
## Phase N — [Feature Name]

> **Goal**: [Brief description of what successful completion looks like]

- [ ] **[Component/Area]**: [Actionable Step]
    - [Technical Details/File Paths]
- [ ] **Verify**: [Specific Verification Step]
```

- Each checkbox should correspond to one atomic, testable step.
- Do NOT use the single-line changelog format. Use the Phase header + checkbox format above.

## 3. Sync Specifications
- Edit `SPECS/landing_stream_landing_page.md` to reflect the new planned behavior.
- If the plan changes how something works, the spec MUST be updated to describe the new behavior as the standard.

## 4. Handover
- Summarize what was planned and which Phase numbers were added.
- Tell the user: "You can now run `loop.sh` to execute the changes."
