---
name: simplify-and-test-code
description: Simplify code while preserving required behavior, then prove the important paths still work. Use when the user asks to simplify, reduce overengineering, fix overcomplicated code, make code easier to follow for a novice programmer, make code novice-readable, remove unnecessary architecture, clean up agent-generated code, get the core flow working, test thoroughly, run smoke tests, or keep equivalent behavior with less accidental complexity. Applies to early-stage and production code, with stricter behavior-preservation and verification for production-facing changes.
---

# Simplify And Test Code

Make code easier to understand while proving the behavior still works. Prefer direct, boring, traceable implementation over premature architecture.

## Locate The Target

First determine what code the user means.

Use, in order:

1. Explicit files, folders, stack traces, URLs, PRs, terminal output, or pasted code.
2. Recent worktree changes and recently edited files.
3. Search terms from the user's request.
4. Relevant callers, tests, entry points, runtime commands, and generated outputs.

If the target is still ambiguous after inspection, ask one concise clarifying question.

## Workflow

1. Map the current behavior: entry points, callers, data flow, storage, tests, external services, and expected outputs.
2. Identify the behavior that must remain true from concrete evidence: tests, callers, CLI/API contracts, schemas, fixtures, saved files, screenshots, logs, or live outputs.
3. Capture a baseline before editing when feasible: run the relevant tests, smoke command, fixture, export, screenshot flow, or saved-output check.
4. Pick the simplification mode:
   - **Early-stage mode:** simplify aggressively, remove premature architecture, collapse unnecessary layers, and bias toward one readable main path.
   - **Production mode:** make smaller behavior-preserving refactors, keep compatibility, and verify more carefully.
5. Remove accidental complexity: unused abstractions, dead code, duplicated pathways, generated cruft, unnecessary indirection, speculative extensibility, and premature hardening.
6. Keep essential complexity: domain rules, security checks, persistence compatibility, external API quirks, migrations, concurrency safeguards, and observability that is actually used.
7. Add or keep focused tests around important behavior. If coverage is weak, add characterization tests, golden outputs, or live smoke checks before risky refactors.
8. Run the right verification:
   - unit tests for local logic
   - integration tests for databases, files, APIs, browsers, queues, scrapers, or external services
   - live smoke tests when mocks would miss the real risk
9. Report concrete evidence: files changed, code removed, before/after simplicity signal, tests run, records/files/outputs created, where outputs live, and remaining caveats.

## Production Guardrails

For production-facing code:

- Preserve observable behavior unless the user explicitly asks for behavior change.
- Preserve public APIs, stored data compatibility, secrets handling, and deployment assumptions.
- Avoid schema or data deletion without an explicit migration plan.
- Do not remove logging, retries, validation, permission checks, or safety checks unless proven unused or harmful.
- Prefer small, reviewable steps over wholesale rewrites.
- Run existing tests before and after when feasible.
- Do not reduce meaningful test coverage without saying why.
- Call out residual risk clearly.

## Success Criteria

The work is successful when:

- The main path is easier for a novice programmer to trace.
- Required functionality still works end to end.
- Tests pass.
- Real integration behavior is verified when relevant.
- Local files, database rows, exports, screenshots, or other workflow outputs are checked when the workflow creates them.
- The code has less accidental complexity, and ideally less code.
- Remaining complexity is either necessary or explicitly deferred.

Stop when further cleanup would be preference-level rather than behavior- or clarity-improving.

## Avoid

- Do not rewrite based on vibes before inspecting current behavior.
- Do not delete required functionality just to reduce line count.
- Do not hide complexity behind more files or abstractions.
- Do not treat unit tests as enough when the actual risk is integration behavior.
- Do not productionize unless the user asks for productionization.
