import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./db";
import {
  insertEvent,
  insertInsight,
  queryEvents,
  queryInsights,
  updateInsight,
  allTags,
  allFamilies,
} from "./db-journal";
import type { Event, Insight } from "./types";

// ---------------------------------------------------------------------------
// Setup — clear tables before each test (FTS cascades via triggers)
// ---------------------------------------------------------------------------

beforeEach(() => {
  const db = getDb();
  db.exec("DELETE FROM events");
  db.exec("DELETE FROM insights");
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<Event> & { id: string }): Omit<Event, "ts"> & { ts?: string } {
  return {
    type: "created",
    body: "test event body",
    tags: [],
    metadata: {},
    ...overrides,
  };
}

function makeInsight(overrides: Partial<Insight> & { id: string }): Omit<Insight, "ts"> & { ts?: string } {
  return {
    type: "learning",
    body: "test insight body",
    tags: [],
    status: "active",
    refs: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// insertEvent / queryEvents
// ---------------------------------------------------------------------------

describe("insertEvent / queryEvents", () => {
  it("inserts an event and queries it back", () => {
    insertEvent(makeEvent({ id: "evt-1", ts: "2025-01-01T00:00:00Z", body: "hello world" }));
    const results = queryEvents();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("evt-1");
    expect(results[0].body).toBe("hello world");
    expect(results[0].type).toBe("created");
    expect(results[0].tags).toEqual([]);
    expect(results[0].metadata).toEqual({});
  });

  it("returns events in ts DESC order", () => {
    insertEvent(makeEvent({ id: "evt-old", ts: "2025-01-01T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-new", ts: "2025-06-01T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-mid", ts: "2025-03-01T00:00:00Z" }));

    const results = queryEvents();
    expect(results.map((e) => e.id)).toEqual(["evt-new", "evt-mid", "evt-old"]);
  });

  it("filters by type", () => {
    insertEvent(makeEvent({ id: "evt-1", type: "created", ts: "2025-01-01T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-2", type: "feedback", ts: "2025-01-02T00:00:00Z" }));

    const results = queryEvents({ type: "feedback" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("evt-2");
  });

  it("filters by family", () => {
    insertEvent(makeEvent({ id: "evt-1", family: "portfolio", ts: "2025-01-01T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-2", family: "branding", ts: "2025-01-02T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-3", ts: "2025-01-03T00:00:00Z" }));

    const results = queryEvents({ family: "portfolio" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("evt-1");
  });

  it("filters by tag using json_each", () => {
    insertEvent(makeEvent({ id: "evt-1", tags: ["ui", "color"], ts: "2025-01-01T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-2", tags: ["typography"], ts: "2025-01-02T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-3", tags: ["ui", "layout"], ts: "2025-01-03T00:00:00Z" }));

    const results = queryEvents({ tags: ["ui"] });
    expect(results).toHaveLength(2);
    expect(results.map((e) => e.id)).toEqual(["evt-3", "evt-1"]);
  });

  it("filters by since/until date range", () => {
    insertEvent(makeEvent({ id: "evt-1", ts: "2025-01-01T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-2", ts: "2025-03-15T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-3", ts: "2025-06-01T00:00:00Z" }));

    const results = queryEvents({ since: "2025-02-01T00:00:00Z", until: "2025-04-01T00:00:00Z" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("evt-2");
  });

  it("supports limit and offset pagination", () => {
    for (let i = 1; i <= 5; i++) {
      insertEvent(makeEvent({ id: `evt-${i}`, ts: `2025-01-0${i}T00:00:00Z` }));
    }

    const page1 = queryEvents({ limit: 2 });
    expect(page1).toHaveLength(2);
    expect(page1.map((e) => e.id)).toEqual(["evt-5", "evt-4"]);

    const page2 = queryEvents({ limit: 2, offset: 2 });
    expect(page2).toHaveLength(2);
    expect(page2.map((e) => e.id)).toEqual(["evt-3", "evt-2"]);
  });

  it("supports FTS5 search on body text", () => {
    insertEvent(makeEvent({ id: "evt-1", body: "redesigned the landing page", ts: "2025-01-01T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-2", body: "updated color palette", ts: "2025-01-02T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-3", body: "landing page animations", ts: "2025-01-03T00:00:00Z" }));

    const results = queryEvents({ search: "landing" });
    expect(results).toHaveLength(2);
    expect(results.every((e) => e.body.includes("landing"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// insertInsight / queryInsights
// ---------------------------------------------------------------------------

describe("insertInsight / queryInsights", () => {
  it("inserts an insight and queries it back", () => {
    insertInsight(makeInsight({ id: "ins-1", ts: "2025-01-01T00:00:00Z", body: "prefer dark themes" }));
    const results = queryInsights();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("ins-1");
    expect(results[0].body).toBe("prefer dark themes");
    expect(results[0].status).toBe("active");
    expect(results[0].tags).toEqual([]);
    expect(results[0].refs).toEqual([]);
  });

  it("filters by status", () => {
    insertInsight(makeInsight({ id: "ins-1", status: "active", ts: "2025-01-01T00:00:00Z" }));
    insertInsight(makeInsight({ id: "ins-2", status: "superseded", ts: "2025-01-02T00:00:00Z" }));
    insertInsight(makeInsight({ id: "ins-3", status: "killed", ts: "2025-01-03T00:00:00Z" }));

    const active = queryInsights({ status: "active" });
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("ins-1");

    const superseded = queryInsights({ status: "superseded" });
    expect(superseded).toHaveLength(1);
    expect(superseded[0].id).toBe("ins-2");
  });

  it("filters by type", () => {
    insertInsight(makeInsight({ id: "ins-1", type: "preference", ts: "2025-01-01T00:00:00Z" }));
    insertInsight(makeInsight({ id: "ins-2", type: "decision", ts: "2025-01-02T00:00:00Z" }));

    const results = queryInsights({ type: "preference" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("ins-1");
  });

  it("filters by family", () => {
    insertInsight(makeInsight({ id: "ins-1", family: "portfolio", ts: "2025-01-01T00:00:00Z" }));
    insertInsight(makeInsight({ id: "ins-2", family: "brand", ts: "2025-01-02T00:00:00Z" }));

    const results = queryInsights({ family: "portfolio" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("ins-1");
  });

  it("filters by tags with AND logic (all tags required)", () => {
    insertInsight(makeInsight({ id: "ins-1", tags: ["color", "ui"], ts: "2025-01-01T00:00:00Z" }));
    insertInsight(makeInsight({ id: "ins-2", tags: ["color"], ts: "2025-01-02T00:00:00Z" }));
    insertInsight(makeInsight({ id: "ins-3", tags: ["color", "ui", "layout"], ts: "2025-01-03T00:00:00Z" }));

    const results = queryInsights({ tags: ["color", "ui"] });
    expect(results).toHaveLength(2);
    expect(results.map((i) => i.id)).toEqual(["ins-3", "ins-1"]);
  });

  it("supports FTS5 search", () => {
    insertInsight(makeInsight({ id: "ins-1", body: "always use system fonts", ts: "2025-01-01T00:00:00Z" }));
    insertInsight(makeInsight({ id: "ins-2", body: "dark mode is essential", ts: "2025-01-02T00:00:00Z" }));

    const results = queryInsights({ search: "fonts" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("ins-1");
  });

  it("auto-generates timestamp when ts is omitted", () => {
    const before = new Date().toISOString();
    insertInsight(makeInsight({ id: "ins-auto" }));
    const after = new Date().toISOString();

    const results = queryInsights();
    expect(results).toHaveLength(1);
    expect(results[0].ts >= before).toBe(true);
    expect(results[0].ts <= after).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// updateInsight
// ---------------------------------------------------------------------------

describe("updateInsight", () => {
  beforeEach(() => {
    insertInsight(makeInsight({
      id: "ins-upd",
      ts: "2025-01-01T00:00:00Z",
      body: "original body",
      status: "active",
      tags: ["old-tag"],
    }));
  });

  it("updates body", () => {
    updateInsight("ins-upd", { body: "updated body" });
    const results = queryInsights();
    expect(results[0].body).toBe("updated body");
  });

  it("updates status", () => {
    updateInsight("ins-upd", { status: "superseded" });
    const results = queryInsights({ status: "superseded" });
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("superseded");
  });

  it("updates tags (serializes array)", () => {
    updateInsight("ins-upd", { tags: ["new-tag-1", "new-tag-2"] });
    const results = queryInsights();
    expect(results[0].tags).toEqual(["new-tag-1", "new-tag-2"]);
  });

  it("supports partial update (only one field)", () => {
    updateInsight("ins-upd", { status: "killed" });
    const results = queryInsights({ status: "killed" });
    expect(results).toHaveLength(1);
    expect(results[0].body).toBe("original body");
    expect(results[0].tags).toEqual(["old-tag"]);
  });

  it("updated body is searchable via FTS (trigger fires)", () => {
    updateInsight("ins-upd", { body: "completely new searchable content" });
    const results = queryInsights({ search: "searchable" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("ins-upd");

    // Old body should no longer match
    const oldResults = queryInsights({ search: "original" });
    expect(oldResults).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// allTags
// ---------------------------------------------------------------------------

describe("allTags", () => {
  it("returns unique tags across both tables, sorted", () => {
    insertEvent(makeEvent({ id: "evt-1", tags: ["beta", "alpha"], ts: "2025-01-01T00:00:00Z" }));
    insertInsight(makeInsight({ id: "ins-1", tags: ["gamma", "alpha"], ts: "2025-01-01T00:00:00Z" }));

    const tags = allTags();
    expect(tags).toEqual(["alpha", "beta", "gamma"]);
  });

  it("returns empty array when tables are empty", () => {
    expect(allTags()).toEqual([]);
  });

  it("returns empty array when rows have no tags", () => {
    insertEvent(makeEvent({ id: "evt-1", tags: [], ts: "2025-01-01T00:00:00Z" }));
    expect(allTags()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// allFamilies
// ---------------------------------------------------------------------------

describe("allFamilies", () => {
  it("returns unique families across both tables, sorted", () => {
    insertEvent(makeEvent({ id: "evt-1", family: "branding", ts: "2025-01-01T00:00:00Z" }));
    insertInsight(makeInsight({ id: "ins-1", family: "portfolio", ts: "2025-01-01T00:00:00Z" }));
    insertEvent(makeEvent({ id: "evt-2", family: "branding", ts: "2025-01-02T00:00:00Z" }));

    const families = allFamilies();
    expect(families).toEqual(["branding", "portfolio"]);
  });

  it("excludes null families", () => {
    insertEvent(makeEvent({ id: "evt-1", ts: "2025-01-01T00:00:00Z" })); // no family
    insertInsight(makeInsight({ id: "ins-1", family: "only-one", ts: "2025-01-01T00:00:00Z" }));

    const families = allFamilies();
    expect(families).toEqual(["only-one"]);
  });

  it("returns empty array when tables are empty", () => {
    expect(allFamilies()).toEqual([]);
  });
});
