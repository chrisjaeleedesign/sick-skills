# Design Journal Conventions

## File
`.design/journal.jsonl` — one JSON object per line, append-only.

## Entry Types
- `preference` — design taste / hard constraint. Shapes all future work.
- `direction` — a design direction being explored. Links to a prototype family via `family` field.
- `reaction` — user feedback on a specific prototype or direction. References entries via `refs`.
- `learning` — a principle discovered through exploration. Tagged by domain.
- `decision` — something ruled in or out. Status `final` means locked.

## Fields
| Field | Required | Notes |
|-------|----------|-------|
| `ts` | yes | ISO 8601 timestamp |
| `type` | yes | One of the five types above |
| `id` | yes | `{type-prefix}-{number}` e.g. `pref-001`, `dir-1a`, `lrn-003` |
| `tags` | yes | Flat array, freeform. Used for filtering. |
| `body` | yes | The content. Plain text, keep it concise. |
| `status` | yes | `active`, `superseded`, `killed`, `final` |
| `refs` | no | Array of other entry IDs this relates to |
| `family` | no | Design studio prototype family slug |
| `superseded_by` | no | ID of the entry that replaces this one |

## Status Lifecycle
- `active` — current, relevant, should inform work
- `superseded` — replaced by a newer entry. Set `superseded_by` to the new ID.
- `killed` — explicitly rejected/ruled out
- `final` — locked decision, do not revisit

## Conventions for Agents

### Reading
1. Filter by `status: active` unless specifically reviewing history
2. Always read all `preference` entries — these are hard constraints
3. Read `decision` entries with `status: final` — these are walls
4. Read `learning` entries tagged relevant to your task

### Writing
- **Never delete lines.** Mark old entries as `superseded` and append the replacement.
- **Never edit existing lines.** Append a new entry that supersedes the old one.
- **After user reviews a prototype:** append `reaction` entries, then derive `learning` entries from patterns across reactions.
- **When a direction is killed:** change its status to `killed` by appending a superseding entry or a decision entry referencing it.

### Updating a stale entry
To update `pref-001`, append a new line:
```json
{"ts":"...","type":"preference","id":"pref-001-v2","tags":[...],"body":"Updated preference text","status":"active","superseded_by":null}
```
Then append a status change for the old entry:
```json
{"ts":"...","type":"preference","id":"pref-001","tags":[...],"body":"(original text)","status":"superseded","superseded_by":"pref-001-v2"}
```

In practice: just append the new version and a note. Don't rewrite history.

### ID scheme
- Preferences: `pref-NNN`
- Directions: `dir-{label}` (e.g. `dir-1a`, `dir-2`)
- Reactions: `rxn-NNN`
- Learnings: `lrn-NNN`
- Decisions: `dec-NNN`

---

## Thoughts System

Thoughts are a creative journal layer that sits alongside the structured insights/events system. While insights track design decisions with formal status lifecycles, thoughts capture inspiration, philosophy, and half-formed ideas that may influence designs later.

### Storage
Thoughts live in the SQLite database (`journal.db`) — not in JSONL. Access via the `/api/thoughts` REST API.

### Thought Kinds
- `observation` — aesthetic instinct, gut reaction, or something noticed
- `question` — open question or uncertainty to explore
- `principle` — design rule, philosophy, or constraint
- `reference` — external inspiration (video, article, app, image)

### Conviction Levels
- `hunch` — just a feeling, may not stick
- `leaning` — repeated or reinforced, gaining confidence
- `confident` — tested and validated through prototyping
- `core` — foundational belief, unlikely to change

### Revision Stack
Each thought has a revision stack (newest first). Revisions capture how a thought evolves over time. The latest revision is the "current" version.

### Relationships to Insights
Existing journal insights were migrated into thoughts during initial setup:
| Insight Type | → Thought Kind | → Conviction |
|---|---|---|
| preference | principle | confident |
| learning | observation | leaning |
| reaction | observation | hunch |
| direction | observation | leaning |
| decision (final) | principle | core |
| decision (active) | principle | confident |

### Colors
Thoughts, families, sections, and boards can have colors for visual organization. Colors use the `ThoughtColor` type (15 options: red, orange, amber, yellow, lime, emerald, teal, cyan, blue, indigo, violet, purple, pink, rose, gray).

### Boards
Boards are curated collections of thoughts. Thoughts can be placed on a board at x,y positions. AI-arranged views use semantic search to auto-populate boards from a natural language query.

### Proactive Capture
The design-studio skill automatically captures thoughts from conversations. When a user shares inspiration, philosophy, or aesthetic ideas, the agent saves them as thoughts without being asked. See SKILL.md for detection signals.

### API Endpoints
- `GET/POST /api/thoughts` — CRUD for thoughts (actions: create-thought, update-thought, delete-thought, add-revision, add-attachment, add-relation, remove-relation)
- `GET /api/thoughts/meta` — metadata (tags, families, colors, kinds)
- `GET/POST /api/thoughts/boards` — board CRUD
- `GET /api/thoughts/search` — hybrid search (FTS5 + semantic embeddings)
- `POST /api/thoughts/migrate` — one-time migration of journal insights to thoughts
