import type { Section } from "./manifest";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GridPos {
  row: number;
  col: number;
}

export type DropTarget =
  | { kind: "cell"; sectionId: string; row: number; col: number }
  | { kind: "gutter-right"; sectionId: string; row: number }
  | { kind: "gutter-bottom"; sectionId: string; col: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const key = (r: number, c: number): string => `${r}:${c}`;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Parse a droppable element ID into a typed `DropTarget`.
 *
 * Formats:
 * - `{sectionId}:{row}:{col}` → cell
 * - `{sectionId}:gutter-right:{row}` → gutter-right
 * - `{sectionId}:gutter-bottom:{col}` → gutter-bottom
 *
 * Section IDs may contain colons, so splitting is done from the right.
 */
export function parseDropId(id: string): DropTarget | null {
  const parts = id.split(":");

  if (parts.length < 3) return null;

  // Pop the last segment (always a number: col, row, or col depending on kind)
  const last = parts.pop()!;
  // Check the new last segment for gutter keywords
  const secondLast = parts[parts.length - 1];

  if (secondLast === "gutter-right") {
    parts.pop(); // remove "gutter-right"
    const sectionId = parts.join(":");
    const row = parseInt(last, 10);
    if (!sectionId || isNaN(row)) return null;
    return { kind: "gutter-right", sectionId, row };
  }

  if (secondLast === "gutter-bottom") {
    parts.pop(); // remove "gutter-bottom"
    const sectionId = parts.join(":");
    const col = parseInt(last, 10);
    if (!sectionId || isNaN(col)) return null;
    return { kind: "gutter-bottom", sectionId, col };
  }

  // Regular cell: pop again for the row
  const rowStr = parts.pop()!;
  const sectionId = parts.join(":");
  const row = parseInt(rowStr, 10);
  const col = parseInt(last, 10);
  if (!sectionId || isNaN(row) || isNaN(col)) return null;
  return { kind: "cell", sectionId, row, col };
}

/**
 * Insert a slug at the target position, pushing existing cards rightward
 * with cascading overflow. Rows auto-expand when cards spill past the last
 * column of the last row.
 *
 * Returns a new grid and (possibly increased) row count. Never mutates inputs.
 */
export function insertWithShift(
  grid: Record<string, string>,
  rows: number,
  columns: number,
  target: GridPos,
  slug: string,
): { grid: Record<string, string>; rows: number } {
  const newGrid: Record<string, string> = { ...grid };
  let currentRows = rows;

  let r = target.row;
  let c = target.col;
  let toPlace = slug;

  while (toPlace !== undefined) {
    const k = key(r, c);
    const occupant = newGrid[k];

    if (occupant === undefined) {
      // Empty cell — place and done
      newGrid[k] = toPlace;
      break;
    }

    // Occupied — displace
    newGrid[k] = toPlace;
    toPlace = occupant;

    // Advance position
    c += 1;
    if (c >= columns) {
      c = 0;
      r += 1;
    }
    if (r >= currentRows) {
      currentRows += 1;
    }
  }

  return { grid: newGrid, rows: currentRows };
}

/**
 * Remove completely empty trailing rows and columns, cleaning up any
 * orphaned grid keys. Never reduces below 1x1.
 */
export function trimTrailing(
  grid: Record<string, string>,
  rows: number,
  columns: number,
): { grid: Record<string, string>; rows: number; columns: number } {
  let trimmedRows = rows;
  let trimmedCols = columns;

  // Trim trailing empty rows
  while (trimmedRows > 1) {
    const r = trimmedRows - 1;
    const rowHasContent = Array.from({ length: trimmedCols }, (_, c) => key(r, c))
      .some((k) => k in grid);
    if (rowHasContent) break;
    trimmedRows -= 1;
  }

  // Trim trailing empty columns
  while (trimmedCols > 1) {
    const c = trimmedCols - 1;
    const colHasContent = Array.from({ length: trimmedRows }, (_, r) => key(r, c))
      .some((k) => k in grid);
    if (colHasContent) break;
    trimmedCols -= 1;
  }

  // Defensive: remove any keys outside the new bounds
  const newGrid: Record<string, string> = {};
  for (const [k, v] of Object.entries(grid)) {
    const [rStr, cStr] = k.split(":");
    const r = parseInt(rStr, 10);
    const c = parseInt(cStr, 10);
    if (r < trimmedRows && c < trimmedCols) {
      newGrid[k] = v;
    }
  }

  return { grid: newGrid, rows: trimmedRows, columns: trimmedCols };
}

/**
 * Remove a slug from the grid by value. Returns a new grid object.
 */
export function removeSlug(
  grid: Record<string, string>,
  slug: string,
): Record<string, string> {
  const newGrid: Record<string, string> = {};
  for (const [k, v] of Object.entries(grid)) {
    if (v !== slug) {
      newGrid[k] = v;
    }
  }
  return newGrid;
}

/**
 * Search all sections for a slug's grid position.
 * Returns the sectionId, row, and col, or null if not found.
 */
export function findSlug(
  sections: readonly Section[],
  slug: string,
): { sectionId: string; row: number; col: number } | null {
  for (const section of sections) {
    for (const [k, v] of Object.entries(section.grid)) {
      if (v === slug) {
        const [rStr, cStr] = k.split(":");
        return {
          sectionId: section.id,
          row: parseInt(rStr, 10),
          col: parseInt(cStr, 10),
        };
      }
    }
  }
  return null;
}

/**
 * Resolve a gutter drop target into the new grid dimensions and the
 * concrete cell position where the card should be placed.
 *
 * Returns null if the drop is invalid (e.g. column cap reached, or
 * called with a cell target).
 */
export function resolveGutterDrop(
  columns: number,
  rows: number,
  target: DropTarget,
): { columns: number; rows: number; pos: GridPos } | null {
  if (target.kind === "gutter-right") {
    return {
      columns: columns + 1,
      rows,
      pos: { row: target.row, col: columns },
    };
  }

  if (target.kind === "gutter-bottom") {
    return {
      columns,
      rows: rows + 1,
      pos: { row: rows, col: target.col },
    };
  }

  // cell kind — should not be called with this
  return null;
}

/**
 * Orchestrate a complete drag-and-drop operation: remove the slug from its
 * source, expand gutters if needed, insert at the target with shift, and
 * trim trailing empties on all sections.
 *
 * Returns a new sections array, or null if the drop is invalid.
 */
export function applyDragResult(
  sections: readonly Section[],
  slug: string,
  target: DropTarget,
): Section[] | null {
  // 1. Deep-copy sections
  const copied: Section[] = sections.map((s) => ({
    ...s,
    grid: { ...s.grid },
  }));

  // 2. Remove slug from its current position
  for (const section of copied) {
    section.grid = removeSlug(section.grid, slug);
  }

  // 3. Find target section
  const targetSection = copied.find((s) => s.id === target.sectionId);
  if (!targetSection) return null;

  // 4 & 5. Determine target position
  let pos: GridPos;

  if (target.kind === "cell") {
    pos = { row: target.row, col: target.col };
  } else {
    const resolved = resolveGutterDrop(
      targetSection.columns,
      targetSection.rows,
      target,
    );
    if (!resolved) return null;
    targetSection.columns = resolved.columns;
    targetSection.rows = resolved.rows;
    pos = resolved.pos;
  }

  // 6. Insert with shift
  const inserted = insertWithShift(
    targetSection.grid,
    targetSection.rows,
    targetSection.columns,
    pos,
    slug,
  );

  // 7. Update target section
  targetSection.grid = inserted.grid;
  targetSection.rows = inserted.rows;

  // 8. Trim trailing empties on all sections
  for (const section of copied) {
    const trimmed = trimTrailing(section.grid, section.rows, section.columns);
    section.grid = trimmed.grid;
    section.rows = trimmed.rows;
    section.columns = trimmed.columns;
  }

  // 9. Return updated sections
  return copied;
}
