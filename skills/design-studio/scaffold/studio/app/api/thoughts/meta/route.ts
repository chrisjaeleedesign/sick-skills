import { NextResponse } from "next/server";
import { thoughtTags, thoughtFamilies, thoughtColors } from "@/app/lib/db-thoughts";

export async function GET() {
  return NextResponse.json({
    tags: thoughtTags(),
    families: thoughtFamilies(),
    colors: thoughtColors(),
    kinds: ["observation", "question", "principle", "reference"],
  });
}
