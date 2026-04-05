---
name: design-studio
description: "Create, iterate, and compare interactive UI prototypes in a visual gallery with Agentation feedback. Collect inspiration into a mood board bank with bento-grid boards. Map product features as a spatial graph. Use this skill whenever the user wants to: prototype or mockup a UI, explore or iterate on layouts and designs, vibe design, save reference images or screenshots to a mood board, organize inspiration into boards, browse a design gallery, map out product features, or visually compare design directions. Also triggers on: 'let me see some options', 'explore designs', 'try a different layout', 'save this to my board', 'show me what we have', 'I don't like this design', pasting images for design reference, or any mention of prototyping, UI exploration, design concepts, mockups, layout experiments, mood boards, inspiration banks, or feature mapping."
---

Portable design prototyping workspace. Creates a `.agents/design/` directory with a Next.js gallery, Agentation visual feedback, and a **feel → react → fork → feel** loop.

User's request: $ARGUMENTS

## Step 0: Ensure Agentation MCP is Running

**Before doing anything else**, verify the Agentation MCP server is available. This is critical — Agentation provides the visual feedback loop between the browser and the agent.

1. Check if agentation MCP tools are available (e.g., `agentation_list_sessions`). If they are, skip to Step 1.
2. If NOT available, start the Agentation MCP server:
   ```bash
   npx agentation-mcp server &
   ```
   Wait a moment for it to initialize, then verify the tools become available.
3. If the MCP server cannot start (missing dependency), tell the user to install it: `npm install -g agentation-mcp` or `npx add-mcp "npx -y agentation-mcp server"`.

**Never skip this step.** Agentation feedback is how the user communicates visual issues from the browser.

## Intent Detection & Routing

### Step 1: Check for `.agents/design/manifest.json`

Use Glob to check for `.agents/design/manifest.json` in the current working directory.

### Step 2: Route based on intent

**Regardless of `.agents/design/` state:**
- If `$ARGUMENTS` is "help" → display **HELP** text below

**If `.agents/design/` does NOT exist:**
- If `$ARGUMENTS` is empty or blank → route to **INIT** (setup only)
- If `$ARGUMENTS` has content → route to **INIT**, then chain to **CREATE** with the arguments as design intent

**If `.agents/design/` exists:**

Read `.agents/design/manifest.json` to get current family and version context. Then read `$ARGUMENTS` naturally and determine which route matches:

- **CREATE** — User wants to build something new from scratch. ("new concept", "make me a dashboard", "start a different approach", "fresh take on navigation")
- **ARCHIVE** — User wants to hide, remove, or discard a concept. ("get rid of the sidebar one", "kill that direction", "I'm done with this", "trash it")
- **RUN** — User wants to see the gallery or start the dev server. ("show me the gallery", "open the studio", "launch it", "let me browse")
- **UPDATE** — User wants to refresh the studio scaffold to the latest version. ("update the studio", "get latest version", "refresh the scaffold")
- **FEATURES** — User wants to work with the feature map. ("map out the features", "show the feature tree", "what features do we have")
- **JOURNAL** — User wants to save inspiration, paste an image, add a reference, manage boards, or interact with the design journal. ("save this", "add to journal", "add to bank", "paste this image", "mood board", "add to board", "show boards", "inspiration", "reference image", "journal", "remember this", "save this idea", "note this down")
- **PUSH** — User wants to sync local studio changes back to the skill scaffold. ("push changes to scaffold", "sync back", "save these studio improvements")
- **STATUS** — The input is empty. Show current state.
- **ITERATE** — Default. If the input doesn't clearly match another route, treat it as a design direction for the current prototype. This is the most common action — users describe what they want changed.

When ambiguous between CREATE and ITERATE: if the user references or implies evolving what exists ("try", "change", "make it", "what about"), route to ITERATE. If they imply starting fresh with no reference to current state ("build me a", "new concept for"), route to CREATE.

### Step 3: Execute route

