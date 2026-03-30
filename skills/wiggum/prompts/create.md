# Create — Scaffold a Wiggum Loop

Set up a `.agents/wiggum/` development loop from the user's idea.

User's request: $ARGUMENTS

Follow this workflow exactly:

## Step 1: Detect Context

**Check for existing `.agents/wiggum/` directory:**
- Use Glob to check for `.agents/wiggum/IMPLEMENTATION_PLAN.md` in the current working directory
- If `.agents/wiggum/` already exists, STOP. Tell the user: "A `.agents/wiggum/` loop already exists in this project. Use `/wiggum run` to continue, `/wiggum add ...` to extend the plan, or delete `.agents/wiggum/` to start fresh."

**Check for existing source code:**
- Look for non-template source files (e.g., `src/`, `app/`, `lib/`, `*.py`, `*.ts`, `package.json` with real deps, `*.html`, `*.css`, `*.go`, `Cargo.toml`, `*.rs`, `*.java`)
- If real source files exist → **augmenting** an existing project. Read the code to understand the stack and conventions.
- If no source files → **new project**

**Detect component library (for existing projects):**
- Check `package.json` for known UI libraries:
  - shadcn/ui: `@radix-ui/*` deps + `components/ui/` directory
  - MUI: `@mui/material` or `@mui/joy`
  - Chakra UI: `@chakra-ui/react`
  - Radix: `@radix-ui/react-*` (without shadcn directory pattern)
  - Mantine: `@mantine/core`
  - Ant Design: `antd`
  - Headless UI: `@headlessui/react`
  - DaisyUI: `daisyui`
  - Vuetify: `vuetify` (Vue)
  - Element Plus: `element-plus` (Vue)
- Also scan a few source files for import patterns (e.g., `import { Button } from '@/components/ui'`)
- Store the detected library for use in AGENTS.md

**Check for version context:**
- If `.agents/wiggum/archive/` exists, this is scaffolding a new version after archival
- Read `.agents/wiggum/ROADMAP.md` and the latest archive's `summary.md` for context from previous versions

## Step 2: Gather Requirements

Be **opinionated** — suggest defaults and let the user override. Bias toward action.

1. Confirm what they're building (use $ARGUMENTS if sufficient)
2. Suggest a tech stack based on what they described. Only ask if truly ambiguous.
3. Suggest a scope — Phase 0 (setup) + 2-3 feature phases. Explicitly invite pushback: "Here's what I'd scope for v1 — push back if this isn't right."
4. **UI references** (for projects with a frontend): "Any apps you'd like the UI to feel like? (e.g., 'Linear', 'Notion', or skip)" — optional, stored in the spec.
5. **Component library** (for new projects with a frontend framework): If no component library was detected in Step 1, suggest one appropriate for the stack (e.g., shadcn/ui for Next.js). If the user declines, note "No component library" in AGENTS.md.

**For augmenting an existing project:**
- Read existing source files to derive the tech stack and conventions
- Skip stack questions — derive from code
- Focus on what new capability to add

**Skip questions entirely if $ARGUMENTS provides enough context.** The user can always refine after seeing the scaffold.

## Step 3: Generate `.agents/wiggum/` Directory

Create ALL of the following files. Write them completely — no placeholders or TODOs.

### 3a. `.agents/wiggum/ROADMAP.md`

```markdown
# Product Roadmap

## Vision
[High-level description of where this product is going — 2-3 sentences]

## Current: v1 — [Descriptive Name]
[Detailed description of what v1 delivers — enough context for anyone to understand the scope]

See: SPECS/project_spec.md, IMPLEMENTATION_PLAN.md

## Future Direction
[Tentative ideas for what comes after v1 — directional, not specced out. If unknown, write "To be determined based on v1 learnings."]
```

If this is a new version (v2+), adjust the structure:
- Current section reflects the new version number and name
- Add a `## Completed` section with previous version summaries linking to their archive
- Reference v1 context where relevant in the new specs (e.g., "building on the counter app from v1")

### 3b. `.agents/wiggum/SPECS/project_spec.md`

