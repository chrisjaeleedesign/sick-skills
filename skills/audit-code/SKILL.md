---
name: audit-code
description: "Systematically scan a codebase for accumulated technical debt — dead code, duplication, unnecessary complexity, inconsistency, coupling issues, naming problems, and compatibility cruft. Uses parallel specialist agents per category, confidence-scored findings, and category-isolated fix batches. Use when a codebase has been built or heavily modified by AI agents, after completing a feature, or whenever you want to reduce tech debt. Invoke with /audit-code optionally followed by a category or path."
---

# Audit Code

Systematic codebase audit for accumulated technical debt.

User's request: $ARGUMENTS

## Intent Detection & Routing

Parse `$ARGUMENTS` by evaluating these rules **in order** — use the first match:

1. Equals `"help"` → **HELP**
2. Equals `"status"` → **STATUS**
3. Starts with `"fix"` → **FIX** (may be `fix`, `fix all`, `fix <category>`, or `fix <path>`)
4. Starts with a category keyword → **SINGLE PASS** (check for a trailing path to scope the scan)
5. Looks like a file or directory path → **FULL AUDIT** (scoped to that path)
6. Empty or `"all"` → **FULL AUDIT**

**Category keywords**: `dead-code`, `duplication`, `complexity`, `inconsistency`, `naming`, `coupling`, `cruft`

---

## Report File

All audit findings are written to a checklist file on disk at:

```
.audit/<YYYY-MM-DD>_<HHMM>_<slug>.md
```

Where `<HHMM>` is 24-hour local time and `<slug>` is a short descriptor: `full-audit`, or the category name for single-pass runs, or `<category>_<directory>` for scoped runs. Examples:
- `.audit/2026-03-12_1430_full-audit.md`
- `.audit/2026-03-12_0915_dead-code.md`
- `.audit/2026-03-12_1430_naming_src-components.md`

Create the `.audit/` directory if it doesn't exist. Add `.audit/` to `.gitignore` if a `.gitignore` exists and doesn't already include it.

### Report format

```markdown
# Audit: <description>
Scope: <path or "full codebase"> | Date: <YYYY-MM-DD> | Categories: <list>

## Summary

| Category | Total | High | Med | Low | Fixed | Reverted |
|----------|-------|------|-----|-----|-------|----------|
| Dead Code | 3 | 1 | 2 | 0 | 0 | 0 |
| ...       |   |   |   |   |   |   |

## Dead Code (3 findings)

- [ ] **[HIGH 95]** Unused export: `formatDate` — src/utils/dates.ts:L14-L28
  **What**: exported but never imported by any other file
  **Why**: dead exports increase bundle size and cognitive load
  **Fix**: remove the function

- [ ] **[MED 72]** Stale TODO — src/api/auth.ts:L88
  **What**: TODO with no actionable information, file unchanged for 6 months
  **Why**: stale markers create false signals about pending work
  **Fix**: remove the TODO or convert to an issue

## Duplication (N findings)

- [ ] ...
```

### Checklist states

| Marker | Meaning |
|--------|---------|
| `- [ ]` | Pending — not yet attempted |
| `- [x]` | Fixed — applied and tests passed |
| `- [!]` | Reverted — fix attempted, tests failed, changes rolled back |
| `- [-]` | Skipped — user removed or declined this item |

When updating an item, append a status line:

```markdown
- [x] **[HIGH 95]** Unused export: `formatDate` — src/utils/dates.ts:L14-L28
  **What**: exported but never imported by any other file
  **Why**: dead exports increase bundle size and cognitive load
  **Fix**: remove the function
  **Status**: Fixed — commit `abc1234`
```

```markdown
- [!] **[MED 65]** Defensive null check — src/utils/parse.ts:L31
  **What**: null check on non-nullable typed parameter
  **Why**: defensive guards obscure actual contracts
  **Fix**: remove the null check
  **Status**: Reverted — `npm test` failed (TypeError in parse.test.ts:L44)
```

---

## Route: FULL AUDIT

### Step 1: Detect scope

- If a path was provided, use it as the scan root
- Otherwise, use the current working directory
- Always exclude: `node_modules/`, `dist/`, `build/`, `.git/`, `vendor/`, `__pycache__/`, `.wiggum/logs/`, `archive/`

