You are running in a Ralph Wiggum loop (fresh context each run).

## Required Reading (do this first, every iteration)

1. Read `SPECS/*.md` fully (read all spec files).
2. Read `IMPLEMENTATION_PLAN.md` fully.
3. Read `AGENTS.md` fully (commands + repo conventions).

## Rules

- Do exactly **ONE** unchecked task from `IMPLEMENTATION_PLAN.md` per iteration.
- Choose the first unchecked task (they're dependency-ordered).
- Implement the task following repo conventions in `AGENTS.md`.
- Run the relevant validation (see Quality Gates below).
- Update `IMPLEMENTATION_PLAN.md` by checking `[x]` the completed task.
- Add a brief changelog entry at the bottom of `IMPLEMENTATION_PLAN.md`.

## Quality Gates

**Phase 0 (setup tasks):** Validation = the setup step works (e.g., dev server runs, test runner works).

**Phase 1+ (feature tasks):** Before marking complete:
- Code follows conventions in `AGENTS.md`
- Lint passes (if configured)
- Build succeeds (if configured)
- Add a test if the task involves component logic (state, interaction)

**Test requirements by task type:**
- Setup/config tasks: No test needed, just verify command works
- Pure UI/layout components: No test needed unless they have logic
- Components with state/interaction: Unit test required
- E2E tasks: E2E test is the deliverable

## Stop Condition

If and only if:
1. The selected task is completed AND
2. Relevant validation passes (see Quality Gates)

Then output this exact text on its own line (no markdown formatting, no code blocks):

COMPLETE

Otherwise, do NOT output COMPLETE. Fix issues first.

## If Stuck

- If a task is blocked, note why in changelog and skip to next unblocked task.
- If tests fail 3+ times, document the issue in changelog and move on.
- If the plan seems wrong, complete current task first, then note in changelog.
