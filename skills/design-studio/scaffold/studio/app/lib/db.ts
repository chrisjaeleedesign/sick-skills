import Database from "better-sqlite3";
import { readdirSync, existsSync, copyFileSync, unlinkSync } from "fs";
import { join } from "path";
import type { EntryQueryParams } from "./types";

// Resolve paths relative to the studio directory.
// process.env.DESIGN_STUDIO_ROOT can override, otherwise we find the studio
// root by looking for package.json walking up from cwd.
function findStudioRoot(): string {
  if (process.env.DESIGN_STUDIO_ROOT) return process.env.DESIGN_STUDIO_ROOT;
  // The Next.js dev server sets cwd to the studio directory
  const candidates = [
    join(process.cwd(), ".."),           // cwd is .design/studio/
    join(process.cwd(), "../.."),         // cwd is .design/studio/app/
    join(process.cwd(), ".design"),       // cwd is project root
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "journal.db")) || existsSync(join(dir, "manifest.json"))) {
      return dir;
    }
  }
  // Fallback: assume cwd is studio
  return join(process.cwd(), "..");
}

export const DESIGN_ROOT = findStudioRoot();
const DB_PATH = join(DESIGN_ROOT, "journal.db");

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA_SQL = `
-- Entries table (formerly "thoughts")
CREATE TABLE IF NOT EXISTS thoughts (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('observation','question','principle','reference')),
  source_type TEXT CHECK (source_type IN ('video','article','conversation','observation','prototype','image','link')),
  source_url  TEXT,
  source_meta TEXT NOT NULL DEFAULT '{}',
  family      TEXT,
  tags        TEXT NOT NULL DEFAULT '[]',
  color       TEXT,
  pinned      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  layout_w    INTEGER DEFAULT 1,
  layout_h    INTEGER DEFAULT 1,
  layout_x    INTEGER,
  layout_y    INTEGER
);

CREATE INDEX IF NOT EXISTS idx_thoughts_kind       ON thoughts(kind);
CREATE INDEX IF NOT EXISTS idx_thoughts_family      ON thoughts(family);
CREATE INDEX IF NOT EXISTS idx_thoughts_color       ON thoughts(color);
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at  ON thoughts(created_at);
CREATE INDEX IF NOT EXISTS idx_thoughts_pinned      ON thoughts(pinned);

-- Revisions table (revision stack per entry)
CREATE TABLE IF NOT EXISTS revisions (
  id         TEXT PRIMARY KEY,
  thought_id TEXT NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
  body       TEXT,
  seq        INTEGER NOT NULL,
  source     TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revisions_thought_id ON revisions(thought_id);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id          TEXT PRIMARY KEY,
  thought_id  TEXT NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
  revision_id TEXT REFERENCES revisions(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('image','screenshot','thumbnail','video_ref')),
  path        TEXT NOT NULL,
  alt         TEXT DEFAULT '',
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_thought_id ON attachments(thought_id);

-- Entry relations (directed graph)
CREATE TABLE IF NOT EXISTS thought_relations (
  from_id    TEXT NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
  to_id      TEXT NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('related','inspired_by','builds_on','contradicts')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (from_id, to_id)
);

CREATE INDEX IF NOT EXISTS idx_thought_relations_from ON thought_relations(from_id);
CREATE INDEX IF NOT EXISTS idx_thought_relations_to   ON thought_relations(to_id);

-- Boards (curated collections)
CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  color       TEXT,
  columns     INTEGER DEFAULT 6,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Board items (entry positions on a board)
CREATE TABLE IF NOT EXISTS board_items (
  board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  thought_id TEXT NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
  x          REAL NOT NULL DEFAULT 0,
  y          REAL NOT NULL DEFAULT 0,
  w          INTEGER DEFAULT 1,
  h          INTEGER DEFAULT 1,
  added_at   TEXT NOT NULL,
  PRIMARY KEY (board_id, thought_id)
);

CREATE INDEX IF NOT EXISTS idx_board_items_board   ON board_items(board_id);
CREATE INDEX IF NOT EXISTS idx_board_items_thought ON board_items(thought_id);

-- FTS5 on revisions body
CREATE VIRTUAL TABLE IF NOT EXISTS revisions_fts USING fts5(body, content='revisions', content_rowid='rowid');

-- FTS sync triggers for revisions
CREATE TRIGGER IF NOT EXISTS revisions_ai AFTER INSERT ON revisions BEGIN
  INSERT INTO revisions_fts(rowid, body) VALUES (new.rowid, new.body);
END;

CREATE TRIGGER IF NOT EXISTS revisions_au AFTER UPDATE ON revisions BEGIN
  INSERT INTO revisions_fts(revisions_fts, rowid, body) VALUES ('delete', old.rowid, old.body);
  INSERT INTO revisions_fts(rowid, body) VALUES (new.rowid, new.body);
END;

CREATE TRIGGER IF NOT EXISTS revisions_ad AFTER DELETE ON revisions BEGIN
  INSERT INTO revisions_fts(revisions_fts, rowid, body) VALUES ('delete', old.rowid, old.body);
END;

-- Features table (design thinking tool)
CREATE TABLE IF NOT EXISTS features (
  id          TEXT PRIMARY KEY,
  area        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  priority    TEXT DEFAULT '',
  status      TEXT DEFAULT '',
  x           REAL DEFAULT 0,
  y           REAL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_features_area ON features(area);

CREATE TABLE IF NOT EXISTS feature_connections (
  a_id       TEXT NOT NULL,
  b_id       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'related' CHECK (type IN ('parent', 'related')),
  note       TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  PRIMARY KEY (a_id, b_id),
  FOREIGN KEY (a_id) REFERENCES features(id) ON DELETE CASCADE,
  FOREIGN KEY (b_id) REFERENCES features(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_fc_a ON feature_connections(a_id);
CREATE INDEX IF NOT EXISTS idx_fc_b ON feature_connections(b_id);

-- Saved filters
CREATE TABLE IF NOT EXISTS saved_filters (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  filter_json TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);
`;

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _db: Database.Database | undefined;