### Step 2: Read project conventions

Check for and read (if they exist): `CLAUDE.md`, `AGENTS.md`, `.wiggum/AGENTS.md`, `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`. Extract: language, framework, naming conventions, project structure patterns. Summarize as a short "project context" block for agents.

### Step 3: Dispatch parallel agents

Launch **7 parallel agents** (one per pass category) using the Agent tool with `subagent_type: "general-purpose"`. Before dispatching:

1. **Read each pass file yourself** — the pass files are in the `passes/` subdirectory alongside this SKILL.md. Read each `passes/<category>.md` file and embed its full content into the agent prompt below (replacing `<PASS_INSTRUCTIONS>`). This avoids path resolution issues for subagents.
2. Include the scan scope (path + exclusions)
3. Include the project context from Step 2
4. Include the output format specification below

**Agent prompt template** (adapt per category):

```
You are an audit agent scanning for <CATEGORY> issues.

## Scope
Scan path: <SCOPE_PATH>
Exclude: node_modules/, dist/, build/, .git/, vendor/, __pycache__/, archive/

## Project Context
<PROJECT_CONTEXT>

## Instructions
<PASS_INSTRUCTIONS>

Use Glob, Grep, Read, and Bash tools as needed to scan the codebase.

Adapt all search patterns to the project's language(s). The project context above indicates the stack — use language-appropriate syntax for imports, function declarations, etc.

## Output Format
Return findings as a structured list. Each finding must include:
- severity: HIGH | MED | LOW
- confidence: 0-100
- file: path/to/file.ext:L<start>-L<end>
- title: short description
- what: description of the issue
- why: impact (reference agent-debt patterns where applicable)
- fix: concrete suggested action

Only report findings with confidence >= 50.
Sort by severity (HIGH first), then by confidence (highest first).

Report a maximum of 20 findings. If more exist, report the 20 highest-confidence and note: "(N additional findings below threshold — narrow scope with /audit-code <category> <path>)."

On large codebases (500+ files), focus on the most recently modified files unless the user provided a specific scope.

If you find no issues above the confidence threshold, return: "No findings for <CATEGORY>."
```

### Step 4: Write report file

Wait for all agents to complete, then:

1. Deduplicate — two findings in the same file within 5 lines of each other that describe the same root issue count as duplicates. Keep the higher-confidence one.
2. Create `.audit/` directory if needed. Add `.audit/` to `.gitignore` if not already present.
3. Write the report file at `.audit/<YYYY-MM-DD>_<HHMM>_<slug>.md` using the report format above. Always include the section header for every scanned category, even if zero findings: `## Dead Code (0 findings)` with `No issues found.` This distinguishes "clean" from "agent crashed."
4. Display the summary table and report path to the user in conversation
5. End with: "Report written to `.audit/<filename>`. Run `/audit-code fix` to start fixing, or edit the report to remove items you want to skip."

---

## Route: SINGLE PASS

Run one category only. No subagent needed for a single category — execute the pass directly:

1. Read the pass instructions from `passes/<category>.md` (in the `passes/` subdirectory alongside this SKILL.md)
2. Read project conventions (same as Step 2 above)
3. Scan the codebase following the pass instructions
4. Write the report file (same format, just one category section)
5. Display the summary and report path to the user

If a path scope was provided, constrain the scan to that path.

---

## Route: FIX

Apply fixes from the most recent report file.

### Step 1: Find the report

- If `$ARGUMENTS` includes a file path (e.g., `fix .audit/2026-03-12_full-audit.md`), use that report
- Otherwise: use `Glob` for `.audit/*.md`. Sort matches lexicographically (the timestamp prefix ensures chronological order). Take the last entry. If multiple reports exist, prefer the most recent `full-audit` report unless the user specified a specific category or file path.
- If no report exists, tell the user to run `/audit-code` first

### Step 2: Determine category scope

- `fix` or `fix all` → fix all categories with `- [ ]` items in the report
- `fix <category>` → fix only that category's `- [ ]` items

### Step 3: Apply fixes one category at a time

Process categories in this order (removal passes first, then refinement passes):
dead-code → duplication → cruft → naming → complexity → inconsistency → coupling

For each category with pending (`- [ ]`) items:

