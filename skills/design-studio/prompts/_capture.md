# Capture — Screenshot (Internal Subroutine)

This is an internal helper called by create.md and iterate.md. Not a user-facing command.

You are capturing a screenshot of the current prototype to use as a visual reference.

## Steps

1. **Check if studio is running:** `lsof -i :3001`
   - If not running → warn the user: "Studio not running — screenshot skipped. Run `/design-studio run` first for thumbnails."

2. **Determine device preset** based on the design work just done:
   - Mobile layout/design → `--device mobile`
   - Tablet layout/design → `--device tablet`
   - Laptop-specific work → `--device laptop`
   - Default (most work) → omit flag (defaults to desktop)

3. **Run capture script:**
   ```bash
   cd .agents/design/studio && npx tsx scripts/capture.ts --family <slug> --version <N> [--device <preset>]
   ```
   This launches headless Chromium, navigates to the prototype in bare capture mode (no Design Studio chrome), and saves a clean screenshot. The capture script automatically creates a journal entry with the screenshot attached.

4. **Read the screenshot** using the Read tool so it's in conversation context — this lets the agent (and user) see what was generated.

## Fallback

If the capture script fails (e.g., Playwright not installed), fall back to manual browser automation:
- Navigate to `http://localhost:3001/prototypes/<family>/v<N>?capture=true`
- Take a screenshot and save to `.agents/design/references/<family>-v<N>.png`

## Constraints

- You MUST attempt a screenshot after generating a prototype.
- Don't block the parent flow on screenshot failure.
