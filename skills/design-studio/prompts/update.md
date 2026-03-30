# Update — Refresh Studio Scaffold

You are updating the studio app code in `.agents/design/studio/` to the latest version from the skill scaffold, while preserving user data.

## Steps

1. **Verify `.agents/design/` exists** — if not, tell the user to run `/design-studio` first to initialize.

2. **Copy scaffold files** from this skill's `scaffold/` directory, overwriting existing studio infrastructure:
   - Read each file from the scaffold and write it to the corresponding path under `.agents/design/`
   - **Files to update:** `studio/package.json`, `studio/next.config.ts`, `studio/postcss.config.mjs`, `studio/tsconfig.json`, `studio/app/globals.css`, `studio/app/layout.tsx`, `studio/app/page.tsx`, `studio/app/gallery.tsx`, `studio/app/family-card.tsx`, `studio/app/journal-modal.tsx`, `studio/app/lib/manifest.ts`, `studio/app/lib/constants.ts`, `studio/app/lib/journal.ts`, `studio/app/lib/grid.ts`, `studio/app/lib/db.ts`, `studio/app/api/manifest/route.ts`, `studio/app/api/journal/route.ts`, `studio/app/api/journal/meta/route.ts`, `studio/app/api/screenshot/[family]/[version]/route.ts`, `studio/app/prototypes/layout.tsx`, `studio/scripts/capture.ts`, `studio/scripts/journal-log.ts`, `journal-conventions.md`

3. **Preserve user data** — do NOT overwrite:
   - `.agents/design/manifest.json`
   - `.agents/design/journal.db`
   - `.agents/design/journal.jsonl`
   - `.agents/design/references/` (all screenshot files)
   - `.agents/design/studio/app/prototypes/` (all prototype subdirectories — do NOT touch any family/version folders, but DO update `studio/app/prototypes/layout.tsx`)
   - `.agents/design/studio/app/lib/seed-data.ts` (if exists)

4. **Install dependencies:**
   ```bash
   cd .agents/design/studio && bun install
   ```

5. **Check for running server:** Run `lsof -i :<port>` using the port from `.agents/design/manifest.json` settings. If the server is running, warn the user: "The studio server is still running — restart it to pick up the updates."

6. **Report:**
   > **Updated** Design Studio to the latest version.
   > - Prototypes, manifest, journal, and screenshots preserved.
   > - Dependencies reinstalled.
   >
   > Run `/design-studio run` to start (or restart) the server.

## Constraints

- This operation is idempotent — running it multiple times is safe.
- NEVER modify prototype files or the manifest.
- If `.agents/design/journal.jsonl` exists but `.agents/design/journal.db` doesn't, the migration will happen automatically when the server starts (handled by `db.ts`).
