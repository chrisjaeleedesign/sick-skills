import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./db";
import { createThought, addRevision } from "./db-thoughts";
import { loadVec, storeEmbedding, hasEmbedding, searchSimilar, hybridSearch } from "./db-embeddings";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  loadVec();
  const db = getDb();
  db.exec("DELETE FROM board_items");
  db.exec("DELETE FROM boards");
  db.exec("DELETE FROM thought_relations");
  db.exec("DELETE FROM attachments");
  db.exec("DELETE FROM revisions");
  db.exec("DELETE FROM thoughts");
  // Clear vec0 table
  db.exec("DELETE FROM revision_embeddings");
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomVector(dims: number = 1536): Float32Array {
  const v = new Float32Array(dims);
  for (let i = 0; i < dims; i++) v[i] = Math.random() - 0.5;
  // Normalize
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  for (let i = 0; i < dims; i++) v[i] /= norm;
  return v;
}

function similarVector(base: Float32Array, noise: number = 0.05): Float32Array {
  const v = new Float32Array(base.length);
  for (let i = 0; i < base.length; i++) {
    v[i] = base[i] + (Math.random() - 0.5) * noise;
  }
  const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("vec0 table creation", () => {
  it("loadVec creates the revision_embeddings table", () => {
    const db = getDb();
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='revision_embeddings'",
    ).all();
    expect(tables).toHaveLength(1);
  });
});

describe("storeEmbedding / hasEmbedding", () => {
  it("stores and checks embedding existence", () => {
    const { revision } = createThought({ kind: "observation", body: "test" });
    const vec = randomVector();

    expect(hasEmbedding(revision.id)).toBe(false);
    storeEmbedding(revision.id, vec);
    expect(hasEmbedding(revision.id)).toBe(true);
  });

  it("overwrites existing embedding", () => {
    const { revision } = createThought({ kind: "observation", body: "test" });
    storeEmbedding(revision.id, randomVector());
    storeEmbedding(revision.id, randomVector()); // should not throw
    expect(hasEmbedding(revision.id)).toBe(true);
  });
});

describe("searchSimilar", () => {
  it("returns results ordered by distance", () => {
    const baseVec = randomVector();

    const { revision: r1 } = createThought({ kind: "observation", body: "close" });
    const { revision: r2 } = createThought({ kind: "observation", body: "far" });

    // r1 gets a vector very similar to query, r2 gets a random one
    storeEmbedding(r1.id, similarVector(baseVec, 0.01));
    storeEmbedding(r2.id, randomVector());

    const results = searchSimilar(baseVec, 10);
    expect(results.length).toBeGreaterThanOrEqual(2);
    // First result should be the similar one
    expect(results[0].revision_id).toBe(r1.id);
    expect(results[0].distance).toBeLessThan(results[1].distance);
  });
});

describe("hybridSearch", () => {
  it("combines FTS and vector results", () => {
    const baseVec = randomVector();

    // This thought has both matching text and similar embedding
    const { thought: t1, revision: r1 } = createThought({
      kind: "observation",
      body: "organic shapes feel natural and alive",
    });
    storeEmbedding(r1.id, similarVector(baseVec, 0.01));

    // This thought only has matching text
    const { thought: t2 } = createThought({
      kind: "observation",
      body: "organic materials in architecture",
    });

    // This thought only has similar embedding
    const { thought: t3, revision: r3 } = createThought({
      kind: "observation",
      body: "rigid geometric grids",
    });
    storeEmbedding(r3.id, similarVector(baseVec, 0.02));

    const results = hybridSearch("organic", baseVec, 10);
    expect(results.length).toBeGreaterThanOrEqual(1);

    // t1 should rank highest (matches both FTS and vector)
    expect(results[0].thought_id).toBe(t1.id);
  });
});