/**
 * Returns the singleton SQLite database instance. On first call it:
 * 1. Backs up the existing DB file (journal.db → journal.db.bak)
 * 2. Opens/creates the database with WAL mode
 * 3. Runs idempotent schema creation (CREATE TABLE IF NOT EXISTS)
 * 4. Runs any pending numbered migrations
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  // Timestamped backup before any schema changes (keep last 5)
  if (existsSync(DB_PATH)) {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${DB_PATH}.bak-${ts}`;
      copyFileSync(DB_PATH, backupPath);

      // Clean old backups, keep last 5
      const dir = join(DB_PATH, "..");
      const prefix = "journal.db.bak-";
      const backups = readdirSync(dir)
        .filter((f) => f.startsWith(prefix))
        .sort()
        .reverse();
      for (const old of backups.slice(5)) {
        try { unlinkSync(join(dir, old)); } catch { /* best effort */ }
      }
    } catch { /* best effort */ }
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA_SQL);

  runMigrations(db);

  _db = db;
  return _db;
}

// ---------------------------------------------------------------------------
// Migration system — numbered, tracked, never re-run
// ---------------------------------------------------------------------------

interface Migration {
  id: number;
  name: string;
  run: (db: Database.Database) => void;
}

/**
 * All schema migrations. Each runs exactly once, tracked in _migrations table.
 * RULES:
 * - Never delete or reorder existing migrations
 * - Never use DROP TABLE — use ALTER TABLE for changes
 * - Add new migrations at the end with the next sequential ID
 * - Each migration must be idempotent within its run function (safe to retry)
 */
