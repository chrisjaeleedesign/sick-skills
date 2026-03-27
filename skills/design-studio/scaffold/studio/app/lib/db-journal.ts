import { getDb, buildQuery } from "./db";
import type { EventType, InsightType, InsightStatus, Event, Insight, QueryParams } from "./types";

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

/** Parses JSON string columns on a raw event row into a typed Event object. */
function deserializeEvent(row: Record<string, unknown>): Event {
  return {
    id: row.id as string,
    ts: row.ts as string,
    type: row.type as EventType,
    body: row.body as string,
    family: (row.family as string) ?? undefined,
    version: (row.version as number) ?? undefined,
    tags: JSON.parse((row.tags as string) || "[]"),
    metadata: JSON.parse((row.metadata as string) || "{}"),
  };
}

/** Parses JSON string columns on a raw insight row into a typed Insight object. */
function deserializeInsight(row: Record<string, unknown>): Insight {
  return {
    id: row.id as string,
    ts: row.ts as string,
    type: row.type as InsightType,
    body: row.body as string,
    family: (row.family as string) ?? undefined,
    tags: JSON.parse((row.tags as string) || "[]"),
    status: row.status as InsightStatus,
    refs: JSON.parse((row.refs as string) || "[]"),
    superseded_by: (row.superseded_by as string) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Queries the events table with optional full-text search, filtering by type,
 * family, tags, date range, and pagination. Results are ordered by timestamp
 * descending (or by relevance rank when searching).
 */
export function queryEvents(params: QueryParams = {}): Event[] {
  const db = getDb();
  const { sql, bindings } = buildQuery("events", "events_fts", params);
  const rows = db.prepare(sql).all(...bindings) as Record<string, unknown>[];
  return rows.map(deserializeEvent);
}

/**
 * Queries the insights table with optional full-text search, filtering by
 * type, status, family, tags, date range, and pagination. Results are ordered
 * by timestamp descending (or by relevance rank when searching).
 */
export function queryInsights(params: QueryParams = {}): Insight[] {
  const db = getDb();

  const extraConditions: string[] = [];
  const extraBindings: unknown[] = [];

  if (params.status) {
    extraConditions.push("insights.status = ?");
    extraBindings.push(params.status);
  }

  const { sql, bindings } = buildQuery("insights", "insights_fts", params, {
    extraConditions,
    extraBindings,
  });

  const rows = db.prepare(sql).all(...bindings) as Record<string, unknown>[];
  return rows.map(deserializeInsight);
}

// ---------------------------------------------------------------------------
// Insert functions
// ---------------------------------------------------------------------------

/**
 * Inserts a new event into the events table. If `ts` is not provided, the
 * current ISO timestamp is used. Tags and metadata are serialized to JSON.
 */
export function insertEvent(
  event: Omit<Event, "ts"> & { ts?: string },
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO events (id, ts, type, body, family, version, tags, metadata)
     VALUES (@id, @ts, @type, @body, @family, @version, @tags, @metadata)`,
  ).run({
    id: event.id,
    ts: event.ts ?? new Date().toISOString(),
    type: event.type,
    body: event.body,
    family: event.family ?? null,
    version: event.version ?? null,
    tags: JSON.stringify(event.tags ?? []),
    metadata: JSON.stringify(event.metadata ?? {}),
  });
}

/**
 * Inserts a new insight into the insights table. If `ts` is not provided, the
 * current ISO timestamp is used. Tags and refs are serialized to JSON.
 */
export function insertInsight(
  insight: Omit<Insight, "ts"> & { ts?: string },
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO insights (id, ts, type, body, family, tags, status, refs, superseded_by)
     VALUES (@id, @ts, @type, @body, @family, @tags, @status, @refs, @superseded_by)`,
  ).run({
    id: insight.id,
    ts: insight.ts ?? new Date().toISOString(),
    type: insight.type,
    body: insight.body,
    family: insight.family ?? null,
    tags: JSON.stringify(insight.tags ?? []),
    status: insight.status ?? "active",
    refs: JSON.stringify(insight.refs ?? []),
    superseded_by: insight.superseded_by ?? null,
  });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Partially updates an insight. Only the columns present in the patch object
 * are modified. Array fields (tags, refs) are serialized to JSON.
 */
export function updateInsight(
  id: string,
  patch: Partial<
    Pick<Insight, "body" | "status" | "tags" | "refs" | "superseded_by">
  >,
): void {
  const db = getDb();
  const setClauses: string[] = [];
  const bindings: unknown[] = [];

  if (patch.body !== undefined) {
    setClauses.push("body = ?");
    bindings.push(patch.body);
  }
  if (patch.status !== undefined) {
    setClauses.push("status = ?");
    bindings.push(patch.status);
  }
  if (patch.tags !== undefined) {
    setClauses.push("tags = ?");
    bindings.push(JSON.stringify(patch.tags));
  }
  if (patch.refs !== undefined) {
    setClauses.push("refs = ?");
    bindings.push(JSON.stringify(patch.refs));
  }
  if (patch.superseded_by !== undefined) {
    setClauses.push("superseded_by = ?");
    bindings.push(patch.superseded_by);
  }

  if (setClauses.length === 0) return;

  bindings.push(id);
  db.prepare(
    `UPDATE insights SET ${setClauses.join(", ")} WHERE id = ?`,
  ).run(...bindings);
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

/**
 * Returns all unique tags used across both events and insights tables, sorted
 * alphabetically.
 */
export function allTags(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT j.value AS tag FROM events, json_each(events.tags) AS j
       UNION
       SELECT DISTINCT j.value AS tag FROM insights, json_each(insights.tags) AS j
       ORDER BY tag`,
    )
    .all() as { tag: string }[];
  return rows.map((r) => r.tag);
}

/**
 * Returns all distinct non-null family values across both events and insights
 * tables, sorted alphabetically.
 */
export function allFamilies(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT family FROM events WHERE family IS NOT NULL
       UNION
       SELECT DISTINCT family FROM insights WHERE family IS NOT NULL
       ORDER BY family`,
    )
    .all() as { family: string }[];
  return rows.map((r) => r.family);
}
