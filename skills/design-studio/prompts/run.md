# Run — Start the Studio Server

You are starting the design studio server so the user can browse prototypes.

The studio uses a compile-on-write architecture: prototypes are prebuilt
static bundles (see `build.ts`), and the server is a small Node process
(`server.ts`, ~60MB RSS) that serves them plus the JSON API. There is no
dev server and no compiler process.

## Steps

1. **Start Agentation MCP** (if not already running): verify `agentation_list_sessions` is available. If not, run `npx agentation-mcp server &` in the background. This must be running for the visual feedback loop to work.

2. **Check for an existing server (including orphans):**
   ```bash
   lsof -iTCP:3001 -sTCP:LISTEN
   ```
   If something is listening → tell the user the studio is already running at `http://localhost:3001`.

3. If not → start the server:
   ```bash
   cd .agents/design/studio && bun run serve
   ```
   Run this in the background. (`serve` re-bundles `server.ts` in ~20ms, then runs it under Node — better-sqlite3 doesn't load under Bun.)

   *Legacy installs:* if `server.ts` doesn't exist, this is a pre-rebuild
   Next.js install — use `bun run dev` instead and warn the user it is
   RAM-heavy (Turbopack).

4. Report: "Studio running at http://localhost:3001"

5. Remind the user:
   - Every prototype includes the Agentation toolbar for visual feedback — click any element to annotate it.
   - **The server exits by itself after 15 idle minutes** (RAM hygiene). This is intentional, not a crash — run `/design-studio run` again to restart it. `STUDIO_IDLE_MS` overrides the timeout.

## Constraints

- Never start the legacy Next dev server when `server.ts` exists.
- Don't leave extra server processes running — one listener on :3001.
