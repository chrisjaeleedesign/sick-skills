import { NextResponse } from "next/server";
import { readManifest, writeManifest } from "@/app/lib/manifest";
import type { Section, Family, Settings } from "@/app/lib/manifest";

type ManifestAction =
  | { action?: undefined; sections?: Section[]; families?: Record<string, Family>; settings?: Partial<Settings> }
  | { action: "add-family"; family: Family }
  | { action: "add-section"; section: Section }
  | { action: "set-current"; family: string; version: number };

/** Find the first empty cell in the focused section's grid, expanding rows if needed. */
function assignToFocusedSection(manifest: { sections: Section[] }, slug: string): void {
  const focused = manifest.sections.find((s) => s.focus);
  if (!focused) return;

  for (let r = 0; r < focused.rows; r++) {
    for (let c = 0; c < focused.columns; c++) {
      const key = `${r}:${c}`;
      if (!focused.grid[key]) {
        focused.grid[key] = slug;
        return;
      }
    }
  }
  focused.grid[`${focused.rows}:0`] = slug;
  focused.rows += 1;
}

function getProject(request: Request): string {
  const { searchParams } = new URL(request.url);
  return searchParams.get("project") || "default";
}

export async function GET(request: Request) {
  const project = getProject(request);
  return NextResponse.json(readManifest(project));
}

export async function POST(request: Request) {
  const project = getProject(request);
  const body = (await request.json()) as ManifestAction;
  const manifest = readManifest(project);

  if (body.action === "add-family") {
    manifest.families[body.family.slug] = body.family;
    assignToFocusedSection(manifest, body.family.slug);
  } else if (body.action === "add-section") {
    manifest.sections.unshift(body.section);
  } else if (body.action === "set-current") {
    manifest.current = { family: body.family, version: body.version };
  } else {
    if (body.sections) manifest.sections = body.sections;
    if (body.families) manifest.families = body.families;
    if (body.settings) manifest.settings = { ...manifest.settings, ...body.settings };
  }

  writeManifest(manifest, project);
  return NextResponse.json({ ok: true });
}
