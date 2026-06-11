# Iterate — Fork and Evolve

You are forking a prototype version with a new design direction.

## Context

- User's direction: `$ARGUMENTS`
- Manifest: read via `GET http://localhost:3001/api/manifest?project=<project>` (the canonical file is `.agents/design/projects/<project>.json`; root `manifest.json` is legacy — never write it directly)

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

7. **Compile the new version:**
   ```bash
   cd .agents/design/studio && bun build.ts <family> <N+1>
   ```
   Transient build (~1s). If it fails, fix page.tsx before continuing.

8. **Update manifest via the API:** fetch the current manifest, append the new version to the family's `versions` array, and POST it back:
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
   ```bash
   # POST {"families": <updated families record>} to /api/manifest?project=<project>
   # then:
   curl -s -X POST http://localhost:3001/api/manifest \
     -H "Content-Type: application/json" \
     -d '{"action": "set-current", "family": "<family>", "version": <N+1>}'
   ```

9. **Capture screenshot:** Follow [_capture.md](_capture.md) to screenshot the new version.

10. **Report:** Always end with a clickable link to every page that was created or changed. The port is 3001 unless the manifest settings say otherwise. Format:

   > **New version:** [<family name> v<N+1>](http://localhost:<port>/prototypes/<family>/v<N+1>)
   > **Forked from:** [v<N>](http://localhost:<port>/prototypes/<family>/v<N>)

   Briefly mention what feedback was addressed and what changed.

11. **Journal capture**

Before ending, review this conversation for journal-worthy moments. Read and follow [_journal-entry.md](_journal-entry.md) to create entries for any of:

- **Decisions** made during this session ("we're going with X direction")
- **Reactions** from the user (positive or negative) to what was created
- **Principles** or philosophies that emerged from the discussion
- **References** or inspiration the user shared
- **Questions** that remain open or unresolved
- **Pivots** or direction changes ("actually, let's try something different")

Create one entry per distinct idea. Set `project` to the current project and `family` to the prototype family if relevant. This is how the design story gets told — don't skip it.

## Constraints

- If `$ARGUMENTS` is empty, ask the user what direction they want before proceeding.
- Always include the full current code in the subagent prompt — the subagent has no prior context.
- If agentation MCP is not available, that's fine — proceed with just the user's direction text.
