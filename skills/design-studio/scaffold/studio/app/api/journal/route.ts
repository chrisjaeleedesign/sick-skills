import { NextResponse } from "next/server";
import {
  queryEvents,
  queryInsights,
  createEvent,
  createInsight,
  updateInsight,
} from "@/app/lib/db-journal";
import type { QueryParams } from "@/app/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table") ?? "insights";

  const params: QueryParams = {
    search: searchParams.get("search") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    family: searchParams.get("family") ?? undefined,
    tags: searchParams.get("tags")?.split(",").filter(Boolean) ?? undefined,
    since: searchParams.get("since") ?? undefined,
    until: searchParams.get("until") ?? undefined,
    limit: searchParams.has("limit")
      ? Number(searchParams.get("limit"))
      : undefined,
    offset: searchParams.has("offset")
      ? Number(searchParams.get("offset"))
      : undefined,
  };

  const rows =
    table === "events" ? queryEvents(params) : queryInsights(params);

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  switch (body.action) {
    case "append-event":
      createEvent(body.event);
      break;
    case "append-insight":
      createInsight(body.insight);
      break;
    case "update-insight":
      updateInsight(body.id, body.patch);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
