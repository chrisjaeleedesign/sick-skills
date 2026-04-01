# prompt-tester init

First-time setup for the prompt tester workspace.

## Steps

1. **Check if already initialized.** If `.agents/prompt-tester/app/` exists, skip setup and tell the user: "Prompt tester already initialized. Run with `/prompt-tester run`."

2. **Copy the scaffold.**
   ```bash
   mkdir -p .agents/prompt-tester
   cp -r ~/.claude/skills/prompt-tester/scaffold/ .agents/prompt-tester/app/
   ```

3. **Install dependencies.**
   ```bash
   cd .agents/prompt-tester/app && bun install
   ```

4. **Create data directories.**
   ```bash
   mkdir -p .agents/prompt-tester/prompts .agents/prompt-tester/scenarios .agents/prompt-tester/runs
   ```

5. **Add to .gitignore.** Check if `.agents/prompt-tester/` is already in `.gitignore`. If not, append it:
   ```bash
   echo '.agents/prompt-tester/' >> .gitignore
   ```

6. **Confirm.** Tell the user: "Prompt tester initialized. Run with `/prompt-tester run`."
