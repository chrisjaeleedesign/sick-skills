#!/bin/bash
# Ralph Wiggum Loop - Bash Option
# Usage: ./loop.sh [--experiment] [max_iterations]
#
# Requires: Claude Code CLI installed (`claude` command available)
# Run from repo root directory
#
# Flags:
#   --experiment  When all tasks complete, generate new experiment phases
#                 and continue looping instead of exiting.

set -e

# Parse arguments
EXPERIMENT_MODE=false
MAX_ITERATIONS=25

for arg in "$@"; do
    case $arg in
        --experiment)
            EXPERIMENT_MODE=true
            ;;
        *)
            MAX_ITERATIONS=$arg
            ;;
    esac
done

ITERATION=0
PROMPT_FILE="ralph_prompts/LOOP.md"
COMMIT_PROMPT_FILE="ralph_prompts/COMMIT.md"
EXPERIMENT_PROMPT_FILE="ralph_prompts/EXPERIMENT_NEXT.md"

# Ensure we're in repo root
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found. Run this script from repo root."
    exit 1
fi

if [ "$EXPERIMENT_MODE" = true ]; then
    echo "Starting Ralph loop in EXPERIMENT mode (max $MAX_ITERATIONS iterations)"
else
    echo "Starting Ralph loop (max $MAX_ITERATIONS iterations)"
fi
echo "=========================================="

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
    ITERATION=$((ITERATION + 1))
    echo ""
    echo ">>> Iteration $ITERATION of $MAX_ITERATIONS"
    echo "-------------------------------------------"

    # Run Claude Code with the prompt file content
    OUTPUT=$(claude --dangerously-skip-permissions -p "$(cat "$PROMPT_FILE")" 2>&1) || true

    echo "$OUTPUT"

    # Check for completion signal (COMPLETE on its own line)
    if echo "$OUTPUT" | grep -qE "^COMPLETE$"; then
        echo ""
        echo "[✓] Task completed at iteration $ITERATION"

        # Commit changes if any exist
        if [ -n "$(git status --porcelain)" ]; then
            echo "[→] Committing changes..."
            claude --dangerously-skip-permissions -p "$(cat "$COMMIT_PROMPT_FILE")" 2>&1 || true
        fi
    else
        echo ""
        echo "[!] No COMPLETE signal - check for errors above"
    fi

    # Check if all tasks are done
    if ! grep -q "^\- \[ \]" IMPLEMENTATION_PLAN.md 2>/dev/null; then
        echo ""
        echo "=========================================="
        echo "All checkboxes complete at iteration $ITERATION"

        # Run cleanup
        echo "Running plan cleanup..."
        claude --dangerously-skip-permissions -p "$(cat ralph_prompts/CLEANUP.md)" 2>&1 || true

        if [ "$EXPERIMENT_MODE" = true ]; then
            # Experiment mode: generate new phases and continue
            echo ""
            echo "=========================================="
            echo "Experiment mode: generating next phase..."
            claude --dangerously-skip-permissions -p "$(cat "$EXPERIMENT_PROMPT_FILE")" 2>&1 || true

            # Verify new tasks were generated
            if grep -q "^\- \[ \]" IMPLEMENTATION_PLAN.md 2>/dev/null; then
                echo "[✓] New experiment phase generated — continuing loop"
            else
                echo "[!] No new tasks generated — exiting experiment loop"
                exit 0
            fi
        else
            # Build mode: exit
            exit 0
        fi
    fi

    # Brief pause between iterations
    sleep 2
done

echo ""
echo "=========================================="
echo "Max iterations ($MAX_ITERATIONS) reached without completion"
exit 1
