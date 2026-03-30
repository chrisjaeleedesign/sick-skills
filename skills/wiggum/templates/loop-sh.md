# loop.sh Template

This is the reference template for generating `.agents/wiggum/loop.sh`. The create flow should write this script to the project's `.agents/wiggum/loop.sh` and make it executable.

## Script

```bash
#!/bin/bash
# Wiggum Loop — Headless worker execution
# Usage: .agents/wiggum/loop.sh [max_iterations]
#
# Runs from .agents/wiggum/ directory, executes a configurable worker in PROJECT_ROOT.
# Worker options:
#   - Default: Claude CLI (`claude` command)
#   - Override: set WIGGUM_WORKER_CMD to a command that accepts one argument: prompt file path

set -euo pipefail

# Allow nested Claude CLI invocations (when loop.sh is launched from within a Claude Code session).
# Claude Code sets a CLAUDECODE env var and refuses to start if it detects one, to prevent
# accidental nested sessions. Since our workers are intentionally separate processes, unset it.
unset CLAUDECODE 2>/dev/null || true

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MAX_ITERATIONS=${1:-25}
MAX_REVIEW_ROUNDS=3
ITERATION=0
WIGGUM_WORKER_CMD=${WIGGUM_WORKER_CMD:-claude}

PROMPT_FILE="$SCRIPT_DIR/prompts/loop.md"
CLEANUP_PROMPT_FILE="$SCRIPT_DIR/prompts/cleanup.md"
REVIEW_PROMPT_FILE="$SCRIPT_DIR/prompts/review.md"
HOLISTIC_REVIEW_PROMPT_FILE="$SCRIPT_DIR/prompts/holistic-review.md"
LOG_DIR="$SCRIPT_DIR/logs"
PLAN_FILE="$SCRIPT_DIR/IMPLEMENTATION_PLAN.md"
PROGRESS_FILE="$LOG_DIR/progress.md"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Init git if needed
cd "$PROJECT_ROOT"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git init
    git add .
    git commit -m "Initial commit (before wiggum loop)"
fi

# Validate prompt file
for required_file in "$PROMPT_FILE" "$CLEANUP_PROMPT_FILE" "$REVIEW_PROMPT_FILE" "$HOLISTIC_REVIEW_PROMPT_FILE" "$PLAN_FILE"; do
    if [ ! -f "$required_file" ]; then
        echo "Error: required file not found: $required_file"
        exit 1
    fi
done

if ! command -v "$WIGGUM_WORKER_CMD" >/dev/null 2>&1; then
    echo "Error: worker command not found: $WIGGUM_WORKER_CMD"
    echo "Set WIGGUM_WORKER_CMD to an installed command."
    exit 1
fi

run_worker() {
    local prompt_file="$1"

    if [ "$WIGGUM_WORKER_CMD" = "claude" ]; then
        claude --dangerously-skip-permissions -p "$(cat "$prompt_file")"
        return
    fi

    "$WIGGUM_WORKER_CMD" "$prompt_file"
}

echo "Starting Wiggum loop (max $MAX_ITERATIONS iterations)"
echo "Project: $PROJECT_ROOT"
echo "Worker command: $WIGGUM_WORKER_CMD"
echo "=========================================="

# Track which phase we're in for phase-level commits
LAST_COMPLETED_PHASE=""

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    RUN_LOG="$LOG_DIR/run-$(printf '%03d' $ITERATION).md"

    echo ""
    echo ">>> Iteration $ITERATION of $MAX_ITERATIONS"
    echo "-------------------------------------------"

    # Run worker from project root
    cd "$PROJECT_ROOT"
    OUTPUT=$(run_worker "$PROMPT_FILE" 2>&1) || true

    # Save run log
    {
        echo "# Run $ITERATION"
        echo ""
        echo "**Timestamp**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo ""
        echo "## Output"
        echo ""
        echo "$OUTPUT"
    } > "$RUN_LOG"

    echo "$OUTPUT"

    # Check for BLOCKED signal
    if echo "$OUTPUT" | grep -qE "^BLOCKED:"; then
        BLOCKED_REASON=$(echo "$OUTPUT" | grep -E "^BLOCKED:" | sed -n '1p' | sed 's/^BLOCKED:[[:space:]]*//')
        if [ -z "$BLOCKED_REASON" ]; then
            BLOCKED_REASON="Worker reported blocked state"
        fi

        echo ""
        echo "[x] Worker reported BLOCKED: $BLOCKED_REASON"

        REMAINING=$(grep -c "^\- \[ \]" "$PLAN_FILE" 2>/dev/null) || REMAINING=0
        COMPLETED_COUNT=$(grep -c "^\- \[x\]" "$PLAN_FILE" 2>/dev/null) || COMPLETED_COUNT=0
        TOTAL=$((REMAINING + COMPLETED_COUNT))

        {
            echo "# Wiggum Loop Progress"
            echo ""
            echo "**Last updated**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
            echo "**Iteration**: $ITERATION of $MAX_ITERATIONS"
            echo "**Tasks**: $COMPLETED_COUNT / $TOTAL completed ($REMAINING remaining)"
            echo "**Status**: BLOCKED"
            echo "**Blocker**: $BLOCKED_REASON"
        } > "$PROGRESS_FILE"

        exit 2
    fi

    # Check for COMPLETE signal
    TASK_COMPLETED=false
    if echo "$OUTPUT" | grep -qE "^COMPLETE$"; then
        echo ""
        echo "[+] Task completed at iteration $ITERATION"
        TASK_COMPLETED=true
    else
        echo ""
        echo "[!] No COMPLETE signal — check for errors above"
    fi

    # Only check phase completion and commit when a task actually completed
    if [ "$TASK_COMPLETED" = true ]; then
        # Determine current completed phase (highest phase where all tasks are [x])
        CURRENT_PHASE=""
        cd "$PROJECT_ROOT"
        while IFS= read -r phase_line; do
            phase_name=$(echo "$phase_line" | sed 's/^## //')
            # Extract phase section (from this header to the next ## header)
            phase_section=$(sed -n "/^## ${phase_name//\//\\/}$/,/^## /p" "$PLAN_FILE" | sed '$ d')
            if echo "$phase_section" | grep -q "^\- \[ \]"; then
                break  # Found incomplete phase, stop
            fi
            if echo "$phase_section" | grep -q "^\- \[x\]"; then
                CURRENT_PHASE="$phase_name"
            fi
        done < <(grep "^## Phase" "$PLAN_FILE")

        # Phase-level commit: commit when a new phase completes
        if [ -n "$CURRENT_PHASE" ] && [ "$CURRENT_PHASE" != "$LAST_COMPLETED_PHASE" ]; then
            # Review sub-loop: re-run until clean or max rounds
            REVIEW_ROUND=0
            while [ $REVIEW_ROUND -lt $MAX_REVIEW_ROUNDS ]; do
                REVIEW_ROUND=$((REVIEW_ROUND + 1))

                echo ""
                echo "[~] Review: $CURRENT_PHASE (round $REVIEW_ROUND/$MAX_REVIEW_ROUNDS)..."
                cd "$PROJECT_ROOT"
                REVIEW_OUTPUT=$(run_worker "$REVIEW_PROMPT_FILE" 2>&1) || true
                echo "$REVIEW_OUTPUT"

                # Save review log
                REVIEW_LOG="$LOG_DIR/review-$(printf '%03d' $ITERATION)-r${REVIEW_ROUND}.md"
                {
                    echo "# Review: $CURRENT_PHASE — Round $REVIEW_ROUND"
                    echo ""
                    echo "**Timestamp**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
                    echo ""
                    echo "$REVIEW_OUTPUT"
                } > "$REVIEW_LOG"

                # Break if clean
                if echo "$REVIEW_OUTPUT" | grep -q "^REVIEW: Clean$"; then
                    echo "[+] Review clean (round $REVIEW_ROUND)"
                    break
                fi
                echo "[!] Review made fixes — re-reviewing..."
            done

            if [ $REVIEW_ROUND -eq $MAX_REVIEW_ROUNDS ] && ! echo "$REVIEW_OUTPUT" | grep -q "^REVIEW: Clean$"; then
                echo "[!] Max review rounds reached — proceeding to commit"
            fi

            # Review prompt handles committing when clean — no separate commit step needed

            # Re-read plan to find highest completed phase (worker may have done multiple)
            LAST_COMPLETED_PHASE=""
            while IFS= read -r phase_line; do
                phase_name=$(echo "$phase_line" | sed 's/^## //')
                phase_section=$(sed -n "/^## ${phase_name//\//\\/}$/,/^## /p" "$PLAN_FILE" | sed '$ d')
                if echo "$phase_section" | grep -q "^\- \[ \]"; then
                    break
                fi
                if echo "$phase_section" | grep -q "^\- \[x\]"; then
                    LAST_COMPLETED_PHASE="$phase_name"
                fi
            done < <(grep "^## Phase" "$PLAN_FILE")
        fi
    fi

    # Update progress file
    REMAINING=$(grep -c "^\- \[ \]" "$PLAN_FILE" 2>/dev/null) || REMAINING=0
    COMPLETED_COUNT=$(grep -c "^\- \[x\]" "$PLAN_FILE" 2>/dev/null) || COMPLETED_COUNT=0
    TOTAL=$((REMAINING + COMPLETED_COUNT))
    {
        echo "# Wiggum Loop Progress"
        echo ""
        echo "**Last updated**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
        echo "**Iteration**: $ITERATION of $MAX_ITERATIONS"
        echo "**Tasks**: $COMPLETED_COUNT / $TOTAL completed ($REMAINING remaining)"
        echo "**Last completed phase**: ${CURRENT_PHASE:-None yet}"
        echo "**Status**: $([ "$REMAINING" -eq 0 ] && echo "ALL COMPLETE" || echo "IN PROGRESS")"
    } > "$PROGRESS_FILE"

    # Check if all tasks are done
    if ! grep -q "^\- \[ \]" "$PLAN_FILE" 2>/dev/null; then
        echo ""
        echo "=========================================="
        echo "All tasks complete at iteration $ITERATION!"

        # Holistic review: full-app check before cleanup
        if [ -f "$HOLISTIC_REVIEW_PROMPT_FILE" ]; then
            HOLISTIC_ROUND=0
            while [ $HOLISTIC_ROUND -lt $MAX_REVIEW_ROUNDS ]; do
                HOLISTIC_ROUND=$((HOLISTIC_ROUND + 1))

                echo ""
                echo "[~] Holistic review (round $HOLISTIC_ROUND/$MAX_REVIEW_ROUNDS)..."
                cd "$PROJECT_ROOT"
                HOLISTIC_OUTPUT=$(run_worker "$HOLISTIC_REVIEW_PROMPT_FILE" 2>&1) || true
                echo "$HOLISTIC_OUTPUT"

                HOLISTIC_LOG="$LOG_DIR/holistic-r${HOLISTIC_ROUND}.md"
                {
                    echo "# Holistic Review — Round $HOLISTIC_ROUND"
                    echo ""
                    echo "**Timestamp**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
                    echo ""
                    echo "$HOLISTIC_OUTPUT"
                } > "$HOLISTIC_LOG"

                if echo "$HOLISTIC_OUTPUT" | grep -q "^REVIEW: Clean$"; then
                    echo "[+] Holistic review clean (round $HOLISTIC_ROUND)"
                    break
                fi
                echo "[!] Holistic review made fixes — re-reviewing..."
            done

            if [ $HOLISTIC_ROUND -eq $MAX_REVIEW_ROUNDS ] && ! echo "$HOLISTIC_OUTPUT" | grep -q "^REVIEW: Clean$"; then
                echo "[!] Max holistic review rounds reached — proceeding"
            fi

            # Commit holistic fixes directly
            if [ -n "$(git status --porcelain .)" ]; then
                echo "[->] Committing holistic review fixes..."
                cd "$PROJECT_ROOT"
                git add .
                git commit -m "Holistic review fixes"
            fi
        fi

        # Run cleanup (archive completed phases to COMPLETED.md)
        echo "Running cleanup..."
        cd "$PROJECT_ROOT"
        run_worker "$CLEANUP_PROMPT_FILE" 2>&1 || true

        # Final commit
        if [ -n "$(git status --porcelain .)" ]; then
            git add .
            git commit -m "Wiggum loop complete — all phases finished"
        fi

        # Update progress
        {
            echo "# Wiggum Loop Progress"
            echo ""
            echo "**Last updated**: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
            echo "**Iteration**: $ITERATION of $MAX_ITERATIONS"
            echo "**Tasks**: $TOTAL / $TOTAL completed (0 remaining)"
            echo "**Status**: ALL COMPLETE"
        } > "$PROGRESS_FILE"

        exit 0
    fi

    # Brief pause between iterations
    sleep 2
done

echo ""
echo "=========================================="
echo "Max iterations ($MAX_ITERATIONS) reached without completion"
exit 1
```

## Key Adaptations from Original

1. **Path resolution**: `SCRIPT_DIR` is `.agents/wiggum/`, `PROJECT_ROOT` is its parent
2. **Worker runs from PROJECT_ROOT**: `cd "$PROJECT_ROOT"` before running `run_worker`
3. **Logs to `.agents/wiggum/logs/`**: Each run saved as `run-NNN.md`
4. **Progress file**: Updated after each iteration at `.agents/wiggum/logs/progress.md`
5. **Phase-level commits**: Detects phase boundaries instead of committing per task
6. **Git init**: Checks and initializes git if needed
7. **Worker-agnostic execution**: `WIGGUM_WORKER_CMD` supports commands beyond Claude
8. **Blocked-state handling**: Worker can output `BLOCKED: ...` to stop loop early with clear status
9. **Nested session fix**: `unset CLAUDECODE` allows launching Claude CLI workers from within a Claude Code session
