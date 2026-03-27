# Naming Pass

Scan for names that obscure meaning. Good names are the cheapest documentation. Generic or misleading names force readers to read the implementation to understand intent, multiplying cognitive load across every future reader.

## What to Detect

### 1. Generic Names (confidence: 65-80)
- Variables/functions named: `data`, `result`, `temp`, `tmp`, `val`, `value`, `item`, `element`, `obj`, `info`, `stuff`
- Functions named: `handler`, `process`, `handle`, `manage`, `run`, `execute`, `do`, `perform` (without a specific noun)
- Classes/modules named: `Manager`, `Handler`, `Processor`, `Helper`, `Utils`, `Misc`, `Common` (without domain specificity)
- **Search strategy**:
  - `Grep` for common generic names as function/variable/class declarations
  - Exclude: loop variables (`i`, `j`, `k`), short-lived lambda params, test fixtures
  - `Read` surrounding context to determine what the thing actually represents
  - Suggest a concrete name based on what the code does

### 2. Misleading Names (confidence: 70-85)
- `get*` functions that modify state (should be `fetch*` or `compute*` and separate the mutation)
- `is*`/`has*` functions that return non-boolean values
- Variables whose name implies a different type than they hold
- Functions whose name describes only part of what they do
- **Search strategy**:
  - `Grep` for `function get\w+|const get\w+ =` and check if any of them write/mutate
  - `Grep` for `function is\w+|function has\w+` and verify they return booleans
  - Look for names that include "and" or "or" (signs of doing too much)

### 3. Magic Numbers and Strings (confidence: 80-95)
- Numeric literals used in logic (not 0, 1, -1, or obvious array indices)
- String literals used as identifiers, status codes, or config keys in multiple places
- Timeout/interval values without named constants
- **Search strategy**:
  - `Grep` for numeric literals in conditionals: `[><=!]+\s*\d{2,}` (2+ digit numbers in comparisons)
  - `Grep` for `setTimeout|setInterval|delay|sleep` with literal numbers
  - Look for repeated string literals used as keys or identifiers
  - Exclude: test data, CSS values, well-known constants (like HTTP status 200, 404)

### 4. Abbreviations and Acronyms (confidence: 55-70)
- Inconsistent abbreviation usage (some places say `usr`, others `user`)
- Non-obvious abbreviations that aren't domain-standard
- Single-letter variables outside of tiny scopes (loops, lambdas)
- **Search strategy**:
  - Look for very short variable names (2-3 chars) in non-trivial scopes
  - Find inconsistent abbreviations by grepping for both forms
  - Exclude: industry-standard abbreviations (URL, HTTP, ID, DB, API)

### 5. Type-Encoding in Names (confidence: 60-75)
- Hungarian notation or type prefixes (`strName`, `arrItems`, `bIsActive`) in languages with type systems
- Redundant type suffixes (`userList`, `nameString`, `countNumber`) — if the type is declared, the name doesn't need it
- **Search strategy**:
  - `Grep` for patterns like `str[A-Z]`, `arr[A-Z]`, `num[A-Z]`, `b[A-Z][a-z]` in typed languages
  - Look for `*List`, `*Array`, `*Map`, `*String`, `*Number` suffixes

## Analysis Approach

1. **Context is king**: A name is only bad relative to what it represents. Always `Read` surrounding code before judging.
2. **Suggest, don't just flag**: For every bad name, propose a specific better name based on what the code actually does.
3. **Respect conventions**: If the project has a naming convention (even if it's not your preference), flag deviations from THAT convention, not from your ideal.
4. **Scale matters**: A generic name in a 3-line function is fine. The same name in a 50-line function or exported API is a problem.

## Confidence Guidelines

| Pattern | Confidence |
|---------|-----------|
| Magic number in comparison (mechanical) | 85-95 |
| Repeated string literal used as key (mechanical) | 80-90 |
| `get*` that mutates state (verifiable) | 75-85 |
| `is*` returning non-boolean (verifiable) | 75-85 |
| `data`/`result` as exported function param | 70-80 |
| Generic class name (`Manager`, `Utils`) | 65-75 |
| `data`/`result` as local in small function | 50-55 |
| Abbreviation judgment call | 55-65 |

## Output

Return each finding with: severity, confidence, file:line, title, what, why, fix (include the suggested concrete name).

- Misleading names (get that mutates) → severity: high
- Magic numbers in business logic → severity: medium
- Generic exported names → severity: medium
- Generic local names → severity: low
- Type-encoding in typed language → severity: low
