---
name: design-an-interface
description: Generate and compare radically different interface designs for a module. Use only when the user explicitly invokes $design-an-interface or asks to design the same interface multiple ways.
disable-model-invocation: true
---

# Design an Interface

Based on "Design It Twice" from "A Philosophy of Software Design": your first idea is unlikely to be the best. Generate multiple radically different designs, then compare.

## Workflow

### 1. Establish the design boundary

Before designing, understand:

- [ ] What problem does this module solve?
- [ ] Who are the callers? (other modules, external users, tests)
- [ ] What are the key operations?
- [ ] Any constraints? (performance, compatibility, existing patterns)
- [ ] What should be hidden inside vs exposed?

Infer these from the repository when possible. Ask only when a missing answer
would materially change the candidate interfaces.

### 2. Generate designs in parallel

Use the available subagent mechanism to generate at least three viable,
radically different approaches. Assign a different governing constraint to
each candidate. During this divergence phase, do not let an always-on
simplicity preference collapse the candidates into the same shape.

```
Prompt template for each sub-agent:

Design an interface for: [module description]

Requirements: [gathered requirements]

Constraints for this design: [assign a different constraint to each agent]
- Agent 1: "Minimize method count - aim for 1-3 methods max"
- Agent 2: "Maximize flexibility - support many use cases"
- Agent 3: "Optimize for the most common case"
- Agent 4: "Take inspiration from [specific paradigm/library]"

Output format:
1. Interface signature (types/methods)
2. Usage example (how caller uses it)
3. What this design hides internally
4. Trade-offs of this approach
```

### 3. Present the caller experience

Show each design with:

1. **Interface signature** - types, methods, params
2. **Usage examples** - how callers actually use it in practice
3. **What it hides** - complexity kept internal

Keep each design concrete enough to evaluate from the caller's perspective.

### 4. Compare designs

After showing all designs, compare them on:

- **Interface simplicity**: fewer methods, simpler params
- **General-purpose vs specialized**: flexibility vs focus
- **Implementation efficiency**: does shape allow efficient internals?
- **Depth**: small interface hiding significant complexity (good) vs large interface with thin implementation (bad)
- **Ease of correct use** vs **ease of misuse**

Highlight where the designs genuinely diverge and what each makes easier or
harder.

### 5. Synthesize

Apply Ponytail's simplicity discipline only now: prefer the least complex
candidate that satisfies the actual callers and constraints. Combine designs
only when the combination removes a demonstrated weakness rather than adding
speculative flexibility.

Ask when user judgment is still needed:

- "Which design best fits your primary use case?"
- "Any elements from other designs worth incorporating?"

## Evaluation Criteria

From "A Philosophy of Software Design":

**Interface simplicity**: Fewer methods, simpler params = easier to learn and use correctly.

**General-purpose**: Can handle future use cases without changes. But beware over-generalization.

**Implementation efficiency**: Does interface shape allow efficient implementation? Or force awkward internals?

**Depth**: Small interface hiding significant complexity = deep module (good). Large interface with thin implementation = shallow module (avoid).

## Anti-Patterns

- Don't let sub-agents produce similar designs - enforce radical difference
- Don't skip comparison - the value is in contrast
- Don't implement - this is purely about interface shape
- Don't let implementation effort dominate interface quality, but identify
  designs that force disproportionate hidden complexity
