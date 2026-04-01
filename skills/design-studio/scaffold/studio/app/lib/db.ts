import Database from "better-sqlite3";
import { readdirSync, existsSync, copyFileSync, unlinkSync } from "fs";
import { join } from "path";
import type { QueryParams } from "./types";
import { genId } from "./utils";
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
-- Events table
CREATE TABLE IF NOT EXISTS events (
  id       TEXT PRIMARY KEY,
  ts       TEXT NOT NULL,
  type     TEXT NOT NULL CHECK (type IN ('created','iterated','archived','moved','feedback')),
  body     TEXT NOT NULL,
  family   TEXT,
  version  INTEGER,
  tags     TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}'
);

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
  id            TEXT PRIMARY KEY,
  ts            TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('preference','learning','reaction','direction','decision')),
  body          TEXT NOT NULL,
  family        TEXT,
  tags          TEXT NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','killed','final')),
  refs          TEXT NOT NULL DEFAULT '[]',
  superseded_by TEXT
);

-- FTS5 for events
CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(body, content='events', content_rowid='rowid');

-- FTS5 for insights
CREATE VIRTUAL TABLE IF NOT EXISTS insights_fts USING fts5(body, content='insights', content_rowid='rowid');

-- Triggers: events FTS sync
CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
  INSERT INTO events_fts(rowid, body) VALUES (new.rowid, new.body);
END;

CREATE TRIGGER IF NOT EXISTS events_ad AFTER DELETE ON events BEGIN
  INSERT INTO events_fts(events_fts, rowid, body) VALUES ('delete', old.rowid, old.body);
END;

-- Triggers: insights FTS sync
CREATE TRIGGER IF NOT EXISTS insights_ai AFTER INSERT ON insights BEGIN
  INSERT INTO insights_fts(rowid, body) VALUES (new.rowid, new.body);
END;

CREATE TRIGGER IF NOT EXISTS insights_au AFTER UPDATE ON insights BEGIN
  INSERT INTO insights_fts(insights_fts, rowid, body) VALUES ('delete', old.rowid, old.body);
  INSERT INTO insights_fts(rowid, body) VALUES (new.rowid, new.body);
END;

CREATE TRIGGER IF NOT EXISTS insights_ad AFTER DELETE ON insights BEGIN
  INSERT INTO insights_fts(insights_fts, rowid, body) VALUES ('delete', old.rowid, old.body);
END;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_ts     ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type   ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_family ON events(family);

CREATE INDEX IF NOT EXISTS idx_insights_ts     ON insights(ts);
CREATE INDEX IF NOT EXISTS idx_insights_type   ON insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_family ON insights(family);
CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(status);

-- Thoughts table
CREATE TABLE IF NOT EXISTS thoughts (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('observation','question','principle','reference')),
  source_type TEXT CHECK (source_type IN ('video','article','conversation','observation','prototype','image')),
  source_url  TEXT,
  source_meta TEXT NOT NULL DEFAULT '{}',
  family      TEXT,
  tags        TEXT NOT NULL DEFAULT '[]',
  color       TEXT,
  pinned      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_thoughts_kind       ON thoughts(kind);
CREATE INDEX IF NOT EXISTS idx_thoughts_family      ON thoughts(family);
CREATE INDEX IF NOT EXISTS idx_thoughts_color       ON thoughts(color);
CREATE INDEX IF NOT EXISTS idx_thoughts_created_at  ON thoughts(created_at);
CREATE INDEX IF NOT EXISTS idx_thoughts_pinned      ON thoughts(pinned);

-- Revisions table (revision stack per thought)
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

