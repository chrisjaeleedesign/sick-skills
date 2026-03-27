# Inconsistency Pass

Scan for inconsistent patterns within the codebase. When different parts of a codebase handle the same concept in different ways, it creates confusion about which approach is correct and makes the codebase harder to navigate.

## What to Detect

### 1. Error Handling Inconsistency (confidence: 70-85)
- Some modules use try-catch, others use Result/Either types, others return null
- Mixed approaches to error propagation (throw vs return vs callback)
- Inconsistent error message formats
- **Search strategy**:
  - `Grep` for `try\s*{`, `catch`, `throw`, `.catch(`, `Result<`, `Either<`
  - Group by directory/module and note which approach each area uses
  - Flag when adjacent or related modules use different approaches

### 2. Naming Convention Inconsistency (confidence: 75-90)
- Mixed camelCase and snake_case in the same language
- Mixed naming patterns for the same concept (e.g., `getUserById` vs `fetchUser` vs `loadUser`)
- Inconsistent prefixes/suffixes for the same type of thing (e.g., `UserService` vs `OrderManager` vs `ProductHandler`)
- **Search strategy**:
  - `Grep` for function names matching `(get|fetch|load|find|retrieve|read)` + entity name
  - Check file names for naming consistency
  - Look for mixed case conventions within files of the same type

### 3. Structural Inconsistency (confidence: 60-80)
- Same type of module structured differently (one uses classes, another uses plain functions)
- Mixed abstraction levels — one module is fully abstracted, its sibling is raw procedural code
- Inconsistent file organization (some features have dedicated directories, others are single files)
- **Search strategy**:
  - `Glob` to map the directory structure
  - Compare files that serve similar purposes (controllers, services, utilities)
  - Check if similar modules export similar interfaces

### 4. API/Interface Inconsistency (confidence: 70-85)
- Similar functions with different parameter orders for the same concept
- Mixed return types for similar operations (some return the object, some return void, some return boolean)
- Inconsistent use of async/await vs callbacks vs promises
- **Search strategy**:
  - Find functions that operate on the same entities
  - Compare their signatures and return types
  - Check for mixed async patterns in the same module

### 5. Import/Module Inconsistency (confidence: 75-90)
- Mixed import styles (default vs named, relative vs absolute paths)
- Same utility imported from different paths in different files
- Re-exports that create multiple valid import paths for the same symbol
- **Search strategy**:
  - `Grep` for import statements, compare patterns across files
  - Look for the same symbol imported via different paths
  - Check for barrel files (index.ts) that create aliased imports

## Analysis Approach

1. **Map the landscape**: Before flagging anything, understand what patterns exist. There might be a deliberate migration in progress.
2. **Find the majority pattern**: The inconsistency is the minority approach, not both. Identify which pattern is used more often — that's the convention; the other instances are the findings.
3. **Group by scope**: Inconsistency within a single module is worse than across distant modules. Weight accordingly.
4. **Check for boundaries**: Before scanning, `Glob` top-level directories. Treat directories as separate boundary zones if they have their own `package.json`/`pyproject.toml` or contain different language files. Don't flag cross-boundary inconsistency — different patterns across language boundaries (e.g., frontend vs backend) are expected, not findings.

## Confidence Guidelines

| Pattern | Confidence |
|---------|-----------|
| Mixed case conventions in same language/layer | 80-90 |
| Same operation named 3+ different ways | 75-85 |
| Mixed error handling in same module | 75-85 |
| Mixed error handling across related modules | 70-80 |
| One file uses classes, sibling uses functions | 65-75 |
| Mixed async patterns in same module | 75-85 |
| Mixed import styles | 70-80 |
| Structural differences across distant modules | 55-65 |

## Output

Return each finding with: severity, confidence, file:line (list all inconsistent locations), title, what, why, fix.

- Same-module inconsistency → severity: medium
- Cross-module inconsistency (related modules) → severity: medium
- Cross-module inconsistency (distant modules) → severity: low
- Naming inconsistency → severity: low (medium if pervasive)

For the fix field, specify: which pattern is the majority convention, and which files should be updated to match.
