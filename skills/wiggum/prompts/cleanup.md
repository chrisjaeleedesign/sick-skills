# Cleanup — Version Archival & Transition

Archive the completed version and prepare for the next.

User's request: $ARGUMENTS

## Step 1: Determine Version Number

1. Check if `.wiggum/archive/` exists and list any version directories (v1, v2, v3...)
2. If no archive directory exists, this is v1 completing
3. Current version number = count of existing archive versions + 1

Let `CURRENT_V` = the version being archived (e.g., "v1")
Let `NEXT_V` = the next version (e.g., "v2")

## Step 2: Verify All Tasks Complete

Read `.wiggum/IMPLEMENTATION_PLAN.md` and confirm all tasks are checked (`[x]`).
If unchecked tasks remain, tell the user:
> There are still N unchecked tasks. Complete them first with `/wiggum run`, or manually check them off if they're no longer needed.

Then stop.

## Step 3: Archive Current Version

Create `.wiggum/archive/$CURRENT_V/` with these contents:

1. **Copy specs**: Copy the entire `.wiggum/SPECS/` directory → `.wiggum/archive/$CURRENT_V/SPECS/`
2. **Copy plan**: Copy `.wiggum/IMPLEMENTATION_PLAN.md` → `.wiggum/archive/$CURRENT_V/IMPLEMENTATION_PLAN.md`
3. **Copy completed**: Copy `.wiggum/COMPLETED.md` → `.wiggum/archive/$CURRENT_V/COMPLETED.md`
4. **Copy logs**: Copy all `.wiggum/logs/*.md` files → `.wiggum/archive/$CURRENT_V/logs/` (skip if no logs exist)
5. **Generate summary**: Create `.wiggum/archive/$CURRENT_V/summary.md`:

```markdown
# $CURRENT_V Summary — [Version Name from ROADMAP.md]

## What Was Built
[Summarize from specs and completed work — what this version delivered]

## Key Decisions
[Notable technical or design decisions made during implementation, drawn from changelog entries]

## Known Issues / Tech Debt
[Any issues noted in changelogs, skipped tasks, or incomplete edge cases]

## Stats
- Phases completed: [N]
- Tasks completed: [N]
- Iterations run: [from progress.md if available]
```

## Step 4: Update ROADMAP.md

Edit `.wiggum/ROADMAP.md`:

1. Read the current version name from the `## Current:` section
2. Add or update a `## Completed` section with the archived version:
   ```
   ## Completed
   - **$CURRENT_V — [Name]**: [1-2 sentence summary of what it delivered]. See: archive/$CURRENT_V/summary.md
   ```
3. If there was a "Future Direction" entry that matches the next version, promote it to be ready for the Current section (but don't fill in Current yet — the create flow will do that)
4. Keep the `## Vision` section unchanged (or update if the user's request implies a vision change)

## Step 5: Reset Working Files

1. **Reset `.wiggum/IMPLEMENTATION_PLAN.md`**:
   ```markdown
   # Implementation Plan

    > **Wiggum Loop Rule**: Each iteration completes at least one full phase. The worker may combine the next phase if it's small and tightly coupled.

   ---

   _Plan will be generated for the next version._

   ---

   ## Changelog

   _Updated by Wiggum loop iterations._
   ```

2. **Reset `.wiggum/COMPLETED.md`**:
   ```markdown
   # Completed Phases

   _Phases are archived here as they complete during loop execution._
   ```

3. **Clear `.wiggum/logs/`**: Remove all log files from `.wiggum/logs/` (they're preserved in the archive)

4. **Keep unchanged**: `.wiggum/AGENTS.md`, `.wiggum/loop.sh`, `.wiggum/prompts/` — these carry forward

## Step 6: Commit the Archive

Stage and commit all changes:
```
git add .wiggum/
git commit -m "Archive $CURRENT_V — [version name]"
```

## Step 7: Handover

If `$ARGUMENTS` describes the next version (contains feature descriptions, or starts with "v2:", "v3:", "next:"):

> **$CURRENT_V archived!** Summary at `.wiggum/archive/$CURRENT_V/summary.md`.
>
> Now scaffolding $NEXT_V...

Then hand off to the CREATE flow — the calling SKILL.md will route to `prompts/create.md` with the new version context. The create flow will read the archive and roadmap, generate new specs and plan, and update ROADMAP.md.

If `$ARGUMENTS` is empty or doesn't describe the next version:

> **$CURRENT_V archived!** Summary at `.wiggum/archive/$CURRENT_V/summary.md`.
>
> What would you like to build for $NEXT_V? Describe the next version and I'll scaffold it:
> `/wiggum v2: [describe what's next]`
