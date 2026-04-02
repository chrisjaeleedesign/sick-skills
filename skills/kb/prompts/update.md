# Update

Scan the connected Drive folder and create or refresh the manifest. This is idempotent — safe to run anytime.

## Run the update

```
python3 <skill-dir>/scripts/kb.py update-manifest
```

This command handles the full flow:
1. Lists all files in the connected Drive folder
2. Checks if `_kb_manifest` sheet exists (creates it if not)
3. Compares folder contents against the manifest:
   - New files get added with AI-generated summaries
   - Modified files get their summaries regenerated
   - Files no longer in the folder get marked as `status: removed` (not deleted — they may return)
4. Writes all changes back to the manifest sheet

Summary generation uses an external model, so this may take a moment for folders with many new or changed docs. Progress is reported to stderr as each doc is processed.

## Report the results

After the update completes, tell the user what changed:
- How many docs were added, updated, and marked removed
- Total docs in the manifest
- If this was the first run, note that the manifest sheet was created

If any individual doc failed (permissions, unreadable format), note it but don't treat it as a failure of the whole update.

## When to suggest this

If the user mentions new docs, reorganization, or asks "is the KB up to date?", suggest running an update.
