#!/bin/bash
# Ralph Wiggum Loop - Bash Option
# Usage: ./loop.sh [max_iterations]
#
# Requires: Claude Code CLI installed (`claude` command available)
# Run from repo root directory

set -e

MAX_ITERATIONS=${1:-25}
ITERATION=0
PROMPT_FILE="ralph_prompts/LOOP.md"
COMMIT_PROMPT_FILE="ralph_prompts/COMMIT.md"

# Ensure we're in repo root
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Error: $PROMPT_FILE not found. Run this script from repo root."
    exit 1
fi

echo "Starting Ralph loop (max $MAX_ITERATIONS iterations)"
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
        
        exit 0
    fi

    # Brief pause between iterations
    sleep 2
done

echo ""
echo "=========================================="
echo "Max iterations ($MAX_ITERATIONS) reached without completion"
exit 1
