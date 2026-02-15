# Run — Supervise Loop Execution

Supervise the execution of `.wiggum/loop.sh` for the current project.

User's request: $ARGUMENTS

## Step 1: Pre-flight Check

1. Read `.wiggum/IMPLEMENTATION_PLAN.md`
2. Count unchecked tasks (`- [ ]`) and completed tasks (`- [x]`)
3. List the phases and their completion status
4. Read `.wiggum/SPECS/project_spec.md` to confirm what's being built

If no unchecked tasks remain, tell the user:
> All tasks are already complete! Run `/wiggum verify` to check the implementation, or `/wiggum v2: [next feature]` to start a new version.

Then stop.

## Step 2: Pre-loop Spec Verification

Read `.wiggum/SPECS/project_spec.md` and `.wiggum/IMPLEMENTATION_PLAN.md`.

Perform a quick quality check:
- **Completeness**: Are features detailed enough for headless Claude to implement?
- **Ambiguity**: Any requirements that could be interpreted multiple ways?
- **Traceability**: Does every spec requirement have a plan task, and vice versa?

If CRITICAL issues found, report them and ask the user to resolve before proceeding.
If only WARNING/INFO issues, note them but proceed.

## Step 3: Get User Approval

Present the plan summary and ask for explicit approval:

> **Ready to run the Wiggum loop:**
> - **Tasks remaining**: N unchecked across M phases
> - **First uncompleted phase**: [Phase name and goal]
> - **Estimated iterations**: N (one per task)
> - **Note**: This runs `claude --dangerously-skip-permissions` in headless mode.
>
> Proceed?

Wait for explicit user confirmation before proceeding. Do NOT start the loop without approval.

## Step 4: Execute Loop

1. Make sure `.wiggum/loop.sh` is executable: run `chmod +x .wiggum/loop.sh`
2. Run `.wiggum/loop.sh` via Bash with `run_in_background: true` so the loop executes as a background process
3. Tell the user the loop has started and that they can check `.wiggum/logs/progress.md` for status
4. Use the Read tool to read `.wiggum/logs/progress.md` periodically to monitor status
5. Report significant milestones to the user (phase completions, task counts)
6. Use TaskOutput with the background task ID to check if the process has completed

## Step 5: Post-loop

When the loop finishes (progress.md shows ALL COMPLETE or the background process exits):

1. Read `.wiggum/logs/progress.md` for final status
2. Read the project source code and `.wiggum/SPECS/project_spec.md`
3. Run **post-loop spec verification**:
   - For each spec requirement, check if the implementation matches
   - Produce a checklist: "Spec says X → Code does/doesn't do X"
   - Report gaps, drift, or unimplemented requirements
4. Report results to the user:

> **Loop complete!**
> - **Iterations**: N
> - **Phases completed**: [list]
>
> **Spec verification**:
> [Per-requirement checklist summary]
>
> Next steps:
> - `/wiggum verify` for a detailed spec audit
> - `/wiggum v2: [next feature]` to plan the next version
