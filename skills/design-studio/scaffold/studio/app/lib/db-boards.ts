import { getDb } from "./db";
import { genId, now } from "./utils";
import type { Board, BoardItem, ThoughtColor } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deserializeBoard(row: Record<string, unknown>): Board {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    color: (row.color as ThoughtColor) ?? undefined,
    columns: (row.columns as number) ?? 6,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function deserializeBoardItem(row: Record<string, unknown>): BoardItem {
  return {
    board_id: row.board_id as string,
    thought_id: row.thought_id as string,
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
  color?: ThoughtColor;
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
  thoughtId: string,
  layout?: { x?: number; y?: number; w?: number; h?: number },
): void {
  const ts = now();
  getDb().prepare(`
    INSERT OR REPLACE INTO board_items (board_id, thought_id, x, y, w, h, added_at)
    VALUES (@board_id, @thought_id, @x, @y, @w, @h, @added_at)
  `).run({
    board_id: boardId,
    thought_id: thoughtId,
    x: layout?.x ?? 0,
    y: layout?.y ?? 0,
    w: layout?.w ?? 1,
    h: layout?.h ?? 1,
    added_at: ts,
  });
}

export function removeBoardItem(boardId: string, thoughtId: string): void {
  getDb().prepare("DELETE FROM board_items WHERE board_id = ? AND thought_id = ?").run(boardId, thoughtId);
}

export function getBoardItems(boardId: string): BoardItem[] {
  const rows = getDb().prepare(
    "SELECT * FROM board_items WHERE board_id = ? ORDER BY y, x"
  ).all(boardId) as Record<string, unknown>[];
  return rows.map(deserializeBoardItem);
}

export function updateBoardItemLayout(
  boardId: string,
  thoughtId: string,
  layout: { x?: number; y?: number; w?: number; h?: number },
): void {
  const db = getDb();
  const sets: string[] = [];
  const values: Record<string, unknown> = { board_id: boardId, thought_id: thoughtId };

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
  items: { thoughtId: string; x: number; y: number; w: number; h: number }[],
): void {
  const db = getDb();
  const stmt = db.prepare(
    "UPDATE board_items SET x = @x, y = @y, w = @w, h = @h WHERE board_id = @board_id AND thought_id = @thought_id"
  );
  const tx = db.transaction(() => {
    for (const item of items) {
      stmt.run({ board_id: boardId, thought_id: item.thoughtId, x: item.x, y: item.y, w: item.w, h: item.h });
    }
  });
  tx();
}

export function getBoardsForThought(thoughtId: string): { board_id: string; name: string; color: string | null }[] {
  return getDb().prepare(`
    SELECT bi.board_id, b.name, b.color
    FROM board_items bi
    JOIN boards b ON b.id = bi.board_id
    WHERE bi.thought_id = ?
    ORDER BY b.name
  `).all(thoughtId) as { board_id: string; name: string; color: string | null }[];
}
