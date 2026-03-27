# Dead Code Pass

Scan for code that exists but serves no purpose. Dead code increases cognitive load, bundle size, and creates false signals about what the codebase does.

## What to Detect

### 1. Unused Exports (confidence: 90-100)
- Find all `export` statements (named exports, default exports)
- For each export, Grep across the codebase for imports of that symbol
- If no file imports it AND it's not an entry point (main, index, CLI), flag it
- **Search**: `Grep` for `export (function|const|class|type|interface|enum)` to find exports, then cross-reference with `Grep` for `import.*{symbolName}` or `import symbolName`

### 2. Unused Functions/Variables (confidence: 80-95)
- Find function/variable declarations that are never referenced elsewhere in their file or in other files
- Skip: entry points, event handlers registered by name, test helpers in test files
- **Search**: `Grep` for function declarations, then search for call sites

### 3. Unused Imports (confidence: 95-100)
- Find import statements where the imported symbol is never used in the file
- **Search**: `Grep` for `import` statements, then `Read` the file and check if each imported symbol appears in the file body

### 4. Unreachable Code (confidence: 90-100)
- Code after `return`, `throw`, `break`, `continue` statements (not in nested blocks)
- Branches that can never execute (e.g., `if (false)`, redundant else after return)
- **Search**: `Grep` for `^\s*(return|throw)\b` to find exit statements, then `Read` 5-10 lines after each match. If non-comment, non-blank code exists at the same or deeper indent level (and is not in a nested block), flag it.

### 5. Commented-Out Code (confidence: 70-85)
- Blocks of 3+ consecutive commented lines that look like code (contain `=`, `()`, `{`, `function`, `import`, `if`, `for`, etc.)
- Single-line comments that are just code with `//` or `#` prepended
- NOT: documentation comments, TODO/FIXME with explanation, license headers
- **Search**: `Grep` for multi-line comment blocks, then `Read` to verify they contain code

### 6. Stale TODOs (confidence: 50-70)
- TODO/FIXME/HACK/XXX markers with no actionable information or referencing completed/stale work
- TODOs referencing completed features or closed issues
- TODOs with no actionable information ("TODO: fix this")
- **Search**: `Grep` for `TODO|FIXME|HACK|XXX`

## Confidence Guidelines

| Pattern | Confidence |
|---------|-----------|
| Unused import (mechanical) | 95-100 |
| Exported symbol with zero importers | 90-95 |
| Code after return/throw at same level | 90-100 |
| Commented-out code block (>5 lines of code) | 80-85 |
| Commented-out code block (3-5 lines) | 70-80 |
| Function declared, zero call sites found | 80-90 |
| Stale TODO with vague text | 50-60 |
| Stale TODO referencing done work | 60-70 |

## Output

Return each finding with: severity, confidence, file:line, title, what, why, fix.

- Unused imports/exports → severity: low (if few), medium (if many in one file)
- Unreachable code → severity: medium
- Large commented-out blocks → severity: medium
- Unused functions → severity: medium (high if >20 lines)
