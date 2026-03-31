# Init Ask Webapp

Set up the webapp for the first time in this project.

## Steps

1. Check if `.agents/ask/app/` already exists. If so, skip — it's already initialized.

2. Copy the scaffold:
```bash
cp -r ~/.claude/skills/ask/scaffold/ .agents/ask/app/
```

3. Install dependencies:
```bash
cd .agents/ask/app && bun install
```

4. Add `.agents/ask/` to the project's `.gitignore` if not already there.

5. Confirm to the user: "Webapp initialized at `.agents/ask/app/`. Run it with `/ask run`."
