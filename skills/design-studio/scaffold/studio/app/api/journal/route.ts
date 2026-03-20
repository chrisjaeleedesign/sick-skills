import { NextResponse } from "next/server";
import {
  readJournal,
  appendJournalEntry,
  updateJournalEntry,
  type JournalEntry,
} from "@/app/lib/journal";

export async function GET() {
  return NextResponse.json(readJournal());
}

export async function POST(request: Request) {
  const body = (await request.json()) as
    | { action: "append"; entry: JournalEntry }
    | { action: "update"; id: string; patch: Partial<JournalEntry> };

  if (body.action === "append") {
    appendJournalEntry(body.entry);
  } else if (body.action === "update") {
    updateJournalEntry(body.id, body.patch);
  }

  return NextResponse.json({ ok: true });
}
