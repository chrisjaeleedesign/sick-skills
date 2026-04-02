# Suggest

Leave an inline comment on a document in the knowledge base. Comments appear directly in the doc text as styled `<<AI: ...>>` blocks — purple-highlighted, italic, visually distinct from human content.

## Find the target doc

If the user names a specific doc, find it in the manifest:
```
python3 <skill-dir>/scripts/kb.py read-manifest
```

If they refer to something from a recent query, use the doc you already retrieved.

If ambiguous, ask which doc they mean.

## Read the doc first

Before commenting, read the doc to understand its content and find the right place to insert:
```
python3 <skill-dir>/scripts/kb.py read-doc --doc-id <doc-id>
```

Find a text passage near where the comment should go. You'll use this as the `--after` anchor.

## Post the inline comment

```
# After a specific passage
python3 <skill-dir>/scripts/kb.py inline-comment --doc-id <doc-id> --content "Your comment here" --after "exact text from the doc to insert after"

# At the end of the document (if no specific location needed)
python3 <skill-dir>/scripts/kb.py inline-comment --doc-id <doc-id> --content "Your comment here"
```

The `--after` text must be an exact substring from the document. Pick a short, unique passage near where the comment belongs — the end of a sentence or heading works well.

## Writing good inline comments

Comments should be clear and actionable. Include context about what you're flagging and why.

For observations:
> This section doesn't mention how international users are handled. Worth adding if geographic scope has been decided.

For suggested edits, include the current text and proposed replacement:
> Suggested edit: Change 'Weekly is the cleanest default starting assumption' to 'Weekly is the default cadence for V1, with flexibility to adjust after the first month.' Reason: makes the decision concrete for V1.

## Cleanup

To remove all AI comments from a doc:
```
python3 <skill-dir>/scripts/kb.py cleanup --doc-id <doc-id>
```

This strips all `<<AI: ...>>` blocks and restores the doc to human-only content.

## Guardrails

**Only insert `<<AI: >>` blocks.** Do not use the Docs API to directly edit, delete, or rewrite any human-authored content. The agent adds clearly marked inline comments; humans decide what to act on.

If the user asks you to directly edit doc content (not just leave a comment), explain: "I can leave an inline comment with the exact change I'd recommend. Want me to do that?"
