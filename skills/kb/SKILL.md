---
name: kb
description: "Query, reference, and update a shared Google Drive knowledge base. Use this skill whenever the user says things like 'check the kb', 'reference our knowledge base', 'what do our docs say', 'check our shared docs', 'look up in our docs', 'reference our docs', 'what does our internal documentation say', 'sync the kb', 'refresh the manifest', 'update the kb', or any variation of asking about team knowledge, shared documentation, company guidelines, product direction docs. Also use when the user asks you to check existing docs before writing something, or when another skill needs to look up shared project knowledge. Even short phrases like 'check the kb' or 'reference the knowledge base' should trigger this skill."
---

# kb

A shared knowledge base backed by Google Drive. Humans write and edit docs naturally; agents read, query, and contribute through the gws skill — never direct edits.

This skill depends on the **gws skill** for all Google Drive, Docs, and Sheets operations.

## Precondition

Before routing, check two things:

### 1. gws auth

```bash
which gws && gws auth status
```

If gws is not installed or not authenticated, tell the user: "The kb skill needs the gws CLI to access Google Drive. Please run the gws skill to get set up first."

Do not attempt to walk through gws setup here — that's the gws skill's job.

### 2. KB config

Check if `.agents/kb/config.json` exists in the current working directory:

```bash
cat .agents/kb/config.json
```

If the file exists, it contains:
```json
{
  "folder_id": "<google-drive-folder-id>",
  "manifest_sheet_id": "<spreadsheet-id>",
  "folder_url": "<original-url>"
}
```

If the file **doesn't exist**, ask the user for their Google Drive folder URL or ID. Then:

1. Extract the folder ID from the URL (segment after `/folders/`)
2. Validate by listing it: `gws drive files list --params '{"q": "'"'"'<FOLDER_ID>'"'"' in parents and trashed = false", "pageSize": 1}'`
3. Save the config:
   ```bash
   mkdir -p .agents/kb
   cat > .agents/kb/config.json << 'CONF'
   {"folder_id": "<id>", "manifest_sheet_id": "", "folder_url": "<url>"}
   CONF
   ```
4. Then proceed to update the manifest (follow `prompts/update.md`)

## Intent Routing

**Update / sync** — the user wants to refresh the manifest or just connected a folder.
- "update the kb", "sync", "refresh the knowledge base", "index the docs"
- Also route here if this is the first time after connecting a folder
→ Read and follow `prompts/update.md`

**Query (default)** — the user has a question the KB might answer.
- Any question about project knowledge, guidelines, processes, decisions
- "what does our brand guide say about...", "check the KB for...", "what's our policy on..."
- This is the most common path — if in doubt, treat it as a query
→ Read and follow `prompts/query.md`

**Ambiguous** — if you genuinely can't tell, ask briefly:
> "Are you looking to query the KB or update the manifest?"

## Manifest Format

The `_kb_manifest` is a Google Sheet that indexes all docs in the KB folder. It has these columns:

| Column | Purpose |
|--------|---------|
| Title | Document name |
| Type | doc, sheet, slides, pdf, other |
| Doc ID | Google Drive file ID |
| Summary | AI-generated 2-3 sentence summary |
| Tags | Comma-separated tags (optional) |
| Last Modified | ISO 8601 timestamp |
| Status | "active" or "removed" |

## Typical flows

```
/kb                                            → query (if there's a question in context)
/kb update                                     → update manifest
/kb what's our brand voice for emails?         → query
```
