/* ── /api/conversations — conversation CRUD ── */

import { NextRequest, NextResponse } from "next/server";
import {
  listConversations,
  listProjects,
  createConversation,
  loadConversation,
  updateConversationMeta,
  deleteConversation,
} from "@/app/lib/conversations";

/* GET — list conversations, optionally filtered by project */
export async function GET(req: NextRequest) {
  const project = req.nextUrl.searchParams.get("project") ?? undefined;
  const id = req.nextUrl.searchParams.get("id");

  // If id is a filepath, load that specific conversation
  if (id) {
    try {
      const { meta, messages } = loadConversation(id);
      return NextResponse.json({ ok: true, meta, messages });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 404 });
    }
  }

  const conversations = listConversations(project);
  const projects = listProjects();
  return NextResponse.json({ ok: true, conversations, projects });
}

/* POST — action dispatcher */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action as string;

  if (action === "create") {
    const filepath = createConversation({
      id: body.id,
      title: body.title,
      project: body.project,
      tags: body.tags,
    });
    const { meta } = loadConversation(filepath);
    return NextResponse.json({ ok: true, meta, filepath });
  }

  if (action === "update") {
    if (!body.filepath) {
      return NextResponse.json({ error: "filepath required" }, { status: 400 });
    }
    updateConversationMeta(body.filepath, {
      title: body.title,
      project: body.project,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    if (!body.filepath) {
      return NextResponse.json({ error: "filepath required" }, { status: 400 });
    }
    deleteConversation(body.filepath);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
