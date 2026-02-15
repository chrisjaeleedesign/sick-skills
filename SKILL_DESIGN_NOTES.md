# Ralph Loop Skill — Design Notes

## Scope

**In scope (v1 of the skill):** Finite, solvable work — things with a clear "done" state.
**Out of scope (future):** Open-ended/experiment mode (indefinite loops, auto-generating next phases).

## Decisions Made

1. **Global skill** — lives in `~/.claude/skills/ralph/`, invocable from any project
2. **Single skill with automatic intent routing** — detects create / modify / run / verify from natural language
3. **Subdirectory name**: `.wiggum/`
4. **Loop goal**: finish everything in the spec (with user approval before starting)
5. **Hybrid execution model**: Claude Code creates + supervises `loop.sh`, which spawns headless `claude -p` runs. Claude Code is the orchestrator, headless instances are the workers.
6. **Log granularity**: one trace per headless run (each `claude -p` invocation)
7. **Git**: init repo if needed, commit per phase
8. **Spec verification is two-stage**:
   - **Pre-loop**: vet generated specs for quality/completeness BEFORE starting. Assume the human may not review them.
   - **Post-loop**: verify implementation matches specs after work is done.
9. **Modify = add new phases** to the plan
10. **Skill has internal subdirectories** with sub-prompts for each route
11. **`--dangerously-skip-permissions`**: accepted for now, address for distribution later
12. **Progress monitoring**: loop.sh writes to a progress file after each iteration; Claude Code checks in periodically
13. **One `.wiggum/` per project** — no parallel loops
14. **Versioned snapshots**: when a version completes, archive to `.wiggum/archive/vN/`
15. **ROADMAP.md is organic**: current version is detailed, future vision is directional (not specced), past versions are noted with what they delivered. If user knows future versions up front, capture the direction — but don't spec them out until the current version is done.
16. **Skill proactively asks "what's next?"** when a version finishes
17. **No open-ended/experiment mode** for now — all work is finite with a clear done state

## Architecture

### Skill file structure (global)
```
~/.claude/skills/ralph/
  SKILL.md              # Main entry — intent detection + routing
  prompts/
    create.md           # Scaffolding a new loop from user intent
    run.md              # Supervising loop.sh execution
    modify.md           # Adding new phases to an existing loop
    verify.md           # Vetting specs ↔ implementation (pre + post)
    cleanup.md          # Archiving completed version + prompting what's next
```

### Workspace structure (per-project)
```
my-project/
  src/                        # User's existing project files (untouched)
  .wiggum/
    ROADMAP.md                # Product vision — current version detailed, future directional
    SPECS/
      project_spec.md
    IMPLEMENTATION_PLAN.md
    COMPLETED.md
    AGENTS.md
    loop.sh                   # Generated, tailored to this project
    prompts/                  # Generated prompt files for headless runs
      loop.md
      commit.md
      cleanup.md
    logs/
      run-001.md              # Trace from headless run 1
      run-002.md
      progress.md             # Current status (updated by loop.sh after each iteration)
    archive/
      v1/
        SPECS/
        COMPLETED.md
        IMPLEMENTATION_PLAN.md
        logs/
        summary.md            # What v1 delivered
```

### ROADMAP.md structure

```markdown
# Product Roadmap

## Vision
[High-level description of where this product is going]

## Current: v2 — [Name]
[Detailed description — this is what's being built right now]
See: SPECS/project_spec.md, IMPLEMENTATION_PLAN.md

## Completed
- **v1 — [Name]**: [What it delivered, 1-2 sentences]. See: archive/v1/summary.md

## Future Direction
- **v3 (tentative)**: [Directional sketch — not specced out, just where we're headed]
- **v4 (tentative)**: [Even more vague — just a direction]
```

