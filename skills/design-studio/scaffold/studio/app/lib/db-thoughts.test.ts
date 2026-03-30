import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./db";
import {
  createThought,
  getThought,
  updateThought,
  deleteThought,
  queryThoughts,
  addRevision,
  getRevisions,
  addAttachment,
  getAttachments,
  addRelation,
  removeRelation,
  getRelations,
  createBoard,
  listBoards,
  updateBoard,
  deleteBoard,
  addBoardItem,
  removeBoardItem,
  getBoardItems,
  thoughtTags,
  thoughtFamilies,
  thoughtColors,
} from "./db-thoughts";

// ---------------------------------------------------------------------------
// Setup — clear tables before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM board_items");
  db.exec("DELETE FROM boards");
  db.exec("DELETE FROM thought_relations");
  db.exec("DELETE FROM attachments");
  db.exec("DELETE FROM revisions");
  db.exec("DELETE FROM thoughts");
});

// ---------------------------------------------------------------------------
// Thought CRUD
// ---------------------------------------------------------------------------

describe("createThought / getThought", () => {
  it("creates a thought with initial revision", () => {
    const { thought, revision } = createThought({
      kind: "observation",
      body: "Color is state, not decoration",
      family: "pebble",
      tags: ["color", "philosophy"],
      importance: "assumption",
    });

    expect(thought.id).toMatch(/^th-/);
    expect(thought.kind).toBe("observation");
    expect(thought.family).toBe("pebble");
    expect(thought.tags).toEqual(["color", "philosophy"]);
    expect(thought.importance).toBe("assumption");
    expect(thought.pinned).toBe(false);

    expect(revision.id).toMatch(/^rev-/);
    expect(revision.thought_id).toBe(thought.id);
    expect(revision.body).toBe("Color is state, not decoration");
    expect(revision.seq).toBe(1);
    expect(revision.source).toBe("user");
  });

  it("retrieves a thought by id", () => {
    const { thought } = createThought({ kind: "question", body: "Why round?" });
    const found = getThought(thought.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(thought.id);
    expect(found!.kind).toBe("question");
  });

  it("returns undefined for non-existent thought", () => {
    expect(getThought("th-nonexistent")).toBeUndefined();
  });
});

describe("updateThought", () => {
  it("updates selected fields", () => {
    const { thought } = createThought({ kind: "observation", body: "test" });
    updateThought(thought.id, { importance: "guiding", color: "blue", pinned: true });

    const updated = getThought(thought.id)!;
    expect(updated.importance).toBe("guiding");
    expect(updated.color).toBe("blue");
    expect(updated.pinned).toBe(true);
  });

  it("updates tags as JSON", () => {
    const { thought } = createThought({ kind: "principle", body: "test", tags: ["a"] });
    updateThought(thought.id, { tags: ["x", "y"] });

    const updated = getThought(thought.id)!;
    expect(updated.tags).toEqual(["x", "y"]);
  });
});

describe("deleteThought", () => {
  it("removes thought and cascades to revisions", () => {
    const { thought } = createThought({ kind: "observation", body: "to be deleted" });
    deleteThought(thought.id);

    expect(getThought(thought.id)).toBeUndefined();
    expect(getRevisions(thought.id)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Query thoughts
// ---------------------------------------------------------------------------

describe("queryThoughts", () => {
  it("returns all thoughts ordered by created_at DESC", () => {
    createThought({ kind: "observation", body: "first" });
    createThought({ kind: "question", body: "second" });
    createThought({ kind: "principle", body: "third" });

    const results = queryThoughts();
    expect(results).toHaveLength(3);
    // Most recent first
    expect(results[0].kind).toBe("principle");
  });

  it("filters by kind", () => {
    createThought({ kind: "observation", body: "obs" });
    createThought({ kind: "question", body: "q" });

    const results = queryThoughts({ kind: "question" });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("question");
  });

  it("filters by importance", () => {
    createThought({ kind: "observation", body: "a", importance: "signal" });
    createThought({ kind: "observation", body: "b", importance: "foundational" });

    expect(queryThoughts({ importance: "foundational" })).toHaveLength(1);
  });

  it("filters by color", () => {
    createThought({ kind: "observation", body: "a", color: "blue" });
    createThought({ kind: "observation", body: "b", color: "red" });

    expect(queryThoughts({ color: "blue" })).toHaveLength(1);
  });

  it("filters by tags", () => {
    createThought({ kind: "observation", body: "a", tags: ["x", "y"] });
    createThought({ kind: "observation", body: "b", tags: ["y", "z"] });

    expect(queryThoughts({ tags: ["x"] })).toHaveLength(1);
    expect(queryThoughts({ tags: ["y"] })).toHaveLength(2);
  });

  it("filters by pinned", () => {
    createThought({ kind: "observation", body: "a", pinned: true });
    createThought({ kind: "observation", body: "b" });

    expect(queryThoughts({ pinned: true })).toHaveLength(1);
  });

  it("supports FTS search on revision body", () => {
    createThought({ kind: "observation", body: "organic shapes feel alive" });
    createThought({ kind: "observation", body: "grid layouts are rigid" });

    const results = queryThoughts({ search: "organic" });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("observation");
  });

  it("supports limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      createThought({ kind: "observation", body: `thought ${i}` });
    }

    expect(queryThoughts({ limit: 2 })).toHaveLength(2);
    expect(queryThoughts({ limit: 2, offset: 3 })).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

describe("revisions", () => {
  it("adds revisions with incrementing seq", () => {
    const { thought } = createThought({ kind: "observation", body: "v1" });
    const rev2 = addRevision(thought.id, "v2");
    const rev3 = addRevision(thought.id, "v3", "ai");

    expect(rev2.seq).toBe(2);
    expect(rev3.seq).toBe(3);
    expect(rev3.source).toBe("ai");
  });

  it("returns revisions newest first", () => {
    const { thought } = createThought({ kind: "observation", body: "v1" });
    addRevision(thought.id, "v2");
    addRevision(thought.id, "v3");

    const revs = getRevisions(thought.id);
    expect(revs).toHaveLength(3);
    expect(revs[0].seq).toBe(3);
    expect(revs[2].seq).toBe(1);
  });

  it("adding a revision updates thought.updated_at", () => {
    const { thought } = createThought({ kind: "observation", body: "v1" });
    const before = thought.updated_at;
    addRevision(thought.id, "v2");
    const after = getThought(thought.id)!.updated_at;
    expect(after >= before).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

describe("attachments", () => {
  it("adds and retrieves attachments", () => {
    const { thought } = createThought({ kind: "reference", body: "video ref" });
    const att = addAttachment({
      thought_id: thought.id,
      type: "thumbnail",
      path: "/media/thumb.png",
      alt: "Video thumbnail",
    });

    expect(att.id).toMatch(/^att-/);
    expect(att.type).toBe("thumbnail");

    const all = getAttachments(thought.id);
    expect(all).toHaveLength(1);
    expect(all[0].path).toBe("/media/thumb.png");
  });
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

describe("relations", () => {
  it("adds and retrieves relations", () => {
    const { thought: a } = createThought({ kind: "observation", body: "a" });
    const { thought: b } = createThought({ kind: "observation", body: "b" });

    addRelation(a.id, b.id, "inspired_by");
    const rels = getRelations(a.id);
    expect(rels).toHaveLength(1);
    expect(rels[0].type).toBe("inspired_by");
    expect(rels[0].from_id).toBe(a.id);
    expect(rels[0].to_id).toBe(b.id);
  });

  it("removes relations", () => {
    const { thought: a } = createThought({ kind: "observation", body: "a" });
    const { thought: b } = createThought({ kind: "observation", body: "b" });

    addRelation(a.id, b.id, "related");
    removeRelation(a.id, b.id);
    expect(getRelations(a.id)).toEqual([]);
  });

  it("deduplicates by primary key", () => {
    const { thought: a } = createThought({ kind: "observation", body: "a" });
    const { thought: b } = createThought({ kind: "observation", body: "b" });

    addRelation(a.id, b.id, "related");
    addRelation(a.id, b.id, "related"); // duplicate — should be ignored
    expect(getRelations(a.id)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

describe("boards", () => {
  it("creates and lists boards", () => {
    createBoard({ name: "Aesthetics", color: "violet" });
    createBoard({ name: "Layout ideas" });

    const boards = listBoards();
    expect(boards).toHaveLength(2);
  });

  it("updates a board", () => {
    const board = createBoard({ name: "Draft" });
    updateBoard(board.id, { name: "Final", description: "Curated collection" });

    const boards = listBoards();
    const updated = boards.find(b => b.id === board.id)!;
    expect(updated.name).toBe("Final");
    expect(updated.description).toBe("Curated collection");
  });

  it("deletes a board and cascades to items", () => {
    const board = createBoard({ name: "temp" });
    const { thought } = createThought({ kind: "observation", body: "x" });
    addBoardItem(board.id, thought.id);

    deleteBoard(board.id);
    expect(listBoards()).toEqual([]);
    expect(getBoardItems(board.id)).toEqual([]);
  });

  it("adds and removes board items", () => {
    const board = createBoard({ name: "test" });
    const { thought: t1 } = createThought({ kind: "observation", body: "a" });
    const { thought: t2 } = createThought({ kind: "question", body: "b" });

    addBoardItem(board.id, t1.id, 100, 200);
    addBoardItem(board.id, t2.id, 300, 400);

    const items = getBoardItems(board.id);
    expect(items).toHaveLength(2);
    expect(items[0].x).toBe(100);
    expect(items[0].thought.id).toBe(t1.id);

    removeBoardItem(board.id, t1.id);
    expect(getBoardItems(board.id)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

describe("aggregation helpers", () => {
  it("returns unique tags", () => {
    createThought({ kind: "observation", body: "a", tags: ["x", "y"] });
    createThought({ kind: "observation", body: "b", tags: ["y", "z"] });

    expect(thoughtTags()).toEqual(["x", "y", "z"]);
  });

  it("returns unique families", () => {
    createThought({ kind: "observation", body: "a", family: "pebble" });
    createThought({ kind: "observation", body: "b", family: "arc" });
    createThought({ kind: "observation", body: "c" }); // no family

    expect(thoughtFamilies()).toEqual(["arc", "pebble"]);
  });

  it("returns unique colors", () => {
    createThought({ kind: "observation", body: "a", color: "blue" });
    createThought({ kind: "observation", body: "b", color: "red" });
    createThought({ kind: "observation", body: "c" }); // no color

    const colors = thoughtColors();
    expect(colors).toHaveLength(2);
    expect(colors).toContain("blue");
    expect(colors).toContain("red");
  });
});
