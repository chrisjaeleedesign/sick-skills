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
   > Requirements:
   > - `"use client"` directive at top
   > - Self-contained — all data inline, realistic content (no lorem ipsum)
   > - Imports allowed: `react`, `next/link`, `lucide-react` only. If `.agents/design/studio/app/lib/seed-data.ts` exists, import from `@/app/lib/seed-data` instead of inlining data.
   > - Use CSS variable tokens from the design system (e.g., `bg-surface-1`, `text-text-primary`, `border-border`)
   > - **Sizing: The prototype renders inside a scaled 1440×900 container. Root element MUST use `w-full h-full` — NEVER use viewport units (`100vh`, `h-screen`, `100dvh`, `100vw`, `min-h-screen`). Use `flex-1 overflow-y-auto` for scrollable regions.**
   > - Do NOT include a back-to-gallery link — the parent layout provides navigation
   > - Full interactivity: hover states, toggles, animations where appropriate
   > - Target 500-800 lines, rich and complete
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

5. **Capture screenshot:** Follow [capture.md](capture.md) to screenshot the new prototype. Save to `.agents/design/references/<slug>-v1.png` and add to the version's `references` array.

6. **Log to journal:** Run from `.agents/design/studio/`:
   ```bash
   cd .agents/design/studio && npx tsx scripts/journal-log.ts --table event --type created \
     --body "Created <family name> v1 — <direction>" \
     --family <slug> --tags "created,v1"
   ```
   Also log the design direction as an insight:
   ```bash
   cd .agents/design/studio && npx tsx scripts/journal-log.ts --table insight --type direction \
     --body "<user's design intent / description>" \
     --family <slug> --tags "<relevant comma-separated tags>" --status active
   ```

7. **Capture thoughts:** If the user's description includes design philosophy, aesthetic ideas, or principles (beyond just "make a sidebar layout"), save them as thoughts linked to the new family. Use the thoughts API (see SKILL.md "Proactive Thought Capture" section). Examples of what to capture:
   - "I want something that feels alive, not static" → observation, tags: [aesthetic, animation]
   - "Navigation should be contextual, not fixed" → principle, tags: [navigation, ux]
   - "Inspired by that Stripe dashboard" → reference, tags: [inspiration, dashboard]

   Skip this step if the user's description is purely functional with no philosophical/aesthetic content.

8. **Report:**

   > **Created:** [<family name> v1](http://localhost:<port>/prototypes/<slug>/v1)

   Remind the user they can use the Agentation toolbar to leave visual feedback directly on the prototype.

## Constraints

- One subagent for code generation. Don't generate the prototype inline — it's too context-heavy.
- The subagent should use the `frontend-design` skill pattern for quality if available, but self-contained output is the priority.
