import { NextResponse } from "next/server";
import { listProjects, readManifest } from "@/app/lib/manifest";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  for (const project of listProjects()) {
    const manifest = readManifest(project);
    const family = manifest.families[slug];
    if (family) {
      return NextResponse.json({
        name: family.name,
        description: family.description,
        versions: family.versions,
        project,
      });
    }
  }

  return NextResponse.json(null, { status: 404 });
}
