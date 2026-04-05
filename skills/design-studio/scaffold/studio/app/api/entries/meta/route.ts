import { NextResponse } from "next/server";
import { entryTags, entryFamilies, entryColors, entryProjects } from "@/app/lib/db-entries";

export async function GET() {
  return NextResponse.json({
    tags: entryTags(),
    families: entryFamilies(),
    colors: entryColors(),
    projects: entryProjects(),
    kinds: ["observation", "question", "principle", "reference"],
  });
}
