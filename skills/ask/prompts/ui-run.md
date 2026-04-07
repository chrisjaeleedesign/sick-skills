# Run — Start the Chat Server

You are starting the chat dev server so the user can chat in their browser.

## Steps

1. Check if the chat port is already in use: `lsof -i :3002`
2. If in use → tell the user the chat UI is already running at `http://localhost:3002`
3. If not → start the dev server:
   ```bash
   cd .agents/chat && npm run dev
   ```
   Run this in the background.
4. Report: "Chat UI running at http://localhost:3002"
