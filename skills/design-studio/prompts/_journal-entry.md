# _journal-entry.md — Create journal entries (shared subroutine)

This is a shared reference for creating design journal entries. Used by create.md, iterate.md, journal.md, and the proactive capture rule in SKILL.md.

## Create an entry

```bash
curl -s -X POST http://localhost:<port>/api/entries \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-entry",
    "entry": {
      "kind": "<observation|question|principle|reference>",
      "source_type": "conversation",
      "body": "<concise summary of the idea>",
      "project": "<current project slug or omit for global>",
      "family": "<current family slug or omit for general>",
      "tags": ["<relevant>", "<tags>"],
      "importance": "signal"
    }
  }'
```

## Attach an image

```bash
# First save the image to .agents/design/media/
TIMESTAMP=$(date +%s)
cp "<source>" ".agents/design/media/${TIMESTAMP}-<slug>.<ext>"

# Then attach it to the entry
curl -s -X POST http://localhost:<port>/api/entries \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add-attachment",
    "attachment": {
      "entry_id": "<id from create response>",
      "type": "image",
      "path": "media/<timestamp>-<slug>.<ext>",
      "alt": "<description>"
    }
  }'
```

## Kind selection

| Signal | Kind |
|--------|------|
| Philosophy, principle, design rule | `principle` |
| External media (video, article, app, website) | `reference` |
| Aesthetic instinct, gut reaction, preference | `observation` |
| Open question, uncertainty, unresolved tension | `question` |

## Importance

| Level | When |
|-------|------|
| `signal` | New idea, first mention (default) |
| `guiding` | Reinforced idea, user repeated or confirmed it |
| `foundational` | Core decision that shapes everything going forward |
