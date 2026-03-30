# Refine — Discuss and Improve the Plan

Conversational plan review before execution.

User's request: $ARGUMENTS

## Step 1: Load Context

1. Use Glob to check for `.agents/wiggum/IMPLEMENTATION_PLAN.md`. If not found, STOP: "No `.agents/wiggum/` directory found. Use `/wiggum [description]` to create one."
2. Read `.agents/wiggum/SPECS/project_spec.md` (and any other files in `.agents/wiggum/SPECS/`)
3. Read `.agents/wiggum/IMPLEMENTATION_PLAN.md`
4. Read `.agents/wiggum/AGENTS.md`

## Step 2: Initial Quality Scan

Review the plan with fresh eyes, focused on:

- **Redundancies**: Tasks or phases that overlap or duplicate effort
- **Over-complicated approaches**: Where simpler solutions exist — premature abstractions, unnecessary indirection, config-driven complexity the spec doesn't call for
- **Code philosophy alignment**: Check against the Code Philosophy in `.agents/wiggum/AGENTS.md`
- **Phase scoping**: Are phases coherent deliverable units? Can each be demoed or verified end-to-end? Are tightly-coupled concerns grouped together?
- **Task specificity**: Could a headless worker agent execute each task unambiguously? Flag missing file paths, vague acceptance criteria, unclear library choices.
- **Test expectations**: Do Verify tasks specify what to test, how, and what passing looks like?

## Step 3: Present Findings

Present 2-4 observations or concerns, ranked by severity (most impactful first). For each:
- State the issue clearly
- Explain why it matters
- Suggest a fix or ask for the user's preference if multiple approaches exist

End with:
> What concerns do you have? Any docs or references to check against?

## Step 4: Iterate

Each subsequent turn:
1. Address the user's feedback
2. Make agreed-upon changes to `.agents/wiggum/` files (plan, specs, AGENTS.md as needed)
3. Reassess: "Here's where the plan stands now. [Remaining concern or 'Looking solid']. Anything else?"

## Step 5: Readiness

When the user asks "are we ready?" or similar, give an honest yes/no with reasoning.

If yes:
> Plan looks solid. `/wiggum run` when you're ready.

If no:
> Not quite — [specific remaining concern]. Want to address that first?
