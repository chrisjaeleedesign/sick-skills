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
} from "@/app/lib/db-thoughts";
import { storeEmbedding } from "@/app/lib/db-embeddings";
import { generateEmbedding } from "@/app/lib/embeddings";
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

  const params: ThoughtQueryParams = {
    search: searchParams.get("search") ?? undefined,
    kind: (searchParams.get("kind") as ThoughtQueryParams["kind"]) ?? undefined,
    conviction: (searchParams.get("conviction") as ThoughtQueryParams["conviction"]) ?? undefined,
    color: (searchParams.get("color") as ThoughtQueryParams["color"]) ?? undefined,
    family: searchParams.get("family") ?? undefined,
    tags: searchParams.get("tags")?.split(",").filter(Boolean) ?? undefined,
    pinned: searchParams.has("pinned") ? searchParams.get("pinned") === "true" : undefined,
    limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined,
    offset: searchParams.has("offset") ? Number(searchParams.get("offset")) : undefined,
  };

  return NextResponse.json(queryThoughts(params, { withRevision: true }));
}

export async function POST(request: Request) {
  const body = await request.json();

  switch (body.action) {
    case "create-thought": {
      const result = createThought(body.thought);
      // Best-effort embedding for the initial revision
      await embedRevision(result.revision.id, result.revision.body);
      return NextResponse.json({ ok: true, ...result });
    }
    case "update-thought": {
      updateThought(body.id, body.patch);
      return NextResponse.json({ ok: true });
    }
    case "delete-thought": {
      deleteThought(body.id);
      return NextResponse.json({ ok: true });
    }
    case "add-revision": {
      const revision = addRevision(body.thought_id, body.body, body.source);
      await embedRevision(revision.id, revision.body);
      return NextResponse.json({ ok: true, revision });
    }
    case "add-attachment": {
      const attachment = addAttachment(body.attachment);
      return NextResponse.json({ ok: true, attachment });
    }
    case "add-relation": {
      addRelation(body.from_id, body.to_id, body.type);
      return NextResponse.json({ ok: true });
    }
    case "remove-relation": {
      removeRelation(body.from_id, body.to_id);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
