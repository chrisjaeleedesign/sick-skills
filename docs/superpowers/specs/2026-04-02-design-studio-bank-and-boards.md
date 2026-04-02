# Design Studio: Bank & Boards

**Date:** 2026-04-02
**Status:** Draft
**Scope:** Unified content bank with curated bento boards for the design studio skill

## Summary

Replace the existing Thoughts page with a unified "Bank & Boards" system. Every piece of inspiration — pasted images, prototype screenshots, text thoughts, shared links — lives in a single bank. Users curate items from the bank into named bento-grid boards for different themes (color palettes, navigation patterns, typography, etc.).

## Motivation

The design studio currently has fragmented inspiration capture: Thoughts hold text observations, prototype screenshots live in `references/`, and there's no way to paste reference images from a Claude Code chat into the workspace. The mood board concept unifies all of these into a single visual system where everything is browsable, searchable, and organizable.

## Core Concepts

### The Bank

The bank is the single source of truth for all inspiration items. Everything auto-enters the bank:

- **Pasted images** — user pastes an image in Claude Code chat, Claude saves it to `.agents/design/media/` and creates a bank item
- **Prototype screenshots** — auto-captured on create/iterate, auto-added as bank items
- **Thoughts** — observations, principles, questions logged during conversation
- **Shared URLs** — link previews with auto-generated descriptions

The bank is not a hidden drawer — it's the default landing view. A full-page, scrollable bento grid of everything.

### Boards

Boards are curated subsets of bank items arranged in a bento grid. Users drag items from the bank onto boards. Key properties:

- An item can live on multiple boards
- Each board has its own bento layout (per-item x, y, w, h)
- Boards have a name, color, and description
- Boards are browsable from a Boards Overview page showing mini bento previews

### Bento Layout

All views use react-grid-layout for a bento-box tile layout:

- Items have variable sizes in grid units (1x1, 2x1, 1x2, 2x2, 3x2, etc.)
- Drag to reorder, resize handles to change emphasis
- Vertical compaction eliminates gaps
- Layout positions persist per-view
- 6-column grid for board/all-items views, 3-column for the bank drawer

## Navigation Hierarchy

Three views, accessible via tabs at the top:

### 1. All Items (default landing page)

- Full-page bento grid of every bank item
- Search bar: semantic (via embeddings) + keyword hybrid search
- Filter chips: by type (image, thought, screenshot, link), by tags, by prototype family, by time range
- Saved filters: one-click shortcuts for common filter combos (e.g., "sidebar-nav images", "this week")
- Draggable/reorderable — layout persists
- Items show: thumbnail/content, note, type badge, tags, timestamp, board membership dots

### 2. Boards Overview

- Grid of board cards, each showing:
  - Board name + color dot
  - Mini bento preview of contents
  - Item count, last updated timestamp
- "+ New Board" card to create boards
- Click a board card to enter it

### 3. Inside a Board

- Full-page curated bento grid
- Back arrow to Boards Overview
- "Add from bank" button opens a slide-in drawer on the right
  - The drawer shows the full bank as a compact bento (3-column)
  - Search/filter within the drawer
  - Drag items from drawer onto the board
  - Resizable divider between board and drawer
- Drag to rearrange, resize tiles within the board

## Data Model

### Approach: Extend Existing Thoughts System

Unify bank items and thoughts into a single table. The existing `thoughts` table already has: kind, body, tags, color, source_type, attachments, revisions, boards, and embeddings. This avoids duplicating search, board, and embedding infrastructure.

### Schema Changes

**`thoughts` table** — add fields:

```sql
-- Layout position in the "all items" view
layout_w INTEGER DEFAULT 1,    -- width in grid units
layout_h INTEGER DEFAULT 1,    -- height in grid units
layout_x INTEGER,              -- column position (null = auto-place)
layout_y INTEGER,              -- row position (null = auto-place)
```

**`board_items` table** — add layout fields (existing table has board_id, thought_id, x, y):

```sql
-- Extend existing board_items with size
ALTER TABLE board_items ADD COLUMN w INTEGER DEFAULT 1;
ALTER TABLE board_items ADD COLUMN h INTEGER DEFAULT 1;
```

**`boards` table** — add fields (existing table has id, name, description, color):

```sql
ALTER TABLE boards ADD COLUMN columns INTEGER DEFAULT 6;
ALTER TABLE boards ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
```

**New source_type values:**

- `image` — pasted from chat (existing)
- `prototype` — auto-captured screenshot (new, currently these go to `references/` only)
- `link` — shared URL with preview (new)

Existing source types (`video`, `article`, `conversation`, `observation`) continue to work.

### New: `saved_filters` table