1. Apply all pending fixes for this category using Edit tool
2. Run the project's test/build command if one exists (check `package.json` scripts, `Makefile`, `Cargo.toml`, etc.)
3. **If tests pass**:
   - `git add` the changed files
   - `git commit` with message `audit-code: <category description> (N items)`
   - Get the commit hash via `git rev-parse --short HEAD`
   - Update each fixed item in the report: change `- [ ]` to `- [x]`, append `**Status**: Fixed — commit <hash>`
   - Update the summary table counts in the report
4. **If tests fail**:
   - `git checkout` the changed files to revert ALL code changes for this category
   - Update each item in the report: change `- [ ]` to `- [!]`, append `**Status**: Reverted — <test failure reason>`
   - Update the summary table counts in the report
   - Report to user and ask how to proceed
5. **If no test command found**: present the changes and ask user to confirm before committing
6. Move to next category

### Step 4: Final summary

After all categories are processed, update the summary table in the report with final counts, then display:

```
## Fix Complete

Report: .audit/<filename>

| Category | Fixed | Reverted | Remaining |
|----------|-------|----------|-----------|
| ...      | N     | N        | N         |
```

**Safety rules:**
- Never re-fix a fix. Only process `- [ ]` items. Skip `- [x]`, `- [!]`, and `- [-]`.
- Category-isolated batches: a failure in one category does not affect others.
- Always preserve git history — commit per category, revert per category.
- Always update the report file after each category — if the conversation dies, progress is preserved.

---

## Route: STATUS

Read the most recent report file in `.audit/` and display the summary table with current checklist counts. Quick way to see progress without opening the file.

---

## Route: HELP

Display:

> **audit-code** — systematic codebase audit for technical debt
>
> Scans your codebase for 7 categories of accumulated issues using parallel specialist agents. Findings are written to a checklist file in `.audit/` that tracks fix progress.
>
> ### Usage
>
> | Command | What it does |
> |---------|-------------|
> | `/audit-code` | Full audit of the entire codebase |
> | `/audit-code <path>` | Full audit scoped to a file or directory |
> | `/audit-code <category>` | Run a single audit pass |
> | `/audit-code <category> <path>` | Single pass, scoped |
> | `/audit-code fix` | Fix pending items from the latest report |
> | `/audit-code fix <category>` | Fix pending items for one category |
> | `/audit-code status` | Show progress on the current report |
> | `/audit-code help` | Show this help |
>
> ### Categories
>
> | Category | What it finds |
> |----------|--------------|
> | `dead-code` | Unused exports, functions, imports, unreachable branches, stale TODOs |
> | `duplication` | Exact clones, near-clones, semantic duplicates |
> | `complexity` | God functions, deep nesting, defensive over-coding, single-use abstractions |
> | `inconsistency` | Mixed patterns, naming conventions, error handling approaches |
> | `naming` | Generic names, misleading names, magic numbers |
> | `coupling` | Feature envy, shotgun surgery, data clumps, wrong-layer logic |
> | `cruft` | Compatibility shims, deprecated wrappers, dead TODOs, unused polyfills |
>
> ### Workflow
>
> ```
> /audit-code                      # full audit → writes .audit/<date>_<time>_full-audit.md
> # optionally edit the report to remove items you don't want fixed
> /audit-code fix dead-code        # fix easy wins first, checks them off
> /audit-code fix duplication      # consolidate duplicates, checks them off
> /audit-code status               # see what's left
> /audit-code fix                  # fix everything remaining
> ```
>
> ### Report Checklist
>
> The report file uses checkbox markers to track progress:
> - `- [ ]` Pending — not yet attempted
> - `- [x]` Fixed — applied and tests passed
> - `- [!]` Reverted — fix attempted, tests failed
> - `- [-]` Skipped — user declined this item
>
> You can edit the report manually before running fix — delete or mark items `- [-]` to skip them.
>
> ### Confidence Scoring
>
> Each finding includes a confidence score (0-100):
> - **90-100**: Certain — mechanically verifiable (unused import, unreachable code)
> - **70-89**: High — strong evidence with some judgment (semantic duplicate, defensive guard)
> - **50-69**: Medium — requires human judgment (potential god function, naming improvement)
> - **Below 50**: Not reported
