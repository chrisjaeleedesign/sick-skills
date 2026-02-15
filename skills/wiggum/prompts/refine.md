# Refine — Sharpen the Plan Before Execution

Re-evaluate the implementation plan with fresh eyes before the headless loop executes it.

User's request: $ARGUMENTS

You just created this plan. Now shift perspective: you are a senior engineer who will inherit this codebase and maintain it for years. The headless worker that executes this plan has no judgment — it follows instructions literally. Every gap in the plan becomes a bug. Every vague task becomes a coin flip. Every non-standard approach becomes a "why did they do it this way?" for the next maintainer.

Your job: make sure this plan produces code that someone would look at and think "this was implemented by someone who knows the ecosystem."

## Step 1: Load Context and Spawn Verification

1. Use Glob to check for `.wiggum/IMPLEMENTATION_PLAN.md`. If not found, STOP: "No `.wiggum/` directory found. Use `/wiggum [description]` to create one."
2. Read `.wiggum/SPECS/project_spec.md` (and any other files in `.wiggum/SPECS/`)
3. Read `.wiggum/IMPLEMENTATION_PLAN.md`
4. Read `.wiggum/AGENTS.md`

Spawn a sub-agent using the Task tool (subagent_type: `code-reviewer`) with this prompt:

> Structural verification of a Wiggum implementation plan.
>
> Read `.wiggum/SPECS/project_spec.md` (and any other spec files in `.wiggum/SPECS/`) and `.wiggum/IMPLEMENTATION_PLAN.md`. Perform these checks and report findings:
>
> **Traceability**:
> - For every requirement in the spec, identify which phase/task implements it. Flag requirements with no corresponding task as `[CRITICAL] Uncovered requirement`.
> - For every task in the plan, identify which spec requirement it serves. Flag tasks with no spec backing as `[INFO] Orphan task` (may be legitimate infrastructure).
>
> **Task specificity**:
> For each task, answer: could a headless Claude instance with no human oversight execute this unambiguously? Flag problems as `[WARNING] Vague task`. Common issues:
> - Missing file paths or directory locations
> - Unspecified library or dependency choices
> - Vague acceptance criteria ("make it work", "add error handling")
> - Missing edge case instructions
>
> **Phase structure**:
> - Each phase should have 3-7 tasks. Flag violations as `[WARNING]`.
> - Each phase should end with a `**Verify**` task. Flag missing as `[CRITICAL]`.
> - Tasks within a phase should be dependency-ordered — a task should not reference output from a later task. Flag violations as `[WARNING] Dependency ordering`.
>
> **Test expectations**:
> Each Verify task should specify: (1) what to test, (2) how to test it (command or method), and (3) what passing looks like (expected output or assertion). Flag Verify tasks that say only "verify it works" or equivalent as `[WARNING] Weak verification`.
>
> Report all findings as a tagged list with phase/task references. End with a summary count: N critical, N warning, N info.

Do not wait for the sub-agent to finish. Proceed to Step 2 immediately.

## Step 2: Identify High-Consequence Decisions

Read through the full plan. Identify the 3-7 decisions that would be hardest to change later — the load-bearing walls of the implementation. These are decisions where choosing wrong creates expensive rework.

Examples by project type:
- **Web apps**: data model design, auth pattern, state management, routing structure, API contract shape
- **CLI tools**: argument parsing approach, config file format, output formatting strategy, plugin architecture
- **Data pipelines**: data format choices, orchestration pattern, error recovery strategy, schema management
- **Libraries**: public API surface, dependency choices, versioning strategy, build/bundle approach
- **Mobile apps**: navigation pattern, local storage approach, state management, API client design

Look for decisions in your plan where a different senior engineer might reasonably choose a different approach. Those are the ones that need grounding.

If the plan is small (1-2 phases, simple scope), you may find only 1-3 decisions. That is fine — do not force the count to 3.

## Step 3: Ground Decisions Against Current Practice

For each decision identified in Step 2:

**State the decision**: What does the plan currently specify? Be precise — name the library, pattern, or approach.

**Search for current practice**: Use WebSearch to verify this is how the community currently does it. Construct specific queries:
- Good: `"Next.js 14 app router authentication best practice 2025"`, `"Python CLI argument parsing click vs argparse 2025"`, `"React state management recommendations 2025"`
- Bad: `"how to do auth"`, `"best state management"`, `"CLI tools"`

