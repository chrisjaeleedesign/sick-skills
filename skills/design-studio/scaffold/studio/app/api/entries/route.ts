import { NextResponse } from "next/server";
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
} from "@/app/lib/db-entries";
import { getDb } from "@/app/lib/db";
import { getBoardsForEntry } from "@/app/lib/db-boards";
import { storeEmbedding } from "@/app/lib/db-embeddings";
import { generateEmbedding } from "@/app/lib/embeddings";
import { handleAction } from "@/app/lib/route-handler";
import type { EntryQueryParams, SourceType } from "@/app/lib/types";

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

  // If an id is specified, return a single entry with revisions/attachments/relations
  const id = searchParams.get("id");
  if (id) {
    const entry = getEntry(id);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      ...entry,
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

  const params: EntryQueryParams = {
    search: searchParams.get("search") ?? undefined,
    kind: rawKind
      ? (rawKind.includes(",")
          ? rawKind.split(",").filter(Boolean) as EntryQueryParams["kind"]
          : rawKind as EntryQueryParams["kind"])
      : undefined,
    importance: rawImportance
      ? (rawImportance.includes(",")
          ? rawImportance.split(",").filter(Boolean) as EntryQueryParams["importance"]
          : rawImportance as EntryQueryParams["importance"])
      : undefined,
    color: (searchParams.get("color") as EntryQueryParams["color"]) ?? undefined,
    family: rawFamily
      ? (rawFamily.includes(",")
          ? rawFamily.split(",").filter(Boolean)
          : rawFamily)
      : undefined,
    project: searchParams.get("project")
      ? searchParams.get("project")!.split(",").filter(Boolean)
      : undefined,
    tags: searchParams.get("tags")?.split(",").filter(Boolean) ?? undefined,
    pinned: searchParams.has("pinned") ? searchParams.get("pinned") === "true" : undefined,
    hidden: searchParams.has("hidden") ? searchParams.get("hidden") === "true" : undefined,
    since: searchParams.get("since") ?? undefined,
    until: searchParams.get("until") ?? undefined,
    limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined,
    offset: searchParams.has("offset") ? Number(searchParams.get("offset")) : undefined,
    source_type: searchParams.get("source_type")
      ? searchParams.get("source_type")!.split(",").filter(Boolean) as SourceType[]
      : undefined,
  };

  if (view === "bank") {
    const entries = queryEntries(params, { withRevision: true });

    if (entries.length === 0) {
      return NextResponse.json(entries);
    }

    // Batch-fetch first attachment per entry
    const db = getDb();
    const ids = entries.map((t) => t.id);
    const placeholders = ids.map(() => "?").join(", ");
    const attachmentRows = db
      .prepare(
        `SELECT thought_id, path, type FROM attachments WHERE thought_id IN (${placeholders}) ORDER BY created_at`
      )
      .all(...ids) as { thought_id: string; path: string; type: string }[];

    // Take first attachment per entry
    const firstAttachment = new Map<string, { path: string; type: string }>();
    for (const row of attachmentRows) {
      if (!firstAttachment.has(row.thought_id)) {
        firstAttachment.set(row.thought_id, { path: row.path, type: row.type });
      }
    }

    // Fetch board membership per entry
    const result = entries.map((t) => {
      const boards = getBoardsForEntry(t.id).map((b) => ({
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

  return NextResponse.json(queryEntries(params, { withRevision: true }));
}

export async function POST(request: Request) {
  const body = await request.json();
  const db = getDb();

  return handleAction(body, {
    "create-entry": async (b) => {
      const result = createEntry(b.entry as Parameters<typeof createEntry>[0]);
      await embedRevision(result.revision.id, result.revision.body);
      return result;
    },
    "update-entry": (b) => {
      updateEntry(b.id as string, b.patch as Parameters<typeof updateEntry>[1]);
    },
    "delete-entry": (b) => {
      deleteEntry(b.id as string);
    },
    "add-revision": async (b) => {
      const revision = addRevision(b.entry_id as string, b.body as string, b.source as string);
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
    "bulk-update-sort-order": (b) => {
      const items = b.items as { id: string; sort_order: number }[];
      const stmt = db.prepare("UPDATE entries SET sort_order = ? WHERE id = ?");
      const tx = db.transaction(() => {
        for (const item of items) stmt.run(item.sort_order, item.id);
      });
      tx();
    },
  });
}
