---
description: Plan a new feature by updating the Implementation Plan and Specs
---

# Workflow: Plan Feature

This workflow guides the agent to process a user request, update the robust Implementation Plan, and ensure the Specifications are synchronized before execution.

## 1. Context & Understanding
- **Read**: `IMPLEMENTATION_PLAN.md` to see the last completed Phase.
- **Read**: All `SPECS/*.md` files to understand the current project specifications and behavior.
- **Read**: `AGENTS.md` to understand the tech stack and conventions.
- **Goal**: Identify what specific changes effectively translate the user's request into actionable engineering tasks.

## 2. Update Implementation Plan
- **Action**: Edit `IMPLEMENTATION_PLAN.md`.
- **Rule**: **NEVER DELETE** or remove existing completed phases. The plan is a robust history.
- **Rule**: Always **APPEND** new Phases at the very bottom of the file.
- **Batched Requests**: If the user asks for multiple distinct features, create separate Phases (e.g., Phase 23, Phase 24) to keep execution atomic and parallelizable.
- **Format Standardization**:
  ```markdown
  ## Phase N — [Feature Name]

  > **Goal**: [Brief description of what successful completion looks like]

  - [ ] **[Component/Area]**: [Actionable Step]
      - [Technical Details/File Paths]
  - [ ] **Verify**: [Specific Verification Step]
  ```
- **Constraint**: Ensure tasks are broken down into atomic, testable steps. Each checkbox should ideally correspond to one commit/tool-loop.

## 3. Sync Specifications
- **Action**: Update the relevant `SPECS/*.md` file(s) to reflect the new planned behavior.
- **Rule**: Update the documentation to reflect the *new truth*.
- **Constraint**: If the Implementation Plan changes how something works, the Spec MUST be updated to describe that behavior as the standard. Do not leave the Spec outdated.
- **New features**: If no existing spec file covers the new feature, create a new spec file in `SPECS/`.

## 4. Handover
- **Notify**: Inform the user:
  > "I have updated the `IMPLEMENTATION_PLAN.md` (Phase X) and synchronized the `SPECS`. You can now run `./loop.sh` to execute the changes."
