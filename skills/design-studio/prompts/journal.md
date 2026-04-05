# Journal — Design Journal & References

You are managing the user's design journal: a collection of reference images, links, entries, and mood boards.

## Context

- Studio server port: read from `.agents/design/manifest.json` → `settings.port` (default 3001)
- Journal UI: `http://localhost:<port>/bank`
- Boards UI: `http://localhost:<port>/bank/boards`
- API base: `http://localhost:<port>/api`

## Step 0: Ensure the studio is running

Check if the studio server is running:
```bash
lsof -i :<port>
```

If not running, start it:
```bash
cd .agents/design/studio && npm run dev -- --port <port> &
sleep 3
```

## Step 1: Detect what the user wants and act

Read `$ARGUMENTS` and determine the sub-task:

---

### When the user pastes or references an image

The user may provide a file path, a base64 data URL, or describe an image they want to save.

1. **Save the image** to `.agents/design/media/`:
   ```bash
   mkdir -p .agents/design/media
   # If it's a file path — copy it:
   TIMESTAMP=$(date +%s)
   SLUG="<derive from filename or description>"
   EXT="<png|jpg|webp>"
   cp "<source-path>" ".agents/design/media/${TIMESTAMP}-${SLUG}.${EXT}"
   # If it's base64 — decode it:
   echo "<base64-string>" | base64 --decode > ".agents/design/media/${TIMESTAMP}-${SLUG}.${EXT}"
   ```

2. **Create an entry and attach the image.** Follow [_journal-entry.md](_journal-entry.md) for the entry creation API pattern.

   Use kind `reference`, source_type `image`. After creating the entry, attach the image using the attachment API from the shared util. Path must be relative to `.agents/design/` (e.g., `media/...` not `.agents/design/media/...`).

3. **Report** what was saved and suggest boards it might fit into:
   ```bash
   # List boards for suggestions
   curl -s http://localhost:<port>/api/entries/boards | grep -o '"name":"[^"]*"'
   ```
   
   Tell the user: "Saved as [entry body] in the journal. You can view it at http://localhost:<port>/bank. Want me to add it to a board?"

---

### When the user shares a URL

1. **Create an entry** with the link. Follow [_journal-entry.md](_journal-entry.md) for the entry creation API pattern. Use kind `reference`, source_type `link`, and include `source_url` in the entry.

2. **Report:** "Saved link to journal: [description]. View at http://localhost:<port>/bank"

---

### When the user expresses a design thought

This is the existing entry-capture behavior. Save it as an entry linked to the current family if relevant.

Follow [_journal-entry.md](_journal-entry.md) for the entry creation API pattern. Use the appropriate kind (observation, question, principle, reference) and source_type `conversation`.

After saving: "Saved entry: [one-line summary]"

---

### Board commands

**"add to board X" / "add this to board X":**
1. Find the board by name:
   ```bash
   BOARDS=$(curl -s http://localhost:<port>/api/entries/boards)
   # Parse to find board_id for board named "X"
   ```
2. Add the item:
   ```bash
   curl -s -X POST http://localhost:<port>/api/entries/boards \
     -H "Content-Type: application/json" \
     -d "{
       \"action\": \"add-item\",
       \"board_id\": \"<board_id>\",
       \"entry_id\": \"<entry_id>\"
     }"
   ```

**"create board called X" / "new board named X":**
```bash
curl -s -X POST http://localhost:<port>/api/entries/boards \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-board",
    "board": {
      "name": "<board name>",
      "description": "<optional description from user>"
    }
  }'
```
Report: "Created board '[name]'. View at http://localhost:<port>/bank/boards"

**"show boards" / "list boards" / "what boards do I have":**
```bash
curl -s http://localhost:<port>/api/entries/boards
```
List boards with their names and item counts.

**"show journal" / "open journal":**
Tell the user: "Journal is at http://localhost:<port>/bank"

---

## Constraints

- Always confirm what was saved with a brief message.
- If the user describes something ambiguous, default to saving as a `reference` entry.
- Port defaults to 3001 if not found in manifest.
