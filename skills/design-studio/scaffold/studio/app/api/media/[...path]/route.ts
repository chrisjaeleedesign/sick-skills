import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { DESIGN_ROOT } from "@/app/lib/db";

const CONTENT_TYPES: Record<string, string> = {
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".svg":  "image/svg+xml",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: "No path provided" }, { status: 400 });
  }

  const filePath = path.join(DESIGN_ROOT, ...segments);
  const resolvedRoot = path.resolve(DESIGN_ROOT);
  const resolvedFile = path.resolve(filePath);

  // Prevent path traversal
  if (!resolvedFile.startsWith(resolvedRoot + path.sep) && resolvedFile !== resolvedRoot) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!existsSync(resolvedFile)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(resolvedFile).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

  const file = readFileSync(resolvedFile);

  return new NextResponse(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
