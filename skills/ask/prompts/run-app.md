# Run Ask Webapp

Start the webapp for this project.

## Steps

1. Check if `.agents/ask/app/` exists. If not, run `init-app.md` first.

2. Check if the Python API server is already running:
```bash
lsof -i :3100 | grep LISTEN
```
If not running, start it:
```bash
python3 ~/.claude/skills/ask/scripts/server.py --port 3100 --dir "$(pwd)" &
```

3. Check if the Next.js dev server is already running:
```bash
lsof -i :3101 | grep LISTEN
```
If not running, start it:
```bash
cd .agents/ask/app && bun run dev &
```

4. Wait a moment for both servers to start, then open:
```bash
open http://localhost:3101
```

5. Tell the user: "Ask webapp running at http://localhost:3101. API server on port 3100."

## Stopping

To stop both servers:
```bash
lsof -t -i :3100 | xargs kill 2>/dev/null
lsof -t -i :3101 | xargs kill 2>/dev/null
```
