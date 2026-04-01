import { NextResponse } from "next/server";
import { listProjects, createProject } from "@/app/lib/manifest";

export async function GET() {
  return NextResponse.json(listProjects());
}

export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const manifest = createProject(slug);
  return NextResponse.json({ ok: true, project: slug, manifest });
}
