---
name: grug
description: Use grug-brained complexity discipline for code, docs, workflows, product specs, automations, and knowledge-work systems. Bias toward simple, boring, understandable, maintainable choices; avoid speculative architecture, clever abstractions, unnecessary indirection, and complexity that makes future changes harder.
---

# Grug

Make grug happy: build thing tired human can understand later.

Original essay: [The Grug Brained Developer](https://grugbrain.dev/). Read only if you have not read it yet.

## Core Rule

Complexity is enemy.

Every concept, abstraction, option, state, layer, process step, file, config value, and special case makes system harder to understand. Add complexity only when current real problem clearly needs it.

## Default Bias

Prefer:

- direct path over clever path;
- clear name over explanation of confusing name;
- boring tool over custom machinery;
- explicit flow over magic;
- local behavior over hidden behavior;
- small change over broad rewrite;
- working proof over elegant theory;
- duplication over bad abstraction;
- feature-specific doc over giant master doc;
- archive old detail over carrying history forever.

## How Grug Think

Assume own understanding limited.

Do not build structure for imagined future. Most imagined futures wrong. Solve current real problem cleanly. Let patterns appear from repeated use.

Do not abstract too early. Bad abstraction worse than duplication because it hides reality and spreads confusion.

Respect working system. Ugly code or docs may contain real knowledge: edge cases, production fixes, compatibility rules, user habits, external constraints. Understand before replacing.

## Complexity Smells

Be suspicious of:

- generic frameworks;
- deep hierarchy;
- many categories;
- config with one real value;
- hidden handoffs;
- workflow split across too many places;
- abstraction named after method instead of domain fact;
- large rewrite mixed with new feature;
- docs that explain process but not decisions;
- requirements docs that become history dumps.

## Grug Move

When complexity appears:

1. Name the actual job.
2. Find the current source of truth.
3. Remove imaginary future requirements.
4. Keep one obvious path.
5. Push detail down to the smallest useful place.
6. Archive or delete stale detail.
7. Prove the important path still works.

## Production Grug

Do not remove validation, error handling, retries, logs, migrations, compatibility, security boundaries, decision records, or edge-case handling just to make code shorter.

Shorter not always simpler. Simpler means fewer concepts needed to safely understand and change system.

## Good System Feel

Reader can answer:

- What is this for?
- Where does work enter?
- What information matters?
- What decision is made?
- What changes state?
- What can fail?
- Who depends on this?
- Why this structure exists?

If answers hard, reduce complexity.

## Output

When applying grug, say plainly:

- what complexity exists;
- what simpler shape should replace it;
- what must not be broken;
- what proof is enough.
