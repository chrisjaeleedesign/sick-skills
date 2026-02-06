# Prompt: Generate Next Experiment Phase

You are running in experiment mode. A phase of tasks has just been completed. Your job is to analyze what was learned and generate the next experiment phase.

## Instructions

1. **Read context:**
   - Read all `SPECS/*.md` files for the hypothesis, evaluation criteria, and project context.
   - Read `COMPLETED.md` for results from all completed phases (if it exists).
   - Read `IMPLEMENTATION_PLAN.md` for the current state of the plan.

2. **Analyze results:**
   - What worked? What didn't?
   - Which direction looks most promising based on the data?
   - Are we closer to validating or invalidating the hypothesis?

3. **Generate next phase:**
   - Append a new Phase to `IMPLEMENTATION_PLAN.md` (after the `---` separator, before the `## Changelog` section).
   - Include 2-4 tasks that explore the most promising direction.
   - Each task should be atomic and testable.
   - Use the standard format:

   ```markdown
   ## Phase N — [Descriptive Name]

   > **Goal**: [What we expect to learn from this phase]

   - [ ] **[Area]**: [Actionable task]
       - [Technical details]
   - [ ] **Verify**: [How to evaluate results]
   ```

4. **Phase numbering:**
   - Read the last Phase number in `IMPLEMENTATION_PLAN.md` and increment by 1.

5. **Output:**
   - After appending the phase, output: "Generated Phase N: [brief description]"
