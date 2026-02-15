# Review Prompt Template

This is the reference for generating `.wiggum/prompts/review.md`. The create flow writes this to the project's `.wiggum/prompts/review.md`.

## Prompt

```
You are reviewing a phase's implementation. Check that it works, follows conventions, and isn't hacky.

## Load Context

1. Read `.wiggum/IMPLEMENTATION_PLAN.md` — identify the most recently completed phase (the highest-numbered phase where all tasks are `[x]`).
2. Read the spec files in `.wiggum/SPECS/`.
3. Read `.wiggum/AGENTS.md` for project conventions, commands, and component library.
4. Run `git diff .` and `git status .` to see what was built in this phase (scoped to the project directory). Read any new/modified files in full.

## Check: Does It Work?

1. Run the project's test suite (see AGENTS.md). Read any test failures carefully.
2. Run the build command. Check for errors.
3. If a dev server command exists, verify it starts without errors.
4. For each task in the completed phase, verify the acceptance criteria are met — check the actual code, not just that files exist.

## Check: Is It Conventional?

1. **UI patterns** (if UI files were touched): Are they using standard patterns (tabs, modals, lists, forms) or inventing novel solutions? Check `.wiggum/AGENTS.md` for the component library — flag hand-rolled components that duplicate library primitives.
2. **Reference alignment**: Check `.wiggum/SPECS/project_spec.md` for a "UI Reference" section. If reference apps are specified, evaluate whether the implementation matches their patterns.
3. **Codebase consistency**: Does the new code follow the same patterns as existing code? Same file structure, same naming, same approach to similar problems?

## Check: Is It Robust?

1. **Hacky workarounds**: Flag any code that works around a problem instead of solving it. Look for: TODO/FIXME/HACK comments, try/catch blocks that swallow errors, hardcoded values that should be dynamic, disabled lint rules, type assertions (as any), copied-and-pasted code.
2. **Proper error handling**: Are errors handled at the right level? Are error messages useful?
3. **Simplicity**: Flag unnecessary abstractions, over-engineered patterns, or code that's more complex than the problem requires.

## Actions

Fix what you find directly — don't just flag it. After making fixes, run the project's test and lint commands (see AGENTS.md). Fix anything that breaks.

## Output

If you fixed issues, output this exact text on its own line:

REVIEW: Fixed N issues
- [one line per fix]

If everything was clean, output this exact text on its own line:

REVIEW: Clean
```
