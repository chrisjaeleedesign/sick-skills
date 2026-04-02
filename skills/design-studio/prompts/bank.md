# Bank — Inspiration, References & Boards

You are managing the user's design bank: a collection of reference images, links, thoughts, and mood boards.

## Context

- Studio server port: read from `.agents/design/manifest.json` → `settings.port` (default 3001)
- Bank UI: `http://localhost:<port>/bank`
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

2. **Create a thought** for it:
   ```bash
   RESPONSE=$(curl -s -X POST http://localhost:<port>/api/thoughts \
     -H "Content-Type: application/json" \
     -d '{
       "action": "create-thought",
       "thought": {
         "kind": "reference",
         "source_type": "image",
         "body": "<user description or filename>",
         "tags": ["image", "reference"],
         "conviction": "hunch"
       }
     }')
   THOUGHT_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
   ```

3. **Add the image as an attachment:**
   ```bash
   curl -s -X POST http://localhost:<port>/api/thoughts \
     -H "Content-Type: application/json" \
     -d "{
       \"action\": \"add-attachment\",
       \"thought_id\": \"${THOUGHT_ID}\",
       \"attachment\": {
         \"kind\": \"image\",
         \"url\": \".agents/design/media/${TIMESTAMP}-${SLUG}.${EXT}\",
         \"label\": \"<filename or description>\"
       }
     }"
   ```

4. **Trigger vision analysis:**
   ```bash
   curl -s -X POST http://localhost:<port>/api/thoughts/analyze-image \
     -H "Content-Type: application/json" \
     -d "{\"thought_id\": \"${THOUGHT_ID}\"}"
   ```

5. **Report** what was saved and suggest boards it might fit into:
   ```bash
   # List boards for suggestions
   curl -s http://localhost:<port>/api/thoughts/boards | grep -o '"name":"[^"]*"'
   ```
   
   Tell the user: "Saved as [thought body] in the bank. You can view it at http://localhost:<port>/bank. Want me to add it to a board?"

---

### When the user shares a URL

1. **Create a thought** with the link:
   ```bash
   curl -s -X POST http://localhost:<port>/api/thoughts \
     -H "Content-Type: application/json" \
     -d '{
       "action": "create-thought",
       "thought": {
         "kind": "reference",
         "source_type": "link",
         "source_url": "<the URL>",
         "body": "<user description if provided, otherwise derive from URL>",
         "tags": ["link", "reference"],
         "conviction": "hunch"
       }
     }'
   ```

2. **Report:** "Saved link to bank: [description]. View at http://localhost:<port>/bank"

---

### When the user expresses a design thought

This is the existing thought-capture behavior. Save it as a thought linked to the current family if relevant:

```bash
curl -s -X POST http://localhost:<port>/api/thoughts \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-thought",
    "thought": {
      "kind": "<observation|question|principle|reference>",
      "source_type": "conversation",
      "body": "<concise summary of the idea>",
      "family": "<current family slug if relevant, omit if general>",
      "tags": ["<relevant tags>"],
      "conviction": "hunch"
    }
  }'
```

After saving: "Saved thought: [one-line summary]"

---

### Board commands

**"add to board X" / "add this to board X":**
1. Find the board by name:
   ```bash
   BOARDS=$(curl -s http://localhost:<port>/api/thoughts/boards)
   # Parse to find board_id for board named "X"
   ```
2. Add the item:
   ```bash
   curl -s -X POST http://localhost:<port>/api/thoughts/boards \
     -H "Content-Type: application/json" \
     -d "{
       \"action\": \"add-item\",
       \"board_id\": \"<board_id>\",
       \"thought_id\": \"<thought_id>\"
     }"
   ```

**"create board called X" / "new board named X":**
```bash
curl -s -X POST http://localhost:<port>/api/thoughts/boards \
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
curl -s http://localhost:<port>/api/thoughts/boards
```
List boards with their names and item counts.

**"show bank" / "open bank":**
Tell the user: "Bank is at http://localhost:<port>/bank"

---

## Constraints

- Always confirm what was saved with a brief message.
- If the user describes something ambiguous, default to saving as a `reference` thought.
- Don't block on vision analysis — fire it and move on.
- Port defaults to 3001 if not found in manifest.
