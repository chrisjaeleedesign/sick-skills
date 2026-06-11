# Create — New Prototype Family

You are creating a new prototype family from a design description.

## Context

- Design intent from user: `$ARGUMENTS`
- Manifest location: `.agents/design/projects/<project>.json` (update via API only; root `manifest.json` is legacy)
- Prototypes live at: `.agents/design/studio/app/prototypes/<slug>/v<N>/page.tsx`

## Steps

1. **Derive slug** from the description (e.g., "mobile chat layout" → `mobile-chat-layout`). Keep it short, lowercase, hyphenated.

2. **Create the directory:** `.agents/design/studio/app/prototypes/<slug>/v1/`

3. **Generate the prototype** by spawning a subagent (general-purpose) with this task:

   > Write a self-contained React component (default export) at `.agents/design/studio/app/prototypes/<slug>/v1/page.tsx`.
   >
   > [Include all requirements from [_prototype-constraints.md](_prototype-constraints.md)]
   > - Design direction: [insert user's description]
   >
   > This is a design exploration — be creative, opinionated, and bold. This is NOT production code. Prioritize visual impact and feel over engineering correctness.

4. **Compile the prototype:**
   ```bash
   cd .agents/design/studio && bun build.ts <slug> 1
   ```
   This is a transient build (~1s) that emits the static bundle the server
   serves. If it fails, fix the prototype code before continuing — the build
   error is usually a syntax/import problem in page.tsx.

5. **Update manifest via the API** (server must be running — see [run.md](run.md)):
   ```bash
   curl -s -X POST http://localhost:3001/api/manifest \
     -H "Content-Type: application/json" \
     -d '{"action": "add-family", "family": {
       "name": "Human-readable name",
       "slug": "<slug>",
       "description": "<user'"'"'s description>",
       "createdAt": "<ISO timestamp>",
       "versions": [{
         "number": 1,
         "direction": "<user'"'"'s description>",
         "parentVersion": null,
         "starred": false,
         "references": [],
         "createdAt": "<ISO timestamp>"
       }]
     }}'
   curl -s -X POST http://localhost:3001/api/manifest \
     -H "Content-Type: application/json" \
     -d '{"action": "set-current", "family": "<slug>", "version": 1}'
   ```
   `add-family` assigns the slug to the focused section automatically.

   Do NOT write `.agents/design/manifest.json` directly — that file is a
   LEGACY artifact. The canonical manifest lives at
   `.agents/design/projects/<project>.json` and the API is the only safe way
   to update it. (A past session wrote to the legacy file and the new
   families silently never appeared in the gallery.)

   **Section ordering:** Sections are rendered in array order (newest first). Use `{"action": "add-section", "section": {...}}` to create a section — it prepends automatically.

6. **Capture screenshot:** Follow [_capture.md](_capture.md) to screenshot the new prototype. Save to `.agents/design/references/<slug>-v1.png` and add to the version's `references` array.

7. **Report:**

   > **Created:** [<family name> v1](http://localhost:<port>/prototypes/<slug>/v1)

   Remind the user they can use the Agentation toolbar to leave visual feedback directly on the prototype.

8. **Journal capture**

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
