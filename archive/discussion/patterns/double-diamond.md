# Double Diamond Pattern

Structured design thinking: **Diverge → Converge → Diverge → Converge**

```
    PROBLEM SPACE          SOLUTION SPACE

   ╱            ╲         ╱            ╲
  ╱              ╲       ╱              ╲
 ╱   DISCOVER     ╲     ╱   DEVELOP      ╲
╱                  ╲   ╱                  ╲
────────────────────╲─╱────────────────────╲
                     ╲                      ╲
                      ╲   DEFINE            ╲   DELIVER
                       ╲                     ╲
                        ╲                     ╲
```

## When Active

- User says "design", "build", "implement", "how should we"
- Complex features requiring exploration
- Decisions with multiple valid approaches

## The Four Phases

### Phase 1: DISCOVER (Diverge)
**Goal**: Explore the problem space broadly

- What problem are we actually solving?
- Who is affected?
- What's the current state?
- What constraints exist?
- What have others done?

**Explore the codebase**: Look at related systems, existing patterns, dependencies.

**Ask broad questions**: Don't narrow yet. Understand the full landscape.

**Document in**: `## Exploration` section

---

**Phase Transition Prompt**:
> "I think we've explored the problem space. Here's what we know: [summary]. Ready to narrow down to the core problem? (Phase 2: Define)"

---

### Phase 2: DEFINE (Converge)
**Goal**: Narrow to the core problem statement

- What is THE problem we're solving? (singular)
- What's in scope vs out of scope?
- What does success look like?
- What are the constraints?

**Be specific**: Vague problem = vague solution

**Document in**: `## Problem Statement` section

---

**Phase Transition Prompt**:
> "Core problem defined: [statement]. Now let's explore solutions broadly. Ready? (Phase 3: Develop)"

---

### Phase 3: DEVELOP (Diverge)
**Goal**: Explore solution options broadly

- What are all the ways we could solve this?
- What are the trade-offs of each?
- What does the codebase already support?
- What would need to change?

**Generate options**: Don't commit yet. Explore 3+ approaches.

**Use DeepThink**: This is a great phase for multi-persona thinking.

**Document in**: `## Exploration` with sub-sections per option

---

**Phase Transition Prompt**:
> "We've explored these options: [list]. Ready to converge on a recommendation? (Phase 4: Deliver)"

---

### Phase 4: DELIVER (Converge)
**Goal**: Narrow to the recommended approach

- Which option best solves the problem?
- What's the implementation path?
- What are the risks and mitigations?
- What's the first step?

**Make a recommendation**: Be decisive. State your reasoning.

**Document in**: `## Decisions` and `## Plan` sections

---

**Session End Prompt**:
> "Here's my recommendation: [summary]. Want me to generate a detailed implementation plan?"

---

## Phase Transition Rules

1. **Always ask before transitioning** - User must confirm
2. **Allow going back** - "Let's go back to Discover" is valid
3. **Skip phases if appropriate** - Simple problems may not need all 4
4. **Track current phase** in the discussion document

## Example

```
User: /discussion how should we add real-time notifications?