-- Thought relations (directed graph)
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
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Board items (thought positions on a board)
CREATE TABLE IF NOT EXISTS board_items (
  board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  thought_id TEXT NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
  x          REAL NOT NULL DEFAULT 0,
  y          REAL NOT NULL DEFAULT 0,
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
`;

// ---------------------------------------------------------------------------
// Feature seed data (colocated here to avoid circular import with db-features)
// ---------------------------------------------------------------------------

interface SeedFeature {
  name: string;
  area: string;
  parents: string[];
  x: number;
  y: number;
  priority?: string;
  status?: string;
}

interface SeedConnection {
  a: string;
  b: string;
  note: string;
}

// Positions: center at (600, 450), categories in ring ~250px out, leaves ~100px from parent
const SEED_FEATURES_LIST: SeedFeature[] = [
  // Root
  { name: "Assistants", area: "assistants", parents: [], x: 600, y: 450 },

  // Categories (ring around center)
  { name: "Lifecycle", area: "assistants", parents: ["Assistants"], x: 600, y: 200 },
  { name: "Scope", area: "assistants", parents: ["Assistants"], x: 820, y: 260 },
  { name: "Permissions", area: "assistants", parents: ["Assistants"], x: 870, y: 450 },
  { name: "Conversation", area: "assistants", parents: ["Assistants"], x: 820, y: 640 },
  { name: "Memory", area: "assistants", parents: ["Assistants"], x: 600, y: 700 },
  { name: "Proactiveness", area: "assistants", parents: ["Assistants"], x: 380, y: 640 },
  { name: "Discovery", area: "assistants", parents: ["Assistants"], x: 330, y: 450 },
  { name: "Multiplayer", area: "assistants", parents: ["Assistants"], x: 380, y: 260 },

  // Lifecycle leaves
  { name: "Create from scratch", area: "assistants", parents: ["Lifecycle"], x: 520, y: 110, priority: "must-have" },
  { name: "Edit instructions", area: "assistants", parents: ["Lifecycle"], x: 600, y: 100, priority: "must-have" },
  { name: "Delete/archive", area: "assistants", parents: ["Lifecycle"], x: 680, y: 110, priority: "must-have" },
  { name: "Duplicate", area: "assistants", parents: ["Lifecycle"], x: 550, y: 150, priority: "should-have" },
  { name: "Templates", area: "assistants", parents: ["Lifecycle"], x: 650, y: 150, priority: "nice-to-have" },

  // Scope leaves
  { name: "Area-wide assignment", area: "assistants", parents: ["Scope"], x: 890, y: 190, priority: "must-have" },
  { name: "Space-specific", area: "assistants", parents: ["Scope"], x: 920, y: 240, priority: "must-have" },
  { name: "Personal assistants", area: "assistants", parents: ["Scope"], x: 780, y: 180, priority: "should-have" },
  { name: "Shared assistants", area: "assistants", parents: ["Scope"], x: 830, y: 310, priority: "must-have" },

  // Permissions leaves
  { name: "Retrieval boundaries", area: "assistants", parents: ["Permissions", "Memory"], x: 960, y: 400, priority: "must-have" },
  { name: "Read vs read+write", area: "assistants", parents: ["Permissions"], x: 970, y: 450, priority: "should-have" },
  { name: "Admin controls", area: "assistants", parents: ["Permissions"], x: 960, y: 500, priority: "should-have" },

  // Conversation leaves
  { name: "@mention invoke", area: "assistants", parents: ["Conversation"], x: 900, y: 600, priority: "must-have", status: "shipped" },
  { name: "Create items", area: "assistants", parents: ["Conversation"], x: 920, y: 660, priority: "must-have" },
  { name: "Reference items", area: "assistants", parents: ["Conversation"], x: 830, y: 720, priority: "must-have" },
  { name: "Multi-assistant", area: "assistants", parents: ["Conversation"], x: 770, y: 690, priority: "should-have", status: "exploring" },
  { name: "Attributed messages", area: "assistants", parents: ["Conversation"], x: 900, y: 710, priority: "must-have", status: "shipped" },

  // Memory leaves
  { name: "View memories", area: "assistants", parents: ["Memory"], x: 530, y: 780, priority: "must-have" },
  { name: "Edit/delete memories", area: "assistants", parents: ["Memory"], x: 600, y: 800, priority: "must-have" },
  { name: "Scoped by area", area: "assistants", parents: ["Memory"], x: 670, y: 780, priority: "must-have" },
  { name: "Accumulates over time", area: "assistants", parents: ["Memory"], x: 550, y: 750, priority: "must-have" },

  // Proactiveness leaves
  { name: "Self-initiated messages", area: "assistants", parents: ["Proactiveness"], x: 310, y: 710, priority: "should-have" },
  { name: "Surface insights", area: "assistants", parents: ["Proactiveness"], x: 380, y: 740, priority: "should-have" },
  { name: "Flag issues", area: "assistants", parents: ["Proactiveness"], x: 450, y: 700, priority: "should-have" },
  { name: "Draft creation", area: "assistants", parents: ["Proactiveness"], x: 300, y: 660, priority: "nice-to-have" },
  { name: "Mute controls", area: "assistants", parents: ["Proactiveness"], x: 440, y: 590, priority: "must-have" },

  // Discovery leaves
  { name: "Browse available", area: "assistants", parents: ["Discovery"], x: 240, y: 400, priority: "must-have" },
  { name: "Descriptions", area: "assistants", parents: ["Discovery"], x: 230, y: 450, priority: "must-have" },
  { name: "Recent activity", area: "assistants", parents: ["Discovery"], x: 240, y: 500, priority: "should-have" },

  // Multiplayer leaves
  { name: "See shared assistants", area: "assistants", parents: ["Multiplayer"], x: 310, y: 190, priority: "must-have" },
  { name: "Bring personal to shared", area: "assistants", parents: ["Multiplayer"], x: 380, y: 180, priority: "should-have" },
  { name: "See who created what", area: "assistants", parents: ["Multiplayer"], x: 450, y: 210, priority: "should-have" },
];

const SEED_CONNECTIONS: SeedConnection[] = [
  { a: "Shared assistants", b: "See shared assistants", note: "Sharing model feeds discovery" },
  { a: "Scoped by area", b: "Area-wide assignment", note: "Memory scope follows assignment scope" },
  { a: "Admin controls", b: "Shared assistants", note: "Admins govern shared assistant access" },
  { a: "@mention invoke", b: "Multi-assistant", note: "Mention is the entry point for multi-agent" },
  { a: "Surface insights", b: "View memories", note: "Insights draw from accumulated memories" },
  { a: "Mute controls", b: "Self-initiated messages", note: "Mute governs proactive messaging" },
  { a: "Create items", b: "Reference items", note: "Created items become referenceable" },
  { a: "Templates", b: "Duplicate", note: "Templates are a form of duplication" },
  { a: "Attributed messages", b: "See who created what", note: "Attribution enables multiplayer provenance" },
  { a: "Edit/delete memories", b: "Retrieval boundaries", note: "Memory editing respects retrieval boundaries" },
];

function seedFeaturesIfEmpty(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) AS n FROM features").get() as { n: number };
  if (count.n > 0) return;

  const now = new Date().toISOString();
  const insertStmt = db.prepare(`
    INSERT INTO features (id, area, name, description, notes, priority, status, x, y, created_at, updated_at)
    VALUES (@id, @area, @name, '', '', @priority, @status, @x, @y, @created_at, @updated_at)
  `);
  const insertConn = db.prepare(`
    INSERT OR IGNORE INTO feature_connections (a_id, b_id, type, note, created_at)
    VALUES (@a_id, @b_id, @type, @note, @created_at)
  `);

  const nameToId = new Map<string, string>();

  const tx = db.transaction(() => {
    for (const f of SEED_FEATURES_LIST) {
      const id = genId("feat");
      nameToId.set(f.name, id);
      insertStmt.run({
        id, area: f.area, name: f.name,
        priority: f.priority ?? "", status: f.status ?? "",
        x: f.x, y: f.y, created_at: now, updated_at: now,
      });
    }

    for (const f of SEED_FEATURES_LIST) {
      const childId = nameToId.get(f.name)!;
      for (const parentName of f.parents) {
        const parentId = nameToId.get(parentName);
        if (parentId) {
          insertConn.run({ a_id: childId, b_id: parentId, type: "parent", note: "", created_at: now });
        }
      }
    }

    for (const c of SEED_CONNECTIONS) {
      const aId = nameToId.get(c.a);
      const bId = nameToId.get(c.b);
      if (aId && bId) {
        const [normA, normB] = aId < bId ? [aId, bId] : [bId, aId];
        insertConn.run({ a_id: normA, b_id: normB, type: "related", note: c.note, created_at: now });
      }
    }
  });
  tx();
}

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
 * 5. Imports JSONL data if the insights table is empty
 * 6. Seeds features if empty
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
  seedFeaturesIfEmpty(db);

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
    run: (db) => {
      // Safe: ALTER TABLE ADD COLUMN is a no-op if column exists (we catch the error)
      try { db.exec("ALTER TABLE features ADD COLUMN x REAL DEFAULT 0"); } catch { /* already exists */ }
      try { db.exec("ALTER TABLE features ADD COLUMN y REAL DEFAULT 0"); } catch { /* already exists */ }
    },
  },
  {
    id: 2,
    name: "conviction-to-importance",
    run: (db) => {
      // Rename conviction column to importance and update values.
      // SQLite doesn't support RENAME COLUMN in older versions, so we add
      // the new column, migrate data, and keep conviction for backward compat.
      try { db.exec("ALTER TABLE thoughts ADD COLUMN importance TEXT"); } catch { /* already exists */ }

      // Map old conviction values to new importance values
      db.exec(`UPDATE thoughts SET importance = CASE conviction
        WHEN 'hunch' THEN 'signal'
        WHEN 'leaning' THEN 'assumption'
        WHEN 'confident' THEN 'guiding'
        WHEN 'core' THEN 'foundational'
        ELSE conviction
      END WHERE importance IS NULL`);

      // Clear importance for observations and references (it's optional for these)
      // Actually keep it — user may want to filter by importance on any kind
    },
  },
  {
    id: 3,
    name: "drop-conviction-column",
    run: (db) => {
      // SQLite 3.35+ supports DROP COLUMN
      try { db.exec("ALTER TABLE thoughts DROP COLUMN conviction"); } catch { /* older SQLite or column already gone */ }
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
 * clauses. Used by domain modules (db-journal, db-thoughts).
 */
export function buildQuery(
  baseTable: string,
  ftsTable: string,
  params: QueryParams,
  options?: {
    extraConditions?: string[];
    extraBindings?: unknown[];
    defaultOrder?: string;
  },
): BuiltQuery {
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  let joinClause = "";
  let orderBy = options?.defaultOrder ?? `${baseTable}.ts DESC`;

  if (params.search) {
    joinClause = `JOIN ${ftsTable} ON ${ftsTable}.rowid = ${baseTable}.rowid`;
    conditions.push(`${ftsTable} MATCH ?`);
    bindings.push(params.search);
    orderBy = "rank";
  }

  if (params.type) {
    conditions.push(`${baseTable}.type = ?`);
    bindings.push(params.type);
  }

  if (params.family) {
    conditions.push(`${baseTable}.family = ?`);
    bindings.push(params.family);
  }

  if (params.since) {
    conditions.push(`${baseTable}.ts >= ?`);
    bindings.push(params.since);
  }

  if (params.until) {
    conditions.push(`${baseTable}.ts <= ?`);
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
