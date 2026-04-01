# prompt-tester run

Start the prompt tester servers and open the webapp.

## Starting

1. **Check if initialized.** If `.agents/prompt-tester/app/` does not exist, run init first (`/prompt-tester init`).

2. **Start the Python API server** (port 3200). Check if already running:
   ```bash
   lsof -i :3200 | grep LISTEN
   ```
   If not running:
   ```bash
   python3 ~/.claude/skills/prompt-tester/scripts/tester.py --port 3200 --dir "$(pwd)" &
   ```

3. **Start the Next.js webapp** (port 3201). Check if already running:
   ```bash
   lsof -i :3201 | grep LISTEN
   ```
   If not running:
   ```bash
   cd .agents/prompt-tester/app && bun run dev &
   ```

4. **Wait briefly** for servers to come up, then open the browser:
   ```bash
   open http://localhost:3201
   ```

5. **Tell the user:** "Prompt tester running at http://localhost:3201"

## Stopping

To stop both servers:
```bash
lsof -t -i :3200 | xargs kill 2>/dev/null
lsof -t -i :3201 | xargs kill 2>/dev/null
```
