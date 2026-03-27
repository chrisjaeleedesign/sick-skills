# Duplication Pass

Scan for duplicated logic. This is the highest-value audit pass — linters catch exact clones but miss near-clones and semantic duplicates. AI-generated code has 8x higher duplication rates (GitClear 211M-line study).

## What to Detect

### 1. Exact Clones (confidence: 90-100)
- 5+ consecutive lines that appear identically in multiple locations
- Same code copied between files or within a file
- **Search strategy**:
  - Use `Grep` to find distinctive lines (unique string literals, specific function calls, unusual patterns)
  - When a match appears in multiple files, `Read` both locations and compare surrounding context
  - Look for identical function bodies across files

### 2. Near-Clones (confidence: 75-90)
- Same structure and logic but with different variable names, string literals, or minor variations
- Functions that differ only in the data they operate on (candidates for parameterization)
- **Search strategy**:
  - Find functions with similar signatures (same parameter count, similar names)
  - `Grep` for similar structural patterns: same sequence of method calls, same control flow
  - Compare functions that handle similar entities (e.g., `processUser` vs `processOrder` with identical logic)

### 3. Semantic Duplicates (confidence: 55-75)
- Different implementations of the same business logic or algorithm
- Two functions that achieve the same result through different code paths
- Utility functions that reinvent what another utility already does
- **Search strategy**:
  - Look for functions with similar names or doc comments
  - Find files that import overlapping sets of dependencies
  - Check for multiple implementations of common operations (date formatting, validation, string manipulation)

### 4. Duplicated Constants/Config (confidence: 80-95)
- Same magic number or string literal used across multiple files
- Configuration values defined in multiple places instead of a shared constant
- **Search strategy**:
  - `Grep` for repeated string literals (URLs, error messages, config keys)
  - `Grep` for same numeric constants in different files

## Analysis Approach

1. **Start broad**: Use `Glob` to understand the file structure and identify files likely to contain similar code (same directory, similar names, similar size)
2. **Find anchors**: `Grep` for distinctive patterns — unique function calls, string literals, or structural markers that would appear in duplicated code
3. **Compare deeply**: When you find potential duplicates, `Read` both locations fully and compare logic, not just syntax
4. **Identify the "keep" candidate**: For each duplicate set, note which instance is more general, better named, or better located. The fix should consolidate to that one.

## Confidence Guidelines

| Pattern | Confidence |
|---------|-----------|
| 10+ identical lines in different files | 95-100 |
| 5-9 identical lines | 90-95 |
| Same logic, different variable names | 80-90 |
| Same structure, minor variations (extra guard, different defaults) | 75-85 |
| Similar purpose, different implementation | 55-70 |
| Duplicated string literals/constants | 85-95 |

## Output

Return each finding with: severity, confidence, file:line (both locations), title, what, why, fix.

- Exact clones of >20 lines → severity: high
- Exact clones of 5-20 lines → severity: medium
- Near-clones → severity: medium
- Semantic duplicates → severity: medium (high if both are actively used)
- Duplicated constants → severity: low

For the fix field, specify: which copy to keep, what to extract/parameterize, and where to put the shared version.
