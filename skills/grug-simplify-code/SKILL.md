---
name: grug-simplify-code
description: Strip accidental complexity from code and make the main behavior obvious. Use when the user asks to simplify, de-overengineer, grug-brain, make code novice-readable, clean up clever abstractions, remove unnecessary architecture, or improve code by removing complexity while preserving behavior that matters.
---

# Grug Simplify Code

Make code boring, direct, and easy to trace. Treat complexity as debt unless it protects real behavior.

## Method

1. Find the real path: entry point, callers, tests, outputs, side effects.
2. Name what must stay: behavior, data formats, errors, permissions, persistence, compatibility.
3. Run a baseline when feasible.
4. Cut accidental complexity:
   - dead code
   - duplicated paths
   - speculative abstraction
   - clever generic helpers
   - config with one real value
   - layers that only pass data through
   - premature extensibility
5. Keep complexity that pays rent: domain rules, validation, auth, retries, migrations, concurrency, observability, external API quirks.
6. Verify the important behavior still works.
7. Report what got simpler and what was intentionally left alone.

## Simplicity Tests

Prefer code where:

- a novice can follow the main path top to bottom
- one behavior has one obvious home
- names describe domain facts, not architecture patterns
- errors are handled near where they happen
- tests prove real behavior, not mocks of implementation trivia
- fewer concepts are needed, even if line count is not minimal

## Anti-Neutering Rule

Do not delete code because it looks ugly. Delete it because evidence shows it is accidental.

If purpose is unknown, inspect callers, tests, logs, schemas, or runtime behavior. If still unknown, leave it and say why.

In production code, missing tests are not evidence that behavior is unused.

## Stop

Stop when further cleanup is taste, not clarity or behavior.
