import { getDb, buildQuery } from "./db";
import { genId, now } from "./utils";
import type {
  ThoughtKind, SourceType, Importance, RelationType,
  AttachmentType, ThoughtColor,
  Thought, Revision, Attachment, ThoughtRelation,
  ThoughtQueryParams,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deserializeThought(row: Record<string, unknown>): Thought {
  return {
    id: row.id as string,
    kind: row.kind as ThoughtKind,
    source_type: (row.source_type as SourceType) ?? undefined,
    source_url: (row.source_url as string) ?? undefined,
    source_meta: JSON.parse((row.source_meta as string) || "{}"),
    family: (row.family as string) ?? undefined,
    tags: JSON.parse((row.tags as string) || "[]"),
    color: (row.color as ThoughtColor) ?? undefined,
    pinned: (row.pinned as number) === 1,
    importance: (row.importance as Importance) ?? undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    layout_w: (row.layout_w as number) ?? undefined,
    layout_h: (row.layout_h as number) ?? undefined,
    layout_x: (row.layout_x as number) ?? undefined,
    layout_y: (row.layout_y as number) ?? undefined,
  };
}

function deserializeRevision(row: Record<string, unknown>): Revision {
  return {
    id: row.id as string,
    thought_id: row.thought_id as string,
    body: (row.body as string) ?? undefined,
    seq: row.seq as number,
    source: row.source as string,
    created_at: row.created_at as string,
  };
}

function deserializeAttachment(row: Record<string, unknown>): Attachment {
  return {
    id: row.id as string,
    thought_id: row.thought_id as string,
    revision_id: (row.revision_id as string) ?? undefined,
    type: row.type as AttachmentType,
    path: row.path as string,
    alt: (row.alt as string) ?? "",
    created_at: row.created_at as string,
  };
}

// ---------------------------------------------------------------------------
// Thought CRUD
// ---------------------------------------------------------------------------

export function createThought(input: {
  kind: ThoughtKind;
  body?: string;
  source_type?: SourceType;
  source_url?: string;
  source_meta?: Record<string, unknown>;
  family?: string;
  tags?: string[];
  color?: ThoughtColor;
  pinned?: boolean;
  importance?: Importance;
  revision_source?: string;
}): { thought: Thought; revision: Revision } {

  const db = getDb();
  const thoughtId = genId("th");
  const revisionId = genId("rev");
  const ts = now();

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO thoughts (id, kind, source_type, source_url, source_meta, family, tags, color, pinned, importance, created_at, updated_at)
      VALUES (@id, @kind, @source_type, @source_url, @source_meta, @family, @tags, @color, @pinned, @importance, @created_at, @updated_at)
    `).run({
      id: thoughtId,
      kind: input.kind,
      source_type: input.source_type ?? null,
      source_url: input.source_url ?? null,
      source_meta: JSON.stringify(input.source_meta ?? {}),
      family: input.family ?? null,
      tags: JSON.stringify(input.tags ?? []),
      color: input.color ?? null,
      pinned: input.pinned ? 1 : 0,
      importance: input.importance ?? null,
      created_at: ts,
      updated_at: ts,
    });

    db.prepare(`
      INSERT INTO revisions (id, thought_id, body, seq, source, created_at)
      VALUES (@id, @thought_id, @body, @seq, @source, @created_at)
    `).run({
      id: revisionId,
      thought_id: thoughtId,
      body: input.body ?? null,
      seq: 1,
      source: input.revision_source ?? "user",
      created_at: ts,
    });
  });
  tx();

  const thought = db.prepare("SELECT * FROM thoughts WHERE id = ?").get(thoughtId) as Record<string, unknown>;
  const revision = db.prepare("SELECT * FROM revisions WHERE id = ?").get(revisionId) as Record<string, unknown>;
  return { thought: deserializeThought(thought), revision: deserializeRevision(revision) };
}

export function getThought(id: string): Thought | undefined {

  const row = getDb().prepare("SELECT * FROM thoughts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? deserializeThought(row) : undefined;
}

export function updateThought(id: string, patch: Partial<Pick<Thought, "kind" | "source_type" | "source_url" | "source_meta" | "family" | "tags" | "color" | "pinned" | "importance">>): void {

  const db = getDb();
  const sets: string[] = [];
  const values: Record<string, unknown> = { id };

  if (patch.kind !== undefined) { sets.push("kind = @kind"); values.kind = patch.kind; }
  if (patch.source_type !== undefined) { sets.push("source_type = @source_type"); values.source_type = patch.source_type; }
  if (patch.source_url !== undefined) { sets.push("source_url = @source_url"); values.source_url = patch.source_url; }
  if (patch.source_meta !== undefined) { sets.push("source_meta = @source_meta"); values.source_meta = JSON.stringify(patch.source_meta); }
  if (patch.family !== undefined) { sets.push("family = @family"); values.family = patch.family; }
  if (patch.tags !== undefined) { sets.push("tags = @tags"); values.tags = JSON.stringify(patch.tags); }
  if (patch.color !== undefined) { sets.push("color = @color"); values.color = patch.color; }
  if (patch.pinned !== undefined) { sets.push("pinned = @pinned"); values.pinned = patch.pinned ? 1 : 0; }
  if (patch.importance !== undefined) { sets.push("importance = @importance"); values.importance = patch.importance; }

  if (sets.length === 0) return;
  sets.push("updated_at = @updated_at");
  values.updated_at = now();

  db.prepare(`UPDATE thoughts SET ${sets.join(", ")} WHERE id = @id`).run(values);
}

export function deleteThought(id: string): void {

  getDb().prepare("DELETE FROM thoughts WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Query thoughts
// ---------------------------------------------------------------------------

export function queryThoughts(params: ThoughtQueryParams = {}, opts?: { withRevision?: boolean }): (Thought & { latest_revision_body?: string; latest_revision_seq?: number; latest_revision_created_at?: string })[] {

  const db = getDb();

  // Thought-specific extra filters for buildQuery
  const extraConditions: string[] = [];
  const extraBindings: unknown[] = [];

  if (params.kind) { extraConditions.push("thoughts.kind = ?"); extraBindings.push(params.kind); }
  if (params.source_type) { extraConditions.push("thoughts.source_type = ?"); extraBindings.push(params.source_type); }
  if (params.importance) { extraConditions.push("thoughts.importance = ?"); extraBindings.push(params.importance); }
  if (params.color) { extraConditions.push("thoughts.color = ?"); extraBindings.push(params.color); }
  if (params.pinned !== undefined) { extraConditions.push("thoughts.pinned = ?"); extraBindings.push(params.pinned ? 1 : 0); }

  // Search path: FTS goes through revisions (not directly on thoughts), so
  // buildQuery's standard FTS join won't work. Handle manually.
  let searchJoin = "";
  const searchConditions: string[] = [];
  const searchBindings: unknown[] = [];
  if (params.search) {
    searchJoin = `JOIN revisions ON revisions.thought_id = thoughts.id JOIN revisions_fts ON revisions_fts.rowid = revisions.rowid`;
    searchConditions.push("revisions_fts MATCH ?");
    searchBindings.push(params.search);
  }

  // Use buildQuery for the common filters (family, tags, limit, offset)
  // but pass search=undefined so it doesn't try its own FTS join
  const { sql: baseQuery, bindings } = buildQuery(
    "thoughts",
    "revisions_fts", // unused since we clear search
    { ...params, search: undefined },
    {
      extraConditions: [...searchConditions, ...extraConditions],
      extraBindings: [...searchBindings, ...extraBindings],
      defaultOrder: params.search ? "rank" : "thoughts.created_at DESC",
    },
  );

  // buildQuery produces: SELECT thoughts.* FROM thoughts [WHERE ...] ORDER BY ... LIMIT ...
  // We need to inject the search join and optional revision join, plus DISTINCT for search
  const distinct = params.search ? "DISTINCT" : "";
  const revisionSelect = opts?.withRevision
    ? ", lr.body AS latest_revision_body, lr.seq AS latest_revision_seq, lr.created_at AS latest_revision_created_at"
    : "";
  const revisionJoin = opts?.withRevision
    ? "LEFT JOIN revisions lr ON lr.thought_id = thoughts.id AND lr.seq = (SELECT MAX(seq) FROM revisions WHERE thought_id = thoughts.id)"
    : "";

  // Replace the SELECT clause to add DISTINCT, layout, and revision columns,
  // and inject the search/revision joins after FROM thoughts
  const sql = baseQuery
    .replace("SELECT thoughts.* FROM thoughts", `SELECT ${distinct} thoughts.*, thoughts.layout_w, thoughts.layout_h, thoughts.layout_x, thoughts.layout_y${revisionSelect} FROM thoughts ${searchJoin} ${revisionJoin}`.trim());

  const rows = db.prepare(sql).all(...bindings) as Record<string, unknown>[];
  return rows.map((row) => {
    const thought = deserializeThought(row);
    if (opts?.withRevision) {
      return {
        ...thought,
        latest_revision_body: (row.latest_revision_body as string) ?? undefined,
        latest_revision_seq: (row.latest_revision_seq as number) ?? undefined,
        latest_revision_created_at: (row.latest_revision_created_at as string) ?? undefined,
      };
    }
    return thought;
  });
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

export function addRevision(thoughtId: string, body: string, source: string = "user"): Revision {

  const db = getDb();
  const id = genId("rev");
  const ts = now();

  const maxSeq = db.prepare("SELECT MAX(seq) AS max_seq FROM revisions WHERE thought_id = ?").get(thoughtId) as { max_seq: number | null };
  const seq = (maxSeq.max_seq ?? 0) + 1;

  db.prepare(`
    INSERT INTO revisions (id, thought_id, body, seq, source, created_at)
    VALUES (@id, @thought_id, @body, @seq, @source, @created_at)
  `).run({ id, thought_id: thoughtId, body, seq, source, created_at: ts });

  // Touch the thought's updated_at
  db.prepare("UPDATE thoughts SET updated_at = ? WHERE id = ?").run(ts, thoughtId);

  return deserializeRevision(
    db.prepare("SELECT * FROM revisions WHERE id = ?").get(id) as Record<string, unknown>,
  );
}

export function getRevisions(thoughtId: string): Revision[] {

  const rows = getDb().prepare("SELECT * FROM revisions WHERE thought_id = ? ORDER BY seq DESC").all(thoughtId) as Record<string, unknown>[];
  return rows.map(deserializeRevision);
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export function addAttachment(input: {
  thought_id: string;
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
    id, thought_id: input.thought_id, revision_id: input.revision_id ?? null,
    type: input.type, path: input.path, alt: input.alt ?? "", created_at: ts,
  });

  return deserializeAttachment(
    db.prepare("SELECT * FROM attachments WHERE id = ?").get(id) as Record<string, unknown>,
  );
}

export function getAttachments(thoughtId: string): Attachment[] {

  const rows = getDb().prepare("SELECT * FROM attachments WHERE thought_id = ? ORDER BY created_at").all(thoughtId) as Record<string, unknown>[];
  return rows.map(deserializeAttachment);
}

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export function addRelation(fromId: string, toId: string, type: RelationType): void {

  const ts = now();
  getDb().prepare(`
    INSERT OR IGNORE INTO thought_relations (from_id, to_id, type, created_at)
    VALUES (@from_id, @to_id, @type, @created_at)
  `).run({ from_id: fromId, to_id: toId, type, created_at: ts });
}

export function removeRelation(fromId: string, toId: string): void {

  getDb().prepare("DELETE FROM thought_relations WHERE from_id = ? AND to_id = ?").run(fromId, toId);
}

export function getRelations(thoughtId: string): ThoughtRelation[] {

  const rows = getDb().prepare(
    "SELECT * FROM thought_relations WHERE from_id = ? OR to_id = ? ORDER BY created_at",
  ).all(thoughtId, thoughtId) as ThoughtRelation[];
  return rows;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export function thoughtTags(): string[] {

  const rows = getDb().prepare(
    "SELECT DISTINCT j.value AS tag FROM thoughts, json_each(thoughts.tags) AS j ORDER BY tag",
  ).all() as { tag: string }[];
  return rows.map(r => r.tag);
}

export function thoughtFamilies(): string[] {

  const rows = getDb().prepare(
    "SELECT DISTINCT family FROM thoughts WHERE family IS NOT NULL ORDER BY family",
  ).all() as { family: string }[];
  return rows.map(r => r.family);
}

export function thoughtColors(): ThoughtColor[] {

  const rows = getDb().prepare(
    "SELECT DISTINCT color FROM thoughts WHERE color IS NOT NULL ORDER BY color",
  ).all() as { color: ThoughtColor }[];
  return rows.map(r => r.color);
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export function updateThoughtLayout(id: string, layout: { layout_x?: number; layout_y?: number; layout_w?: number; layout_h?: number }): void {

  const db = getDb();
  const sets: string[] = [];
  const values: Record<string, unknown> = { id };

  if (layout.layout_x !== undefined) { sets.push("layout_x = @layout_x"); values.layout_x = layout.layout_x; }
  if (layout.layout_y !== undefined) { sets.push("layout_y = @layout_y"); values.layout_y = layout.layout_y; }
  if (layout.layout_w !== undefined) { sets.push("layout_w = @layout_w"); values.layout_w = layout.layout_w; }
  if (layout.layout_h !== undefined) { sets.push("layout_h = @layout_h"); values.layout_h = layout.layout_h; }

  if (sets.length === 0) return;
  sets.push("updated_at = @updated_at");
  values.updated_at = now();

  db.prepare(`UPDATE thoughts SET ${sets.join(", ")} WHERE id = @id`).run(values);
}

export function bulkUpdateThoughtLayout(items: { id: string; layout_x: number; layout_y: number; layout_w: number; layout_h: number }[]): void {

  const db = getDb();
  const stmt = db.prepare(
    "UPDATE thoughts SET layout_x = @layout_x, layout_y = @layout_y, layout_w = @layout_w, layout_h = @layout_h, updated_at = @updated_at WHERE id = @id"
  );
  const ts = now();
  const tx = db.transaction(() => {
    for (const item of items) {
      stmt.run({ id: item.id, layout_x: item.layout_x, layout_y: item.layout_y, layout_w: item.layout_w, layout_h: item.layout_h, updated_at: ts });
    }
  });
  tx();
}
