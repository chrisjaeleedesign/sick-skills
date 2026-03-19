# Run — Start the Studio Server

You are starting the design studio dev server so the user can browse prototypes.

## Steps

1. Check if port 3001 is already in use: `lsof -i :3001`
2. If in use → tell the user the studio is already running at `http://localhost:3001`
3. If not → start the dev server:
   ```bash
   cd .design/studio && bun run dev
   ```
   Run this in the background.
4. Report: "Studio running at http://localhost:3001"
5. Remind the user that every prototype includes the Agentation toolbar for visual feedback — click any element to annotate it.
