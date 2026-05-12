import { NextResponse } from "next/server";
import {
  queryFeatures, insertFeature, updateFeature, deleteFeature,
  featureAreas, updateFeaturePositions,
  getAllConnections, addConnection, removeConnection, updateConnectionNote,
} from "@/app/lib/db-features";
import { handleAction } from "@/app/lib/route-handler";
import { getProject } from "@/app/lib/request";
import type { ConnectionType } from "@/app/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = getProject(request);
  const params = { area: searchParams.get("area") ?? undefined, project };
  const features = queryFeatures(params);
  const connections = getAllConnections();
  const areas = featureAreas();
  return NextResponse.json({ features, connections, areas });
}

export async function POST(request: Request) {
  const body = await request.json();
  const project = getProject(request);

  return handleAction(body, {
    create: (b) => {
      const incoming = b.feature as Parameters<typeof insertFeature>[0];
      const featureInput = incoming.project || project === "*"
        ? incoming
        : { ...incoming, project };
      return { feature: insertFeature(featureInput) };
    },
    update: (b) => { updateFeature(b.id as string, b.feature as Partial<Parameters<typeof updateFeature>[1]>); },
    delete: (b) => { deleteFeature(b.id as string); },
    "update-positions": (b) => { updateFeaturePositions(b.updates as Parameters<typeof updateFeaturePositions>[0]); },
    "add-connection": (b) => { addConnection(b.a_id as string, b.b_id as string, b.type as ConnectionType, b.note as string); },
    "remove-connection": (b) => { removeConnection(b.a_id as string, b.b_id as string); },
    "update-connection-note": (b) => { updateConnectionNote(b.a_id as string, b.b_id as string, b.note as string); },
  });
}
