import { NextResponse } from "next/server";
import { readManifest, writeManifest } from "@/app/lib/manifest";
import type { Section, Family, Settings } from "@/app/lib/manifest";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sections?: Section[];
    families?: Record<string, Family>;
    settings?: Partial<Settings>;
  };

  const manifest = readManifest();
  if (body.sections) manifest.sections = body.sections;
  if (body.families) manifest.families = body.families;
  if (body.settings) manifest.settings = { ...manifest.settings, ...body.settings };
  writeManifest(manifest);

  return NextResponse.json({ ok: true });
}
