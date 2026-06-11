---
name: cjl-requirements
description: Create or update lightweight versioned requirements docs and their PROD product-companion docs (journeys, flows, screens). Use when the user asks for requirements, specs, version scope, ready criteria, feature scope, source-of-truth docs, scope changes, journey or flow or screen docs tied to a feature, or a doc to hand to Codex `/goal`.
---

# CJL Requirements

Write the smallest requirements docs that make `/goal implement this` safer.

## Core Rule

Keep the active docs easy for a tired human to scan.

- `project-requirements.md` is the short active contract.
- `features/NNN-REQ-name.md` holds detailed feature scope (the contract).
- `features/NNN-PROD-name.md` holds product thinking for that feature (journeys, flows, screens).
- `archive/` holds implemented or superseded detail.
- `Backlog` holds real future ideas.
- Do not turn requirements into runbooks, handoffs, implementation plans, issues, or PRDs.

## Default Files

Use existing repo conventions first. If none exist, use:

```text
.agents/docs/requirements/
  project-requirements.md
  features/
    001-REQ-feature-name.md
    001-PROD-journey-and-screens.md
  archive/
    versions/
    features/
```

## File Naming

The number is the feature ID; the prefix is the doc job. Number comes first so every doc for one feature sorts together in a directory listing - that adjacency is the index, for humans and for implementing agents pointed at the folder.

- `059-REQ-content-library.md` - the contract for feature 059.
- `059-PROD-journey-and-screens.md` - product thinking for feature 059.
- In prose and titles, keep the spoken form: "REQ-059", "PROD-059". Filenames sort; prose reads.
- Only two prefixes exist: REQ and PROD. Mint a new prefix only after a third doc job recurs across real features - speculative taxonomy rots.

## Product Companions

PROD docs hold how the product works and why: user journeys, mode forks, screen sketches, agent touchpoints, growth paths, explorations. They are input to implementation, never authority. The split is contract vs thinking:

- **REQ** changes slowly and every line is binding. **PROD** changes freely and nothing in it is binding.
- A PROD doc never contains `In Scope`, `Out Of Scope`, or `Ready Means` sections, and a REQ doc's `Ready Means` never references a PROD doc. If satisfying the contract requires reading the companion, the contract is incomplete.
- When product exploration hardens into a commitment, move that sentence into the REQ doc. The PROD doc keeps the sketch; the REQ doc owns the decision.
- Every PROD doc opens with a self-declaring header (`Type` + `Contract` link, see Minimal Shapes) so it is unmistakable out of context. A PROD doc without a paired REQ doc is a smell.
- The REQ doc links its companions under a `Product Source` section.
- Companions archive together with their feature.

## Project Doc

`project-requirements.md` should usually contain only:

- project goal;
- version map;
- active version scope summary;
- active feature requirement links;
- ready criteria;
- open questions;
- short implemented-history links;
- backlog.

If a section needs many bullets, examples, schemas, CLI shapes, edge cases, or detailed tests, move it to a feature doc.

## Feature Docs

Use feature docs for feature-specific detail:

- workflows;
- inputs and outputs;
- data/runtime posture;
- edge cases and failure behavior;
- exact ready criteria;
- test/proof expectations;
- implementation constraints that affect scope or safety.

Feature docs must point back to the project doc and use stable IDs like `REQ-060`. The feature number is permanent; it survives renames, archiving, and companion docs.

## Archive Docs

When a version, feature, or slice ships or becomes obsolete:

1. Reality-sync against code, tests, docs, and live behavior when relevant.
2. Create an archive file under `archive/versions/` or `archive/features/`.
3. Record what was intended, what shipped, proof, gaps, and follow-ups.
4. Replace long active-doc detail with a short summary and archive link.
5. Move unfinished work to active requirements, `Backlog`, or `Open Questions`.
6. Move the feature's PROD companions to the same archive location - a companion without its contract is noise.

Archive slices as well as whole versions. Large versions like V1 should not stay fully expanded after each slice ships.

## Workflow

1. Identify the request: new doc, feature scope, re-scope, version change, reality sync, archive/collapse, or decision note.
2. Find the active source of truth before editing.
3. Decide where the change belongs: project doc, feature doc, archive, backlog, or open questions.
4. Keep the project doc high-level; prefer feature docs for detail.
5. Keep version-level `Out Of Scope` short and only for tempting boundary mistakes.
6. Write only the sections the work needs.
7. Record assumptions and unresolved decisions.
8. Add a short change note when useful.

## Minimal Shapes

Use these only when the repo has no better local convention.

```markdown
# Project Requirements

Status:
Last Updated:

## Version Map

- V0: Prototype / proof of concept.
- V1:

## Active Version

### Goal

### Scope Summary

### Feature Requirements

- REQ-001: <feature name> - <status>. See `features/001-REQ-feature-name.md`.

### Ready Means

### Open Questions

### Implemented History

- <summary>. See `archive/...`.

## Backlog

## Change Notes
```

```markdown
# REQ-001 <Feature> Requirements

Parent: `../project-requirements.md`
Project Version:
Status:
Last Updated:

## Goal

## Product Source

- `001-PROD-<topic>.md` - <what it sketches>. Input to implementation, not contract.

## In Scope

## Out Of Scope

## Ready Means

## Notes / Decisions

## Change Notes
```

Add extra feature sections only when they carry real weight, for example:

- `Behavior That Must Survive`
- `Runtime / Data Posture`
- `Risks / Open Questions`

Omit `Product Source` when the feature has no companion.

```markdown
# PROD-001 <Feature> <Topic>

Type: product companion - not requirements. Scope and decisions live in the contract.
Contract: `001-REQ-feature-name.md`
Last Updated:

<journeys, flows, screens, explorations - any shape that serves the thinking>
```

## Goal-Ready Check

A requirements doc is ready for `/goal implement this` when it has:

- clear scope;
- clear non-scope;
- ready criteria;
- important constraints;
- assumptions and unresolved questions.

If any are missing, ask or mark the assumption.

## Output

When done, state:

- source of truth used;
- change type;
- assumptions;
- files changed;
- unresolved risks.
