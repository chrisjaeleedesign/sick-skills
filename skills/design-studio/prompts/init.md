# Init — First-Time Setup

You are setting up a `.agents/design/` workspace in the user's project.

## Steps

1. **Safety guard.** If `.agents/design/` already exists in the user's project,
   STOP. Tell the user: "Your project already has `.agents/design/`. Run
   `/design-studio` (the dispatcher will route to UPDATE) or remove the
   directory first." Do NOT overwrite an existing install.

2. **Copy the scaffold in one shot.** The skill's `scaffold/` directory mirrors
   the full `.agents/design/` layout exactly. Resolve `${SKILL_DIR}` as the
   directory containing this skill's `SKILL.md` (typically
   `~/.claude/skills/design-studio` or its symlink target). Then run:

   ```bash
   mkdir -p .agents
   cp -R "${SKILL_DIR}/scaffold/" .agents/design
   ```

   Notes:
   - The trailing slash on `scaffold/` is important — it copies the *contents*
     of scaffold into `.agents/design`, so you end up with
     `.agents/design/studio/...`, `.agents/design/manifest.json`, etc.
   - `cp -R` preserves `.gitkeep`, nested directories, and all files without
     enumeration. Never maintain a file list here; it drifts out of date with
     the scaffold (e.g. the scaffold renamed `journal` → `entries` without
     this prompt being updated, producing partial installs).
   - If `cp -R` fails (permission error, missing scaffold, etc.), surface the
     error verbatim and stop. Do not fall back to a partial manual copy.

3. **Install dependencies, but skip Playwright's browser download.**
   `scripts/capture.ts` uses Playwright to screenshot prototypes; the
   install-time browser download (~450MB Chromium) pegs all cores on Intel
   Macs for 5–10 minutes and nobody needs it until they actually run capture.

   ```bash
   cd .agents/design/studio
   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 bun install
   ```

   Tell the user:
   > "Skipped Playwright's Chromium download to keep install fast. If you
   > later want `bun run capture` to work, run
   > `cd .agents/design/studio && npx playwright install chromium` — budget
   > ~10 min on Intel Macs because the install pegs all cores."

4. **Update `.gitignore`.** Append `.agents/design/` if not already present
   (grep before appending, don't duplicate).

5. **Report.** One-line status per prior step, then a summary:
   "Design workspace ready at `.agents/design/`. Run `/design-studio run` to
   start the server at localhost:3001."

6. **Chain.** If the original `$ARGUMENTS` contained design intent (not just
   "init" or empty), proceed to [create.md](create.md) with that intent.

## Constraints

- Do NOT start the dev server automatically. The user controls that via
  `/design-studio run`.
- Keep output brief. One status line per step, then the summary.
- Do NOT bypass Step 1's existing-directory guard. Overwriting a real install
  destroys `manifest.json`, `journal.db`, and prototype work.
