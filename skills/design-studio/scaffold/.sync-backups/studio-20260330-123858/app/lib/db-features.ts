import Database from "better-sqlite3";
import { getDb } from "./db";
import type { Feature, ConnectionType, FeatureConnection } from "./types";

// ---------------------------------------------------------------------------
// Feature seed data
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

export function seedFeaturesIfEmpty(db: Database.Database): void {
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
      const id = `feat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
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
// Feature queries
// ---------------------------------------------------------------------------

export function queryFeatures(params?: { area?: string }): Feature[] {
  const db = getDb();
  let sql = "SELECT * FROM features";
  const values: Record<string, string> = {};
  if (params?.area) {
    sql += " WHERE area = @area";
    values.area = params.area;
  }
  sql += " ORDER BY name";
  return db.prepare(sql).all(values) as Feature[];
}

export function insertFeature(f: {
  area: string; name: string; description?: string; notes?: string;
  priority?: string; status?: string; x?: number; y?: number;
}): Feature {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `feat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO features (id, area, name, description, notes, priority, status, x, y, created_at, updated_at)
    VALUES (@id, @area, @name, @description, @notes, @priority, @status, @x, @y, @created_at, @updated_at)
  `).run({
    id, area: f.area, name: f.name, description: f.description ?? "",
    notes: f.notes ?? "", priority: f.priority ?? "", status: f.status ?? "",
    x: f.x ?? 0, y: f.y ?? 0, created_at: now, updated_at: now,
  });
  return db.prepare("SELECT * FROM features WHERE id = @id").get({ id }) as Feature;
}

export function updateFeature(id: string, updates: Partial<Feature>): void {
  const db = getDb();
  const sets: string[] = [];
  const values: Record<string, unknown> = { id };
  for (const [key, val] of Object.entries(updates)) {
    if (key === "id" || key === "created_at") continue;
    sets.push(`${key} = @${key}`);
    values[key] = val;
  }
  if (sets.length === 0) return;
  sets.push("updated_at = @updated_at");
  values.updated_at = new Date().toISOString();
  db.prepare(`UPDATE features SET ${sets.join(", ")} WHERE id = @id`).run(values);
}

export function deleteFeature(id: string): void {
  getDb().prepare("DELETE FROM features WHERE id = @id").run({ id });
}

export function featureAreas(): string[] {
  return (getDb().prepare("SELECT DISTINCT area FROM features ORDER BY area").all() as { area: string }[]).map(r => r.area);
}

export function updateFeaturePositions(updates: { id: string; x: number; y: number }[]): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE features SET x = @x, y = @y, updated_at = @updated_at WHERE id = @id");
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    for (const u of updates) stmt.run({ ...u, updated_at: now });
  });
  tx();
}

// ---------------------------------------------------------------------------
// Connection functions
// ---------------------------------------------------------------------------

export function getAllConnections(): FeatureConnection[] {
  return getDb().prepare("SELECT * FROM feature_connections ORDER BY created_at").all() as FeatureConnection[];
}

export function addConnection(aId: string, bId: string, type: ConnectionType, note?: string): void {
  let a = aId, b = bId;
  if (type === "related" && b < a) { [a, b] = [b, a]; }
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT OR IGNORE INTO feature_connections (a_id, b_id, type, note, created_at)
    VALUES (@a, @b, @type, @note, @created_at)
  `).run({ a, b, type, note: note ?? "", created_at: now });
}

export function removeConnection(aId: string, bId: string): void {
  getDb().prepare("DELETE FROM feature_connections WHERE (a_id = @a AND b_id = @b) OR (a_id = @b AND b_id = @a)").run({ a: aId, b: bId });
}

export function updateConnectionNote(aId: string, bId: string, note: string): void {
  getDb().prepare("UPDATE feature_connections SET note = @note WHERE (a_id = @a AND b_id = @b) OR (a_id = @b AND b_id = @a)").run({ a: aId, b: bId, note });
}