```sql
CREATE TABLE saved_filters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  filter_json TEXT NOT NULL,   -- serialized filter state: {types, tags, families, timeRange}
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Image Ingest Pipeline

When a user pastes an image in Claude Code chat:

1. **Claude saves the image** to `.agents/design/media/{timestamp}-{slug}.png`
2. **Claude creates a bank item** via `POST /api/thoughts` with:
   - `kind: "reference"`
   - `source_type: "image"`
   - `body`: user's note (if provided)
   - Attachment pointing to the saved image path
3. **Studio API route calls vision model** for rich description:
   - Shells out to `ask.py --model mini --attach <image_path>` with a description prompt
   - Prompt: "Describe this image in detail for a design mood board: colors, layout patterns, typography, mood, UI elements, notable details. Also suggest 3-5 tags."
   - GPT-5.4-mini returns a rich text description + suggested tags
4. **Description stored as a revision** on the thought (source: "api"), tags extracted and saved
5. **Description embedded** via existing embeddings pipeline for semantic search

**Cost:** Fractions of a cent per image (GPT-5.4-mini with vision is very cheap).

**Failure handling:** If the vision model call fails (network error, quota), the bank item is still created with just the user's note. The `analyze-image` endpoint can be retried later. Items without a vision description are still keyword-searchable by their note and tags but won't have rich semantic search coverage.

**Prototype screenshots** follow the same pipeline but skip step 1 (they're already captured by the existing screenshot system). On capture, a bank item is created with `source_type: "prototype"` and the family/version as metadata.

## Search & Filtering

### Semantic Search

Uses the existing embeddings infrastructure (`db-embeddings.ts`, `embeddings.ts`). Every bank item's body text (user note + vision model description for images) is embedded on ingest. Search queries are embedded at query time and matched via cosine similarity.

### Keyword Search

SQLite FTS5 on thought body text + tags. Combined with semantic search results using a hybrid scoring approach (already implemented in `/api/thoughts/search`).

### Filter Dimensions

- **Type:** image, thought, screenshot, link
- **Tags:** auto-generated + user-added, displayed as filter chips
- **Prototype family:** filter to items associated with a specific prototype
- **Time range:** predefined (today, this week, last session) + custom
- **Board membership:** "on any board" / "not on any board" / specific board
- **Starred:** boolean filter

### Saved Filters

Users can save a filter combination as a named shortcut. Displayed as chips in the filter row. Stored in `saved_filters` table.

## API Changes

### Existing endpoints (extended)

**`POST /api/thoughts`** — new actions:

- `action: "update-layout"` — update an item's bento position in the all-items view (layout_x, layout_y, layout_w, layout_h)
- `action: "bulk-update-layout"` — batch update positions after drag reorder

**`POST /api/thoughts/boards`** — new actions:

- `action: "update-board-item-layout"` — update an item's position/size on a specific board
- `action: "bulk-update-board-layout"` — batch update board item positions

### New endpoints

**`GET /api/thoughts/bank`** — returns all items with layout positions, optimized for the bento grid view. Supports query params for filtering (type, tags, family, timeRange, boardId).

**`POST /api/thoughts/analyze-image`** — triggers vision model description for an image:
- Input: `{ thought_id, image_path }`
- Calls `ask.py --model mini` with the image
- Saves description as revision, extracts tags
- Triggers embedding generation
- Returns the generated description

**`POST /api/saved-filters`** — CRUD for saved filters

## New Dependencies

- **`react-grid-layout`** (~45kB) — bento layout with drag-and-drop + resize. Handles grid positioning, compaction, and serialization of layout state.

## UI Components

### New Pages

- `/bank` — All Items view (replaces current `/thoughts` as the landing page for this section)
- `/bank/boards` — Boards Overview
- `/bank/boards/[id]` — Inside a Board

### New Components

- `BentoGrid` — wrapper around react-grid-layout configured for the bento aesthetic. Shared by all three views with different column counts.
- `BankItem` — renders a single tile in the bento grid. Handles image thumbnails, text thoughts, screenshots, and links with appropriate display for each type.
- `BankDrawer` — slide-in panel for the bank when inside a board view. Compact bento with search/filter, resizable width.
- `FilterBar` — search input + type chips + tag chips + saved filters + time dropdown. Reused across All Items and Bank Drawer.
- `BoardCard` — preview card for the Boards Overview showing mini bento thumbnail.

### Modified Components

- Gallery sidebar navigation — add "Bank" link alongside existing Gallery, Thoughts, Features links
- The existing Thoughts page content can be deprecated in favor of the Bank view (thoughts are a subset of bank items filterable by type)

## Skill Changes

### SKILL.md Routing

Add a new route signal for mood board / bank operations:

| Signal | Routes to |
|--------|-----------|
| "mood", "board", "bank", "inspiration" | BANK |

### New Prompt: `bank.md`

Instructions for the bank workflow when invoked from chat:

- Detect when user pastes an image → save to media, create bank item, trigger vision analysis
- Detect when user shares a URL → fetch preview, create bank item
- Detect when user expresses a design thought → create bank item (existing behavior from thoughts)
- Support explicit commands: "add to board X", "create board called X"

### Modified Prompt: `create.md` and `iterate.md`

After capturing a prototype screenshot, also create a bank item with `source_type: "prototype"`.

## Migration

### From Existing Thoughts

No data migration needed — existing thoughts automatically appear in the bank. The new layout fields default to null (auto-placed by react-grid-layout's compaction).

### From Existing Boards

Existing `board_items` gain `w` and `h` columns defaulting to 1x1. Existing boards gain a `columns` field defaulting to 6.

### Thoughts Page

The `/thoughts` route can redirect to `/bank?type=thought` to preserve access to text-only items. The Thoughts page UI is not deleted — it's superseded by the Bank view which shows the same data with more capabilities.

## Out of Scope

- **Collaborative boards** — no multi-user support, this is single-user
- **Image editing** — no cropping, annotating, or manipulating images within the board
- **Board templates** — no pre-built board layouts
- **Export** — no exporting boards as images or PDFs
- **Real-time sync** — no websocket updates; refresh to see changes from other tabs
