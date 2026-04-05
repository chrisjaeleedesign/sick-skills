import { getDb, buildQuery } from "./db";
import { genId, now } from "./utils";
import type {
  EntryKind, SourceType, Importance, RelationType,
  AttachmentType, Color,
  Entry, Revision, Attachment, EntryRelation,
  EntryQueryParams,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deserializeEntry(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    kind: row.kind as EntryKind,
    source_type: (row.source_type as SourceType) ?? undefined,
    source_url: (row.source_url as string) ?? undefined,
    source_meta: JSON.parse((row.source_meta as string) || "{}"),
    family: (row.family as string) ?? undefined,
    project: (row.project as string) ?? undefined,
    tags: JSON.parse((row.tags as string) || "[]"),
    color: (row.color as Color) ?? undefined,
    pinned: (row.pinned as number) === 1,
    importance: (row.importance as Importance) ?? undefined,
    hidden: (row.hidden as number) === 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function deserializeRevision(row: Record<string, unknown>): Revision {
  return {
    id: row.id as string,
    entry_id: row.thought_id as string,
    body: (row.body as string) ?? undefined,
    seq: row.seq as number,
    source: row.source as string,
    created_at: row.created_at as string,
  };
}

function deserializeAttachment(row: Record<string, unknown>): Attachment {
  return {
    id: row.id as string,
    entry_id: row.thought_id as string,
    revision_id: (row.revision_id as string) ?? undefined,
    type: row.type as AttachmentType,
    path: row.path as string,
    alt: (row.alt as string) ?? "",
    created_at: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Entry CRUD
// ---------------------------------------------------------------------------

export function createEntry(input: {
  kind: EntryKind;
  body?: string;
  source_type?: SourceType;
  source_url?: string;
  source_meta?: Record<string, unknown>;
  family?: string;
  project?: string;
  tags?: string[];
  color?: Color;
  pinned?: boolean;
  importance?: Importance;
  hidden?: boolean;
  revision_source?: string;
}): { entry: Entry; revision: Revision } {
  const db = getDb();
  const entryId = genId("th");
  const revisionId = genId("rev");
  const ts = now();

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO entries (id, kind, source_type, source_url, source_meta, family, project, tags, color, pinned, importance, hidden, created_at, updated_at)
      VALUES (@id, @kind, @source_type, @source_url, @source_meta, @family, @project, @tags, @color, @pinned, @importance, @hidden, @created_at, @updated_at)
    `).run({
      id: entryId,
      kind: input.kind,
      source_type: input.source_type ?? null,
      source_url: input.source_url ?? null,
      source_meta: JSON.stringify(input.source_meta ?? {}),
      family: input.family ?? null,
      project: input.project ?? null,
      tags: JSON.stringify(input.tags ?? []),
      color: input.color ?? null,
      pinned: input.pinned ? 1 : 0,
      importance: input.importance ?? null,
      hidden: input.hidden ? 1 : 0,
      created_at: ts,
      updated_at: ts,
    });

    db.prepare(`
      INSERT INTO revisions (id, thought_id, body, seq, source, created_at)
      VALUES (@id, @thought_id, @body, @seq, @source, @created_at)
    `).run({
      id: revisionId,
      thought_id: entryId,
      body: input.body ?? null,
      seq: 1,
      source: input.revision_source ?? "user",
      created_at: ts,
    });
  });
  tx();

  const entry = db.prepare("SELECT * FROM entries WHERE id = ?").get(entryId) as Record<string, unknown>;
  const revision = db.prepare("SELECT * FROM revisions WHERE id = ?").get(revisionId) as Record<string, unknown>;
  return { entry: deserializeEntry(entry), revision: deserializeRevision(revision) };
}

export function getEntry(id: string): Entry | undefined {
  const row = getDb().prepare("SELECT * FROM entries WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? deserializeEntry(row) : undefined;
}

export function updateEntry(id: string, patch: Partial<Pick<Entry, "kind" | "source_type" | "source_url" | "source_meta" | "family" | "project" | "tags" | "color" | "pinned" | "importance" | "hidden">>): void {
  const db = getDb();
  const sets: string[] = [];
  const values: Record<string, unknown> = { id };

  if (patch.kind !== undefined) { sets.push("kind = @kind"); values.kind = patch.kind; }
  if (patch.source_type !== undefined) { sets.push("source_type = @source_type"); values.source_type = patch.source_type; }
  if (patch.source_url !== undefined) { sets.push("source_url = @source_url"); values.source_url = patch.source_url; }
  if (patch.source_meta !== undefined) { sets.push("source_meta = @source_meta"); values.source_meta = JSON.stringify(patch.source_meta); }
  if (patch.family !== undefined) { sets.push("family = @family"); values.family = patch.family; }
  if (patch.project !== undefined) { sets.push("project = @project"); values.project = patch.project || null; }
  if (patch.tags !== undefined) { sets.push("tags = @tags"); values.tags = JSON.stringify(patch.tags); }
  if (patch.color !== undefined) { sets.push("color = @color"); values.color = patch.color; }
  if (patch.pinned !== undefined) { sets.push("pinned = @pinned"); values.pinned = patch.pinned ? 1 : 0; }
  if (patch.importance !== undefined) { sets.push("importance = @importance"); values.importance = patch.importance; }
  if (patch.hidden !== undefined) { sets.push("hidden = @hidden"); values.hidden = patch.hidden ? 1 : 0; }

  if (sets.length === 0) return;
  sets.push("updated_at = @updated_at");
  values.updated_at = now();

  db.prepare(`UPDATE entries SET ${sets.join(", ")} WHERE id = @id`).run(values);
}

export function deleteEntry(id: string): void {
  getDb().prepare("DELETE FROM entries WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Query entries
// ---------------------------------------------------------------------------

export function queryEntries(params: EntryQueryParams = {}, opts?: { withRevision?: boolean }): (Entry & { latest_revision_body?: string; latest_revision_seq?: number; latest_revision_created_at?: string })[] {
  const db = getDb();

  const extraConditions: string[] = [];
  const extraBindings: unknown[] = [];

  // By default, hide hidden entries unless explicitly requested
  if (params.hidden !== true) {
    extraConditions.push("entries.hidden = 0");
  }

  if (params.kind) {
    if (Array.isArray(params.kind)) {
      extraConditions.push(`entries.kind IN (${params.kind.map(() => '?').join(',')})`);
      extraBindings.push(...params.kind);
    } else {
      extraConditions.push("entries.kind = ?");
      extraBindings.push(params.kind);
    }
  }
  if (params.source_type) {
    if (Array.isArray(params.source_type)) {
      extraConditions.push(`entries.source_type IN (${params.source_type.map(() => "?").join(",")})`);
      extraBindings.push(...params.source_type);
    } else {
      extraConditions.push("entries.source_type = ?");
      extraBindings.push(params.source_type);
    }
  }
  if (params.importance) {
    if (Array.isArray(params.importance)) {
      extraConditions.push(`entries.importance IN (${params.importance.map(() => '?').join(',')})`);
      extraBindings.push(...params.importance);
    } else {
      extraConditions.push("entries.importance = ?");
      extraBindings.push(params.importance);
    }
  }
  if (params.color) { extraConditions.push("entries.color = ?"); extraBindings.push(params.color); }
  if (params.pinned !== undefined) { extraConditions.push("entries.pinned = ?"); extraBindings.push(params.pinned ? 1 : 0); }

  // Handle since/until via extra conditions
  if (params.since) { extraConditions.push("entries.created_at >= ?"); extraBindings.push(params.since); }
  if (params.until) { extraConditions.push("entries.created_at <= ?"); extraBindings.push(params.until); }

  // Handle family as array via extra conditions (buildQuery only handles single string)
  let familyForBuildQuery: string | undefined;
  if (params.family) {
    if (Array.isArray(params.family)) {
      extraConditions.push(`entries.family IN (${params.family.map(() => '?').join(',')})`);
      extraBindings.push(...params.family);
    } else {
      familyForBuildQuery = params.family;
    }
  }

  // Handle project filter (supports multi-select + "__global" for NULL)
  if (params.project) {
    const projects = Array.isArray(params.project) ? params.project : [params.project];
    const named = projects.filter((p) => p !== "__global");
    const includeGlobal = projects.includes("__global");
    const parts: string[] = [];
    if (named.length > 0) {
      parts.push(`entries.project IN (${named.map(() => "?").join(",")})`);
      extraBindings.push(...named);
    }
    if (includeGlobal) {
      parts.push("entries.project IS NULL");
    }
    if (parts.length > 0) {
      extraConditions.push(`(${parts.join(" OR ")})`);
    }
  }

  // Search path: FTS goes through revisions (not directly on entries), so
  // buildQuery's standard FTS join won't work. Handle manually.
  let searchJoin = "";
  const searchConditions: string[] = [];
  const searchBindings: unknown[] = [];
  if (params.search) {
    searchJoin = `JOIN revisions ON revisions.thought_id = entries.id JOIN revisions_fts ON revisions_fts.rowid = revisions.rowid`;
    searchConditions.push("revisions_fts MATCH ?");
    searchBindings.push(params.search);
  }

  const { sql: baseQuery, bindings } = buildQuery(
    "entries",
    "revisions_fts",
    { ...params, search: undefined, family: familyForBuildQuery, since: undefined, until: undefined },
    {
      extraConditions: [...searchConditions, ...extraConditions],
      extraBindings: [...searchBindings, ...extraBindings],
      defaultOrder: params.search ? "rank" : "COALESCE(entries.sort_order, 999999) ASC, entries.created_at DESC",
    },
  );

  const distinct = params.search ? "DISTINCT" : "";
  const revisionSelect = opts?.withRevision
    ? ", lr.body AS latest_revision_body, lr.seq AS latest_revision_seq, lr.created_at AS latest_revision_created_at"
    : "";
  const revisionJoin = opts?.withRevision
    ? "LEFT JOIN revisions lr ON lr.thought_id = entries.id AND lr.seq = (SELECT MAX(seq) FROM revisions WHERE thought_id = entries.id)"
    : "";

  const sql = baseQuery
    .replace("SELECT entries.* FROM entries", `SELECT ${distinct} entries.*${revisionSelect} FROM entries ${searchJoin} ${revisionJoin}`.trim());

  const rows = db.prepare(sql).all(...bindings) as Record<string, unknown>[];
  return rows.map((row) => {
    const entry = deserializeEntry(row);
    if (opts?.withRevision) {
      return {
        ...entry,
        latest_revision_body: (row.latest_revision_body as string) ?? undefined,
        latest_revision_seq: (row.latest_revision_seq as number) ?? undefined,
        latest_revision_created_at: (row.latest_revision_created_at as string) ?? undefined,
      };
    }
    return entry;
  });
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

export function addRevision(entryId: string, body: string, source: string = "user"): Revision {
  const db = getDb();
  const id = genId("rev");
  const ts = now();

  const maxSeq = db.prepare("SELECT MAX(seq) AS max_seq FROM revisions WHERE thought_id = ?").get(entryId) as { max_seq: number | null };
  const seq = (maxSeq.max_seq ?? 0) + 1;

  db.prepare(`
    INSERT INTO revisions (id, thought_id, body, seq, source, created_at)
    VALUES (@id, @thought_id, @body, @seq, @source, @created_at)
  `).run({ id, thought_id: entryId, body, seq, source, created_at: ts });

  // Touch the entry's updated_at
  db.prepare("UPDATE entries SET updated_at = ? WHERE id = ?").run(ts, entryId);

  return deserializeRevision(
    db.prepare("SELECT * FROM revisions WHERE id = ?").get(id) as Record<string, unknown>,
  );
}

export function getRevisions(entryId: string): Revision[] {
  const rows = getDb().prepare("SELECT * FROM revisions WHERE thought_id = ? ORDER BY seq DESC").all(entryId) as Record<string, unknown>[];
  return rows.map(deserializeRevision);
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export function addAttachment(input: {
  entry_id: string;
  revision_id?: string;
  type: AttachmentType;
  path: string;
  alt?: string;
}): Attachment {
  const db = getDb();
  const id = genId("att");
  const ts = now();

  db.prepare(`
    INSERT INTO attachments (id, thought_id, revision_id, type, path, alt, created_at)
    VALUES (@id, @thought_id, @revision_id, @type, @path, @alt, @created_at)
  `).run({
    id, thought_id: input.entry_id, revision_id: input.revision_id ?? null,
    type: input.type, path: input.path, alt: input.alt ?? "", created_at: ts,
  });

  return deserializeAttachment(
    db.prepare("SELECT * FROM attachments WHERE id = ?").get(id) as Record<string, unknown>,
  );
}

export function getAttachments(entryId: string): Attachment[] {
  const rows = getDb().prepare("SELECT * FROM attachments WHERE thought_id = ? ORDER BY created_at").all(entryId) as Record<string, unknown>[];
  return rows.map(deserializeAttachment);
}

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export function addRelation(fromId: string, toId: string, type: RelationType): void {
  const ts = now();
  getDb().prepare(`
    INSERT OR IGNORE INTO entry_relations (from_id, to_id, type, created_at)
    VALUES (@from_id, @to_id, @type, @created_at)
  `).run({ from_id: fromId, to_id: toId, type, created_at: ts });
}

export function removeRelation(fromId: string, toId: string): void {
  getDb().prepare("DELETE FROM entry_relations WHERE from_id = ? AND to_id = ?").run(fromId, toId);
}

export function getRelations(entryId: string): EntryRelation[] {
  const rows = getDb().prepare(
    "SELECT * FROM entry_relations WHERE from_id = ? OR to_id = ? ORDER BY created_at",
  ).all(entryId, entryId) as EntryRelation[];
  return rows;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export function entryTags(): string[] {
  const rows = getDb().prepare(
    "SELECT DISTINCT j.value AS tag FROM entries, json_each(entries.tags) AS j ORDER BY tag",
  ).all() as { tag: string }[];
  return rows.map(r => r.tag);
}

export function entryFamilies(): string[] {
  const rows = getDb().prepare(
    "SELECT DISTINCT family FROM entries WHERE family IS NOT NULL ORDER BY family",
  ).all() as { family: string }[];
  return rows.map(r => r.family);
}

export function entryColors(): Color[] {
  const rows = getDb().prepare(
    "SELECT DISTINCT color FROM entries WHERE color IS NOT NULL ORDER BY color",
  ).all() as { color: Color }[];
  return rows.map(r => r.color);
}

export function entryProjects(): string[] {
  const rows = getDb().prepare(
    "SELECT DISTINCT project FROM entries WHERE project IS NOT NULL ORDER BY project",
  ).all() as { project: string }[];
  return rows.map(r => r.project);
}
