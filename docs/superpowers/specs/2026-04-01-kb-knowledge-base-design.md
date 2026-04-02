# kb: Google Drive Knowledge Base Skill

**Date:** 2026-04-01
**Status:** Draft

## Purpose

Replace `.artifacts/` as the shared knowledge layer for projects. Google Drive gives humans real-time collaboration (editing, commenting, concurrent access) while giving agents a queryable knowledge base they can read from and contribute to with guardrails.

The core problem: `.artifacts/` in git is a terrible collaboration surface — no concurrent editing, no comments, no review flow. Just files that get merge-conflicted. Google Drive solves the collaboration side; this skill makes it agent-accessible.

## Design Principles

- **Read-heavy, write-cautious.** Agents read freely. Agents never directly edit docs — they leave comments (default) or suggestion-mode edits (when they have a specific text change).
- **Idempotent operations.** `update` creates or refreshes the manifest. No separate init/sync distinction.
- **Pure `gws` CLI.** All Google API interaction goes through `gws`. No direct Python SDK usage. Keeps auth, pagination, and error handling in one place.
- **Per-project scope.** Each project gets its own Drive folder and manifest. Config lives in `.agents/kb/`.

## Skill Structure

```
skills/kb/
├── SKILL.md              # Router: parses intent, dispatches to prompts
├── prompts/
│   ├── setup.md          # Guide gws install + auth
│   ├── update.md         # Scan folder, create/update manifest
│   ├── query.md          # Read manifest, fetch relevant docs
│   └── suggest.md        # Leave comments or suggestions on docs
└── scripts/
    └── kb.py             # Shell out to gws, parse JSON, manage .agents/kb/
```

### Local Config: `.agents/kb/config.json`

Created per-project after setup. Stores:

```json
{
  "folder_id": "abc123xyz",
  "manifest_sheet_id": "def456",
  "folder_url": "https://drive.google.com/drive/folders/abc123xyz"
}
```

## Intent Routing (SKILL.md)

Natural language intent detection, no subcommands required. Invoked via `/kb`.

| Condition | Route |
|-----------|-------|
| `gws` not installed or not authenticated | `setup.md` |
| No `.agents/kb/config.json` exists | `setup.md` (folder connection step) |
| "update" / "sync" / "refresh" signals | `update.md` |
| "suggest" / "comment" / "note" signals | `suggest.md` |
| Everything else (questions, topic lookups) | `query.md` |

## Setup Flow (`setup.md`)

Conversational walkthrough, one step at a time. Checks success before proceeding.

**Step 1 — Check for `gws`:**
- `which gws` — if missing, present install options:
  - `brew install googleworkspace-cli` (macOS)
  - `npm install -g @googleworkspace/cli`
  - Link to GitHub releases

**Step 2 — Check auth:**
- `gws auth status` — if not authenticated:
  - `gws auth setup` (creates GCP project)
  - `gws auth login` (opens browser for OAuth)

**Step 3 — Connect a folder:**
- Ask for Drive folder URL or raw folder ID
- Accept either format, extract folder ID from URL if needed (`drive.google.com/drive/folders/<id>`)
- Validate: `gws drive files get --params '{"fileId": "<folder_id>"}'`
- Write config to `.agents/kb/config.json`
- Immediately run the update flow to create the manifest

**Re-entry:** If `/kb` is invoked later and config exists but auth has expired (`gws` exit code 2), route to just the auth step, not the full setup.

## Manifest (`_kb_manifest` Sheet)

A Google Sheet file created inside the user's Drive folder, named `_kb_manifest`. The data lives on the first sheet tab (default "Sheet1"). Serves as the agent's table of contents.

### Columns

| Column | Purpose | Example |
|--------|---------|---------|
| Title | Doc name in Drive | Brand Voice Guide |
| Type | doc, sheet, slides, pdf, other | doc |
| Doc ID | Google Drive file ID | 1a2b3c... |
| Summary | AI-generated, 2-3 sentences | Defines tone (conversational, confident, never sarcastic), vocabulary rules, and per-channel adjustments. Reference when writing any customer-facing copy. |
| Tags | Optional, comma-separated | brand, copy, guidelines |
| Last Modified | From Drive metadata | 2026-03-28T14:30:00Z |
| Status | active / removed | active |

### Summary Generation

Summaries are NOT truncated first paragraphs. For each doc, the `update` flow:

1. Reads the full doc content via `gws`
2. Passes it through a model (via `scripts/core.py`) with a prompt: *"Summarize this document in 2-3 sentences. Focus on: what knowledge it contains, what decisions or guidelines it defines, and when an agent should reference it."*
3. Writes the summary to the manifest

Summaries include a "when to reference" signal so the agent can pattern-match queries to docs without opening every one.

Summaries are only regenerated for docs whose Last Modified date has changed since the last update.

## Update Flow (`update.md`)

Idempotent — first run creates, subsequent runs refresh.

1. `gws drive files list` on the folder — get all files with metadata
2. Check if `_kb_manifest` sheet exists in the folder
   - No: create it with headers via `gws sheets`
   - Yes: read existing rows
3. Diff against current folder contents:
   - New files: add rows, generate summaries
   - Removed files: set Status to `removed` (not deleted from manifest)
   - Changed files (title or Last Modified): update row, regenerate summary if content changed
4. Write changes back to the sheet

Flagging removed docs rather than deleting them handles cases where a human temporarily moved a doc or there's a permissions issue.

## Query Flow (`query.md`)

The primary agent path. Two-step: manifest first, then fetch on demand.

**Step 1 — Read the manifest:**
```
gws sheets spreadsheets.values get --params '{"spreadsheetId": "<id>", "range": "_kb_manifest!A:G"}'
```
Agent scans summaries to find relevant docs.

**Step 2 — Decide what to fetch:**
Based on summaries, pick 1-3 most relevant docs. The "when to reference" signals in summaries should make this straightforward.

**Step 3 — Fetch doc content:**
```
gws docs documents get --params '{"documentId": "<doc_id>"}'
```
Agent reads and uses the content.

**Step 4 — Cite the source:**
When using KB knowledge, reference which doc it came from so the user can verify or go deeper.

**No match:** If no doc is relevant, say so. Optionally suggest creating a new doc for that topic.

## Suggest Flow (`suggest.md`)

Agent contribution with guardrails. **Never direct edits.**

### Comments (Default)

For observations, questions, or notes — not specific text changes.

```
gws drive comments create --params '{"fileId": "<doc_id>"}' --json '{"content": "This section may be outdated — pricing tiers changed in March 2026."}'
```

Comments can be anchored to specific text using `quotedFileContent` so they attach to the relevant passage.

### Suggestions (Specific Text Changes)

When the agent has an exact replacement in mind. If `gws` supports Docs suggestion-mode via API discovery, use it. Otherwise, fall back to a comment with the proposed change:

> "Suggested edit: Change 'Q1 2026' to 'Q2 2026' in the timeline section."

This fallback is pragmatic — Docs suggestion-mode via API requires calculating exact character offsets, and a comment with "change X to Y" is nearly as useful to a human reviewer.

### Guardrails

- The `suggest.md` prompt explicitly instructs: **never use direct edit mode**
- Agent Drive permissions should ideally be `commenter` not `editor` as an additional safety net
- Prompt-level instruction is the primary control since permissions are configured by the user

## Script: `kb.py`

Handles all `gws` interaction and JSON parsing. Key functions:

- **`check_gws()`** — verify installation and auth status
- **`get_config()`** — read `.agents/kb/config.json`
- **`save_config()`** — write config
- **`list_folder(folder_id)`** — `gws drive files list`, return parsed file metadata
- **`read_manifest(sheet_id)`** — `gws sheets` get values, return as list of dicts
- **`write_manifest(sheet_id, rows)`** — `gws sheets` update values
- **`create_manifest(folder_id)`** — create new Sheet in folder, return sheet ID
- **`read_doc(doc_id)`** — `gws docs documents get`, return text content
- **`add_comment(file_id, content, quoted_text=None)`** — `gws drive comments create`
- **`generate_summary(content)`** — call model via `scripts/core.py` to produce summary

Uses `scripts/core.py` for model calls (summary generation). Uses `subprocess` for `gws` calls, parsing JSON stdout.

## Access Pattern

| Actor | Read | Direct Edit | Comment | Suggest |
|-------|------|-------------|---------|---------|
| Founders/team | Yes | Yes | Yes | Yes |
| Agent | Yes | No | Yes (default) | Yes (when specific) |

## Content Types Supported

- Google Docs (primary)
- Google Sheets
- Google Slides
- PDFs and other files (listed in manifest, content reading may be limited)

## Dependencies

- `gws` CLI installed and authenticated
- `scripts/core.py` for model calls (summary generation)
- Python 3 with `subprocess`, `json` (stdlib only)