Include the tech stack, the specific pattern, and a recent year. One focused search per decision.

**Evaluate**: Three possible outcomes:

- **Aligned** — The plan follows the standard approach. No change needed. Record and move on.
- **Divergent but simpler** — The plan departs from convention but the approach is simpler and appropriate for the scope. Add a brief comment to the relevant task explaining the choice (e.g., `<!-- Using X instead of the more common Y because this is a v1 with single-user scope -->`). This helps future maintainers understand the intent was deliberate.
- **Divergent without benefit** — The plan uses a non-standard approach with no clear advantage. Rewrite the relevant tasks to follow the conventional approach.
- **UI pattern check** — For decisions involving UI (component choices, interaction patterns, layout), also evaluate: Does the plan follow conventional patterns? Does it use the component library (see `.wiggum/AGENTS.md`)? Would a user recognize this pattern from other apps? If `.wiggum/SPECS/project_spec.md` has a UI Reference section, evaluate against those reference apps specifically.

**If a search returns no useful results**: proceed with your training knowledge and note `(unverified — no recent docs found)` next to the decision in your summary. Do not block on unhelpful search results.

Bias toward the conventional approach. A novel solution needs to be meaningfully simpler to justify the maintenance cost of being non-standard. "Clever" is not a benefit.

## Step 4: Sweep for Over-Engineering

Read through the plan once more, looking for scope beyond what the spec requires:

- **Premature abstraction**: Generic/reusable infrastructure before there is a second use case. First version should be concrete.
- **Unnecessary indirection**: Wrapper layers, service abstractions, or adapter patterns that exist "for flexibility" in a v1. If the plan creates `utils/`, `helpers/`, or `services/` directories with many files, question whether direct implementation would be simpler.
- **Gold-plating**: Features or edge case handling the spec does not call for — optimistic updates, retry logic, caching, offline support. If the spec does not mention it, the plan should not include it.
- **Config-driven complexity**: Making things configurable (themes, feature flags, pluggable backends) when the spec has one concrete use case.

For each instance found: simplify the task description, or remove the task if the spec does not require it. Do not remove tasks that ARE backed by the spec — only trim excess.

## Step 5: Strengthen Test Expectations

For each phase's Verify task:

1. It must specify **what** to test (which behavior or capability), **how** to test it (exact command, test type, or manual steps), and **what passing looks like** (expected output, assertion, or observable result).

2. **Phase 0** (setup): The Verify task should have an exact command and expected result. Example: "`npm run dev` starts without errors — page loads at localhost:3000 showing the default template."

3. **Feature phases**: The Verify task should include at least one concrete test scenario with input and expected output. Example: "Add a todo item 'Buy milk' — it appears in the list. Refresh the page — it persists."

4. If a task involves logic (state, data processing, interaction), the task itself (not just the Verify step) should mention that a test is expected. The headless worker follows `.wiggum/prompts/loop.md` which has quality gates for tests — but only if the plan signals that a test is warranted.

Do not add tests for things the spec does not require. Do strengthen every test the spec does require.

## Step 6: Integrate Sub-Agent Findings

Check the sub-agent's results (wait if it has not finished yet — do not skip this step).

For each finding:
- `[CRITICAL]`: Fix immediately. Uncovered spec requirements get new tasks. Missing Verify steps get added.
- `[WARNING]`: Fix if the fix is straightforward. For vague tasks, rewrite with specifics. For structural issues, reorder or rebalance.
- `[INFO]`: Acknowledge. Orphan tasks that are legitimate infrastructure (setup, config) need no action.

## Step 7: Report

Present a summary of what changed. All changes should already be applied to `.wiggum/IMPLEMENTATION_PLAN.md` (and `.wiggum/SPECS/` if spec gaps were found).

If changes were made:

> **Plan refined.** Here's what changed:
>
> **Decisions grounded** (Step 3):
> - [Decision]: [aligned / simplified-divergence-noted / rewritten to conventional approach]
> - ...
>
> **Simplified** (Step 4):
> - [What was simplified or removed, and why]
>
> **Tests strengthened** (Step 5):
> - [Which Verify tasks were updated]
>
> **Structural fixes** (Step 6):
> - [Issues from sub-agent that were addressed]
>
> Run `/wiggum run` to start building.

If no changes were needed:

> **Plan reviewed — no changes needed.** The implementation plan aligns with current best practices, has adequate test coverage, and is appropriately scoped.
>
> Run `/wiggum run` to start building.
