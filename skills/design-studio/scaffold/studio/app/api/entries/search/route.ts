import { NextResponse } from "next/server";
import { queryEntries, getEntry, getRevisions } from "@/app/lib/db-entries";
import { hybridSearch } from "@/app/lib/db-embeddings";
import { generateEmbedding } from "@/app/lib/embeddings";
import { getProject } from "@/app/lib/request";
import type { Entry } from "@/app/lib/types";

/** Filter entries by project. `"*"` skips the filter (escape hatch). */
function inProject(entry: Entry, project: string): boolean {
  if (project === "*") return true;
  return entry.project === project;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const similarTo = searchParams.get("similar_to");
  const limit = searchParams.has("limit") ? Number(searchParams.get("limit")) : 10;
  const project = getProject(request);
  const projectFilter = project === "*" ? undefined : project;

  // Mode 1: Find entries similar to a given entry by its embedding
  if (similarTo) {
    const revisions = getRevisions(similarTo);
    const latestBody = revisions[0]?.body;
    if (!latestBody) {
      return NextResponse.json([]);
    }

    const queryVector = await generateEmbedding(latestBody);
    if (!queryVector) {
      // Fall back to FTS-only using a few keywords from the body
      const keywords = latestBody.split(/\s+/).slice(0, 5).join(" ");
      return NextResponse.json(queryEntries({ search: keywords, limit, project: projectFilter }));
    }

    const results = hybridSearch(latestBody, queryVector, limit);
    const entries = results
      .filter(r => r.thought_id !== similarTo)
      .map(r => {
        const entry = getEntry(r.thought_id);
        return entry ? { ...entry, score: r.score } : null;
      })
      .filter((t): t is Entry & { score: number } => t != null)
      .filter((t) => inProject(t, project));

    return NextResponse.json(entries);
  }

  // Mode 2: Search by query text (hybrid FTS + semantic)
  if (!query) {
    return NextResponse.json({ error: "Missing q or similar_to param" }, { status: 400 });
  }

  const queryVector = await generateEmbedding(query);

  if (!queryVector) {
    // No embedding available — fall back to FTS-only
    return NextResponse.json(queryEntries({ search: query, limit, project: projectFilter }));
  }

  const results = hybridSearch(query, queryVector, limit);
  const entries = results
    .map(r => {
      const entry = getEntry(r.thought_id);
      return entry ? { ...entry, score: r.score } : null;
    })
    .filter((t): t is Entry & { score: number } => t != null)
    .filter((t) => inProject(t, project));

  return NextResponse.json(entries);
}
