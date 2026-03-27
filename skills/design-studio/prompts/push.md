---
name: push
description: Push design studio improvements back to the scaffold template
---

# Push Studio to Scaffold

Push infrastructure improvements from the current project's `.design/studio/` back to the skill scaffold, so other projects get the updates.

## Steps

1. **Verify** `.design/studio/` exists. If not, abort: "No design studio found."

2. **Resolve scaffold path:**
   ```bash
   readlink ~/.claude/skills/design-studio
   ```
   The scaffold is at `{result}/scaffold/studio/`.

3. **Dry run first** — show what would change:
   ```bash
   cd .design/studio && bash scripts/sync-studio.sh push
   ```
   This defaults to dry-run. Review the output with the user.

4. **Confirm** — ask the user if they want to proceed. Show the list of files that will be added, updated, or deleted in the scaffold.

5. **Apply:**
   ```bash
   cd .design/studio && bash scripts/sync-studio.sh push --apply
   ```

6. **Report** — show the user what was synced and remind them to commit:
   > Scaffold updated. To save:
   > ```
   > cd {sick-skills-path} && git add -A && git commit -m "sync: update design-studio scaffold"
   > ```

## What gets pushed

- All studio infrastructure: lib, api, components, thoughts, features, gallery, config
- `app/prototypes/layout.tsx` (the viewer wrapper)
- `app/prototypes/example-dashboard/` (the example)
- Scripts, migrations, config files

## What does NOT get pushed

- User prototype families (`app/prototypes/*/` except example-dashboard)
- Build cache (`.next/`), dependencies (`node_modules/`), lock files
- Database files (`.db`, `.db-shm`, `.db-wal`)
