import { getDb } from "./db";
import { genId } from "./utils";
import type { Feature, ConnectionType, FeatureConnection } from "./types";

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
  const id = genId("feat");
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
