/* ── GET /api/models — list available model aliases ── */

import { NextResponse } from "next/server";
import { loadConfig, getModelAliases } from "@/app/lib/config";

export async function GET() {
  try {
    const config = loadConfig();
    const aliases = getModelAliases(config);
    const defaultModel = config.default_model ?? "gpt5";
    return NextResponse.json({ ok: true, models: aliases, default: defaultModel });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
