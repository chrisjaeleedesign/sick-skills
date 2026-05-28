---
name: grug-complexity-philosophy
description: Complexity philosophy for agents doing code, docs, workflows, product specs, automations, or knowledge-work systems. Use to bias work toward simple, boring, understandable, maintainable systems; avoiding speculative architecture, clever abstractions, unnecessary indirection, and complexity that makes future changes harder.
---

# Grug Complexity Philosophy

Build systems for a tired human who has to understand them later.

## Core Belief

Complexity is the main enemy.

Every new concept, abstraction, process step, dependency, option, state, layer, callback, document, config value, and special case makes the system harder to understand. Add complexity only when the current problem clearly needs it.

## Default Bias

Prefer:

- direct paths over clever paths
- clear names over explanations of confusing names
- simple structures over elaborate taxonomies
- local behavior over hidden behavior
- explicit flow over magic
- boring tools over custom machinery
- small changes over broad rewrites
- working systems over elegant plans
- real-world proof over theoretical confidence

## How To Think

Assume your own understanding is limited.

Do not create structure because you can imagine future requirements. Most imagined futures are wrong. Solve the current real requirement cleanly. Let future patterns appear from repeated real use.

Do not abstract too early. A bad abstraction is worse than duplication because it hides reality and spreads confusion.

Duplication is acceptable when the shared shape is not yet obvious. Remove duplication only when the shared structure makes the system easier to understand.

Respect working systems. Ugly systems may contain real knowledge: edge cases, production fixes, team habits, external constraints, compatibility rules, customer needs, or business rules. Understand them before replacing them.

## Complexity Warnings

Be suspicious of:

- generic frameworks
- deep hierarchy
- too many categories
- config that has only one real value
- hidden handoffs
- workflows split across many places
- abstractions named after methods instead of real domain facts
- large rewrites mixed with new work
- metrics or tests that measure proxies instead of real outcomes
- docs that explain process but not decisions

## Production Mindset

Real systems must survive real inputs, partial failures, old data, slow services, permission boundaries, handoffs, debugging, onboarding, and future change.

Do not remove validation, error handling, permissions, retries, logs, migrations, compatibility, decision records, or edge-case handling just because it makes the system shorter.

Shorter is not automatically simpler. Simpler means fewer concepts are needed to understand and safely change the system.

## Good Systems Feel Like

A reader can answer:

- What is this for?
- Where does work enter?
- What information matters?
- What decisions are made?
- What changes state?
- What can fail?
- Who depends on this?
- Why does this structure exist?

If those answers are hard, reduce complexity.
