# Capture — Screenshot (Internal Subroutine)

This is an internal helper called by create.md and iterate.md. Not a user-facing command.

You are capturing a screenshot of the current prototype to use as a visual reference.

## Steps

1. **Check if studio is running:** `lsof -i :3001`
   - If not running → warn the user: "Studio not running — screenshot skipped. Run `/design-studio run` first for thumbnails."

2. **Take screenshot** using browser automation tools (claude-in-chrome or similar):
   - Navigate to the prototype URL (e.g., `http://localhost:3001/prototypes/<family>/v<N>`)
   - Wait for page to load
   - Capture full-page screenshot
   - Save to `.design/references/<family>-v<N>.png`

3. **Update manifest:** Add to the version's `references` array:
   ```json
   { "type": "screenshot", "path": "references/<family>-v<N>.png", "description": "Auto-captured after generation" }
   ```

4. **Read the screenshot** using the Read tool so it's in conversation context — this lets the agent (and user) see what was generated.

## Constraints

- You MUST capture a screenshot after generating a prototype. If browser automation tools are unavailable, warn the user that thumbnails will be missing for this version.
- Don't block the parent flow on screenshot failure.
