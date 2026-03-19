# Init — First-Time Setup

You are setting up a `.design/` workspace in the user's project.

## Steps

1. **Create directories:**
   - `.design/`
   - `.design/references/`
   - `.design/studio/` (the gallery app)

2. **Copy scaffold files** from this skill's `scaffold/` directory into `.design/studio/`:
   - Read each file from the skill's scaffold directory and write it to `.design/studio/`
   - Files to copy: `package.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/gallery.tsx`, `app/family-card.tsx`, `app/lib/manifest.ts`, `app/api/manifest/route.ts`, `app/api/screenshot/[family]/[version]/route.ts`
   - Copy the `app/prototypes/example-dashboard/` directory with its example prototype
   - Create the `app/prototypes/` directory for user prototypes

3. **Write manifest:** Copy `templates/manifest.json` to `.design/manifest.json`

4. **Install dependencies:**
   ```bash
   cd .design/studio && bun install
   ```

5. **Update .gitignore:** Append `.design/` to the project's `.gitignore` if not already present.

6. **Report:** Tell the user their design workspace is ready. Mention `/design-studio run` to start the server at localhost:3001.

7. **Chain:** If the original `$ARGUMENTS` contained design intent (not just "init" or empty), proceed to [create.md](create.md) with that intent.

## Constraints

- Do NOT start the dev server automatically. The user will do that via `/design-studio run`.
- Keep output brief. One status line per step, then the summary.
