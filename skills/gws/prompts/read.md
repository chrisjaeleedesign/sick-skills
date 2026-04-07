# Read

How to read Google Docs, list Drive folders, and read spreadsheets using gws.

## Read a Google Doc

```bash
gws docs documents get --params '{"documentId": "<DOC_ID>"}'
```

This returns the full Docs API JSON. The document text is nested inside:

```
body.content[] → paragraph.elements[] → textRun.content
```

To extract plain text, walk that structure and concatenate all `textRun.content` values. Paragraphs are separated by newlines within the content strings.

The response also includes the document `title` at the top level.

## List a Drive folder

The query parameter needs the folder ID in single quotes inside the JSON. Use double quotes for the outer shell string and escape the inner quotes:

```bash
gws drive files list --params "{\"q\": \"'<FOLDER_ID>' in parents and trashed = false\", \"fields\": \"files(id,name,mimeType,modifiedTime)\", \"pageSize\": 1000}"
```

Alternatively, use a variable to keep it readable:

```bash
FOLDER_ID="<your-folder-id>"
gws drive files list --params "{\"q\": \"'${FOLDER_ID}' in parents and trashed = false\", \"fields\": \"files(id,name,mimeType,modifiedTime)\", \"pageSize\": 1000}"
```

This returns a `files` array. Each file has:
- `id` — the file's unique ID (use this for subsequent operations)
- `name` — display name
- `mimeType` — type of file (see MIME type table in SKILL.md)
- `modifiedTime` — ISO 8601 timestamp of last modification

For folders with more than 1000 files, use `--page-all` to auto-paginate.

## Read a spreadsheet

**Helper command (simple reads):**
```bash
gws sheets +read --spreadsheet <SHEET_ID>
```

**Full API (specify range, more control):**
```bash
gws sheets spreadsheets values get --params '{"spreadsheetId": "<SHEET_ID>", "range": "Sheet1!A:G"}'
```

Returns a `values` array — each element is a row (array of cell values). The first row is typically headers.

## Write to a spreadsheet

```bash
gws sheets spreadsheets values update --params '{"spreadsheetId": "<SHEET_ID>", "range": "Sheet1!A1:G", "valueInputOption": "RAW"}' --json '{"values": [["Header1", "Header2"], ["val1", "val2"]]}'
```

**Append a row:**
```bash
gws sheets +append --spreadsheet <SHEET_ID> --values "val1,val2,val3"
```

## Create a spreadsheet

```bash
gws sheets spreadsheets create --json '{"properties": {"title": "<TITLE>"}}'
```

Returns the new spreadsheet's `spreadsheetId`. To move it into a specific folder:

```bash
gws drive files update --params '{"fileId": "<SHEET_ID>", "addParents": "<FOLDER_ID>"}'
```

## Upload a file

```bash
gws drive +upload --upload ./local-file.pdf
```

Or with metadata:
```bash
gws drive files create --json '{"name": "report.pdf", "parents": ["<FOLDER_ID>"]}' --upload ./report.pdf
```

## Tips

- Use `--dry-run` to preview any command before executing it
- Use `gws schema <method>` to discover parameters for any API method (e.g., `gws schema sheets.spreadsheets.values.get`)
- All string values in `--params` JSON need proper quoting — use single quotes for the outer shell string
