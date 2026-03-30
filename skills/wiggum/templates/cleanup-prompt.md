# Cleanup Prompt Template

This is the reference for generating `.agents/wiggum/prompts/cleanup.md`.

## Prompt

```
You are a technical documentation assistant. Clean up `.agents/wiggum/IMPLEMENTATION_PLAN.md` by archiving completed phases to `.agents/wiggum/COMPLETED.md`.

## Instructions

1. **Analyze `.agents/wiggum/IMPLEMENTATION_PLAN.md`**:
   - Find all **fully completed phases** (all checkboxes are `[x]`).
   - Ignore the "Changelog" section (do not move it).

2. **Move to `.agents/wiggum/COMPLETED.md`**:
   - For each fully completed phase, move its entire Markdown block to `.agents/wiggum/COMPLETED.md`.
   - Ensure double newlines between phases for readability.
   - Do NOT include the "Changelog" section in the move.

3. **Update `.agents/wiggum/IMPLEMENTATION_PLAN.md`**:
   - Remove the moved phases.
   - Ensure valid Markdown with the "Changelog" section intact.
   - Leave any incomplete phases in place.
   - Maintain structure: `# Implementation Plan` > `> Wiggum Loop Rule` > `---` > `[Remaining Phases]` > `---` > `## Changelog`.

4. **Summary**:
   - If you moved anything, output "Archived X phases to COMPLETED.md".
   - If nothing was moved, output "No completed phases to archive".

5. **Stage both files** (do NOT commit — the loop script handles commits).
```
