# Trash — Remove a Concept from View

You are trashing a prototype family the user is done exploring. Trashing hides it from the gallery but does not delete any files.

## Context

- User's input: `$ARGUMENTS`
- Manifest: `.design/manifest.json`

## Steps

1. **Read manifest** to get all families and sections.

2. **Identify which family to trash** from the user's words. Match against family names, slugs, and descriptions. If ambiguous, ask.

3. **Set `archived: true`** on the family in the manifest.

4. **Remove from section grid:** Find the family's slug in any section's `grid` record and delete that entry. This removes it from the gallery grid.

5. **If the trashed family was `current`**, move `current` to the most recently created non-archived family. If no non-archived families remain, set `current` to `null`.

6. **Write updated manifest.**

7. **Report:** Confirm what was trashed and what `current` now points to. Mention the user can restore it from the Trash filter in the gallery.
