# Iterate — Fork and Evolve

You are forking a prototype version with a new design direction.

## Context

- User's direction: `$ARGUMENTS`
- Manifest: `.design/manifest.json`

## Steps

1. **Resolve which family and version to fork from.**
   - Default: whatever `current` points to in the manifest
   - If the user references a specific family by name (e.g., "go back to the sidebar one"), match against family names/slugs/descriptions and fork from the latest version of that family
   - If the user references a specific version (e.g., "v1 was better, try from there"), fork from that version instead of the latest
   - Update `current` to point to the family being forked (it may have changed)
   - **Read `manifest.sections`** for context: sections with `"focus": true` represent the concepts the user is actively exploring. Mention what other focused concepts exist when generating the fork — this gives the subagent awareness of the broader design space.

2. **Read the source prototype** at `.design/studio/app/prototypes/<family>/v<N>/page.tsx`.

3. **Gather feedback from Agentation** — if the agentation MCP tools are available (`agentation_get_all_pending`, `agentation_get_session`, etc.), check for pending annotations. These contain element-specific visual feedback the user left in-browser (selectors, bounding boxes, notes). Include them as context for the subagent.

4. **Create directory:** `.design/studio/app/prototypes/<family>/v<N+1>/`

5. **Generate v(N+1)** by spawning a subagent (general-purpose) with this task:

   > Fork this prototype into a new version at `.design/studio/app/prototypes/<family>/v<N+1>/page.tsx`.
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
   > - Same constraints: `"use client"`, self-contained, react + next/link + lucide-react only
   > - Use CSS variable tokens (bg-surface-1, text-text-primary, etc.)
   > - Keep the back-to-gallery link
   > - Target 500-800 lines
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

9. **Report:** Always end with a clickable link to every page that was created or changed. Read the port from `.design/manifest.json` settings. Format:

   > **New version:** [<family name> v<N+1>](http://localhost:<port>/prototypes/<family>/v<N+1>)
   > **Forked from:** [v<N>](http://localhost:<port>/prototypes/<family>/v<N>)

   Briefly mention what feedback was addressed and what changed.

## Constraints

- If `$ARGUMENTS` is empty, ask the user what direction they want before proceeding.
- Always include the full current code in the subagent prompt — the subagent has no prior context.
- If agentation MCP is not available, that's fine — proceed with just the user's direction text.
