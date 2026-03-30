# Holistic Review Prompt Template

This is the reference for generating `.agents/wiggum/prompts/holistic-review.md`. The create flow writes this to the project's `.agents/wiggum/prompts/holistic-review.md`.

## Prompt

```
You are reviewing the complete application after all phases are built. Your job: catch issues that per-phase reviews miss — cross-phase inconsistencies, integration bugs, and whole-app quality.

## Load Context

1. Read all files in `.agents/wiggum/SPECS/` — understand what was supposed to be built.
2. Read `.agents/wiggum/IMPLEMENTATION_PLAN.md` — understand the phases and what each delivered.
3. Read `.agents/wiggum/AGENTS.md` — note commands, conventions, and component library.
4. Run `git log --oneline -20` to see what was built across phases.
5. Read the main source files to understand the full application.

## Check: Does the Full App Work?

1. Run the full test suite. Read any failures carefully — these may be integration issues between phases.
2. Run the build. Check for errors.
3. For each feature in the spec: trace through the code and verify the implementation is complete and correct. Check that features built in different phases integrate properly.

## Check: Cross-Phase Consistency

1. **Shared patterns**: Do all phases use the same approach for similar problems? (e.g., same error handling pattern, same data fetching approach, same component structure). Flag inconsistencies.
2. **Component reuse**: Are there components in later phases that duplicate or nearly duplicate components from earlier phases? Consolidate.
3. **Naming consistency**: Do naming conventions stay consistent across the codebase?
4. **State management**: If multiple phases touch shared state, is it managed consistently?

## Check: UI Coherence (if applicable)

1. **Visual consistency**: Do all features look like they belong to the same app? Same spacing, typography, color usage.
2. **Interaction consistency**: Are similar actions handled the same way everywhere? (e.g., delete confirmations, form validation, loading states).
3. **Component library usage**: Check `.agents/wiggum/AGENTS.md` for the component library. Flag any hand-rolled components that have library equivalents.
4. **Reference alignment**: Check `.agents/wiggum/SPECS/project_spec.md` for a "UI Reference" section. Does the overall app match the reference's patterns and feel?

## Check: Code Quality

1. **Dead code**: Are there unused imports, functions, or components left from earlier iterations?
2. **TODO/FIXME comments**: Flag any that indicate unfinished work.
3. **Hacky workarounds**: Flag code that works around problems instead of solving them.
4. **Error handling gaps**: Are there unhandled promise rejections, missing error boundaries, or swallowed errors?
5. **Code philosophy**: Check against the Code Philosophy in `.agents/wiggum/AGENTS.md` — flag redundancy across phases, premature abstractions, and inconsistent patterns.

## Actions

Fix what you find directly. After making fixes, run the project's test and lint commands (see AGENTS.md). Fix anything that breaks.

## Output

If you fixed issues, output this exact text on its own line:

REVIEW: Fixed N issues
- [one line per fix]

If everything was clean, output this exact text on its own line:

REVIEW: Clean
```
