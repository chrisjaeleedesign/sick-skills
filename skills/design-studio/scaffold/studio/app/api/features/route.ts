import { NextResponse } from "next/server";
import {
  queryFeatures, insertFeature, updateFeature, deleteFeature,
  featureAreas, updateFeaturePositions,
  getAllConnections, addConnection, removeConnection, updateConnectionNote,
} from "@/app/lib/db-features";
import type { ConnectionType } from "@/app/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params = { area: searchParams.get("area") ?? undefined };
  const features = queryFeatures(params);
  const connections = getAllConnections();
  const areas = featureAreas();
  return NextResponse.json({ features, connections, areas });
}

export async function POST(request: Request) {
  const body = await request.json();
  switch (body.action) {
    case "create":
      return NextResponse.json({ ok: true, feature: insertFeature(body.feature) });
    case "update":
      updateFeature(body.id, body.feature);
      return NextResponse.json({ ok: true });
    case "delete":
      deleteFeature(body.id);
      return NextResponse.json({ ok: true });
    case "update-positions":
      updateFeaturePositions(body.updates);
      return NextResponse.json({ ok: true });
    case "add-connection":
      addConnection(body.a_id, body.b_id, body.type as ConnectionType, body.note);
      return NextResponse.json({ ok: true });
    case "remove-connection":
      removeConnection(body.a_id, body.b_id);
      return NextResponse.json({ ok: true });
    case "update-connection-note":
      updateConnectionNote(body.a_id, body.b_id, body.note);
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
