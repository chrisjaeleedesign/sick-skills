# Complexity Pass

Scan for unnecessary complexity. AI-generated code tends toward defensive over-coding, premature abstraction, and functions that grow unchecked through iterative additions.

## What to Detect

### 1. God Functions (confidence: 70-85)
- Functions longer than 40 lines of logic (excluding comments and blank lines)
- Functions that do multiple distinct things (setup + process + format + save)
- **Search strategy**:
  - Use `Grep` to find function declarations — exemplar patterns: `(function\s+\w+|=>\s*\{|def\s+\w+|func\s+\w+)` (adapt to detected language)
  - `Read` each function, count logical lines, identify distinct responsibility sections
  - Look for functions with many local variables (>7) as a smell

### 2. Deep Nesting (confidence: 80-95)
- Code indented more than 3 levels deep within a function
- Nested callbacks, nested conditionals, nested loops
- **Search strategy**:
  - `Grep` for deeply indented lines — e.g., `^\s{16,}` for 4-space indent or `^\t{4,}` for tab indent (adapt to project style)
  - `Read` the surrounding function to understand the nesting structure
  - Check for patterns like `if` inside `if` inside `for` inside `try`

### 3. Defensive Over-Coding (confidence: 65-85)
- Null/undefined checks where types guarantee the value exists
- Try-catch around operations that cannot throw
- Defensive guards that duplicate validation already done upstream
- Redundant type assertions or casts
- **Search strategy**:
  - `Grep` for `if.*null|if.*undefined|if.*!=\s*null` patterns
  - Check if the guarded value comes from a typed source that guarantees non-null
  - Look for try-catch blocks around simple assignments or property access
  - Find `?? defaultValue` or `|| defaultValue` where the source is already guaranteed

### 4. Single-Use Abstractions (confidence: 60-75)
- Classes or functions used exactly once that add indirection without value
- Wrapper functions that just forward arguments to another function
- Interfaces/types with a single implementation
- **Search strategy**:
  - Find class/function declarations, then count their usage across the codebase
  - Look for thin wrappers: functions whose body is just one other function call
  - Find interfaces with `Grep`, then check if more than one class implements them

### 5. Over-Parameterized Functions (confidence: 70-85)
- Functions with more than 5 parameters
- Boolean parameters that control behavior (flag arguments)
- Options objects with many optional fields where only 1-2 are ever used
- **Search strategy**:
  - `Grep` for function signatures with many commas
  - Check call sites to see which parameters actually vary

### 6. Premature Abstraction (confidence: 55-70)
- Abstract base classes with one concrete subclass
- Strategy/factory patterns with a single strategy/product
- Plugin systems with one plugin
- Generic code that's only instantiated with one type
- **Search strategy**:
  - Find abstract classes/interfaces and count implementations
  - Look for factory functions that only produce one type
  - Find generic type parameters and check if they're always the same concrete type

## Confidence Guidelines

| Pattern | Confidence |
|---------|-----------|
| 4+ nesting levels (mechanical) | 85-95 |
| Function >60 lines | 80-85 |
| Function >40 lines | 70-80 |
| Null check on non-nullable typed value | 75-85 |
| Try-catch around non-throwing operation | 70-80 |
| Single-use class/function (mechanical count) | 65-75 |
| Wrapper that only forwards (mechanical) | 70-80 |
| Function with >5 parameters (mechanical) | 75-85 |
| Abstract class with 1 implementation | 60-70 |
| Judgment call on "too complex" | 55-65 |

## Output

Return each finding with: severity, confidence, file:line, title, what, why, fix.

- God functions (>60 lines) → severity: high
- Deep nesting (4+ levels) → severity: medium
- Defensive over-coding → severity: low (medium if pervasive)
- Single-use abstractions → severity: low
- Over-parameterized functions → severity: medium
