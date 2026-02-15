---
name: wiggum
description: Autonomous development loop — scaffold, run, and manage phased implementation plans
user-invocable: true
---

Autonomous development loop for phased implementation plans.

User's request: $ARGUMENTS

## Intent Detection & Routing

Follow this decision tree exactly:

### Step 1: Check for `.wiggum/` directory

Use Glob to check for `.wiggum/IMPLEMENTATION_PLAN.md` in the current working directory.

### Step 2: Route based on state

**Regardless of `.wiggum/` state:**
- If `$ARGUMENTS` is "help" → route to **HELP**

**If `.wiggum/` does NOT exist:**
- If `$ARGUMENTS` is empty or blank → show **HELP** (below)
- If `$ARGUMENTS` has content → route to **CREATE**

**If `.wiggum/` exists:**
1. Parse `$ARGUMENTS` for intent signals — check for UPDATE first (regardless of task state)
2. Read `.wiggum/IMPLEMENTATION_PLAN.md`
3. Check if any unchecked tasks remain (lines matching `- [ ]`)

| Condition | Arguments | Route |
|-----------|-----------|-------|
| Any | "update", "upgrade", "refresh" (optionally followed by scope like "all", "prompts", "loop") | **UPDATE** |
| Unchecked tasks exist | Empty, "run", "start", "go", "continue" | **RUN** |
| Unchecked tasks exist | "refine", "sharpen", "improve plan", "review plan" | **REFINE** |
| Unchecked tasks exist | Describes new work ("add ...", "also ...", "include ...") | **MODIFY** |
| Unchecked tasks exist | "verify", "check", "review" | **VERIFY** |
| All tasks done (`[x]`) | Empty | **ASK** |
| All tasks done (`[x]`) | Describes new work or starts with "v2:", "v3:", "next:" | **VERSION** |
| All tasks done (`[x]`) | "verify", "check", "review" | **VERIFY** |

### Step 3: Execute route

| Route | Action |
|-------|--------|
| HELP | Display help text below |
| UPDATE | Read and follow [prompts/update.md](prompts/update.md) |
| REFINE | Read and follow [prompts/refine.md](prompts/refine.md) |
| CREATE | Read and follow [prompts/create.md](prompts/create.md) |
| RUN | Read and follow [prompts/run.md](prompts/run.md) |
| MODIFY | Read and follow [prompts/modify.md](prompts/modify.md) |
| VERIFY | Read and follow [prompts/verify.md](prompts/verify.md) |
| VERSION | Read and follow [prompts/cleanup.md](prompts/cleanup.md), then when it hands off to CREATE, read and follow [prompts/create.md](prompts/create.md) for the new version |
| ASK | Display completion message below |

---

## HELP Text

Display when routed to HELP:

> **Wiggum** — autonomous phased development loop
>
> Wiggum scaffolds your project into specs, an implementation plan, and a loop script. It then runs headless Claude instances to build your project phase by phase — with automated code review and UI quality checks at each step.
>
> ### Getting Started
> ```
> /wiggum build a todo app with React and shadcn
> ```
> Wiggum will ask a few questions (tech stack, scope, UI references), then generate everything in a `.wiggum/` directory.
>
> ### Commands
>
> | Command | What it does |
> |---------|-------------|
> | `/wiggum [describe your project]` | Scaffold a new project loop |
> | `/wiggum run` | Start or resume the implementation loop |
> | `/wiggum refine` | Sharpen the plan before running (recommended) |
> | `/wiggum verify` | Audit specs vs. implementation |
> | `/wiggum add [feature]` | Add new phases to the current plan |
> | `/wiggum update` | Refresh loop infrastructure from latest templates |
> | `/wiggum v2: [description]` | Archive current version, start next |
> | `/wiggum help` | Show this help |
>
> ### How It Works
>
> 1. **Scaffold** — `/wiggum [idea]` creates specs, a phased plan, and loop infrastructure
> 2. **Refine** (optional) — `/wiggum refine` reviews decisions against best practices
> 3. **Run** — `/wiggum run` executes the loop: each iteration completes one phase
> 4. **Review** — After each phase, automated review checks behavior, UI, and code quality (loops until clean)
> 5. **Verify** — `/wiggum verify` audits what was built against the original specs
>
> ### What Gets Created
>
> ```
> .wiggum/
>   SPECS/project_spec.md    — What to build (features, edge cases, acceptance criteria)
>   IMPLEMENTATION_PLAN.md   — How to build it (phased task checklist)
>   AGENTS.md                — Project conventions (commands, code style, component library)
>   ROADMAP.md               — Product vision and version history
>   loop.sh                  — The autonomous execution script
>   prompts/                 — Prompts for the headless workers
>   logs/                    — Execution logs and progress tracking
> ```
>
> ### Tips
> - Be specific in your project description — more detail = better specs
> - Use `/wiggum refine` before `/wiggum run` for higher quality output
> - Specify UI reference apps during setup (e.g., "make it feel like Linear") for better UI decisions
> - Review the generated specs and plan before running — push back on anything that doesn't look right

## ASK Text (all tasks complete)

When all tasks are done and no arguments provided:

> All tasks in the current version are complete!
>
> What would you like to do next?
> - Start a new version: `/wiggum v2: [describe what's next]`
> - Verify the implementation: `/wiggum verify`
> - Add more features: `/wiggum add [feature description]`
