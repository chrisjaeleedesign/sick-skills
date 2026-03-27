# Cruft Pass

Scan for accumulated cruft — code that once served a purpose but no longer does. This includes compatibility layers, migration scaffolding, deprecated wrappers, and abandoned experiments. Cruft is distinct from dead code: dead code was never needed; cruft was needed once and outlived its purpose.

## What to Detect

### 1. Compatibility Shims (confidence: 70-85)
- Adapter functions bridging an old interface to a new one, where the old interface has no remaining callers
- Version-checking code for versions no longer supported
- Polyfills for features now available in the project's target environment
- **Search strategy**:
  - `Grep` for keywords: `compat`, `legacy`, `deprecated`, `shim`, `polyfill`, `adapter`, `bridge`, `wrapper`, `v1`, `old`
  - For each match, check if the old interface/version still has callers
  - Look for comments like "for backwards compatibility" or "remove after migration"

### 2. Deprecated Wrappers (confidence: 75-90)
- Functions marked as deprecated that are still exported
- Wrapper functions that just call the replacement function with the same args
- **Search strategy**:
  - `Grep` for `@deprecated`, `@obsolete`, `DEPRECATED`, `deprecated` in comments
  - For each deprecated function, check if anything still calls it
  - Look for functions whose body is just a call to another function with identical or trivially mapped parameters

### 3. Re-Export Cruft (confidence: 80-90)
- Types/functions re-exported from an index/barrel file that could be imported directly
- Re-exports that exist only because the original location changed
- **Search strategy**:
  - `Grep` for `export .* from` patterns (re-exports)
  - Check if the re-exported symbol has direct importers that bypass the re-export
  - Look for barrel files that re-export everything from submodules unnecessarily

### 4. Dead Configuration (confidence: 65-80)
- Environment variables referenced in code but not in any .env or deployment config
- Feature flags that are always on or always off
- Config keys defined but never read
- **Search strategy**:
  - `Grep` for `process.env`, `os.environ`, `env::var` to find env var usage
  - Cross-reference with `.env*` files and deployment configs
  - Look for config objects with fields that are never accessed

### 5. Abandoned Experiments (confidence: 60-75)
- Directories or files with "experiment", "test", "poc", "prototype", "draft" in the name that aren't part of the test suite
- Code behind feature flags that have been off for a long time
- Alternative implementations that were never cleaned up
- **Search strategy**:
  - `Glob` for files matching `*experiment*`, `*poc*`, `*prototype*`, `*draft*`, `*wip*`, `*backup*`
  - `Grep` for `EXPERIMENT`, `POC`, `PROTOTYPE` in code
  - Look for directories named `archive`, `old`, `backup` that are still referenced

### 6. Stale Dependencies (confidence: 55-70)
- Packages in package.json/requirements.txt/Cargo.toml that aren't imported anywhere in the source
- Dev dependencies used in scripts that no longer exist
- **Search strategy**:
  - Read the dependency manifest (package.json, etc.)
  - For each dependency, `Grep` for imports of that package name in source files
  - Exclude: build tools, linters, type packages, and other non-import dependencies
  - This is a heuristic — some deps are used via config (babel plugins, etc.)
  - For scoped packages (starting with `@`), search for both the full scoped name and the package portion after `/`. Cap confidence for dependency findings at 65 unless confirmed unused across 3+ source directories.

## Confidence Guidelines

| Pattern | Confidence |
|---------|-----------|
| Re-export with zero consumers (mechanical) | 85-90 |
| Deprecated wrapper with zero callers (mechanical) | 80-90 |
| Compatibility shim with zero old-interface callers | 75-85 |
| Polyfill for natively-supported feature | 75-85 |
| Feature flag always on/off (verifiable) | 70-80 |
| Dead env var (not in any config) | 65-75 |
| Package not imported in source | 60-70 |
| Abandoned experiment (name-based heuristic) | 55-65 |

## Output

Return each finding with: severity, confidence, file:line, title, what, why, fix.

- Deprecated wrappers with no callers → severity: medium
- Compatibility shims with no consumers → severity: medium
- Dead configuration → severity: low
- Stale dependencies → severity: low (medium if they pose security risk)
- Abandoned experiments → severity: low
- Re-export cruft → severity: low

For the fix field, specify: what to remove, and any migration steps needed (usually none, since the consumers are already gone).
