import * as sqliteVec from "sqlite-vec";
import { getDb } from "./db";
import { EMBEDDING_DIMS } from "./embeddings";

// ---------------------------------------------------------------------------
// sqlite-vec initialization
// ---------------------------------------------------------------------------

let _vecLoaded = false;

/**
 * Loads the sqlite-vec extension and creates the vec0 virtual table for
 * revision embeddings. Safe to call multiple times — only loads once.
 */
function loadVec(): void {
  if (_vecLoaded) return;
  const db = getDb();

  sqliteVec.load(db);

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS revision_embeddings USING vec0(
      revision_id TEXT PRIMARY KEY,
      embedding float[${EMBEDDING_DIMS}] distance_metric=cosine
    )
  `);

  _vecLoaded = true;
}

// ---------------------------------------------------------------------------
// Embedding storage
// ---------------------------------------------------------------------------

/**
 * Stores an embedding vector for a revision. Overwrites if one already exists.
 */
export function storeEmbedding(revisionId: string, vector: Float32Array): void {
  loadVec();
  const db = getDb();
  // vec0 tables don't support INSERT OR REPLACE — delete first if exists
  db.prepare("DELETE FROM revision_embeddings WHERE revision_id = ?").run(revisionId);
  db.prepare(`
    INSERT INTO revision_embeddings (revision_id, embedding)
    VALUES (?, ?)
  `).run(revisionId, Buffer.from(vector.buffer));
}

/**
 * Checks whether an embedding exists for a given revision.
 */
function hasEmbedding(revisionId: string): boolean {
  loadVec();
  const row = getDb().prepare(
    "SELECT 1 FROM revision_embeddings WHERE revision_id = ?",
  ).get(revisionId);
  return row != null;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

interface SimilarResult {
  revision_id: string;
  distance: number;
}

/**
 * Performs KNN cosine similarity search on the revision_embeddings vec0 table.
 * Returns revision IDs ordered by ascending distance (most similar first).
 */
function searchSimilar(query: Float32Array, limit: number = 10): SimilarResult[] {
  loadVec();
  const db = getDb();
  const rows = db.prepare(`
    SELECT revision_id, distance
    FROM revision_embeddings
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT ?
  `).all(Buffer.from(query.buffer), limit) as SimilarResult[];
  return rows;
}

/**
 * Hybrid search combining FTS5 text results with vec0 similarity results.
 * Merges and deduplicates by thought_id, ranking by combined score.
 *
 * FTS results get a score of 1/(rank_position), vec results get a score of
 * 1/(1+distance). Combined score is the sum of both.
 */
export function hybridSearch(
  text: string,
  queryVector: Float32Array,
  limit: number = 10,
): { thought_id: string; revision_id: string; score: number }[] {
  loadVec();
  const db = getDb();
  const scoreMap = new Map<string, { thought_id: string; revision_id: string; score: number }>();

  // FTS search on revisions
  const ftsRows = db.prepare(`
    SELECT r.id AS revision_id, r.thought_id
    FROM revisions r
    JOIN revisions_fts ON revisions_fts.rowid = r.rowid
    WHERE revisions_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(text, limit * 2) as { revision_id: string; thought_id: string }[];

  for (let i = 0; i < ftsRows.length; i++) {
    const row = ftsRows[i];
    const ftsScore = 1 / (i + 1);
    const existing = scoreMap.get(row.thought_id);
    if (!existing || ftsScore > existing.score) {
      scoreMap.set(row.thought_id, {
        thought_id: row.thought_id,
        revision_id: row.revision_id,
        score: (existing?.score ?? 0) + ftsScore,
      });
    }
  }

  // Vector similarity search
  const vecRows = searchSimilar(queryVector, limit * 2);
  // Look up thought_id for each revision
  const revLookup = db.prepare("SELECT thought_id FROM revisions WHERE id = ?");

  for (const vr of vecRows) {
    const rev = revLookup.get(vr.revision_id) as { thought_id: string } | undefined;
    if (!rev) continue;
    const vecScore = 1 / (1 + vr.distance);
    const existing = scoreMap.get(rev.thought_id);
    scoreMap.set(rev.thought_id, {
      thought_id: rev.thought_id,
      revision_id: existing?.revision_id ?? vr.revision_id,
      score: (existing?.score ?? 0) + vecScore,
    });
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
