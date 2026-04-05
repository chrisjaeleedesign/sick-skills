import { getDb } from "./db";
import { genId, now } from "./utils";
import type { Board, BoardItem, Color } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deserializeBoard(row: Record<string, unknown>): Board {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    color: (row.color as Color) ?? undefined,
    columns: (row.columns as number) ?? 6,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function deserializeBoardItem(row: Record<string, unknown>): BoardItem {
  return {
    board_id: row.board_id as string,
    entry_id: row.thought_id as string,
    x: (row.x as number) ?? 0,
    y: (row.y as number) ?? 0,
    w: (row.w as number) ?? 1,
    h: (row.h as number) ?? 1,
    added_at: row.added_at as string,
  };
}

// ---------------------------------------------------------------------------
// Board CRUD
// ---------------------------------------------------------------------------

export function createBoard(input: {
  name: string;
  description?: string;
  color?: Color;
  columns?: number;
}): Board {
  const db = getDb();
  const id = genId("board");
  const ts = now();

  db.prepare(`
    INSERT INTO boards (id, name, description, color, columns, created_at, updated_at)
    VALUES (@id, @name, @description, @color, @columns, @created_at, @updated_at)
  `).run({
    id,
    name: input.name,
    description: input.description ?? "",
    color: input.color ?? null,
    columns: input.columns ?? 6,
    created_at: ts,
    updated_at: ts,
  });

  const row = db.prepare("SELECT * FROM boards WHERE id = ?").get(id) as Record<string, unknown>;
  return deserializeBoard(row);
}

export function getBoard(id: string): Board | undefined {
  const row = getDb().prepare("SELECT * FROM boards WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? deserializeBoard(row) : undefined;
}

export function listBoards(): Board[] {
  const rows = getDb().prepare("SELECT * FROM boards ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(deserializeBoard);
}

export function updateBoard(id: string, patch: Partial<Pick<Board, "name" | "description" | "color" | "columns">>): void {
  const db = getDb();
  const sets: string[] = [];
  const values: Record<string, unknown> = { id };

  if (patch.name !== undefined) { sets.push("name = @name"); values.name = patch.name; }
  if (patch.description !== undefined) { sets.push("description = @description"); values.description = patch.description; }
  if (patch.color !== undefined) { sets.push("color = @color"); values.color = patch.color; }
  if (patch.columns !== undefined) { sets.push("columns = @columns"); values.columns = patch.columns; }

  if (sets.length === 0) return;
  sets.push("updated_at = @updated_at");
  values.updated_at = now();

  db.prepare(`UPDATE boards SET ${sets.join(", ")} WHERE id = @id`).run(values);
}

export function deleteBoard(id: string): void {
  getDb().prepare("DELETE FROM boards WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Board items
// ---------------------------------------------------------------------------

export function addBoardItem(
  boardId: string,
  entryId: string,
  layout?: { x?: number; y?: number; w?: number; h?: number },
): void {
  const ts = now();
  getDb().prepare(`
    INSERT OR REPLACE INTO board_items (board_id, thought_id, x, y, w, h, added_at)
    VALUES (@board_id, @thought_id, @x, @y, @w, @h, @added_at)
  `).run({
    board_id: boardId,
    thought_id: entryId,
    x: layout?.x ?? 0,
    y: layout?.y ?? 0,
    w: layout?.w ?? 1,
    h: layout?.h ?? 1,
    added_at: ts,
  });
}

export function removeBoardItem(boardId: string, entryId: string): void {
  getDb().prepare("DELETE FROM board_items WHERE board_id = ? AND thought_id = ?").run(boardId, entryId);
}

export function getBoardItems(boardId: string): BoardItem[] {
  const rows = getDb().prepare(
    "SELECT * FROM board_items WHERE board_id = ? ORDER BY y, x"
  ).all(boardId) as Record<string, unknown>[];
  return rows.map(deserializeBoardItem);
}

export function updateBoardItemLayout(
  boardId: string,
  entryId: string,
  layout: { x?: number; y?: number; w?: number; h?: number },
): void {
  const db = getDb();
  const sets: string[] = [];
  const values: Record<string, unknown> = { board_id: boardId, thought_id: entryId };

  if (layout.x !== undefined) { sets.push("x = @x"); values.x = layout.x; }
  if (layout.y !== undefined) { sets.push("y = @y"); values.y = layout.y; }
  if (layout.w !== undefined) { sets.push("w = @w"); values.w = layout.w; }
  if (layout.h !== undefined) { sets.push("h = @h"); values.h = layout.h; }

  if (sets.length === 0) return;

  db.prepare(
    `UPDATE board_items SET ${sets.join(", ")} WHERE board_id = @board_id AND thought_id = @thought_id`
  ).run(values);
}

export function bulkUpdateBoardLayout(
  boardId: string,
  items: { entryId: string; x: number; y: number; w: number; h: number }[],
): void {
  const db = getDb();
  const stmt = db.prepare(
    "UPDATE board_items SET x = @x, y = @y, w = @w, h = @h WHERE board_id = @board_id AND thought_id = @thought_id"
  );
  const tx = db.transaction(() => {
    for (const item of items) {
      stmt.run({ board_id: boardId, thought_id: item.entryId, x: item.x, y: item.y, w: item.w, h: item.h });
    }
  });
  tx();
}

export function listBoardsWithPreviews(): (Board & { itemCount: number; previewPaths: string[] })[] {
  const db = getDb();
  const boards = listBoards();
  const countStmt = db.prepare("SELECT COUNT(*) as c FROM board_items WHERE board_id = ?");
  const previewStmt = db.prepare(`
    SELECT a.path FROM board_items bi
    JOIN attachments a ON a.thought_id = bi.thought_id
    WHERE bi.board_id = ? AND a.type IN ('image','screenshot')
    ORDER BY bi.added_at LIMIT 4
  `);
  return boards.map(b => ({
    ...b,
    itemCount: (countStmt.get(b.id) as any).c as number,
    previewPaths: (previewStmt.all(b.id) as any[]).map(r => r.path as string),
  }));
}

export function getBoardItemsEnriched(boardId: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT e.id, e.kind, e.source_type, e.family, e.tags, e.color, e.pinned, e.created_at,
           (SELECT r.body FROM revisions r WHERE r.thought_id = e.id ORDER BY r.seq DESC LIMIT 1) as latest_revision_body,
           a.path as att_path, a.type as att_type
    FROM board_items bi
    JOIN entries e ON e.id = bi.thought_id
    LEFT JOIN (
      SELECT thought_id, path, type, ROW_NUMBER() OVER (PARTITION BY thought_id ORDER BY created_at) as rn
      FROM attachments
    ) a ON a.thought_id = e.id AND a.rn = 1
    WHERE bi.board_id = ?
    ORDER BY bi.y, bi.x
  `).all(boardId);

  return rows.map((row: any) => ({
    id: row.id,
    kind: row.kind,
    source_type: row.source_type,
    family: row.family,
    tags: JSON.parse(row.tags || "[]"),
    color: row.color,
    pinned: row.pinned === 1,
    created_at: row.created_at,
    latest_revision_body: row.latest_revision_body,
    attachment: row.att_path ? { path: row.att_path, type: row.att_type } : null,
    boards: [],
  }));
}

export function getBoardsForEntry(entryId: string): { board_id: string; name: string; color: string | null }[] {
  return getDb().prepare(`
    SELECT bi.board_id, b.name, b.color
    FROM board_items bi
    JOIN boards b ON b.id = bi.board_id
    WHERE bi.thought_id = ?
    ORDER BY b.name
  `).all(entryId) as { board_id: string; name: string; color: string | null }[];
}
