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
- **Completeness**: Are features detailed enough for a headless worker agent to implement?
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
> - **Note**: This runs the worker configured in `.wiggum/loop.sh` (default: Claude CLI; override via `WIGGUM_WORKER_CMD` with a command that accepts a prompt file path).
>
> Proceed?

Wait for explicit user confirmation before proceeding. Do NOT start the loop without approval.

## Step 4: Execute Loop

1. Make sure `.wiggum/loop.sh` is executable: run `chmod +x .wiggum/loop.sh`
2. Start the loop as a background process and persist PID/logs:
   - `mkdir -p .wiggum/logs`
   - `bash .wiggum/loop.sh > .wiggum/logs/loop-live.log 2>&1 & echo $! > .wiggum/logs/loop.pid`
3. Tell the user the loop has started and report the PID from `.wiggum/logs/loop.pid`
4. Use the Read tool to read `.wiggum/logs/progress.md` periodically to monitor status
5. Check whether the process is still running with `ps -p "$(cat .wiggum/logs/loop.pid)"`
6. Report significant milestones to the user (phase completions, task counts, blocked state)

## Step 5: Post-loop

When the loop finishes (progress.md shows ALL COMPLETE, shows BLOCKED, or the background process exits):

1. Read `.wiggum/logs/progress.md` for final status
2. Read `.wiggum/logs/loop-live.log` for worker output summary and any errors
3. Read the project source code and `.wiggum/SPECS/project_spec.md`
4. Run **post-loop spec verification**:
   - For each spec requirement, check if the implementation matches
   - Produce a checklist: "Spec says X → Code does/doesn't do X"
   - Report gaps, drift, or unimplemented requirements
5. Report results to the user:

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
