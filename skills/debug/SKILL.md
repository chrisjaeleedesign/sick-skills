---
name: debug
description: "Run a structured bug investigation that creates and maintains a detailed repository issue, reproduces and traces the failure, diagnoses the cause, and proposes a fix. Use when the user explicitly invokes $debug or asks for this debug flow."
---

# Debug

Follow this flow in order, asking only questions that materially block an accurate investigation:

1. Clarify and understand the bug, distinguishing observed behavior, expected behavior, context, and unknowns.
2. Create a detailed issue in the confirmed repository after checking for duplicates; update an existing issue instead when it already covers the bug.
3. Reproduce the bug with the smallest credible case and capture exact steps, inputs, outputs, logs, screenshots, frequency, environment, and revision.
4. Trace the failing path and the surrounding system, test competing explanations, and diagnose the root cause or best-supported cause while separating verified facts from inferences.
5. Propose a fix at the correct architectural level. Consider shared responsibilities, parallel implementations, canonical sources, and every affected caller; prefer removing the source of divergence over patching one symptom. Compare materially different options, scope, risks, migration needs, and tests or acceptance criteria. Do not implement the fix unless the user's request also authorizes implementation.

Treat the issue as the durable investigation record. Start it with a precise title plus the report, impact, environment or revision, expected versus actual behavior, available evidence, initial reproduction information, and unresolved questions. Update that same issue as the investigation develops with the confirmed reproduction, scope, affected paths and ownership boundaries, trace evidence, diagnosis, useful discarded hypotheses, and final fix proposal; then report the issue link and conclusions to the user.
