# Suggest

Leave inline comments on Google Docs. Comments appear directly in the document text as styled `<<AI: ...>>` blocks — purple-highlighted, italic, visually distinct from human content.

The key principle: agents add clearly marked inline comments. They never directly edit, delete, or rewrite human-authored content. If asked to edit a doc, explain that you can leave an inline comment with the exact change you'd recommend.

## Find the target doc

If the user names a specific doc, you need its document ID. Ask for a URL or ID, or look it up via Drive:

```bash
gws drive files list --params '{"q": "name contains '\''<search-term>'\'' and trashed = false", "fields": "files(id,name,mimeType)"}'
```

## Read the doc first

Before commenting, read the doc to understand its content and find the right insertion point:

```bash
gws docs documents get --params '{"documentId": "<DOC_ID>"}'
```

## Choose your approach

**Append at the end** — use when the comment is general feedback about the whole doc, or when precise placement isn't important. This is simpler and less error-prone.

**Insert at a specific location** — use when the comment relates to a particular section and should appear right next to it. This requires working with document indexes.

## Append a comment at the end (simple)

```bash
gws docs +write --document <DOC_ID> --text $'\n<<AI: Your comment here>>\n'
```

Note: `+write` only appends — it cannot insert at arbitrary positions and does not support styling. Use this when quick feedback is more important than precise placement.

## Insert a comment at a specific location (precise)

This requires finding the exact character index where you want to insert. It's more work but places the comment in context.

### Step 1: Get the document structure

```bash
gws docs documents get --params '{"documentId": "<DOC_ID>"}'
```

### Step 2: Find the insertion index

Walk the document body to find your target text:

```
body.content[] → paragraph.elements[] → textRun
```

Each `textRun` has `startIndex` and `endIndex` fields. Find the text passage you want to insert after, and note its `endIndex` — that's your insertion point.

### Step 3: Insert text and apply styling

Use a `batchUpdate` with two requests — one to insert the text, one to style it:

```bash
gws docs documents batchUpdate --params '{"documentId": "<DOC_ID>"}' --json '{
  "requests": [
    {
      "insertText": {
        "location": {"index": <INSERT_INDEX>},
        "text": "\n<<AI: Your comment here>>\n"
      }
    },
    {
      "updateTextStyle": {
        "range": {
          "startIndex": <INSERT_INDEX>,
          "endIndex": <INSERT_INDEX + length of inserted text>
        },
        "textStyle": {
          "backgroundColor": {"color": {"rgbColor": {"red": 0.9, "green": 0.82, "blue": 1.0}}},
          "foregroundColor": {"color": {"rgbColor": {"red": 0.4, "green": 0.2, "blue": 0.6}}},
          "italic": true,
          "fontSize": {"magnitude": 9, "unit": "PT"}
        },
        "fields": "backgroundColor,foregroundColor,italic,fontSize"
      }
    }
  ]
}'
```

The styling makes AI comments visually distinct: light purple background, dark purple text, italic, 9pt font.

## Writing good comments

Be clear and actionable. Include context about what you're flagging and why.

**For observations:**
> <<AI: This section doesn't mention how international users are handled. Worth adding if geographic scope has been decided.>>

**For suggested edits, show current → proposed:**
> <<AI: Suggested edit: Change 'Weekly is the cleanest default' to 'Weekly is the default cadence for V1, with flexibility to adjust after the first month.' Reason: makes the decision concrete for V1.>>

## Cleanup — remove all AI comments

To strip all `<<AI: ...>>` blocks from a document:

1. Get the doc JSON via `gws docs documents get`
2. Walk the body content and find all text matching the pattern `<<AI: ...>>`
3. Note the `startIndex` and `endIndex` of each match (include surrounding newlines if they were added)
4. Build `deleteContentRange` requests for each match, **processing in reverse order** (highest index first) so deletions don't shift the indexes of subsequent ranges
5. Send as a single `batchUpdate`:

```bash
gws docs documents batchUpdate --params '{"documentId": "<DOC_ID>"}' --json '{
  "requests": [
    {"deleteContentRange": {"range": {"startIndex": <START>, "endIndex": <END>}}},
    ...
  ]
}'
```

This restores the doc to human-only content without affecting anything else.
