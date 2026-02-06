# Prompt: Cleanup Implementation Plan

You are a technical documentation assistant. Your task is to clean up `IMPLEMENTATION_PLAN.md` by archiving completed tasks to `COMPLETED.md`.

## Instructions

1.  **Analyze `IMPLEMENTATION_PLAN.md`**:
    *   Find all **fully completed phases**. A phase is fully completed if *all* its checkboxes are marked as `[x]`.
    *   Ignore the "Changelog" section (do not move it).

2.  **Move to `COMPLETED.md`**:
    *   For each fully completed phase, move its entire Markdown block (Header down to the next header) to the bottom of `COMPLETED.md`.
    *   Ensure double newlines between phases for readability.
    *   **CRITICAL**: Do NOT include the "Changelog" section in the move.

3.  **Update `IMPLEMENTATION_PLAN.md`**:
    *   Remove the moved phases from `IMPLEMENTATION_PLAN.md`.
    *   Ensure the file remains valid Markdown with the "Changelog" section intact.
    *   Leave any *incomplete* phases (unchecked items) in `IMPLEMENTATION_PLAN.md`.
    *   Ensure the structure remains: `# Implementation Plan` > `> Ralph Loop Rule` > `---` > `[Remaining Phases]` > `---` > `## Changelog`.

4.  **Summary**:
    *   If you moved anything, output "Archived X phases to COMPLETED.md".
    *   If nothing was moved, output "No completed phases to archive".

5.  **Commit**:
    *   If changes were made, stage both files and commit with message: "Archive completed phases to COMPLETED.md".
