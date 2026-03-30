import { NextResponse } from "next/server";
import { queryInsights } from "@/app/lib/db-journal";
import {
  createThought,
  queryThoughts,
  addRelation,
} from "@/app/lib/db-thoughts";
import { storeEmbedding } from "@/app/lib/db-embeddings";
import { generateEmbedding } from "@/app/lib/embeddings";
import type { ThoughtKind, Conviction, Insight } from "@/app/lib/types";

// ---------------------------------------------------------------------------
// Migration mapping
// ---------------------------------------------------------------------------

function mapInsight(insight: Insight): { kind: ThoughtKind; conviction: Conviction } {
  switch (insight.type) {
    case "preference":
      return { kind: "principle", conviction: "confident" };
    case "learning":
      return { kind: "observation", conviction: "leaning" };
    case "reaction":
      return { kind: "observation", conviction: "hunch" };
    case "direction":
      return { kind: "observation", conviction: "leaning" };
    case "decision":
      if (insight.status === "final") return { kind: "principle", conviction: "core" };
      if (insight.status === "killed") return { kind: "principle", conviction: "confident" };
      return { kind: "principle", conviction: "confident" };
    default:
      return { kind: "observation", conviction: "hunch" };
  }
}

// ---------------------------------------------------------------------------
// Migration endpoint
// ---------------------------------------------------------------------------

export async function POST() {
  // Check if migration already ran
  const allMigrated = queryThoughts({ limit: 1000 });
  const migratedCount = allMigrated.filter(t =>
    t.source_meta && (t.source_meta as Record<string, unknown>).migrated_from != null
  ).length;

  if (migratedCount > 0) {
    return NextResponse.json({
      ok: true,
      message: `Migration already completed (${migratedCount} thoughts found with migration source)`,
      migrated: 0,
      skipped: migratedCount,
    });
  }

  // Get all insights
  const insights = queryInsights();
  if (insights.length === 0) {
    return NextResponse.json({ ok: true, message: "No insights to migrate", migrated: 0 });
  }

  // Track insight ID -> thought ID for relation mapping
  const insightToThought = new Map<string, string>();
  let migrated = 0;
  let embeddings = 0;

  for (const insight of insights) {
    const { kind, conviction } = mapInsight(insight);

    const { thought, revision } = createThought({
      kind,
      body: insight.body,
      family: insight.family,
      tags: insight.tags,
      conviction,
      revision_source: "migration",
      source_type: "conversation",
      source_meta: {
        migrated_from: insight.id,
        original_type: insight.type,
        original_status: insight.status,
        original_ts: insight.ts,
      },
    });

    insightToThought.set(insight.id, thought.id);
    migrated++;

    // Best-effort embedding
    try {
      const vector = await generateEmbedding(insight.body);
      if (vector) {
        storeEmbedding(revision.id, vector);
        embeddings++;
      }
    } catch {
      // Non-fatal — embedding can be backfilled later
    }
  }

  // Create relations from refs
  for (const insight of insights) {
    const fromThoughtId = insightToThought.get(insight.id);
    if (!fromThoughtId) continue;

    // refs -> related relations
    for (const refId of insight.refs) {
      const toThoughtId = insightToThought.get(refId);
      if (toThoughtId) {
        addRelation(fromThoughtId, toThoughtId, "related");
      }
    }

    // superseded_by -> builds_on relations (the superseding thought builds on this one)
    if (insight.superseded_by) {
      const supersedingThoughtId = insightToThought.get(insight.superseded_by);
      if (supersedingThoughtId) {
        addRelation(supersedingThoughtId, fromThoughtId, "builds_on");
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Migrated ${migrated} insights into thoughts`,
    migrated,
    embeddings,
    relations: insights.reduce((n, i) => n + i.refs.length + (i.superseded_by ? 1 : 0), 0),
  });
}
