# Init — First-Time Setup

You are setting up a `.design/` workspace in the user's project.

## Steps

1. **Copy scaffold** from this skill's `scaffold/` directory into `.design/`:
   - The scaffold mirrors the full `.design/` directory structure
   - Read each file from the scaffold and write it to the corresponding path under `.design/`
   - Top-level files: `manifest.json`, `journal-conventions.md`
   - Top-level directories: `references/` (with `.gitkeep`), `studio/`
   - Studio config files: `studio/package.json`, `studio/next.config.ts`, `studio/postcss.config.mjs`, `studio/tsconfig.json`
   - Studio app files: `studio/app/globals.css`, `studio/app/layout.tsx`, `studio/app/page.tsx`, `studio/app/gallery.tsx`, `studio/app/family-card.tsx`, `studio/app/journal-modal.tsx`
   - Studio lib files: `studio/app/lib/manifest.ts`, `studio/app/lib/constants.ts`, `studio/app/lib/journal.ts`
   - Studio API routes: `studio/app/api/manifest/route.ts`, `studio/app/api/journal/route.ts`, `studio/app/api/screenshot/[family]/[version]/route.ts`
   - Studio prototypes: `studio/app/prototypes/layout.tsx`, `studio/app/prototypes/example-dashboard/v1/page.tsx`

2. **Install dependencies:**
   ```bash
   cd .design/studio && bun install
   ```

3. **Update .gitignore:** Append `.design/` to the project's `.gitignore` if not already present.

4. **Report:** Tell the user their design workspace is ready. Mention `/design-studio run` to start the server at localhost:3001.

5. **Chain:** If the original `$ARGUMENTS` contained design intent (not just "init" or empty), proceed to [create.md](create.md) with that intent.

## Constraints

- Do NOT start the dev server automatically. The user will do that via `/design-studio run`.
- Keep output brief. One status line per step, then the summary.
