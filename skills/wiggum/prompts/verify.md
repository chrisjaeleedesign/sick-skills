# Verify — Spec Verification

Two-stage verification: pre-loop (spec quality) and post-loop (spec vs. implementation).

User's request: $ARGUMENTS

## Mode Detection

Determine which mode to run:

1. Read `.wiggum/SPECS/` — get the spec content
2. Check for meaningful source code in the project root (beyond config/setup files)
   - If only `.wiggum/` exists with no real source code → **PRE-LOOP** mode
   - If meaningful source code exists → **POST-LOOP** mode
3. If `$ARGUMENTS` explicitly says "pre" or "post", respect that override

---

## PRE-LOOP Mode: Spec Quality Verification

Read all files in `.wiggum/SPECS/` and `.wiggum/IMPLEMENTATION_PLAN.md`.

Check for the following:

### Completeness
- Are all features described with enough detail for headless Claude to implement?
- Are there vague requirements like "should be fast" or "user-friendly" without concrete criteria?
- Flag: `CRITICAL` if a feature lacks implementation detail, `WARNING` if edge cases missing

### Ambiguity
- Are there requirements that could be interpreted multiple ways?
- Are terms used consistently throughout specs and plan?
- Flag: `WARNING` with suggested clarification

### Contradictions
- Do any specs conflict with each other?
- Do any plan tasks contradict spec requirements?
- Flag: `CRITICAL` if found

### Edge Cases
- What happens on errors? Is error handling specified?
- What about empty states (no data, first use)?
- Boundary conditions (max values, special characters, concurrent access)?
- Flag: `WARNING` for each missing edge case

### Forward Traceability (Plan → Spec)
- Does every task in the implementation plan correspond to a spec requirement?
- Are there orphan tasks with no spec backing?
- Flag: `INFO` for orphan tasks (may be legitimate setup/infrastructure tasks)

### Backward Traceability (Spec → Plan)
- Does every spec requirement have at least one plan task?
- Are there spec requirements with no implementation path?
- Flag: `CRITICAL` for unimplemented requirements

### Report Format

Present findings in this structure:

```
## Spec Verification Report (Pre-loop)

### Summary
- CRITICAL: N issues
- WARNING: N issues
- INFO: N notes

### Issues

#### [CRITICAL] [Category]: [Short description]
- **Spec reference**: [which spec, which section]
- **Detail**: [explanation of the issue]
- **Suggestion**: [how to fix]

#### [WARNING] [Category]: [Short description]
- **Spec reference**: [which spec, which section]
- **Detail**: [explanation]
- **Suggestion**: [how to fix]

#### [INFO] [Category]: [Short description]
- **Detail**: [explanation]

### Traceability Matrix

| Spec Requirement | Plan Task(s) | Status |
|-----------------|-------------|--------|
| [requirement] | Phase N, Task M | Covered |
| [requirement] | — | MISSING |
```

After presenting the report, offer to auto-fix issues or ask the user which to address.

---

## POST-LOOP Mode: Implementation Verification

Read all files in `.wiggum/SPECS/`, `.wiggum/IMPLEMENTATION_PLAN.md`, and the project source code.

For each spec requirement:
1. Identify the corresponding source files and code
2. Verify the implementation matches the spec
3. Classify as: Pass (matches), Gap (not implemented), or Drift (implemented differently)

### Report Format

```
## Spec Verification Report (Post-loop)

### Summary
- Passed: N requirements
- Gaps: N requirements (specified but not implemented)
- Drift: N requirements (implemented differently than specified)

### Per-Requirement Checklist

#### [Feature Name]

| Requirement | Status | Evidence |
|------------|--------|----------|
| [spec says X] | Pass | [file:line reference] |
| [spec says Y] | Gap | Not found in codebase |
| [spec says Z] | Drift | [file:line] — does A instead of Z |

### Recommendations
- [Actionable suggestions for addressing gaps and drift]

### UI/UX Conventions Check

If the project has UI components, additionally evaluate:

1. **Component library usage**: Read `.wiggum/AGENTS.md` for the Component Library section. Scan source files for hand-rolled components that duplicate library primitives. Flag as `Drift` if custom components were built when library ones exist.
2. **Conventional patterns**: Check that user-facing interactions use standard patterns (tabs, modals, dropdowns, forms, lists). Flag custom or novel interaction patterns as `Drift` with the standard alternative.
3. **Reference alignment**: If `.wiggum/SPECS/project_spec.md` has a UI Reference section, evaluate whether the implementation's patterns match those apps. Flag significant departures as `Drift`.
```

After presenting the report, suggest next steps:
- For gaps: `/wiggum add [missing feature]` to add implementation tasks
- For drift: Update specs to match implementation (if the drift is intentional) or add fix tasks