```markdown
# [Project Name] — Specification

## Overview
[What this project does, in 2-3 sentences]

## Core Features

### [Feature 1]
- [Detailed description — enough for a headless worker to implement without human guidance]
- [Behavior details, edge cases, acceptance criteria]

### [Feature 2]
- [Detailed description]
- [Behavior details, edge cases, acceptance criteria]

## Tech Stack
- [Framework/language]
- [Key dependencies with versions if relevant]

## UI Reference

[If the user specified reference apps, list them here with a brief note on what aspect to reference. Example:
- **Linear** — Clean, minimal interface. Fast interactions. Keyboard-friendly.
- **Notion** — Block-based content. Flexible layouts. Inline editing.

If no reference was specified: "None specified — follow standard conventions for the tech stack."]

## Non-Goals
- [What this project intentionally does NOT do]
- [Scope boundaries to prevent feature creep]
```

Features MUST be detailed enough for a headless worker agent to implement without asking questions. Include:
- Expected behavior for each feature
- Edge cases (empty states, error conditions, boundary values)
- Acceptance criteria (how to verify it works)

### 3c. `.agents/wiggum/IMPLEMENTATION_PLAN.md`

```markdown
# Implementation Plan

> **Wiggum Loop Rule**: Each iteration completes at least one full phase. The worker may combine the next phase if it's small and tightly coupled. If this plan drifts from specs, flag it in the changelog.

---

## Phase 0 — Setup

- [ ] [Specific setup step with exact commands, e.g., "Initialize Next.js 14 project with TypeScript: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir`"]
    - Expected outcome: [what success looks like]
- [ ] [Another setup step if needed]
- [ ] **Verify**: [Specific verification, e.g., "Run `npm run dev` — dev server starts on localhost:3000 without errors"]

## Phase 1 — [First Feature Name]

> **Goal**: [What done looks like for this phase]

- [ ] **[Component/Area]**: [Actionable task]
    - [Technical details, file paths, key decisions]
- [ ] **[Component/Area]**: [Another task]
    - [Technical details]
- [ ] **Verify**: [Specific verification for this phase]

[Continue with Phase 2, Phase 3, etc.]

---

## Changelog

_Updated by Wiggum loop iterations. Each completion adds an entry below._
```

Key requirements:
- Phase 0 MUST have concrete commands — never "set up the project" or "initialize the repo"
- Each phase has a `> **Goal**:` blockquote
- Each phase ends with a `**Verify**` task
- All tasks use `- [ ]` checkbox format

Phase design principles:
- Each phase should deliver a coherent, testable unit of functionality — something you could demo or verify end-to-end
- Don't create phases that produce intermediate artifacts with no standalone value (e.g., "set up data model" alone — pair it with the endpoints that use it)
- Group tightly-coupled work into the same phase (data model + CRUD, component + its state management)
- A phase is too big if it touches more than ~3 unrelated concerns
- A phase is too small if its output can't be meaningfully tested in isolation

### 3d. `.agents/wiggum/COMPLETED.md`

```markdown
# Completed Phases

_Phases are archived here as they complete during loop execution._
```

### 3e. `.agents/wiggum/AGENTS.md`

```markdown
# Agent Conventions

## Commands

- **Dev Server**: [actual command, e.g., `npm run dev`]
- **Test**: [actual command, e.g., `npm test`]
- **Lint**: [actual command, e.g., `npm run lint`]
- **Build**: [actual command, e.g., `npm run build`]

## Code Style

- [Language/framework conventions]
- [Component patterns, e.g., "Use functional React components with hooks"]
- [Naming conventions]

## Component Library

- **Library**: [detected or specified library, e.g., "shadcn/ui (built on Radix primitives)"]
- **Import pattern**: [how components are imported, e.g., `import { Button } from '@/components/ui/button'`]
- **Constraint**: Build all UI with this library. Do not create custom components when a library primitive exists. Check the library's docs before building any UI element.

[If no library: "No component library. Use standard HTML elements with the project's CSS approach. Keep UI simple and conventional."]

## Paths

- All specs and plans live in `.agents/wiggum/`
- Source code lives in the project root
- Tests live in [test directory]

## File Structure

