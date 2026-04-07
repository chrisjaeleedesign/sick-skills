# Init — First-Time Chat UI Setup

You are setting up the browser chat workspace in `.agents/chat/`.

## Steps

1. **Copy scaffold** from this skill's `scaffold/chat/` directory into `.agents/chat/`:
   - Read each file from the scaffold and write it to the corresponding path under `.agents/chat/`
   - Config files: `package.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`
   - App files: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
   - Lib files: `app/lib/config.ts`, `app/lib/conversations.ts`, `app/lib/hooks.ts`, `app/lib/messages.ts`, `app/lib/types.ts`
   - Provider files: `app/lib/providers/openai.ts`, `app/lib/providers/openrouter.ts`
   - API routes: `app/api/chat/route.ts`, `app/api/conversations/route.ts`, `app/api/models/route.ts`
   - Components: `app/components/chat-input.tsx`, `app/components/message-bubble.tsx`, `app/components/message-list.tsx`, `app/components/model-picker.tsx`, `app/components/sidebar.tsx`

2. **Copy config.yaml** from this skill's root into `.agents/chat/config.yaml` — the web app needs it to resolve model aliases.

3. **Install dependencies:**
   ```bash
   cd .agents/chat && npm install
   ```

4. **Update .gitignore:** Append `.agents/chat/` to the project's `.gitignore` if not already present (but NOT `.agents/model-calls/` — conversations should be trackable).

5. **Report:** Tell the user their chat workspace is ready. Mention `/ask open` to start the server at localhost:3002.

6. **Chain:** If the original `$ARGUMENTS` implied wanting to run the UI (or was empty), proceed to [ui-run.md](ui-run.md).

## Constraints

- Keep output brief. One status line per step, then the summary.