Key properties:
- Current version is the only one with detailed specs and a plan
- Past versions link to their archive summaries
- Future versions are directional sketches — enough to influence current architecture decisions (e.g., "v3 will add multi-tenancy" means v1 shouldn't hardcode single-tenant assumptions), but NOT specced out
- Gets updated every time a version completes or a new version starts

### Intent routing

```
/ralph build a todo app          → CREATE (no .wiggum/ exists)
/ralph add user authentication   → MODIFY (.wiggum/ exists, new work described)
/ralph run                       → RUN (.wiggum/ exists, unchecked tasks)
/ralph verify                    → VERIFY (check specs ↔ code)
/ralph v2: add collaboration     → VERSION (.wiggum/ exists, all tasks done, new version described)
/ralph                           → ASK (no args, prompt user)
```

Detection heuristic:
- No `.wiggum/` directory → **CREATE**
- `.wiggum/` exists + args describe new work + unchecked tasks remain → **MODIFY**
- `.wiggum/` exists + "run" or minimal args + unchecked tasks exist → **RUN**
- "verify" / "check" / "review" language → **VERIFY**
- `.wiggum/` exists + all tasks done + new work described → **VERSION** (archive current, scaffold next)
- `.wiggum/` exists + all tasks done + no args → **ASK** ("v1 is complete! What's next?")

### How the loop runs (hybrid model)

**Claude Code (the supervisor):**
1. Reads `.wiggum/IMPLEMENTATION_PLAN.md` and `.wiggum/SPECS/`
2. Runs **pre-loop spec verification** — checks quality, completeness, traceability
3. Presents spec verification results to user, gets approval to proceed
4. Kicks off `.wiggum/loop.sh` via Bash (in background)
5. Periodically checks `.wiggum/logs/progress.md` for status updates
6. When loop.sh finishes (all tasks done):
   - Runs **post-loop spec verification** — checks implementation matches specs
   - Reports results to user
   - Asks: "All done! Want to plan the next version?"

**loop.sh (the worker manager):**
1. Reads `IMPLEMENTATION_PLAN.md`, counts unchecked tasks
2. For each iteration:
   - Spawns `claude --dangerously-skip-permissions -p "$(cat prompts/loop.md)"`
   - Captures full output to `logs/run-NNN.md`
   - Checks for COMPLETE signal
   - Updates `logs/progress.md` with current status
3. After each phase completes (all tasks in a phase checked):
   - Commits changes with descriptive message
4. When all tasks done:
   - Runs cleanup (archive completed phases to COMPLETED.md)
   - Exits

**Headless Claude (the worker):**
1. Reads specs, plan, and conventions (fresh context each time)
2. Picks up first unchecked task
3. Implements it
4. Runs quality gates (lint, build, test)
5. Checks off the task, adds changelog entry
6. Outputs COMPLETE (or doesn't, if stuck)

### Spec verification (two-stage)

**Pre-loop (before any code is written):**
- Read all specs in `.wiggum/SPECS/`
- Check for:
  - **Completeness**: are all features described with enough detail to implement?
  - **Ambiguity**: are there requirements that could be interpreted multiple ways?
  - **Contradictions**: do any specs conflict with each other?
  - **Missing edge cases**: what happens on errors, empty states, boundaries?
  - **Traceability**: does every task in the plan map to a spec requirement? Are there spec requirements with no corresponding task?
- Produce a quality report
- Flag issues for the user (or auto-fix if confident)
- Goal: specs should be good enough that a headless Claude with no human oversight can implement correctly

**Post-loop (after implementation):**
- Read specs + read implemented code
- Produce checklist: "Spec says X → Code does/doesn't do X"
- Report gaps, drift, or unimplemented requirements
- Can be run standalone (`/ralph verify`) or automatically after loop completes

### Version lifecycle

1. **Create** (`/ralph build a todo app`):
   - Scaffold `.wiggum/`
   - Generate specs, plan, agents, loop.sh, prompts
   - Generate `ROADMAP.md` with v1 detailed + future direction if known
   - Run pre-loop spec verification

2. **Run** (`/ralph run`):
   - Pre-loop spec verification (if not already done)
   - User approval
   - Execute loop.sh
   - Monitor progress
   - Post-loop spec verification
   - Report results

3. **Version complete** (all tasks done):
   - Archive current version to `.wiggum/archive/vN/`
   - Generate `archive/vN/summary.md`
   - Update `ROADMAP.md` (move current to completed, promote future direction)
   - Ask user: "v1 is done! What's next for v2?"

4. **New version** (`/ralph v2: add collaboration`):
   - Read roadmap + previous archive for context
   - Generate new specs and plan for v2
   - Update ROADMAP.md (v2 is now current)
   - Reset COMPLETED.md for fresh v2 tracking
   - Ready to run

## Open Questions

### Hook mechanism for progress updates
- How does loop.sh signal Claude Code that an iteration finished?
- Current thinking: loop.sh writes to `logs/progress.md` after each iteration. Claude Code tails or polls this file.
- Alternative: loop.sh could touch a sentinel file, or write to stdout that Claude Code captures from the background process.

### Skill invocation name
- `/ralph` — confirmed? Or something else?

### What goes in `.gitignore`
- Should `.wiggum/logs/` be gitignored? (traces could be large)
- Should `.wiggum/` itself be gitignored? (probably not — the specs and plan are valuable to keep in version control)
- Recommendation: gitignore `logs/` but keep everything else tracked

### Create flow details
- How many questions should the skill ask before scaffolding?
- Should it be opinionated (suggest defaults, let user override) or thorough (ask about everything)?
- Current thinking: be opinionated, ask minimal questions, bias toward action
