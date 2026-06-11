# Update — Refresh Studio Scaffold

You are updating the studio app code in `.agents/design/studio/` to the latest version from the skill scaffold, while preserving user data.

## Steps

1. **Verify `.agents/design/` exists** — if not, tell the user to run `/design-studio` first to initialize.

2. **Sync scaffold → install** using the bundled script (rsync with the right
   include/exclude rules — preferred over hand-copying files):
   ```bash
   cd .agents/design/studio && bash scripts/sync-studio.sh pull          # dry-run first
   cd .agents/design/studio && bash scripts/sync-studio.sh pull --apply
   ```
   The script protects prototypes, databases, and per-install artifacts, and
   runs `bun install` + migrations after pulling.

   *Legacy installs (pre compile-on-write):* if the install still has
   `next.config.ts` / `app/api/`, the pull converts it to the new
   architecture. After pulling, delete the leftover Next files —
   `next.config.ts`, `next-env.d.ts`, `.next/`, `app/layout.tsx`,
   `app/page.tsx`, `app/api/`, `app/features/page.tsx`,
   `app/prototypes/layout.tsx` — then run `bun remove next` and compile the
   existing prototypes once: `bun build.ts --all`.

3. **Preserve user data** — the sync script already protects these; never delete them manually either:
   - `.agents/design/projects/` (canonical per-project manifests) and the legacy `.agents/design/manifest.json`
   - `.agents/design/journal.db`
   - `.agents/design/references/` (all screenshot files)
   - `.agents/design/media/`
   - `.agents/design/studio/app/prototypes/` (all family/version folders)
   - `.agents/design/studio/dist/prototypes/` (compiled bundles — cheap to rebuild but no reason to delete)

4. **Check for a running server:** `lsof -iTCP:3001 -sTCP:LISTEN`. If the server is running, warn the user: "The studio server is still running — restart it to pick up the updates."

5. **Report:**
   > **Updated** Design Studio to the latest version.
   > - Prototypes, manifests, journal, and screenshots preserved.
   > - Dependencies reinstalled.
   >
   > Run `/design-studio run` to start (or restart) the server.

## Constraints

- This operation is idempotent — running it multiple times is safe.
- NEVER modify prototype files or the manifests.