const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: "add-features-xy-columns",
    run: () => { /* Already applied */ },
  },
  {
    id: 2,
    name: "conviction-to-importance",
    run: () => { /* Already applied */ },
  },
  {
    id: 3,
    name: "drop-conviction-column",
    run: () => { /* Already applied */ },
  },
  {
    id: 4,
    name: "bank-and-boards-schema",
    run: () => { /* Already applied */ },
  },
  {
    id: 5,
    name: "consolidate-full-journal-history",
    run: () => { /* Already applied */ },
  },
  {
    id: 6,
    name: "add-sort-order",
    run: () => { /* Already applied */ },
  },
  {
    id: 7,
    name: "rename-to-entries",
    run: (db) => {
      // Rename tables
      try { db.exec("ALTER TABLE thoughts RENAME TO entries"); } catch { /* already renamed */ }
      try { db.exec("ALTER TABLE thought_relations RENAME TO entry_relations"); } catch { /* already renamed */ }

      // Add hidden column
      try { db.exec("ALTER TABLE entries ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }

      // Recreate indexes with new names (old indexes on renamed table still work but have stale names)
      db.exec(`
        DROP INDEX IF EXISTS idx_thoughts_kind;
        CREATE INDEX IF NOT EXISTS idx_entries_kind ON entries(kind);

        DROP INDEX IF EXISTS idx_thoughts_family;
        CREATE INDEX IF NOT EXISTS idx_entries_family ON entries(family);

        DROP INDEX IF EXISTS idx_thoughts_color;
        CREATE INDEX IF NOT EXISTS idx_entries_color ON entries(color);

        DROP INDEX IF EXISTS idx_thoughts_created_at;
        CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);

        DROP INDEX IF EXISTS idx_thoughts_pinned;
        CREATE INDEX IF NOT EXISTS idx_entries_pinned ON entries(pinned);

        DROP INDEX IF EXISTS idx_thought_relations_from;
        CREATE INDEX IF NOT EXISTS idx_entry_relations_from ON entry_relations(from_id);

        DROP INDEX IF EXISTS idx_thought_relations_to;
        CREATE INDEX IF NOT EXISTS idx_entry_relations_to ON entry_relations(to_id);
      `);
    },
  },
  {
    id: 8,
    name: "add-project-column",
    run: (db) => {
      try { db.exec("ALTER TABLE entries ADD COLUMN project TEXT"); } catch { /* already exists */ }
      db.exec("CREATE INDEX IF NOT EXISTS idx_entries_project ON entries(project)");

      // Backfill: prototype entries get project from source_meta
      db.exec(`
        UPDATE entries SET project = JSON_EXTRACT(source_meta, '$.project')
        WHERE source_type = 'prototype' AND source_meta != '{}' AND project IS NULL
      `);

      // Backfill: entries with a family field get project by matching against manifests
      const { listProjects, readManifest } = require("./manifest");
      for (const proj of listProjects()) {
        const manifest = readManifest(proj);
        const slugs = Object.keys(manifest.families);
        const stmt = db.prepare("UPDATE entries SET project = ? WHERE family = ? AND project IS NULL");
        for (const slug of slugs) {
          stmt.run(proj, slug);
        }
      }
    },
  },
];

function runMigrations(db: Database.Database): void {
  // Create tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    (db.prepare("SELECT id FROM _migrations").all() as { id: number }[]).map(r => r.id)
  );

  const insert = db.prepare("INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)");

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    migration.run(db);
    insert.run(migration.id, migration.name, new Date().toISOString());
  }
}


// ---------------------------------------------------------------------------
// Query builder (shared by domain modules)
// ---------------------------------------------------------------------------

interface BuiltQuery {
  sql: string;
  bindings: unknown[];
}

/**
 * Builds a SELECT query with dynamic WHERE, JOIN, ORDER BY, LIMIT and OFFSET
 * clauses. Used by domain modules (db-entries).
 */
export function buildQuery(
  baseTable: string,
  ftsTable: string,
  params: EntryQueryParams,
  options?: {
    extraConditions?: string[];
    extraBindings?: unknown[];
    defaultOrder?: string;
  },
): BuiltQuery {
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  let joinClause = "";
  let orderBy = options?.defaultOrder ?? `${baseTable}.created_at DESC`;

  if (params.search) {
    joinClause = `JOIN ${ftsTable} ON ${ftsTable}.rowid = ${baseTable}.rowid`;
    conditions.push(`${ftsTable} MATCH ?`);
    bindings.push(params.search);
    orderBy = "rank";
  }

  if (params.family && !Array.isArray(params.family)) {
    conditions.push(`${baseTable}.family = ?`);
    bindings.push(params.family);
  }

  if (params.since) {
    conditions.push(`${baseTable}.created_at >= ?`);
    bindings.push(params.since);
  }

  if (params.until) {
    conditions.push(`${baseTable}.created_at <= ?`);
    bindings.push(params.until);
  }

  if (params.tags && params.tags.length > 0) {
    for (const tag of params.tags) {
      conditions.push(
        `EXISTS (SELECT 1 FROM json_each(${baseTable}.tags) WHERE json_each.value = ?)`,
      );
      bindings.push(tag);
    }
  }

  if (options?.extraConditions) {
    conditions.push(...options.extraConditions);
    if (options.extraBindings) {
      bindings.push(...options.extraBindings);
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let limitClause = "";
  if (params.limit != null) {
    limitClause = `LIMIT ?`;
    bindings.push(params.limit);
    if (params.offset != null) {
      limitClause += ` OFFSET ?`;
      bindings.push(params.offset);
    }
  }

  const sql = [
    `SELECT ${baseTable}.* FROM ${baseTable}`,
    joinClause,
    whereClause,
    `ORDER BY ${orderBy}`,
    limitClause,
  ]
    .filter(Boolean)
    .join(" ");

  return { sql, bindings };
}
