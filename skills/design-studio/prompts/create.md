# Create — New Prototype Family

You are creating a new prototype family from a design description.

## Context

- Design intent from user: `$ARGUMENTS`
- Manifest location: `.agents/design/manifest.json`
- Prototypes live at: `.agents/design/studio/app/prototypes/<slug>/v<N>/page.tsx`

## Steps

1. **Derive slug** from the description (e.g., "mobile chat layout" → `mobile-chat-layout`). Keep it short, lowercase, hyphenated.

2. **Create the directory:** `.agents/design/studio/app/prototypes/<slug>/v1/`

3. **Generate the prototype** by spawning a subagent (general-purpose) with this task:

   > Write a self-contained Next.js page component at `.agents/design/studio/app/prototypes/<slug>/v1/page.tsx`.
   >
   > [Include all requirements from [_prototype-constraints.md](_prototype-constraints.md)]
   > - Design direction: [insert user's description]
   >
   > This is a design exploration — be creative, opinionated, and bold. This is NOT production code. Prioritize visual impact and feel over engineering correctness.

4. **Update manifest:** Read `.agents/design/manifest.json`, add the new family and v1:
   ```json
   {
     "name": "Human-readable name",
     "slug": "<slug>",
     "description": "<user's description>",
     "createdAt": "<ISO timestamp>",
     "versions": [{
       "number": 1,
       "direction": "<user's description>",
       "parentVersion": null,
       "starred": false,
       "references": [],
       "createdAt": "<ISO timestamp>"
     }]
   }
   ```
   Set `current` to `{ "family": "<slug>", "version": 1 }`.

   Also add the new slug to a section's grid: if any section has `"focus": true`, find the first empty cell in that section (scan row 0 left-to-right, then row 1, etc.). Place the slug at that cell coordinate in the grid record. If the grid is full, increment the section's `rows` by 1 and place at `"newRow:0"`. If no sections exist, skip (the family will appear in Unsorted).

   If the manifest API supports `add-family` (POST with `{"action": "add-family", "family": {...}}`), use that instead of reading/writing the manifest file directly — it handles grid placement atomically.

   **Section ordering:** Sections are rendered in array order (newest first). When creating a new section, prepend it to the `sections` array (or use `{"action": "add-section", "section": {...}}` which prepends automatically).

5. **Capture screenshot:** Follow [_capture.md](_capture.md) to screenshot the new prototype. Save to `.agents/design/references/<slug>-v1.png` and add to the version's `references` array.

6. **Report:**

   > **Created:** [<family name> v1](http://localhost:<port>/prototypes/<slug>/v1)

   Remind the user they can use the Agentation toolbar to leave visual feedback directly on the prototype.

7. **Journal capture**

Before ending, review this conversation for journal-worthy moments. Read and follow [_journal-entry.md](_journal-entry.md) to create entries for any of:

- **Decisions** made during this session ("we're going with X direction")
- **Reactions** from the user (positive or negative) to what was created
- **Principles** or philosophies that emerged from the discussion
- **References** or inspiration the user shared
- **Questions** that remain open or unresolved
- **Pivots** or direction changes ("actually, let's try something different")

Create one entry per distinct idea. Set `project` to the current project and `family` to the prototype family if relevant. This is how the design story gets told — don't skip it.

## Constraints

- One subagent for code generation. Don't generate the prototype inline — it's too context-heavy.
- The subagent should use the `frontend-design` skill pattern for quality if available, but self-contained output is the priority.
