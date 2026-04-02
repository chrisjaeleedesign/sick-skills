# Iterate — Fork and Evolve

You are forking a prototype version with a new design direction.

## Context

- User's direction: `$ARGUMENTS`
- Manifest: `.agents/design/manifest.json`

## Steps

1. **Resolve which family and version to fork from.**
   - Default: whatever `current` points to in the manifest
   - If the user references a specific family by name (e.g., "go back to the sidebar one"), match against family names/slugs/descriptions and fork from the latest version of that family
   - If the user references a specific version (e.g., "v1 was better, try from there"), fork from that version instead of the latest
   - Update `current` to point to the family being forked (it may have changed)
   - **Read `manifest.sections`** for context: sections with `"focus": true` represent the concepts the user is actively exploring. Mention what other focused concepts exist when generating the fork — this gives the subagent awareness of the broader design space.

2. **Read the source prototype** at `.agents/design/studio/app/prototypes/<family>/v<N>/page.tsx`.

3. **Gather feedback from Agentation** — if the agentation MCP tools are available (`agentation_get_all_pending`, `agentation_get_session`, etc.), check for pending annotations. These contain element-specific visual feedback the user left in-browser (selectors, bounding boxes, notes). Include them as context for the subagent.

4. **Create directory:** `.agents/design/studio/app/prototypes/<family>/v<N+1>/`

5. **Generate v(N+1)** by spawning a subagent (general-purpose) with this task:

   > Fork this prototype into a new version at `.agents/design/studio/app/prototypes/<family>/v<N+1>/page.tsx`.
   >
   > Current code (v<N>):
   > [include full current page.tsx]
   >
   > Visual feedback from Agentation (if any):
   > [include pending annotations — element selectors, positions, user notes]
   >
   > New direction: [user's $ARGUMENTS]
   >
   > Requirements:
   > - Address specific element feedback from Agentation annotations (they include CSS selectors and bounding boxes pointing to exact elements)
   > - Apply the user's new direction
   > [Include all requirements from [_prototype-constraints.md](_prototype-constraints.md)]
   >
   > Be bold with the direction. This is iteration — the user wants to see meaningful change, not subtle tweaks.

6. **Acknowledge annotations:** If agentation annotations were consumed, use `agentation_resolve` or `agentation_acknowledge` to mark them as handled.

7. **Update manifest:** Add v(N+1) to the family's versions array:
   ```json
   {
     "number": N+1,
     "direction": "<user's direction>",
     "parentVersion": N,
     "starred": false,
     "references": [],
     "createdAt": "<ISO timestamp>"
   }
   ```
   Update `current` to `{ "family": "<family>", "version": N+1 }`.

8. **Capture screenshot:** Follow [capture.md](capture.md) to screenshot the new version.

   After capturing, save the screenshot to the bank:
   ```bash
   # Create a bank item for the screenshot
   RESPONSE=$(curl -s -X POST http://localhost:<port>/api/thoughts \
     -H "Content-Type: application/json" \
     -d "{\"action\":\"create-thought\",\"thought\":{\"kind\":\"reference\",\"source_type\":\"prototype\",\"family\":\"<family>\",\"body\":\"<Family Name> v<N+1> screenshot\",\"tags\":[\"screenshot\",\"auto-captured\"]}}")
   THOUGHT_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
   # Add screenshot as attachment
   curl -s -X POST http://localhost:<port>/api/thoughts \
     -H "Content-Type: application/json" \
     -d "{\"action\":\"add-attachment\",\"thought_id\":\"${THOUGHT_ID}\",\"attachment\":{\"kind\":\"image\",\"url\":\"references/<family>-v<N+1>.png\",\"label\":\"<Family Name> v<N+1> screenshot\"}}"
   # Trigger vision analysis (non-blocking)
   curl -s -X POST http://localhost:<port>/api/thoughts/analyze-image \
     -H "Content-Type: application/json" \
     -d "{\"thought_id\":\"${THOUGHT_ID}\"}" &
   ```

9. **Log to journal:** Run from `.agents/design/studio/`:
   ```bash
   cd .agents/design/studio && npx tsx scripts/journal-log.ts --table event --type iterated \
     --body "Iterated <family name> v<source> → v<new> — <direction>" \
     --family <slug> --tags "iterated,v<new>"
   ```
   If the user provided explicit feedback that prompted this iteration (e.g., "too busy", "I prefer the sidebar approach"), also log a reaction insight:
   ```bash
   cd .agents/design/studio && npx tsx scripts/journal-log.ts --table insight --type reaction \
     --body "<user's feedback that prompted this change>" \
     --family <slug> --tags "feedback" --status active
   ```

10. **Capture thoughts:** If the user's direction includes philosophical or aesthetic ideas (beyond element-specific feedback), save them as thoughts linked to the family via the thoughts API (see SKILL.md "Proactive Thought Capture"). Also check Agentation annotations — if any contain broader ideas (not just "move this button"), capture those as thoughts too.

    Examples of what to capture:
    - "Try making it feel more organic, less grid-based" → observation, tags: [aesthetic, layout]
    - "I think the key insight is that navigation IS content" → principle, tags: [navigation, ux]
    - User's Agentation annotation says "this whole approach feels too corporate" → observation, tags: [aesthetic, feedback]

    Skip for purely mechanical feedback ("make the font bigger", "swap these two elements").

11. **Report:** Always end with a clickable link to every page that was created or changed. Read the port from `.agents/design/manifest.json` settings. Format:

   > **New version:** [<family name> v<N+1>](http://localhost:<port>/prototypes/<family>/v<N+1>)
   > **Forked from:** [v<N>](http://localhost:<port>/prototypes/<family>/v<N>)

   Briefly mention what feedback was addressed and what changed.

## Constraints

- If `$ARGUMENTS` is empty, ask the user what direction they want before proceeding.
- Always include the full current code in the subagent prompt — the subagent has no prior context.
- If agentation MCP is not available, that's fine — proceed with just the user's direction text.
