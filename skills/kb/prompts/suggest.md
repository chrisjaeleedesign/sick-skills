# Suggest

Leave a comment or suggestion on a document in the knowledge base. This is how the agent contributes back — through comments, never through direct edits.

## Find the target doc

If the user names a specific doc, find it in the manifest:
```
python3 <skill-dir>/scripts/kb.py read-manifest
```

If they refer to something from a recent query, use the doc you already retrieved.

If ambiguous, ask which doc they mean.

## Decide the type

**Comment (default):** For observations, questions, notes, or flags. Use this when the agent notices something is outdated, incomplete, or worth flagging for human review.

**Anchored comment:** When the observation is about a specific passage, include the quoted text so the comment attaches to that section of the document rather than floating at the doc level.

## Post the comment

```
# General comment
python3 <skill-dir>/scripts/kb.py comment --file-id <doc-id> --content "Your comment text here"

# Anchored to specific text
python3 <skill-dir>/scripts/kb.py comment --file-id <doc-id> --content "This date may need updating" --quote "Q1 2026"
```

## Guardrails

**Never use direct edit mode.** The agent reads and comments. Humans accept, reject, or edit. This is the foundational principle of the knowledge base — founders maintain control over the content.

If the user asks you to directly edit a doc, explain the model: "The KB is set up so agents contribute through comments and suggestions, and humans decide what to accept. I can leave a detailed comment with the exact change I'd recommend — want me to do that instead?"

For specific text changes, write the comment as a clear suggestion:
> "Suggested edit: Change '[current text]' to '[proposed text]'. Reason: [why]."

This gives the human everything they need to accept or reject with one click.
