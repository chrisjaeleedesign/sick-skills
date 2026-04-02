import { NextResponse } from "next/server";
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
  updateThoughtLayout,
  bulkUpdateThoughtLayout,
} from "@/app/lib/db-thoughts";
import { getDb } from "@/app/lib/db";
import { getBoardsForThought } from "@/app/lib/db-boards";
import { storeEmbedding } from "@/app/lib/db-embeddings";
import { generateEmbedding } from "@/app/lib/embeddings";
import { handleAction } from "@/app/lib/route-handler";
import type { ThoughtQueryParams } from "@/app/lib/types";

/** Best-effort embedding: generate and store, but never fail the request. */
async function embedRevision(revisionId: string, body: string | undefined): Promise<void> {
  if (!body) return;
  try {
    const vector = await generateEmbedding(body);
    if (vector) storeEmbedding(revisionId, vector);
  } catch {
    // Embedding is best-effort — log but don't fail
    console.error(`Failed to embed revision ${revisionId}`);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // If an id is specified, return a single thought with revisions/attachments/relations
  const id = searchParams.get("id");
  if (id) {
    const thought = getThought(id);
    if (!thought) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      ...thought,
      revisions: getRevisions(id),
      attachments: getAttachments(id),
      relations: getRelations(id),
    });
  }

  const view = searchParams.get("view");

  // Parse comma-separated multi-value filters
  const rawKind = searchParams.get("kind");
  const rawImportance = searchParams.get("importance");
  const rawFamily = searchParams.get("family");

  const params: ThoughtQueryParams = {
    search: searchParams.get("search") ?? undefined,
    kind: rawKind
      ? (rawKind.includes(",")
          ? rawKind.split(",").filter(Boolean) as ThoughtQueryParams["kind"]
          : rawKind as ThoughtQueryParams["kind"])
      : undefined,
    importance: rawImportance
      ? (rawImportance.includes(",")
          ? rawImportance.split(",").filter(Boolean) as ThoughtQueryParams["importance"]
          : rawImportance as ThoughtQueryParams["importance"])
      : undefined,
    color: (searchParams.get("color") as ThoughtQueryParams["color"]) ?? undefined,
    family: rawFamily
      ? (rawFamily.includes(",")
          ? rawFamily.split(",").filter(Boolean)
          : rawFamily)
      : undefined,
    tags: searchParams.get("tags")?.split(",").filter(Boolean) ?? undefined,
    pinned: searchParams.has("pinned") ? searchParams.get("pinned") === "true" : undefined,
    since: searchParams.get("since") ?? undefined,
    until: searchParams.get("until") ?? undefined,
    limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined,
    offset: searchParams.has("offset") ? Number(searchParams.get("offset")) : undefined,
    // Bank-view extra filter
    source_type: (searchParams.get("source_type") as ThoughtQueryParams["source_type"]) ?? undefined,
  };

  if (view === "bank") {
    const thoughts = queryThoughts(params, { withRevision: true });

    if (thoughts.length === 0) {
      return NextResponse.json(thoughts);
    }

    // Batch-fetch first attachment per thought
    const db = getDb();
    const ids = thoughts.map((t) => t.id);
    const placeholders = ids.map(() => "?").join(", ");
    const attachmentRows = db
      .prepare(
        `SELECT thought_id, path, type FROM attachments WHERE thought_id IN (${placeholders}) ORDER BY created_at`
      )
      .all(...ids) as { thought_id: string; path: string; type: string }[];

    // Take first attachment per thought_id
    const firstAttachment = new Map<string, { path: string; type: string }>();
    for (const row of attachmentRows) {
      if (!firstAttachment.has(row.thought_id)) {
        firstAttachment.set(row.thought_id, { path: row.path, type: row.type });
      }
    }

    // Fetch board membership per thought
    const result = thoughts.map((t) => {
      const boards = getBoardsForThought(t.id).map((b) => ({
        id: b.board_id,
        name: b.name,
        color: b.color,
      }));
      return {
        ...t,
        attachment: firstAttachment.get(t.id) ?? null,
        boards,
      };
    });

    return NextResponse.json(result);
  }

  return NextResponse.json(queryThoughts(params, { withRevision: true }));
}

export async function POST(request: Request) {
  const body = await request.json();

  return handleAction(body, {
    "create-thought": async (b) => {
      const result = createThought(b.thought as Parameters<typeof createThought>[0]);
      await embedRevision(result.revision.id, result.revision.body);
      return result;
    },
    "update-thought": (b) => {
      updateThought(b.id as string, b.patch as Parameters<typeof updateThought>[1]);
    },
    "delete-thought": (b) => {
      deleteThought(b.id as string);
    },
    "add-revision": async (b) => {
      const revision = addRevision(b.thought_id as string, b.body as string, b.source as string);
      await embedRevision(revision.id, revision.body);
      return { revision };
    },
    "add-attachment": (b) => {
      const attachment = addAttachment(b.attachment as Parameters<typeof addAttachment>[0]);
      return { attachment };
    },
    "add-relation": (b) => {
      addRelation(b.from_id as string, b.to_id as string, b.type as Parameters<typeof addRelation>[2]);
    },
    "remove-relation": (b) => {
      removeRelation(b.from_id as string, b.to_id as string);
    },
    "update-layout": (b) => {
      updateThoughtLayout(b.id as string, b.layout as Parameters<typeof updateThoughtLayout>[1]);
    },
    "bulk-update-layout": (b) => {
      bulkUpdateThoughtLayout(b.items as Parameters<typeof bulkUpdateThoughtLayout>[0]);
    },
  });
}