- `[directory]`: [Description]
- `.agents/wiggum/`: Loop infrastructure (specs, plan, logs)

## Code Philosophy

- No redundancy — don't implement the same logic in multiple places
- Complex problems, simple solutions — if it needs a paragraph to explain, simplify
- No hacky workarounds — solve the root problem, don't patch around it
- Follow best practices for the language/framework in use
- Keep code tight and standardized — consistent patterns, minimal abstraction layers
- Avoid premature abstraction — three similar lines > one premature helper
- Every file a new developer opens should be immediately understandable
```

Derive commands and conventions from the chosen tech stack. If augmenting an existing project, read the code to match existing patterns.

### 3f. Resolve `TEMPLATE_DIR`

Resolve the templates directory from the loaded Wiggum skill bundle:

- Prefer the skill base directory provided by the harness when this skill is loaded.
- Fallback: locate this skill's `templates/` directory beside `SKILL.md`.
- Do NOT assume a hardcoded home path like `~/.claude/...`.

Set `TEMPLATE_DIR` to that resolved path before generating template-derived files.

### 3g. `.agents/wiggum/loop.sh`

Read the template at `${TEMPLATE_DIR}/loop-sh.md`. Extract the bash script from the code block and write it to `.agents/wiggum/loop.sh`. Then make it executable:

```bash
chmod +x .agents/wiggum/loop.sh
```

### 3h. `.agents/wiggum/prompts/loop.md`

Read the template at `${TEMPLATE_DIR}/loop-prompt.md`. Extract the prompt from the code block and write it to `.agents/wiggum/prompts/loop.md`.

### 3i. `.agents/wiggum/prompts/cleanup.md`

Read the template at `${TEMPLATE_DIR}/cleanup-prompt.md`. Extract the prompt and write it to `.agents/wiggum/prompts/cleanup.md`.

### 3j. `.agents/wiggum/prompts/review.md`

Read the template at `${TEMPLATE_DIR}/review-prompt.md`. Extract the prompt and write it to `.agents/wiggum/prompts/review.md`.

### 3k. `.agents/wiggum/prompts/holistic-review.md`

Read the template at `${TEMPLATE_DIR}/holistic-review-prompt.md`. Extract the prompt from the code block and write it to `.agents/wiggum/prompts/holistic-review.md`.

### 3l. `.agents/wiggum/logs/` directory and `.agents/wiggum/.gitignore`

Create the logs directory (an empty directory). Write `.agents/wiggum/.gitignore`:

```
logs/
```

This ensures log files are not committed to git but everything else in `.agents/wiggum/` is tracked.

## Step 4: Pre-loop Spec Verification

After generating all files, perform an inline spec quality check:

1. Read `.agents/wiggum/SPECS/project_spec.md`
2. Read `.agents/wiggum/IMPLEMENTATION_PLAN.md`
3. Check for:
   - **Completeness**: Are all features described with enough detail to implement headlessly?
   - **Ambiguity**: Are there requirements that could be interpreted multiple ways?
   - **Contradictions**: Do any specs conflict with each other?
   - **Edge cases**: What happens on errors, empty states, boundaries?
   - **Forward traceability**: Does every plan task map to a spec requirement?
   - **Backward traceability**: Does every spec requirement have at least one plan task?
4. Auto-fix any issues you find (update the files directly)
5. Report remaining concerns to the user with severity levels (CRITICAL / WARNING / INFO)

## Step 5: Handover

Present a summary:

> **Wiggum loop scaffolded!** Here's what was created:
>
> - **Spec**: `.agents/wiggum/SPECS/project_spec.md` — [brief summary]
> - **Plan**: `.agents/wiggum/IMPLEMENTATION_PLAN.md` — [N phases, M total tasks]
> - **Conventions**: `.agents/wiggum/AGENTS.md` — [stack summary]
> - **Roadmap**: `.agents/wiggum/ROADMAP.md` — v1 scoped
>
> **Spec quality report**:
> [List any concerns with severity, or "Specs look solid — ready to build."]
>
> Review the specs and plan. Push back on anything that doesn't look right.
> When ready: `/wiggum refine` to sharpen the plan, or `/wiggum run` to start building.
