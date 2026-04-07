# Update

Scan the connected Drive folder and create or refresh the manifest. This is idempotent — safe to run anytime.

## Step 1: Read config

```bash
cat .agents/kb/config.json
```

Get the `folder_id` and `manifest_sheet_id`.

## Step 2: List folder contents

```bash
gws drive files list --params '{"q": "'"'"'<FOLDER_ID>'"'"' in parents and trashed = false", "fields": "files(id,name,mimeType,modifiedTime)", "pageSize": 1000}'
```

Note all files, their IDs, names, types, and modification times. Ignore any file named `_kb_manifest` — that's the manifest itself.

Map MIME types to short names:
- `application/vnd.google-apps.document` → doc
- `application/vnd.google-apps.spreadsheet` → sheet
- `application/vnd.google-apps.presentation` → slides
- `application/pdf` → pdf
- anything else → other

## Step 3: Read current manifest

If `manifest_sheet_id` is set in the config:

```bash
gws sheets spreadsheets values get --params '{"spreadsheetId": "<manifest_sheet_id>", "range": "Sheet1!A:G"}'
```

If the manifest doesn't exist yet (no sheet ID, or the read fails), create one:

```bash
gws sheets spreadsheets create --json '{"properties": {"title": "_kb_manifest"}}'
```

Note the `spreadsheetId` from the response. Move it into the KB folder:

```bash
gws drive files update --params '{"fileId": "<new_sheet_id>", "addParents": "<FOLDER_ID>"}'
```

Write the header row:

```bash
gws sheets spreadsheets values update --params '{"spreadsheetId": "<new_sheet_id>", "range": "Sheet1!A1:G1", "valueInputOption": "RAW"}' --json '{"values": [["Title", "Type", "Doc ID", "Summary", "Tags", "Last Modified", "Status"]]}'
```

Update `.agents/kb/config.json` with the new `manifest_sheet_id`.

## Step 4: Diff folder against manifest

Compare the folder file list against the manifest rows by **Doc ID**:

- **New files** (in folder, not in manifest): these need summaries generated — go to Step 5
- **Modified files** (in both, but `modifiedTime` in folder differs from `Last Modified` in manifest): regenerate summary — go to Step 5
- **Unchanged files** (in both, same modification time): keep the existing row as-is
- **Removed files** (in manifest but not in folder): set Status to `removed` — don't delete the row, the doc might come back

## Step 5: Generate summaries for new or modified docs

For each doc that needs a summary, read it:

```bash
gws docs documents get --params '{"documentId": "<doc-id>"}'
```

Extract the text content from `body.content[].paragraph.elements[].textRun.content`.

Then write a 2-3 sentence summary. Focus on:
1. What knowledge or information the document contains
2. What decisions, guidelines, or rules it defines
3. When an agent should reference this document — be specific about trigger conditions

Be concrete. Instead of "contains information about pricing" write "defines the three pricing tiers (Starter, Pro, Enterprise) with feature breakdowns, usage limits, and the upgrade prompt logic for each tier boundary."

For sheets or other non-doc files that can't be read as text, write a summary based on the file name and type.

## Step 6: Write the updated manifest

Build the full values array — headers + all rows (new, updated, unchanged, and removed):

```bash
gws sheets spreadsheets values update --params '{"spreadsheetId": "<manifest_sheet_id>", "range": "Sheet1!A1:G", "valueInputOption": "RAW"}' --json '{"values": [["Title", "Type", "Doc ID", "Summary", "Tags", "Last Modified", "Status"], ["Doc Name", "doc", "abc123", "Summary text here", "", "2026-04-01T10:00:00Z", "active"], ...]}'
```

## Step 7: Report

Tell the user what changed:
- How many docs were **added** (new summaries generated)
- How many were **updated** (summaries regenerated)
- How many were **marked removed**
- Total docs in the manifest

If this was the first run, note that the manifest sheet was created.

If any individual doc failed to read (permissions, unsupported format), note it but don't treat it as a failure of the whole update.

## When to suggest this

If the user mentions new docs, reorganization, or asks "is the KB up to date?", suggest running an update.
