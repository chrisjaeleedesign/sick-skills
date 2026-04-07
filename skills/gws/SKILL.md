---
name: gws
description: "Interact with Google Drive, Docs, Sheets, and other Google Workspace services using the gws CLI. Use this skill whenever the user wants to read or write Google Docs, list or manage files in Drive, read or update spreadsheets, leave inline comments or suggestions on documents, check gws authentication status, or perform any Google Workspace operation from the command line. Also use when another skill needs to perform Drive, Docs, or Sheets operations — this skill is the reference for how to use gws correctly. Trigger on phrases like 'read this google doc', 'list my drive folder', 'check gws auth', 'leave a comment on the doc', 'append to the sheet', 'upload to drive', or any mention of Google Drive, Google Docs, Google Sheets, or the gws CLI."
---

# gws — Google Workspace CLI

The `gws` CLI gives you direct access to Google Drive, Docs, Sheets, Gmail, Calendar, and 30+ other Google Workspace APIs from the terminal. All responses are structured JSON. This skill teaches you how to use it effectively.

## Precondition

Before doing anything, check if gws is installed and authenticated:

```bash
which gws && gws auth status
```

- If `gws` is not found or auth shows `"auth_method": "none"` → read and follow `prompts/setup.md`
- If authenticated → proceed to intent routing

## Intent Routing

**Setup / auth** — user wants to install gws, authenticate, or fix expired credentials.
→ Read and follow `prompts/setup.md`

**Suggest / comment** — user wants to leave inline comments or suggestions on a Google Doc.
- "leave a comment on...", "flag something in...", "suggest an edit to...", "add a note to the doc..."
→ Read and follow `prompts/suggest.md`

**Read / browse / operate (default)** — user wants to read docs, list folders, work with sheets, or any other gws operation.
→ Read and follow `prompts/read.md`

## CLI Quick Reference

This section covers the essential patterns. Any agent using gws should understand these.

### Command pattern

```
gws <service> <resource> <method> [flags]
```

Services include: `drive`, `docs`, `sheets`, `gmail`, `calendar`, `chat`, `admin`, and many more. The CLI auto-generates commands from Google's Discovery Service, so the full API surface is available.

### Key flags

| Flag | Purpose | Example |
|------|---------|---------|
| `--params` | Request parameters as JSON | `--params '{"pageSize": 10}'` |
| `--json` | Request body as JSON | `--json '{"properties": {"title": "My Sheet"}}'` |
| `--page-all` | Auto-paginate, stream as NDJSON | `gws drive files list --page-all` |
| `--page-limit N` | Cap pagination at N pages | `--page-limit 5` |
| `--dry-run` | Preview request without executing | Good for verifying complex params |
| `--upload` | Multipart file upload | `--upload ./report.pdf` |

Use single quotes around JSON values in the shell to avoid history expansion issues (especially with `!` in Sheets ranges like `Sheet1!A:G`).

### Helper commands

These are hand-crafted shortcuts that simplify common operations:

| Command | What it does |
|---------|-------------|
| `gws docs +write` | Append text to a Google Doc |
| `gws sheets +read` | Read values from a spreadsheet |
| `gws sheets +append` | Append a row (`--spreadsheet ID --values "A,B,C"`) |
| `gws drive +upload` | Upload a file with automatic metadata |
| `gws gmail +send` | Send an email |
| `gws gmail +triage` | Show unread inbox summary |
| `gws calendar +agenda` | Show upcoming events |
| `gws calendar +insert` | Create a new event |

### Schema introspection

When you're unsure about parameters for any API method, look it up:

```bash
gws schema <method>
```

Example: `gws schema drive.files.list` shows the request/response schema. This is your first stop when you need to discover fields, parameter names, or valid values — don't guess, check the schema. Common lookups:
- `gws schema docs.documents.get` — reading documents
- `gws schema sheets.spreadsheets.values.get` — reading sheet values
- `gws schema docs.documents.batchUpdate` — modifying documents

### Error handling

- **Exit code 0**: success, JSON on stdout
- **Exit code 2**: authentication expired — re-run `gws auth login`
- **Non-zero exit**: error details on stderr
- **Stderr noise**: lines starting with `Using keyring backend:` are harmless, ignore them

### Extracting IDs from URLs

Google URLs contain the IDs you need:

| URL pattern | ID location |
|-------------|-------------|
| `https://docs.google.com/document/d/<DOC_ID>/edit` | Between `/d/` and `/edit` |
| `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit` | Between `/d/` and `/edit` |
| `https://drive.google.com/drive/folders/<FOLDER_ID>` | After `/folders/` |

### MIME types

| Google MIME type | Meaning |
|-----------------|---------|
| `application/vnd.google-apps.document` | Google Doc |
| `application/vnd.google-apps.spreadsheet` | Google Sheet |
| `application/vnd.google-apps.presentation` | Google Slides |
| `application/pdf` | PDF |

## For Other Skills

Any skill that needs Google Workspace access should reference this skill. The agent uses `gws` CLI commands directly via bash — no wrapper scripts needed. All gws commands return structured JSON that can be parsed directly.

If you're building a skill that depends on gws:
1. Check auth with `which gws && gws auth status` as a precondition
2. If auth fails, point the user to the gws skill for setup
3. Use the CLI commands documented above and in the prompt files for all operations
