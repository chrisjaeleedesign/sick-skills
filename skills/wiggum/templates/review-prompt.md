# Review Prompt Template

This is the reference for generating `.wiggum/prompts/review.md`. The create flow writes this to the project's `.wiggum/prompts/review.md`.

## Prompt

```
You are reviewing the latest implementation work. Check that it works, follows conventions, and isn't hacky.

## Load Context

1. Read `.wiggum/IMPLEMENTATION_PLAN.md` — identify which phases were completed (all tasks `[x]`) to understand scope.
2. Read the spec files in `.wiggum/SPECS/`.
3. Read `.wiggum/AGENTS.md` for project conventions, commands, component library, and code philosophy.
4. Run `git diff HEAD` to see all changes since last commit. Read any new/modified files in full.

## Check: Does It Work?

1. Run the project's test suite (see AGENTS.md). Read any test failures carefully.
2. Run the build command. Check for errors.
3. IMPORTANT: Do NOT start long-running processes like dev servers (`npm run dev`, `bun run dev`, etc.) — they run forever and will block the loop. Use `build` commands for verification instead.
4. For each completed task, verify the acceptance criteria are met — check the actual code, not just that files exist.

## Check: Is It Conventional?

1. **UI patterns** (if UI files were touched): Are they using standard patterns (tabs, modals, lists, forms) or inventing novel solutions? Check `.wiggum/AGENTS.md` for the component library — flag hand-rolled components that duplicate library primitives.
2. **Reference alignment**: Check `.wiggum/SPECS/project_spec.md` for a "UI Reference" section. If reference apps are specified, evaluate whether the implementation matches their patterns.
3. **Codebase consistency**: Does the new code follow the same patterns as existing code? Same file structure, same naming, same approach to similar problems?

## Check: Is It Robust?

1. **Hacky workarounds**: Flag any code that works around a problem instead of solving it. Look for: TODO/FIXME/HACK comments, try/catch blocks that swallow errors, hardcoded values that should be dynamic, disabled lint rules, type assertions (as any), copied-and-pasted code.
2. **Proper error handling**: Are errors handled at the right level? Are error messages useful?
3. **Code philosophy**: Check against the Code Philosophy in `.wiggum/AGENTS.md` — flag redundancy, hacky workarounds, unnecessary complexity, premature abstractions.

## Actions

Fix what you find directly — don't just flag it. After making fixes, run the project's test and lint commands (see AGENTS.md). Fix anything that breaks.

## Output

If you fixed issues, output this exact text on its own line:

REVIEW: Fixed N issues
- [one line per fix]

Do NOT commit when you fixed issues — the next review round will check your fixes.

If everything was clean:
1. Read `.wiggum/IMPLEMENTATION_PLAN.md` to determine which phases were completed
2. Run: `git add .` then `git commit -m "Phase N[-M]: [description of what was implemented]"`
   - Use "Phase 2-3:" format if multiple phases were completed
3. Output this exact text on its own line:

REVIEW: Clean
```
