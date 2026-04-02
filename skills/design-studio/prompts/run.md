# Run — Start the Studio Server

You are starting the design studio dev server so the user can browse prototypes.

## Steps

1. **Start Agentation MCP** (if not already running): verify `agentation_list_sessions` is available. If not, run `npx agentation-mcp server &` in the background. This must be running for the visual feedback loop to work.

2. Check if the studio port is already in use: `lsof -i :3001`
3. If in use → tell the user the studio is already running at `http://localhost:3001`
4. If not → start the dev server:
   ```bash
   cd .agents/design/studio && bun run dev
   ```
   Run this in the background.
5. Report: "Studio running at http://localhost:3001"
6. Remind the user that every prototype includes the Agentation toolbar for visual feedback — click any element to annotate it.
