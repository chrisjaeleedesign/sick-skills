# Headless Worker Prompt Template

This is the reference for generating `.agents/wiggum/prompts/loop.md`. The create flow writes this to the project's `.agents/wiggum/prompts/loop.md`.

## Prompt

```
You are running in a Wiggum loop (fresh context each run). Each iteration completes one full phase.

## Required Reading (do this first, every iteration)

1. Read all files in `.agents/wiggum/SPECS/` fully.
2. Read `.agents/wiggum/IMPLEMENTATION_PLAN.md` fully.
3. Read `.agents/wiggum/AGENTS.md` fully (commands + repo conventions).

## Rules

- Read the full plan. Identify all remaining unchecked phases.
- Default: complete all unchecked tasks in the **current phase** (the first phase with any `- [ ]` tasks).
- You MAY combine the next phase into this iteration if:
  - It is small (≤5 tasks) AND tightly coupled with the phase you just completed (shared data model, same feature area, dependent functionality)
  - Combined total does not exceed ~10 tasks
- Never combine more than 2 phases in a single iteration.
- If combining, state what you're combining and why at the top of your output before starting work.
- Work through tasks in order (they're dependency-ordered within each phase).
- For each task:
  1. Implement it following repo conventions in `.agents/wiggum/AGENTS.md`
  2. All source code changes happen in the project root (NOT inside `.agents/wiggum/`)
  3. Run the relevant validation (see Quality Gates below)
  4. Check it off: change `- [ ]` to `- [x]` in `.agents/wiggum/IMPLEMENTATION_PLAN.md`
  5. Add a brief changelog entry at the bottom of `.agents/wiggum/IMPLEMENTATION_PLAN.md`
- After completing your work, follow **Stop Condition** exactly.

## Design Principles

Follow the Code Philosophy in `.agents/wiggum/AGENTS.md`. Additionally:

- Use the project's component library for all UI elements — don't hand-roll when a library primitive exists (check AGENTS.md).
- Before writing new code, read how similar things are already done in the project. Match style, structure, and approach.
- When something is hard to implement, step back and look for the conventional approach before pushing through with a workaround.

## Quality Gates

**IMPORTANT — Never start long-running processes.** Do NOT run dev servers (`npm run dev`, `bun run dev`, `next dev`, etc.) as they run forever and will block the loop. Use `build` commands instead (e.g., `bun run build`, `npm run build`) which exit on completion. If a verify task says to check `bun run dev`, verify with `bun run build` instead.

**Phase 0 (setup tasks):** Validation = the setup step works (e.g., build succeeds, test runner works).

**Phase 1+ (feature tasks):** Before marking a task complete:
- Code follows conventions in `.agents/wiggum/AGENTS.md`
- Lint passes (if configured)
- Build succeeds (if configured)
- Add a test if the task involves logic (state, interaction, data processing)

**Test requirements by task type:**
- Setup/config tasks: No test needed, just verify command works
- Pure UI/layout components: No test needed unless they have logic
- Components with state/interaction: Unit test required
- E2E tasks: E2E test is the deliverable

## Stop Condition

If and only if:
1. ALL unchecked tasks in the current phase (and optionally the next combined phase) are completed AND
2. Relevant validation passes for each completed task (see Quality Gates)

Then output this exact text on its own line (no markdown formatting, no code blocks):

COMPLETE

If tasks remain unchecked because you are blocked after trying three materially different approaches, output this exact format on its own line:

BLOCKED: <short reason>

Otherwise, do NOT output COMPLETE.

## If Stuck

When you hit an error or something doesn't work:

1. **Read the error carefully.** Understand what it's actually telling you — don't just retry the same approach.
2. **Check existing code for patterns.** How does the rest of the codebase handle similar things? Match that approach.
3. **Try a different approach.** If your first attempt fails, think about why and try a fundamentally different strategy — not a minor tweak of the same thing.
4. **Check if you're using the API/library correctly.** Read the existing imports and usage patterns in the project before assuming your approach is right.
5. **Only declare blocked as a last resort.** After genuinely trying 3 different approaches (not 3 retries of the same approach), document what you tried and why each failed in the changelog. Leave blocked tasks unchecked.

If you completed some tasks but got stuck on others, do NOT output COMPLETE. Output `BLOCKED: <short reason>`.
```
