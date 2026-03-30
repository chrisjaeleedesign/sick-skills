import { NextResponse } from "next/server";
import { allTags, allFamilies } from "@/app/lib/db-journal";

export async function GET() {
  return NextResponse.json({
    tags: allTags(),
    families: allFamilies(),
  });
}
