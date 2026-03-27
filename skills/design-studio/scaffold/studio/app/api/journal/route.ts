import { NextResponse } from "next/server";
import {
  queryEvents,
  queryInsights,
  insertEvent,
  insertInsight,
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
      insertEvent(body.event);
      break;
    case "append-insight":
      insertInsight(body.insight);
      break;
    case "update-insight":
      updateInsight(body.id, body.patch);
      break;
  }

  return NextResponse.json({ ok: true });
}
