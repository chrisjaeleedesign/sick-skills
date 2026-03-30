import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ family: string; version: string }> }
) {
  const { family, version } = await params;
  const filePath = join(process.cwd(), "../references", `${family}-v${version}.png`);

  try {
    const buffer = readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
