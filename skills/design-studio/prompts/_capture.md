# Capture — Screenshot (Internal Subroutine)

This is an internal helper called by create.md and iterate.md. Not a user-facing command.

You are capturing a screenshot of the current prototype to use as a visual reference.

## Steps

1. **Make sure the prototype is compiled and the server is running:**
   ```bash
   lsof -iTCP:3001 -sTCP:LISTEN
   ```
   - If not running → start it per [run.md](run.md), or warn the user: "Studio not running — screenshot skipped. Run `/design-studio run` first for thumbnails."

2. **Determine device preset** based on the design work just done:
   - Mobile layout/design → `--device mobile`
   - Tablet layout/design → `--device tablet`
   - Laptop-specific work → `--device laptop`
   - Default (most work) → omit flag (defaults to desktop)

3. **Run the capture script:**
   ```bash
   cd .agents/design/studio && bun run capture --family <slug> --version <N> [--device <preset>] [--project <slug>]
   ```
   This bundles `scripts/capture.ts` for Node (transient), launches headless Chromium, navigates to the prototype in bare capture mode (no studio chrome), saves a clean screenshot to `.agents/design/references/`, and creates a journal entry with the screenshot attached (deduplicated by `prototype://{project}/{family}/v{version}`).

4. **Read the screenshot** using the Read tool so it's in conversation context — this lets the agent (and user) see what was generated.

## Fallback

If the capture script fails (e.g., Playwright's Chromium not installed), use browser automation (claude-in-chrome) instead:
- Navigate to `http://localhost:3001/prototypes/<family>/v<N>?capture=true`
- Take a screenshot and save to `.agents/design/references/<family>-v<N>.png`
- Then create the journal entry manually per [_journal-entry.md](_journal-entry.md) (the script normally does this for you).

Do NOT auto-install Playwright's Chromium — it's a ~450MB download that pegs all cores. Ask the user first.

## Constraints

- You MUST attempt a screenshot after generating a prototype.
- Don't block the parent flow on screenshot failure.
