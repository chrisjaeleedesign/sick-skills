# Run — Supervise Loop Execution

Supervise the execution of `.agents/wiggum/loop.sh` for the current project.

User's request: $ARGUMENTS

## Step 1: Pre-flight Check

1. Read `.agents/wiggum/IMPLEMENTATION_PLAN.md`
2. Count unchecked tasks (`- [ ]`) and completed tasks (`- [x]`)
3. List the phases and their completion status
4. Read `.agents/wiggum/SPECS/project_spec.md` to confirm what's being built

If no unchecked tasks remain, tell the user:
> All tasks are already complete! Run `/wiggum verify` to check the implementation, or `/wiggum v2: [next feature]` to start a new version.

Then stop.

## Step 2: Pre-loop Spec Verification

Read `.agents/wiggum/SPECS/project_spec.md` and `.agents/wiggum/IMPLEMENTATION_PLAN.md`.

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
> - **Note**: This runs the worker configured in `.agents/wiggum/loop.sh` (default: Claude CLI; override via `WIGGUM_WORKER_CMD` with a command that accepts a prompt file path).
>
> Proceed?

Wait for explicit user confirmation before proceeding. Do NOT start the loop without approval.

## Step 4: Launch Loop

1. Make sure `.agents/wiggum/loop.sh` is executable: run `chmod +x .agents/wiggum/loop.sh`
2. **Nested session fix**: Verify that `loop.sh` contains `unset CLAUDECODE` near the top. Claude Code sets a `CLAUDECODE` env var and refuses to launch if it detects one (to prevent accidental nesting). Since our workers are intentionally separate processes, this must be unset. If the line is missing, add `unset CLAUDECODE 2>/dev/null || true` after `set -euo pipefail`.
3. Start the loop as a background process and persist PID/logs:
   - `mkdir -p .agents/wiggum/logs`
   - `bash .agents/wiggum/loop.sh > .agents/wiggum/logs/loop-live.log 2>&1 & echo $! > .agents/wiggum/logs/loop.pid`
4. Tell the user the loop has started and report the PID from `.agents/wiggum/logs/loop.pid`

## Step 5: Active Monitoring

After launching, enter an active monitoring loop. Continue monitoring until the loop finishes, is blocked, or the user intervenes.

### Monitoring cycle

Run this cycle repeatedly, sleeping 2-3 minutes between checks:

1. **Process health**: `ps -p "$(cat .agents/wiggum/logs/loop.pid)" -o pid,state,etime,%cpu 2>/dev/null`
   - If process is dead → check exit code and logs, report to user, go to Step 6
2. **Task progress**: Count `- [x]` and `- [ ]` in `.agents/wiggum/IMPLEMENTATION_PLAN.md`
   - Record the count each cycle to detect stalls
3. **Log tail**: Read last 30 lines of `.agents/wiggum/logs/loop-live.log` for errors or status
4. **Report milestones**: When task count increases, tell the user what completed

### Stuck detection

A worker is **stuck** if ANY of these are true:

| Signal | Detection | Threshold |
|--------|-----------|-----------|
| **No progress** | Task count unchanged between checks | 3 consecutive checks (~6-9 min) with no change AND worker process has been running >15 min total |
| **Repeated errors** | Same error line appears 3+ times in last 50 lines of log | Immediate |
| **Zombie worker** | Process alive but <1% CPU for >10 min and no new log output | 2 consecutive checks |

**Known error patterns to watch for:**
- `Cannot be launched inside another Claude Code session` → missing `unset CLAUDECODE`
- `Error: worker command not found` → worker not installed
- `BLOCKED:` in output → worker self-reported block (this is handled by loop.sh, but monitor for it)
- Rapid iteration cycling with `[!] No COMPLETE signal` on every iteration → worker failing repeatedly

### Recovery procedure

When stuck is detected:

1. **Identify the stuck process**: Find the worker child process: `pgrep -P "$(cat .agents/wiggum/logs/loop.pid)"`
2. **Kill stuck processes**: Kill the worker child first, then the loop parent:
   ```
   kill <worker_pid>
   kill <loop_pid>
   ```
3. **Diagnose**: Read the last 100 lines of `.agents/wiggum/logs/loop-live.log` and identify the root cause
4. **Fix if possible**: Apply a fix if the issue is identifiable (e.g., add missing `unset CLAUDECODE`, fix a file permission, etc.)
5. **Report to user**: Tell the user what happened, what was stuck, and what you fixed
6. **Restart**: Relaunch the loop — it will pick up from the last checked-off task:
   ```
   bash .agents/wiggum/loop.sh > .agents/wiggum/logs/loop-live.log 2>&1 & echo $! > .agents/wiggum/logs/loop.pid
   ```
7. **Resume monitoring**: Go back to the monitoring cycle

If the same stuck condition recurs after 2 restart attempts, stop and ask the user for guidance instead of retrying indefinitely.

### Progress reporting

- **On milestone** (phase completion, review round): Report immediately
- **On stuck + recovery**: Report what happened and that you restarted
- **Periodic summary**: Every ~10 minutes if the user is present, give a brief status line (tasks done / total, current phase, elapsed time)
- **If user is away**: Minimize output, just track internally and report the full summary when they return or when the loop finishes

## Step 6: Post-loop

When the loop finishes (all tasks checked, progress.md shows ALL COMPLETE, BLOCKED signal, or the process exits cleanly):

1. Read `.agents/wiggum/logs/progress.md` for final status
2. Read `.agents/wiggum/logs/loop-live.log` for worker output summary and any errors
3. Read the project source code and `.agents/wiggum/SPECS/project_spec.md`
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
