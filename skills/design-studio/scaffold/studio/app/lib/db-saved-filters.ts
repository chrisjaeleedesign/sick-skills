import { getDb } from "./db";
import { genId } from "./utils";
import type { SavedFilter } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deserializeSavedFilter(row: Record<string, unknown>): SavedFilter {
  return {
    id: row.id as string,
    name: row.name as string,
    filter_json: JSON.parse((row.filter_json as string) || "{}"),
    project: (row.project as string) ?? "default",
    created_at: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Saved filter CRUD
// ---------------------------------------------------------------------------

export function createSavedFilter(input: { name: string; filter_json: object; project?: string }): SavedFilter {
  const db = getDb();
  const id = genId("sf");

  db.prepare(`
    INSERT INTO saved_filters (id, name, filter_json, project)
    VALUES (@id, @name, @filter_json, @project)
  `).run({
    id,
    name: input.name,
    filter_json: JSON.stringify(input.filter_json),
    project: input.project ?? "default",
  });

  const row = db.prepare("SELECT * FROM saved_filters WHERE id = ?").get(id) as Record<string, unknown>;
  return deserializeSavedFilter(row);
}

export function listSavedFilters(project?: string): SavedFilter[] {
  // Escape hatch: project="*" means "all projects" — skip the filter.
  if (!project || project === "*") {
    const rows = getDb().prepare("SELECT * FROM saved_filters ORDER BY created_at DESC").all() as Record<string, unknown>[];
    return rows.map(deserializeSavedFilter);
  }
  const rows = getDb()
    .prepare("SELECT * FROM saved_filters WHERE project = ? ORDER BY created_at DESC")
    .all(project) as Record<string, unknown>[];
  return rows.map(deserializeSavedFilter);
}

export function deleteSavedFilter(id: string): void {
  getDb().prepare("DELETE FROM saved_filters WHERE id = ?").run(id);
}
