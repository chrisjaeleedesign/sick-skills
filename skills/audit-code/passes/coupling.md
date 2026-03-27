# Coupling Pass

Scan for coupling problems — code that is tangled across boundaries in ways that make changes expensive, error-prone, or surprising. Coupling issues are the primary driver of "shotgun surgery" where a simple change cascades across many files.

## What to Detect

### 1. Feature Envy (confidence: 65-80)
- A function that accesses data or methods from another module more than its own
- Code that reaches deep into another object's internals (long accessor chains)
- **Search strategy**:
  - Look for functions with many imports from a single other module
  - `Grep` for long property access chains: `\w+\.\w+\.\w+\.\w+` (3+ dots)
  - `Read` functions that heavily use another module's exports — if >50% of their logic is about the other module's data, the function likely belongs there

### 2. Shotgun Surgery Indicators (confidence: 60-75)
- A single concept (e.g., "user roles") that requires changes in 5+ files to modify
- **Search strategy**:
  - Pick key domain concepts from the codebase (look at directory names, common words in function names)
  - For each concept, `Grep` to find all files that reference it
  - If a concept is spread across many layers/modules with no clear central definition, flag it
  - Look for the same constant/enum/type defined or re-defined in multiple places

### 3. Data Clumps (confidence: 70-85)
- Same group of 3+ parameters passed together to multiple functions
- Same set of fields destructured together in multiple places
- **Search strategy**:
  - `Grep` for function signatures and look for repeated parameter groups
  - Find destructuring patterns that extract the same fields from different sources
  - Look for similar function signatures across different files

### 4. Wrong-Layer Logic (confidence: 65-80)
- Business logic in UI/presentation layer (validation, computation in components/views)
- Database queries or HTTP calls in business logic that should use a data access layer
- Formatting/display logic in data access code
- **Search strategy**:
  - In frontend code: `Grep` for direct API calls (`fetch`, `axios`, DB client) in component files
  - In UI components: look for complex calculations, state machines, or business rules
  - In data layer: look for string formatting, HTML generation, or UI-specific transforms
  - Check file naming and directory structure to understand intended layers

### 5. Circular Dependencies (confidence: 80-90)
- Module A imports from Module B, and Module B imports from Module A
- Indirect circles: A → B → C → A
- **Search strategy**:
  - For key modules, trace import chains
  - `Grep` for imports within each directory pair to find bidirectional references
  - Focus on modules that are imported widely — they're most likely to have circular deps

### 6. God Objects / God Modules (confidence: 70-85)
- A single file/module that is imported by a disproportionate number of other files
- A single class/object that holds state for many unrelated concerns
- **Search strategy**:
  - `Grep` for import statements referencing each module, count importers
  - Flag modules imported by >40% of the codebase (excluding genuine shared utilities like logging)
  - `Read` heavily-imported modules to check if they bundle unrelated concerns

## Analysis Approach

1. **Map the architecture first**: Use `Glob` and file structure to understand intended layers/boundaries before flagging violations
2. **Look for patterns, not individual instances**: One long accessor chain might be fine. The same pattern repeated 10 times is a coupling issue.
3. **Consider the domain**: Some coupling is inherent to the domain. Flag structural coupling, not domain coupling.
4. **Weight by change frequency**: Coupling in rarely-changed code is less harmful than in actively-developed code.

## Confidence Guidelines

| Pattern | Confidence |
|---------|-----------|
| Circular import (mechanical) | 85-90 |
| Same params passed together 3+ times (mechanical) | 75-85 |
| Component making direct DB/API calls (verifiable layer violation) | 70-80 |
| Module imported by >40% of codebase | 70-85 |
| Long accessor chains (3+ dots) pattern | 65-75 |
| Feature envy (judgment) | 65-75 |
| Shotgun surgery (concept spread across 5+ files) | 60-70 |
| Wrong-layer judgment calls | 60-70 |

## Output

Return each finding with: severity, confidence, file:line (list all involved files), title, what, why, fix.

- Circular dependencies → severity: high
- Wrong-layer logic (DB calls in UI) → severity: high
- Feature envy (pervasive pattern) → severity: medium
- Shotgun surgery indicators → severity: medium
- Data clumps → severity: low (medium if >3 occurrences)
- God modules → severity: medium
