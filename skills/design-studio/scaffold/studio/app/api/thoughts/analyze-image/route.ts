import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { DESIGN_ROOT } from "@/app/lib/db";
import { getThought, addRevision, updateThought } from "@/app/lib/db-thoughts";
import { generateEmbedding } from "@/app/lib/embeddings";
import { storeEmbedding } from "@/app/lib/db-embeddings";

const execAsync = promisify(exec);

const ANALYZE_PROMPT =
  "Describe this image in detail for a design mood board: colors, layout patterns, typography, mood, UI elements, notable details. Also suggest 3-5 comma-separated tags at the end, prefixed with 'Tags: '.";

export async function POST(request: Request) {
  let body: { thought_id?: string; image_path?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { thought_id, image_path } = body;

  if (!thought_id || !image_path) {
    return NextResponse.json({ error: "thought_id and image_path are required" }, { status: 400 });
  }

  // Resolve image path relative to DESIGN_ROOT
  const absImagePath = path.resolve(DESIGN_ROOT, image_path);

  // Path traversal check
  if (!absImagePath.startsWith(path.resolve(DESIGN_ROOT))) {
    return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
  }

  if (!existsSync(absImagePath)) {
    return NextResponse.json({ error: "Image file not found" }, { status: 404 });
  }

  // Locate ask.py: DESIGN_ROOT is .agents/design/, so repo root is two levels up
  const askScriptPath = path.resolve(DESIGN_ROOT, "../../skills/ask/scripts/ask.py");

  if (!existsSync(askScriptPath)) {
    return NextResponse.json({ error: `ask.py not found at ${askScriptPath}` }, { status: 500 });
  }

  // Shell out to ask.py
  let rawOutput: string;
  try {
    const callId = `api-${Date.now()}`;
    const { stdout } = await execAsync(
      `python3 "${askScriptPath}" --model mini --content "${ANALYZE_PROMPT.replace(/"/g, '\\"')}" --attach "${absImagePath}" --id "${callId}"`,
    );
    rawOutput = stdout.trim();
  } catch (err) {
    console.error("analyze-image: ask.py failed:", err);
    return NextResponse.json({ error: `Image analysis failed: ${String(err)}` }, { status: 500 });
  }

  // Parse description and tags from output
  const tagsMatch = rawOutput.match(/Tags:\s*(.+)$/im);
  const tagsLine = tagsMatch?.[1] ?? "";
  const tags = tagsLine
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Description is everything before the Tags line
  const description = rawOutput
    .replace(/Tags:.*$/im, "")
    .trim();

  // Store revision
  const revision = addRevision(thought_id, description, "vision-model");

  // Merge tags with existing thought tags
  const thought = getThought(thought_id);
  if (thought) {
    const existingTags: string[] = thought.tags ?? [];
    const mergedTags = Array.from(new Set([...existingTags, ...tags]));
    updateThought(thought_id, { tags: mergedTags });
  }

  // Embed the new revision (best-effort)
  try {
    const vector = await generateEmbedding(description);
    if (vector) storeEmbedding(revision.id, vector);
  } catch {
    console.error(`analyze-image: Failed to embed revision ${revision.id}`);
  }

  return NextResponse.json({ description, tags, revision_id: revision.id });
}
