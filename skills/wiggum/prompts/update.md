# Update — Refresh Loop Infrastructure from Skill Templates

Refresh project `.agents/wiggum/` files from the latest Wiggum skill templates.

User's request: $ARGUMENTS

Follow this workflow exactly:

## Step 1: Verify `.agents/wiggum/` Exists

Use Glob to check for `.agents/wiggum/IMPLEMENTATION_PLAN.md` in the current working directory.

If NOT found, STOP. Tell the user:
> No `.agents/wiggum/` directory found. Use `/wiggum [description]` to create one.

## Step 1.5: Resolve `TEMPLATE_DIR`

Resolve the templates directory from the loaded Wiggum skill bundle:

- Prefer the skill base directory provided by the harness when this skill is loaded.
- Fallback: locate this skill's `templates/` directory beside `SKILL.md`.
- Do NOT assume a hardcoded home path like `~/.claude/...`.

Set `TEMPLATE_DIR` to that resolved path before processing files.

## Step 2: Parse Scope

Strip the trigger keyword ("update", "upgrade", or "refresh") from `$ARGUMENTS`. Examine what remains:

| Remaining arguments | Scope | Files |
|---|---|---|
| Empty or "all" | **all** | All files below |
| Contains "prompt" or "prompts" | **prompts** | 4 prompt files only |
| Contains "loop" or "loop.sh" | **loop** | loop.sh only |

**File mapping:**

| Scope | Global Template | Project File |
|---|---|---|
| prompts, all | `${TEMPLATE_DIR}/loop-prompt.md` | `.agents/wiggum/prompts/loop.md` |
| prompts, all | `${TEMPLATE_DIR}/cleanup-prompt.md` | `.agents/wiggum/prompts/cleanup.md` |
| prompts, all | `${TEMPLATE_DIR}/review-prompt.md` | `.agents/wiggum/prompts/review.md` |
| prompts, all | `${TEMPLATE_DIR}/holistic-review-prompt.md` | `.agents/wiggum/prompts/holistic-review.md` |
| loop, all | `${TEMPLATE_DIR}/loop-sh.md` | `.agents/wiggum/loop.sh` |

## Step 3: Process Each File

For each file in scope, do the following:

### 3a. Read the global template

Read the template file from `${TEMPLATE_DIR}`. Extract the content from inside the fenced code block (the content between the ``` delimiters — do NOT include the ``` lines themselves). This is the **template content**.

### 3b. Read the project file

Read the corresponding project file from `.agents/wiggum/`. This is the **project content**.

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
  > `.agents/wiggum/loop.sh` appears to have project-specific changes:
  > - Custom retry logic added after line 15
  > - Modified iteration count from 10 to 25
  >
  > Update anyway? This will replace these customizations.

  - If the user confirms → overwrite and record status as "Updated (custom changes overwritten)"
  - If the user declines → record status as "Skipped (custom changes preserved)"

## Step 4: Clean Up Orphaned Files

List all `.md` files in `.agents/wiggum/prompts/`. For each file, check if it appears in the **Project File** column of the file mapping table above. If a `.md` file exists in `.agents/wiggum/prompts/` but is NOT in the mapping, it's an orphan from a previous template version — delete it and record status as "Removed (orphaned)" in the report.

Skip any non-`.md` files (they may be project-specific).

## Step 5: Fix Permissions

If `loop.sh` was in scope and was updated (status is "Updated" or "Updated (custom changes overwritten)"), run:

```bash
chmod +x .agents/wiggum/loop.sh
```

## Step 6: Report Results

Display a summary:

> **Wiggum update complete!**
>
> | File | Status |
> |------|--------|
> | `.agents/wiggum/prompts/loop.md` | [status] |
> | `.agents/wiggum/prompts/cleanup.md` | [status] |
> | `.agents/wiggum/prompts/review.md` | [status] |
> | `.agents/wiggum/prompts/holistic-review.md` | [status] |
> | `.agents/wiggum/loop.sh` | [status] |

Only include rows for files that were in scope.
