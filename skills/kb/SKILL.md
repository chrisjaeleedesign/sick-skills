---
name: kb
description: "Query, reference, and contribute to a shared Google Drive knowledge base. Use this skill whenever the user says things like 'check the kb', 'reference our knowledge base', 'what do our docs say', 'check our shared docs', 'look up in our docs', 'reference our docs', 'what does our internal documentation say', 'sync the kb', 'refresh the manifest', 'update the kb', 'leave a note on the doc', 'flag something in a doc', or any variation of asking about team knowledge, shared documentation, company guidelines, product direction docs, or wanting to set up, query, update, or contribute to a collaborative knowledge layer in Google Drive. Also use when the user asks you to check existing docs before writing something, or when another skill needs to look up shared project knowledge. Even short phrases like 'check the kb' or 'reference the knowledge base' should trigger this skill."
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
