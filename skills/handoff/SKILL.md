---
name: handoff
description: Package topic-relevant context from the current conversation into a concise handoff for another agent or conversation.
argument-hint: "Topic or purpose of the handoff"
---

Create a concise handoff centered on the topic or purpose the user provides. Extract only the context relevant to that topic, including useful material that arose incidentally during otherwise unrelated work.

Preserve the difference between facts, user decisions, ideas or proposals, constraints, and unresolved questions. Do not turn suggestions into decisions or add recommended next steps. Include actions only when the user explicitly stated or requested them.

Reference existing artifacts such as plans, issues, commits, diffs, or designs instead of duplicating their contents. Redact secrets and sensitive personal information.

Save the handoff in the workspace-local `.agents/handoffs/` directory using a clear filename such as `YYYY-MM-DD-<topic>-handoff.md`. If no `.agents/` directory exists, create `.agents/handoffs/` in the current working directory and tell the user.

If the topic cannot be inferred from the request, ask what context the handoff should cover.
