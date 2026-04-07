# Query

Find and retrieve knowledge from the Drive knowledge base to answer the user's question.

## Step 1: Read the manifest

Load the config to get the manifest sheet ID:

```bash
cat .agents/kb/config.json
```

Then read the manifest:

```bash
gws sheets spreadsheets values get --params '{"spreadsheetId": "<manifest_sheet_id>", "range": "Sheet1!A:G"}'
```

This returns rows with columns: Title, Type, Doc ID, Summary, Tags, Last Modified, Status.

Scan the **Summary** column to find docs relevant to the user's question. Summaries include "when to reference" signals — match on those. Focus on `active` docs (skip `removed` ones).

## Step 2: Decide what to fetch

Pick 1-3 docs whose summaries best match the question. Don't fetch everything — be selective. If the manifest is empty or nothing matches, skip to Step 4.

## Step 3: Fetch and read

For each relevant doc, read it using gws:

```bash
gws docs documents get --params '{"documentId": "<doc-id>"}'
```

Extract the text content from the response by walking `body.content[].paragraph.elements[].textRun.content`.

## Step 4: Respond

**If you found relevant docs:** Answer the question grounded in the doc content. Always cite which doc(s) you used — by name, not ID. If the answer spans multiple docs, note which parts came from where.

**If nothing matched:** Say so clearly. Don't guess or use general knowledge when the user is asking about their specific knowledge base. Suggest:
- Running `/kb update` if new docs may have been added
- Creating a doc for this topic if it doesn't exist yet

## Guiding principle

The knowledge base is the source of truth. When it covers a topic, use its content over your own knowledge. The user put information there specifically so agents would reference it.