| Route | Action |
|-------|--------|
| INIT | Read and follow [prompts/init.md](prompts/init.md) |
| CREATE | Read and follow [prompts/create.md](prompts/create.md) |
| ITERATE | Read and follow [prompts/iterate.md](prompts/iterate.md) |
| ARCHIVE | Read and follow [prompts/archive.md](prompts/archive.md) |
| RUN | Read and follow [prompts/run.md](prompts/run.md) |
| UPDATE | Read and follow [prompts/update.md](prompts/update.md) |
| FEATURES | Read and follow [prompts/features.md](prompts/features.md) |
| JOURNAL | Read and follow [prompts/journal.md](prompts/journal.md) |
| PUSH | Read and follow [prompts/push.md](prompts/push.md) |
| STATUS | Read and follow [prompts/status.md](prompts/status.md) |

### Journal Capture (MANDATORY)

Every design-studio interaction MUST end with journal capture. This is how the design story gets told. After completing the primary task (create, iterate, etc.), the agent MUST review the conversation and save entries for:

**Story beats** (the narrative of how we got here):
- Rejections: "none of these feel right" → `observation`
- Convergences: "this is the direction" → `principle`
- Branches: "try both approaches" → `observation`
- Pivots: "actually let's go a different way" → `observation`
- Reactions: "I like this" / "this doesn't work" → `observation`
- Decisions: "we're going with X" → `principle` with importance `guiding`

**Ideas and references:**
- Philosophies shared by the user → `principle`
- External references (videos, articles, apps) → `reference`
- Aesthetic directions described → `observation`
- Open questions raised → `question`

Follow [_journal-entry.md](prompts/_journal-entry.md) for the API pattern. Create one entry per distinct idea. Set `project` to the current project. Briefly confirm each: "Saved: [summary]"

This step is embedded as the final step in create.md and iterate.md, but applies to ALL interactions including status checks and conversations where the user shares ideas.

### Internal subroutines (not user-facing)

| Subroutine | Used by | Action |
|------------|---------|--------|
| CAPTURE | CREATE, ITERATE | Read [prompts/_capture.md](prompts/_capture.md) — screenshots the current prototype via browser automation |

---

## HELP Text

Display when routed to HELP:

> **Design Studio** — interactive UI prototyping workspace
>
> Design Studio creates a `.agents/design/` folder in your project with a visual gallery and version-tracked prototypes. Describe what you want, react to what you see, fork and evolve.
>
> ### Gallery Features
>
> The gallery at localhost:3001 is a visual workspace:
> - **Grid layout** — organize prototypes in rows and columns per section
> - **Sections** — named groups with focus toggle (tells the AI what's in play)
> - **Thumbnails** — screenshot previews on each card, toggle on/off
> - **Drag-and-drop** — move cards between cells and sections
> - **Trash** — quick-archive from hover, restore from filter
> - **Section filter** — show/hide sections and trash from the header
>
> ### Examples
>
> ```
> /design-studio
> ```
> Shows what you have and what you're working on.
>
> ```
> /design-studio mobile chat layout with sidebar
> ```
> Creates a new prototype family with v1.
>
> ```
> /design-studio try darker, more minimal
> ```
> Forks the current version with your direction applied.
>
> ```
> /design-studio v1 was better, try a different direction from there
> ```
> Forks from a specific version, not just the latest.
>
> ```
> /design-studio trash the sidebar one
> ```
> Removes a concept from the gallery (recoverable).
>
> ```
> /design-studio run
> ```
> Starts the studio server at localhost:3001.
>
> ```
> /design-studio features
> ```
> Opens the feature mapping tool for exploring and connecting product features.
>
> ### How It Works
>
> 1. **Create** — describe a UI concept, get an interactive prototype with screenshot
> 2. **Feel** — use Agentation in the browser to click elements and leave visual feedback
> 3. **Fork** — give a direction, get a new version informed by your feedback
> 4. **Browse** — the gallery shows all concepts in a grid with thumbnails and sections
