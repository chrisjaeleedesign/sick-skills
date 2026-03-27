import { describe, it, expect } from "vitest";
import {
  parseDropId,
  insertWithShift,
  trimTrailing,
  removeSlug,
  findSlug,
  resolveGutterDrop,
  applyDragResult,
} from "./grid";
import type { Section } from "./manifest";

// ---------------------------------------------------------------------------
// Helper to build a minimal Section for testing
// ---------------------------------------------------------------------------
function makeSection(
  overrides: Partial<Section> & { id: string },
): Section {
  return {
    name: "Test",
    focus: false,
    collapsed: false,
    columns: 2,
    rows: 1,
    grid: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseDropId
// ---------------------------------------------------------------------------
describe("parseDropId", () => {
  it("parses a regular cell id", () => {
    expect(parseDropId("sec-123:1:2")).toEqual({
      kind: "cell",
      sectionId: "sec-123",
      row: 1,
      col: 2,
    });
  });

  it("parses a section ID containing numbers", () => {
    expect(parseDropId("sec-1774119501453:0:1")).toEqual({
      kind: "cell",
      sectionId: "sec-1774119501453",
      row: 0,
      col: 1,
    });
  });

  it("parses a right gutter id", () => {
    expect(parseDropId("sec-123:gutter-right:0")).toEqual({
      kind: "gutter-right",
      sectionId: "sec-123",
      row: 0,
    });
  });

  it("parses a bottom gutter id", () => {
    expect(parseDropId("sec-123:gutter-bottom:2")).toEqual({
      kind: "gutter-bottom",
      sectionId: "sec-123",
      col: 2,
    });
  });

  it("returns null for too few parts", () => {
    expect(parseDropId("foo:1")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseDropId("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// insertWithShift
// ---------------------------------------------------------------------------
describe("insertWithShift", () => {
  it("inserts into an empty cell without shifting", () => {
    const result = insertWithShift({}, 1, 2, { row: 0, col: 0 }, "A");
    expect(result.grid["0:0"]).toBe("A");
    expect(result.rows).toBe(1);
  });

  it("pushes an existing card right when inserting into an occupied cell", () => {
    const grid = { "0:0": "A" };
    const result = insertWithShift(grid, 1, 2, { row: 0, col: 0 }, "B");
    expect(result.grid["0:0"]).toBe("B");
    expect(result.grid["0:1"]).toBe("A");
    expect(result.rows).toBe(1);
  });

  it("cascades a chain of pushes, wrapping to a new row", () => {
    const grid = { "0:0": "A", "0:1": "B" };
    const result = insertWithShift(grid, 1, 2, { row: 0, col: 0 }, "C");
    expect(result.grid["0:0"]).toBe("C");
    expect(result.grid["0:1"]).toBe("A");
    expect(result.grid["1:0"]).toBe("B");
    expect(result.rows).toBe(2);
  });

  it("wraps a push at end of row to the next row", () => {
    const grid = { "0:2": "A" };
    const result = insertWithShift(grid, 1, 3, { row: 0, col: 2 }, "B");
    expect(result.grid["0:2"]).toBe("B");
    expect(result.grid["1:0"]).toBe("A");
    expect(result.rows).toBe(2);
  });

  it("cascades a full row across multiple positions", () => {
    const grid = { "0:0": "A", "0:1": "B", "0:2": "C" };
    const result = insertWithShift(grid, 1, 3, { row: 0, col: 0 }, "D");
    expect(result.grid["0:0"]).toBe("D");
    expect(result.grid["0:1"]).toBe("A");
    expect(result.grid["0:2"]).toBe("B");
    expect(result.grid["1:0"]).toBe("C");
    expect(result.rows).toBe(2);
  });

  it("inserts into an empty grid without changing row count", () => {
    const result = insertWithShift({}, 1, 2, { row: 0, col: 0 }, "A");
    expect(result.grid["0:0"]).toBe("A");
    expect(result.rows).toBe(1);
  });

  it("does not mutate the original grid", () => {
    const grid = { "0:0": "A" };
    const original = { ...grid };
    insertWithShift(grid, 1, 2, { row: 0, col: 0 }, "B");
    expect(grid).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// trimTrailing
// ---------------------------------------------------------------------------
describe("trimTrailing", () => {
  it("removes a single empty trailing row", () => {
    const grid = { "0:0": "A", "0:1": "B" };
    const result = trimTrailing(grid, 2, 2);
    expect(result.rows).toBe(1);
    expect(result.columns).toBe(2);
  });

  it("removes multiple empty trailing rows", () => {
    const grid = { "0:0": "A" };
    const result = trimTrailing(grid, 4, 2);
    expect(result.rows).toBe(1);
  });

  it("removes an empty trailing column", () => {
    const grid = { "0:0": "A", "1:0": "B" };
    const result = trimTrailing(grid, 2, 3);
    expect(result.columns).toBe(1);
    expect(result.rows).toBe(2);
  });

  it("removes both trailing rows and columns", () => {
    const grid = { "0:0": "A" };
    const result = trimTrailing(grid, 3, 3);
    expect(result.rows).toBe(1);
    expect(result.columns).toBe(1);
  });

  it("does not change when there are no trailing empties", () => {
    const grid = { "0:0": "A", "0:1": "B", "1:0": "C", "1:1": "D" };
    const result = trimTrailing(grid, 2, 2);
    expect(result.rows).toBe(2);
    expect(result.columns).toBe(2);
    expect(Object.keys(result.grid)).toHaveLength(4);
  });

  it("does not change a 1x1 grid with content", () => {
    const grid = { "0:0": "A" };
    const result = trimTrailing(grid, 1, 1);
    expect(result.rows).toBe(1);
    expect(result.columns).toBe(1);
    expect(result.grid["0:0"]).toBe("A");
  });

  it("keeps a completely empty grid at 1x1 minimum", () => {
    const result = trimTrailing({}, 3, 3);
    expect(result.rows).toBe(1);
    expect(result.columns).toBe(1);
  });

  it("preserves middle gaps (only trims trailing)", () => {
    const grid = { "0:0": "A", "2:0": "B" };
    const result = trimTrailing(grid, 3, 1);
    expect(result.rows).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// removeSlug
// ---------------------------------------------------------------------------
describe("removeSlug", () => {
  it("removes the correct slug from the grid", () => {
    const grid = { "0:0": "A", "0:1": "B" };
    const result = removeSlug(grid, "A");
    expect(result["0:0"]).toBeUndefined();
    expect(result["0:1"]).toBe("B");
  });

  it("returns a grid without the slug", () => {
    const grid = { "0:0": "A" };
    const result = removeSlug(grid, "A");
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("returns an identical grid when slug is not found", () => {
    const grid = { "0:0": "A", "0:1": "B" };
    const result = removeSlug(grid, "Z");
    expect(result).toEqual(grid);
  });

  it("only removes the matching slug among multiple entries", () => {
    const grid = { "0:0": "A", "0:1": "B", "1:0": "C" };
    const result = removeSlug(grid, "B");
    expect(Object.keys(result)).toHaveLength(2);
    expect(result["0:0"]).toBe("A");
    expect(result["1:0"]).toBe("C");
  });
});

// ---------------------------------------------------------------------------
// findSlug
// ---------------------------------------------------------------------------
describe("findSlug", () => {
  it("finds a slug in the first section", () => {
    const sections = [
      makeSection({ id: "s1", grid: { "0:0": "A" } }),
      makeSection({ id: "s2", grid: { "0:0": "B" } }),
    ];
    expect(findSlug(sections, "A")).toEqual({
      sectionId: "s1",
      row: 0,
      col: 0,
    });
  });

  it("finds a slug in a later section", () => {
    const sections = [
      makeSection({ id: "s1", grid: { "0:0": "A" } }),
      makeSection({ id: "s2", grid: { "1:2": "X" } }),
    ];
    expect(findSlug(sections, "X")).toEqual({
      sectionId: "s2",
      row: 1,
      col: 2,
    });
  });

  it("returns null when the slug is not found", () => {
    const sections = [
      makeSection({ id: "s1", grid: { "0:0": "A" } }),
    ];
    expect(findSlug(sections, "Z")).toBeNull();
  });

  it("returns correct row and col coordinates", () => {
    const sections = [
      makeSection({ id: "s1", grid: { "2:1": "deep" } }),
    ];
    expect(findSlug(sections, "deep")).toEqual({
      sectionId: "s1",
      row: 2,
      col: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// resolveGutterDrop
// ---------------------------------------------------------------------------
describe("resolveGutterDrop", () => {
  it("expands columns for a right gutter drop", () => {
    const result = resolveGutterDrop(2, 2, {
      kind: "gutter-right",
      sectionId: "s1",
      row: 0,
    });
    expect(result).toEqual({
      columns: 3,
      rows: 2,
      pos: { row: 0, col: 2 },
    });
  });

  it("expands columns beyond 3 for a right gutter drop", () => {
    const result = resolveGutterDrop(5, 2, {
      kind: "gutter-right",
      sectionId: "s1",
      row: 0,
    });
    expect(result).toEqual({
      columns: 6,
      rows: 2,
      pos: { row: 0, col: 5 },
    });
  });

  it("expands rows for a bottom gutter drop", () => {
    const result = resolveGutterDrop(2, 3, {
      kind: "gutter-bottom",
      sectionId: "s1",
      col: 1,
    });
    expect(result).toEqual({
      columns: 2,
      rows: 4,
      pos: { row: 3, col: 1 },
    });
  });

  it("returns null for a cell kind target", () => {
    const result = resolveGutterDrop(2, 2, {
      kind: "cell",
      sectionId: "s1",
      row: 0,
      col: 0,
    });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// applyDragResult
// ---------------------------------------------------------------------------
describe("applyDragResult", () => {
  it("moves a card to an empty cell in the same section", () => {
    const sections = [
      makeSection({
        id: "s1",
        columns: 2,
        rows: 2,
        grid: { "0:0": "A" },
      }),
    ];
    const result = applyDragResult(sections, "A", {
      kind: "cell",
      sectionId: "s1",
      row: 1,
      col: 1,
    });
    expect(result).not.toBeNull();
    const s = result!.find((s) => s.id === "s1")!;
    expect(s.grid["1:1"]).toBe("A");
    expect(s.grid["0:0"]).toBeUndefined();
  });

  it("push-shifts when moving a card to an occupied cell", () => {
    const sections = [
      makeSection({
        id: "s1",
        columns: 2,
        rows: 1,
        grid: { "0:0": "A", "0:1": "B" },
      }),
    ];
    const result = applyDragResult(sections, "A", {
      kind: "cell",
      sectionId: "s1",
      row: 0,
      col: 0,
    });
    expect(result).not.toBeNull();
    const s = result!.find((s) => s.id === "s1")!;
    // A is removed first, so grid has only B at 0:1.
    // Then A is inserted at 0:0, pushing B to 0:1 (B was already there).
    expect(s.grid["0:0"]).toBe("A");
    expect(s.grid["0:1"]).toBe("B");
  });

  it("moves a card between sections — removed from source, placed in target", () => {
    const sections = [
      makeSection({
        id: "s1",
        columns: 2,
        rows: 1,
        grid: { "0:0": "A", "0:1": "B" },
      }),
      makeSection({
        id: "s2",
        columns: 2,
        rows: 1,
        grid: {},
      }),
    ];
    const result = applyDragResult(sections, "A", {
      kind: "cell",
      sectionId: "s2",
      row: 0,
      col: 0,
    });
    expect(result).not.toBeNull();
    const s1 = result!.find((s) => s.id === "s1")!;
    const s2 = result!.find((s) => s.id === "s2")!;
    expect(s1.grid["0:0"]).toBeUndefined();
    expect(s2.grid["0:0"]).toBe("A");
  });

  it("creates a new column on gutter-right drop", () => {
    const sections = [
      makeSection({
        id: "s1",
        columns: 2,
        rows: 1,
        grid: { "0:0": "A" },
      }),
    ];
    const result = applyDragResult(sections, "A", {
      kind: "gutter-right",
      sectionId: "s1",
      row: 0,
    });
    expect(result).not.toBeNull();
    const s = result!.find((s) => s.id === "s1")!;
    expect(s.grid["0:2"]).toBe("A");
  });

  it("expands columns beyond 3 on gutter-right drop", () => {
    const sections = [
      makeSection({
        id: "s1",
        columns: 5,
        rows: 1,
        grid: { "0:0": "A" },
      }),
    ];
    const result = applyDragResult(sections, "A", {
      kind: "gutter-right",
      sectionId: "s1",
      row: 0,
    });
    expect(result).not.toBeNull();
    const s = result!.find((s) => s.id === "s1")!;
    expect(s.grid["0:5"]).toBe("A");
  });

  it("creates a new row on gutter-bottom drop", () => {
    const sections = [
      makeSection({
        id: "s1",
        columns: 2,
        rows: 1,
        grid: { "0:0": "A" },
      }),
    ];
    const result = applyDragResult(sections, "A", {
      kind: "gutter-bottom",
      sectionId: "s1",
      col: 1,
    });
    expect(result).not.toBeNull();
    const s = result!.find((s) => s.id === "s1")!;
    expect(s.grid["1:1"]).toBe("A");
  });

  it("auto-trims the source section after a card is removed", () => {
    const sections = [
      makeSection({
        id: "s1",
        columns: 2,
        rows: 2,
        grid: { "0:0": "A", "1:0": "B" },
      }),
      makeSection({
        id: "s2",
        columns: 2,
        rows: 1,
        grid: {},
      }),
    ];
    // Move B out of s1, leaving only A at 0:0 → trailing row 1 and col 1 should trim
    const result = applyDragResult(sections, "B", {
      kind: "cell",
      sectionId: "s2",
      row: 0,
      col: 0,
    });
    expect(result).not.toBeNull();
    const s1 = result!.find((s) => s.id === "s1")!;
    expect(s1.rows).toBe(1);
    expect(s1.columns).toBe(1);
  });

  it("cascade push creates a new row when needed", () => {
    const sections = [
      makeSection({
        id: "s1",
        columns: 2,
        rows: 1,
        grid: { "0:0": "B", "0:1": "C" },
      }),
    ];
    const result = applyDragResult(sections, "A", {
      kind: "cell",
      sectionId: "s1",
      row: 0,
      col: 0,
    });
    expect(result).not.toBeNull();
    const s = result!.find((s) => s.id === "s1")!;
    expect(s.grid["0:0"]).toBe("A");
    expect(s.grid["0:1"]).toBe("B");
    expect(s.grid["1:0"]).toBe("C");
    expect(s.rows).toBe(2);
  });

  it("does not mutate the original sections array", () => {
    const sections = [
      makeSection({
        id: "s1",
        columns: 2,
        rows: 1,
        grid: { "0:0": "A" },
      }),
    ];
    const originalGrid = { ...sections[0].grid };
    applyDragResult(sections, "A", {
      kind: "cell",
      sectionId: "s1",
      row: 0,
      col: 1,
    });
    expect(sections[0].grid).toEqual(originalGrid);
  });
});
