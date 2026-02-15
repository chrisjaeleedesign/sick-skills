# Update — Refresh Loop Infrastructure from Global Templates

Refresh project `.wiggum/` files from the latest global templates.

User's request: $ARGUMENTS

Follow this workflow exactly:

## Step 1: Verify `.wiggum/` Exists

Use Glob to check for `.wiggum/IMPLEMENTATION_PLAN.md` in the current working directory.

If NOT found, STOP. Tell the user:
> No `.wiggum/` directory found. Use `/wiggum [description]` to create one.

## Step 2: Parse Scope

Strip the trigger keyword ("update", "upgrade", or "refresh") from `$ARGUMENTS`. Examine what remains:

| Remaining arguments | Scope | Files |
|---|---|---|
| Empty or "all" | **all** | All 4 files below |
| Contains "prompt" or "prompts" | **prompts** | 3 prompt files only |
| Contains "loop" or "loop.sh" | **loop** | loop.sh only |

**File mapping:**

| Scope | Global Template | Project File |
|---|---|---|
| prompts, all | `~/.claude/skills/wiggum/templates/loop-prompt.md` | `.wiggum/prompts/loop.md` |
| prompts, all | `~/.claude/skills/wiggum/templates/commit-prompt.md` | `.wiggum/prompts/commit.md` |
| prompts, all | `~/.claude/skills/wiggum/templates/cleanup-prompt.md` | `.wiggum/prompts/cleanup.md` |
| prompts, all | `~/.claude/skills/wiggum/templates/review-prompt.md` | `.wiggum/prompts/review.md` |
| prompts, all | `~/.claude/skills/wiggum/templates/holistic-review-prompt.md` | `.wiggum/prompts/holistic-review.md` |
| loop, all | `~/.claude/skills/wiggum/templates/loop-sh.md` | `.wiggum/loop.sh` |

## Step 3: Process Each File

For each file in scope, do the following:

### 3a. Read the global template

Read the template file from `~/.claude/skills/wiggum/templates/`. Extract the content from inside the fenced code block (the content between the ``` delimiters — do NOT include the ``` lines themselves). This is the **template content**.

### 3b. Read the project file

Read the corresponding project file from `.wiggum/`. This is the **project content**.

- **If the project file does not exist** → write the template content to the project path. Record status as "Created (new file)". Move to next file.

### 3c. Compare

- **If identical** → record status as "Already current". Move to next file.
- **If different** → continue to 3d.

### 3d. Assess for project-specific customizations

Compare the project content against the template content. Determine if the differences look like **project-specific customizations** vs. just being an **older template version**.

Signs of customization (any of these → treat as customized):
- Added project-specific file paths, directories, or package names
- Custom logic, rules, or steps not present in the template
- Comments indicating intentional modification (e.g., "# Custom:", "# Project-specific:")
- Structural changes: reordered sections, added/removed sections, fundamentally different organization
- References to project-specific tools, frameworks, or commands not in the template

Signs of just being an older version (all of these → treat as old version):
- Content is a subset or superset of the template with only minor wording differences
- Same overall structure and sections
- No project-specific references or custom logic
- Differences look like template improvements (bug fixes, clarified wording, new features)

### 3e. Apply update

- **If no customization detected** (old template version) → overwrite the project file with the template content. Record status as "Updated".
- **If customization detected** → show the user a brief summary of what looks custom, e.g.:
  > `.wiggum/loop.sh` appears to have project-specific changes:
  > - Custom retry logic added after line 15
  > - Modified iteration count from 10 to 25
  >
  > Update anyway? This will replace these customizations.

  - If the user confirms → overwrite and record status as "Updated (custom changes overwritten)"
  - If the user declines → record status as "Skipped (custom changes preserved)"

## Step 4: Clean Up Orphaned Files

List all `.md` files in `.wiggum/prompts/`. For each file, check if it appears in the **Project File** column of the file mapping table above. If a `.md` file exists in `.wiggum/prompts/` but is NOT in the mapping, it's an orphan from a previous template version — delete it and record status as "Removed (orphaned)" in the report.

Skip any non-`.md` files (they may be project-specific).

## Step 5: Fix Permissions

If `loop.sh` was in scope and was updated (status is "Updated" or "Updated (custom changes overwritten)"), run:

```bash
chmod +x .wiggum/loop.sh
```

## Step 6: Report Results

Display a summary:

> **Wiggum update complete!**
>
> | File | Status |
> |------|--------|
> | `.wiggum/prompts/loop.md` | [status] |
> | `.wiggum/prompts/commit.md` | [status] |
> | `.wiggum/prompts/cleanup.md` | [status] |
> | `.wiggum/prompts/review.md` | [status] |
> | `.wiggum/prompts/holistic-review.md` | [status] |
> | `.wiggum/loop.sh` | [status] |

Only include rows for files that were in scope.
