---
name: design-studio
description: "Create, iterate, and compare interactive UI prototypes in a .design/ workspace with a visual gallery and Agentation feedback. Use for vibe designing, layout exploration, rapid UI iteration, and visual feedback loops. Invoke with /design-studio. Use this skill whenever the user mentions prototyping, UI exploration, design concepts, mockups, layout experiments, or wants to visually iterate on interface ideas."
---

Portable design prototyping workspace. Creates a `.design/` directory with a Next.js gallery, Agentation visual feedback, and a **feel → react → fork → feel** loop.

User's request: $ARGUMENTS

## Intent Detection & Routing

### Step 1: Check for `.design/manifest.json`

Use Glob to check for `.design/manifest.json` in the current working directory.

### Step 2: Route based on state

**Regardless of `.design/` state:**
- If `$ARGUMENTS` is "help" → display **HELP** text below

**If `.design/` does NOT exist:**
- If `$ARGUMENTS` is empty or blank → route to **INIT** (setup only)
- If `$ARGUMENTS` has content → route to **INIT**, then chain to **CREATE** with the arguments as design intent

**If `.design/` exists:**
1. Read `.design/manifest.json` to get current family and version context
2. Parse `$ARGUMENTS` for intent signals using the table below
3. Route to the matching prompt

| Signal words in `$ARGUMENTS` | Route |
|-------------------------------|-------|
| "new", "fresh", "concept", "start over" | **CREATE** |
| "archive", "trash", "done with", "shelve", "hide", "remove" | **ARCHIVE** |
| "run", "start", "serve", "dev" | **RUN** |
| "update", "upgrade", "refresh" | **UPDATE** |
| "features", "feature map", "feature table", "map features" | **FEATURES** |
| "push", "sync back", "update scaffold", "push to scaffold" | **PUSH** |
| _(empty)_ | **STATUS** |
| _(anything else — a design direction)_ | **ITERATE** |

When `$ARGUMENTS` is empty, show status. When it has content, default to iterate — the most common action is evolving the current design.

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
| PUSH | Read and follow [prompts/push.md](prompts/push.md) |

### STATUS (inline — no separate prompt file)

When `$ARGUMENTS` is empty and `.design/` exists, read the manifest and display a brief summary:

> **Current:** {family name} v{N} — "{direction}"
>
> **Sections:**
> - **{section name}** {🎯 if focused} — {family1}, {family2}
> - {section name} — {family1}
>
> **Unsorted:** {family1}, {family2} _(or "none")_
>
> **Archived:** _{name}_, _{name}_ _(or "none")_
>
> What would you like to do? Describe a direction to iterate, or say "new" to start a fresh concept.

Also check Agentation for pending annotations — if any exist, mention: "You have {N} pending annotations from the browser."

### Proactive Thought Capture

**During ANY design-studio interaction** (create, iterate, status, or conversation), watch for the user sharing inspiration, philosophy, aesthetic ideas, or references. When detected, automatically save as a thought via `POST /api/thoughts` on the studio server (default port from manifest settings, typically localhost:3001).

**Detection signals:**
- User mentions watching, reading, or seeing something ("I saw this video about...", "I was reading about...")
- User shares a philosophy or principle ("color should represent state, not be literal", "intentional unfinishedness")
- User describes an aesthetic direction ("organic, breathing interfaces", "brutalist but warm")
- User references external media (YouTube links, articles, images, other apps/products)
- User expresses a design instinct or gut reaction that goes beyond the current prototype

**How to capture:**
```bash
curl -s -X POST http://localhost:<port>/api/thoughts \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-thought",
    "thought": {
      "kind": "<observation|question|principle|reference>",
      "body": "<concise summary of the idea>",
      "source_type": "conversation",
      "family": "<current family slug if relevant, omit if general>",
      "tags": ["<relevant tags>"],
      "conviction": "hunch"
    }
  }'
```

**After capturing:** Briefly confirm: "Saved thought: [one-line summary]" — don't interrupt the flow.

**Kind selection:**
- Philosophy/principle/rule → `principle`
- External reference (video, article, app) → `reference`
- Aesthetic instinct or gut reaction → `observation`
- Open question or uncertainty → `question`

**Default conviction:** `hunch` for new ideas. Upgrade to `leaning` if the user repeats or reinforces the idea.

### Internal subroutines (not user-facing)

| Subroutine | Used by | Action |
|------------|---------|--------|
| CAPTURE | CREATE, ITERATE | Read [prompts/capture.md](prompts/capture.md) — screenshots the current prototype via browser automation |

---

## HELP Text

Display when routed to HELP:

> **Design Studio** — interactive UI prototyping workspace
>
> Design Studio creates a `.design/` folder in your project with a visual gallery and version-tracked prototypes. Describe what you want, react to what you see, fork and evolve.
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
