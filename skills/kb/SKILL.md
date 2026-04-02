---
name: kb
description: "Connect to a Google Drive knowledge base that agents can query and contribute to. Use whenever the user mentions knowledge base, KB, shared docs, Drive folder, updating docs, querying team knowledge, leaving comments on docs, or wants to set up a collaborative knowledge layer. Also triggers when another skill needs to look up shared project knowledge."
---

# kb

A shared knowledge base backed by Google Drive. Humans write and edit docs naturally; agents read, query, and contribute through comments — never direct edits.

## Precondition

Before routing, check if gws is ready and the KB is configured:

```
python3 <skill-dir>/scripts/kb.py check
```

- If gws is **not installed** or **not authenticated** → read and follow `prompts/setup.md`
- If no `.agents/kb/config.json` exists → read and follow `prompts/setup.md` (folder connection step)

Only proceed to intent routing if gws is installed, authenticated, and config exists.

## Intent Routing

Read the user's message and figure out what they need:

**Update / sync** — the user wants to refresh the manifest or just connected a folder.
- "update the kb", "sync", "refresh the knowledge base", "index the docs"
- Also route here if this is the first time after setup
- → Read and follow `prompts/update.md`

**Suggest / comment** — the user wants the agent to contribute to a doc.
- "leave a comment on...", "suggest an edit to...", "note on the pricing doc that..."
- "flag that X is outdated", "add a note about..."
- → Read and follow `prompts/suggest.md`

**Query (default)** — the user has a question the KB might answer.
- Any question about project knowledge, guidelines, processes, decisions
- "what does our brand guide say about...", "check the KB for...", "what's our policy on..."
- This is the most common path — if in doubt, treat it as a query
- → Read and follow `prompts/query.md`

**Ambiguous** — if you genuinely can't tell, ask briefly:
> "Are you looking to query the KB, update the manifest, or leave a comment on a doc?"

## Typical flows

```
/kb                                            → query (if there's a question in context)
/kb update                                     → update manifest
/kb what's our brand voice for emails?         → query
/kb comment on the pricing doc: tiers changed  → suggest
```
