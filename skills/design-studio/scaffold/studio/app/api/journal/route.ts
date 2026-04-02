import { NextResponse } from "next/server";
import {
  queryEvents,
  queryInsights,
  createEvent,
  createInsight,
  updateInsight,
} from "@/app/lib/db-journal";
import { handleAction } from "@/app/lib/route-handler";
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

  return handleAction(body, {
    "append-event": (b) => { createEvent(b.event as Parameters<typeof createEvent>[0]); },
    "append-insight": (b) => { createInsight(b.insight as Parameters<typeof createInsight>[0]); },
    "update-insight": (b) => { updateInsight(b.id as string, b.patch as Parameters<typeof updateInsight>[1]); },
  });
}
