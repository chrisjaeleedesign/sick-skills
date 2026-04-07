# Status — Show Current State

Show the user what conversations and projects exist.

## Steps

1. Check if `.agents/chat/` exists. If not, tell the user to run `/ask` to set up.

2. Check if the dev server is running: `lsof -i :3002`

3. List conversations from `.agents/model-calls/`:
   ```bash
   ls -la .agents/model-calls/*.jsonl 2>/dev/null | wc -l
   ```
   Read the first line (metadata) of each to get titles, projects, and exchange counts.

4. Report in a concise table:
   - Number of conversations
   - Projects and conversation counts
   - Server status (running/stopped)
   - URL if running
