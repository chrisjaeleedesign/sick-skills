---
name: kb
description: "Query, reference, and update a shared Google Drive knowledge base using a workspace-local `.agents/kb/config.json` and the global `gws` CLI skill. Use when the user says to check, query, sync, refresh, update, or reference the KB/knowledge base/shared docs, or asks what internal docs say."
---

# kb

Shared knowledge base workflow backed by Google Drive.

This skill depends on the global `gws` skill and the `gws` CLI for Google Drive, Docs, and Sheets access. Use this skill for KB behavior; use `gws` for generic Google Workspace operations.

## Preconditions

1. Check auth:
   ```bash
   which gws && gws auth status
   ```
   If missing or unauthenticated, use the `gws` skill for setup.

2. Check project config:
   ```bash
   cat .agents/kb/config.json
   ```
   Required fields:
   - `folder_id`
   - `manifest_sheet_id`
   - `folder_url`

## Query

Use this when the user asks what the KB/shared docs say:

```bash
node /Volumes/Misc/sick-skills/skills/kb/scripts/kb-query.mjs --config .agents/kb/config.json --question "<question>" --limit 3
```

Answer from the returned sources. Cite source names. If no active source matches, say so directly and suggest running an update if docs may have changed.

## Update

Use dry-run first:

```bash
node /Volumes/Misc/sick-skills/skills/kb/scripts/kb-update.mjs --config .agents/kb/config.json --dry-run
```

Write only when the dry-run is expected:

```bash
node /Volumes/Misc/sick-skills/skills/kb/scripts/kb-update.mjs --config .agents/kb/config.json --write
```

The update script:
- uses shared-drive flags for Drive operations
- skips `_kb_manifest` and folders
- preserves removed rows instead of deleting history
- updates the manifest only with explicit `--write`

## Manifest Schema

The `_kb_manifest` sheet has:

`Title`, `Type`, `Doc ID`, `Summary`, `Tags`, `Last Modified`, `Status`

Only `active` rows are used for normal queries. `removed` rows are historical context and should not be cited as current truth.
