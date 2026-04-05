import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./db";
import {
  createEntry,
  getEntry,
  updateEntry,
  deleteEntry,
  queryEntries,
  addRevision,
  getRevisions,
  addAttachment,
  getAttachments,
  addRelation,
  removeRelation,
  getRelations,
  entryTags,
  entryFamilies,
  entryColors,
} from "./db-entries";

// ---------------------------------------------------------------------------
// Setup — clear tables before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM board_items");
  db.exec("DELETE FROM boards");
  db.exec("DELETE FROM entry_relations");
  db.exec("DELETE FROM attachments");
  db.exec("DELETE FROM revisions");
  db.exec("DELETE FROM entries");
});

// ---------------------------------------------------------------------------
// Entry CRUD
// ---------------------------------------------------------------------------

describe("createEntry / getEntry", () => {
  it("creates an entry with initial revision", () => {
    const { entry, revision } = createEntry({
      kind: "observation",
      body: "Color is state, not decoration",
      family: "pebble",
      tags: ["color", "philosophy"],
      importance: "assumption",
    });

    expect(entry.id).toMatch(/^th-/);
    expect(entry.kind).toBe("observation");
    expect(entry.family).toBe("pebble");
    expect(entry.tags).toEqual(["color", "philosophy"]);
    expect(entry.importance).toBe("assumption");
    expect(entry.pinned).toBe(false);
    expect(entry.hidden).toBe(false);

    expect(revision.id).toMatch(/^rev-/);
    expect(revision.entry_id).toBe(entry.id);
    expect(revision.body).toBe("Color is state, not decoration");
    expect(revision.seq).toBe(1);
    expect(revision.source).toBe("user");
  });

  it("retrieves an entry by id", () => {
    const { entry } = createEntry({ kind: "question", body: "Why round?" });
    const found = getEntry(entry.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(entry.id);
    expect(found!.kind).toBe("question");
  });

  it("returns undefined for non-existent entry", () => {
    expect(getEntry("th-nonexistent")).toBeUndefined();
  });
});

describe("updateEntry", () => {
  it("updates selected fields", () => {
    const { entry } = createEntry({ kind: "observation", body: "test" });
    updateEntry(entry.id, { importance: "guiding", color: "blue", pinned: true });

    const updated = getEntry(entry.id)!;
    expect(updated.importance).toBe("guiding");
    expect(updated.color).toBe("blue");
    expect(updated.pinned).toBe(true);
  });

  it("updates tags as JSON", () => {
    const { entry } = createEntry({ kind: "principle", body: "test", tags: ["a"] });
    updateEntry(entry.id, { tags: ["x", "y"] });

    const updated = getEntry(entry.id)!;
    expect(updated.tags).toEqual(["x", "y"]);
  });

  it("updates hidden flag", () => {
    const { entry } = createEntry({ kind: "observation", body: "test" });
    expect(entry.hidden).toBe(false);

    updateEntry(entry.id, { hidden: true });
    const updated = getEntry(entry.id)!;
    expect(updated.hidden).toBe(true);
  });
});

describe("deleteEntry", () => {
  it("removes entry and cascades to revisions", () => {
    const { entry } = createEntry({ kind: "observation", body: "to be deleted" });
    deleteEntry(entry.id);

    expect(getEntry(entry.id)).toBeUndefined();
    expect(getRevisions(entry.id)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Query entries
// ---------------------------------------------------------------------------

describe("queryEntries", () => {
  it("returns all entries ordered by created_at DESC", () => {
    createEntry({ kind: "observation", body: "first" });
    createEntry({ kind: "question", body: "second" });
    createEntry({ kind: "principle", body: "third" });

    const results = queryEntries();
    expect(results).toHaveLength(3);
    // Most recent first
    expect(results[0].kind).toBe("principle");
  });

  it("filters by kind", () => {
    createEntry({ kind: "observation", body: "obs" });
    createEntry({ kind: "question", body: "q" });

    const results = queryEntries({ kind: "question" });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("question");
  });

  it("filters by importance", () => {
    createEntry({ kind: "observation", body: "a", importance: "signal" });
    createEntry({ kind: "observation", body: "b", importance: "foundational" });

    expect(queryEntries({ importance: "foundational" })).toHaveLength(1);
  });

  it("filters by color", () => {
    createEntry({ kind: "observation", body: "a", color: "blue" });
    createEntry({ kind: "observation", body: "b", color: "red" });

    expect(queryEntries({ color: "blue" })).toHaveLength(1);
  });

  it("filters by tags", () => {
    createEntry({ kind: "observation", body: "a", tags: ["x", "y"] });
    createEntry({ kind: "observation", body: "b", tags: ["y", "z"] });

    expect(queryEntries({ tags: ["x"] })).toHaveLength(1);
    expect(queryEntries({ tags: ["y"] })).toHaveLength(2);
  });

  it("filters by pinned", () => {
    createEntry({ kind: "observation", body: "a", pinned: true });
    createEntry({ kind: "observation", body: "b" });

    expect(queryEntries({ pinned: true })).toHaveLength(1);
  });

  it("excludes hidden entries by default", () => {
    createEntry({ kind: "observation", body: "visible" });
    createEntry({ kind: "observation", body: "hidden", hidden: true });

    expect(queryEntries()).toHaveLength(1);
    expect(queryEntries({ hidden: true })).toHaveLength(2);
  });

  it("supports FTS search on revision body", () => {
    createEntry({ kind: "observation", body: "organic shapes feel alive" });
    createEntry({ kind: "observation", body: "grid layouts are rigid" });

    const results = queryEntries({ search: "organic" });
    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe("observation");
  });

  it("supports limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      createEntry({ kind: "observation", body: `entry ${i}` });
    }

    expect(queryEntries({ limit: 2 })).toHaveLength(2);
    expect(queryEntries({ limit: 2, offset: 3 })).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

describe("revisions", () => {
  it("adds revisions with incrementing seq", () => {
    const { entry } = createEntry({ kind: "observation", body: "v1" });
    const rev2 = addRevision(entry.id, "v2");
    const rev3 = addRevision(entry.id, "v3", "ai");

    expect(rev2.seq).toBe(2);
    expect(rev3.seq).toBe(3);
    expect(rev3.source).toBe("ai");
  });

  it("returns revisions newest first", () => {
    const { entry } = createEntry({ kind: "observation", body: "v1" });
    addRevision(entry.id, "v2");
    addRevision(entry.id, "v3");

    const revs = getRevisions(entry.id);
    expect(revs).toHaveLength(3);
    expect(revs[0].seq).toBe(3);
    expect(revs[2].seq).toBe(1);
  });

  it("adding a revision updates entry.updated_at", () => {
    const { entry } = createEntry({ kind: "observation", body: "v1" });
    const before = entry.updated_at;
    addRevision(entry.id, "v2");
    const after = getEntry(entry.id)!.updated_at;
    expect(after >= before).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

describe("attachments", () => {
  it("adds and retrieves attachments", () => {
    const { entry } = createEntry({ kind: "reference", body: "video ref" });
    const att = addAttachment({
      entry_id: entry.id,
      type: "thumbnail",
      path: "/media/thumb.png",
      alt: "Video thumbnail",
    });

    expect(att.id).toMatch(/^att-/);
    expect(att.type).toBe("thumbnail");

    const all = getAttachments(entry.id);
    expect(all).toHaveLength(1);
    expect(all[0].path).toBe("/media/thumb.png");
  });
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

describe("relations", () => {
  it("adds and retrieves relations", () => {
    const { entry: a } = createEntry({ kind: "observation", body: "a" });
    const { entry: b } = createEntry({ kind: "observation", body: "b" });

    addRelation(a.id, b.id, "inspired_by");
    const rels = getRelations(a.id);
    expect(rels).toHaveLength(1);
    expect(rels[0].type).toBe("inspired_by");
    expect(rels[0].from_id).toBe(a.id);
    expect(rels[0].to_id).toBe(b.id);
  });

  it("removes relations", () => {
    const { entry: a } = createEntry({ kind: "observation", body: "a" });
    const { entry: b } = createEntry({ kind: "observation", body: "b" });

    addRelation(a.id, b.id, "related");
    removeRelation(a.id, b.id);
    expect(getRelations(a.id)).toEqual([]);
  });

  it("deduplicates by primary key", () => {
    const { entry: a } = createEntry({ kind: "observation", body: "a" });
    const { entry: b } = createEntry({ kind: "observation", body: "b" });

    addRelation(a.id, b.id, "related");
    addRelation(a.id, b.id, "related"); // duplicate — should be ignored
    expect(getRelations(a.id)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

describe("aggregation helpers", () => {
  it("returns unique tags", () => {
    createEntry({ kind: "observation", body: "a", tags: ["x", "y"] });
    createEntry({ kind: "observation", body: "b", tags: ["y", "z"] });

    expect(entryTags()).toEqual(["x", "y", "z"]);
  });

  it("returns unique families", () => {
    createEntry({ kind: "observation", body: "a", family: "pebble" });
    createEntry({ kind: "observation", body: "b", family: "arc" });
    createEntry({ kind: "observation", body: "c" }); // no family

    expect(entryFamilies()).toEqual(["arc", "pebble"]);
  });

  it("returns unique colors", () => {
    createEntry({ kind: "observation", body: "a", color: "blue" });
    createEntry({ kind: "observation", body: "b", color: "red" });
    createEntry({ kind: "observation", body: "c" }); // no color

    const colors = entryColors();
    expect(colors).toHaveLength(2);
    expect(colors).toContain("blue");
    expect(colors).toContain("red");
  });
});
