# Archive — Remove a Concept from View

You are archiving a prototype family the user is done exploring. Archiving hides it from the gallery but does not delete any files.

## Context

- User's input: `$ARGUMENTS`
- Manifest: `.agents/design/manifest.json`

## Steps

1. **Read manifest** to get all families and sections.

2. **Identify which family to archive** from the user's words. Match against family names, slugs, and descriptions. If ambiguous, ask.

3. **Set `archived: true`** on the family in the manifest.

4. **Remove from section grid:** Find the family's slug in any section's `grid` record and delete that entry. This removes it from the gallery grid.

5. **If the archived family was `current`**, move `current` to the most recently created non-archived family. If no non-archived families remain, set `current` to `null`.

6. **Write updated manifest.**

7. **Log to journal:** Run from `.agents/design/studio/`:
   ```bash
   cd .agents/design/studio && npx tsx scripts/journal-log.ts --table event --type archived \
     --body "Archived <family name>" \
     --family <slug> --tags "archived"
   ```
   If the user explicitly killed a direction with reasoning, also log a decision:
   ```bash
   cd .agents/design/studio && npx tsx scripts/journal-log.ts --table insight --type decision \
     --body "<reason for killing the direction>" \
     --family <slug> --tags "killed" --status killed
   ```

8. **Report:** Confirm what was archived and what `current` now points to. Mention the user can restore it from the Trash filter in the gallery.
