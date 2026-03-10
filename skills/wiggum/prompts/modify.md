# Modify — Add Phases to Existing Plan

Add new phases to the current implementation plan.

User's request: $ARGUMENTS

## Step 1: Context & Understanding

1. Read `.wiggum/IMPLEMENTATION_PLAN.md` to see existing phases and the last phase number
2. Read all files in `.wiggum/SPECS/` to understand the current project
3. Read `.wiggum/AGENTS.md` to understand the tech stack and conventions
4. Read `.wiggum/ROADMAP.md` for version context
5. Identify what specific changes translate the user's request into actionable engineering tasks

If `$ARGUMENTS` is empty, ask the user what they want to add. Do not proceed without a clear feature description.

## Step 2: Check State

- If ALL tasks in the plan are complete (`[x]`), this should be a VERSION transition, not a MODIFY. Tell the user:
  > All current tasks are complete. To add a new version: `/wiggum v2: [describe what's next]`
  Then stop.

- If unchecked tasks remain, proceed with adding new phases.

## Step 3: Update Implementation Plan

Edit `.wiggum/IMPLEMENTATION_PLAN.md`:

- **NEVER DELETE** existing phases or tasks — the plan is an append-only history during execution
- Determine the next phase number by finding the highest existing phase number and incrementing
- Append new phases BEFORE the `## Changelog` section
- If the request contains multiple distinct features, create separate phases

Use this format for each new phase:

```markdown
## Phase N — [Feature Name]

> **Goal**: [Brief description of what successful completion looks like]

- [ ] **[Component/Area]**: [Actionable task]
    - [Technical details, file paths]
- [ ] **[Component/Area]**: [Another task]
    - [Technical details]
- [ ] **Verify**: [Specific verification step for this phase]
```

Requirements:
- Each task should be atomic and testable
- 3-7 tasks per phase
- End each phase with a **Verify** task
- Include enough technical detail for a headless worker agent to implement

## Step 4: Sync Specifications

- Update `.wiggum/SPECS/project_spec.md` to include the new features under Core Features
- Or create a new spec file in `.wiggum/SPECS/` if the feature is a distinct capability
- Ensure the spec has enough detail for the new tasks (behavior, edge cases, acceptance criteria)
- Update `.wiggum/ROADMAP.md` if the scope of the current version has meaningfully changed

## Step 5: Handover

Summarize what was added:

> **Plan updated!**
> - Added Phase N: [name] — [task count] tasks
> - [Added Phase N+1: [name] — [task count] tasks] (if multiple phases)
> - Specs updated: [which files changed]
>
> Total remaining tasks: [count]
> Run `/wiggum run` to continue building.
