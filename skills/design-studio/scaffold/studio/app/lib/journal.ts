import { readFileSync, appendFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const JOURNAL_PATH = join(process.cwd(), "../journal.jsonl");

export interface JournalEntry {
  ts: string;
  type: "preference" | "direction" | "reaction" | "learning" | "decision";
  id: string;
  tags: string[];
  body: string;
  status: "active" | "superseded" | "killed" | "final";
  refs?: string[];
  family?: string;
  superseded_by?: string;
}

export function readJournal(): JournalEntry[] {
  if (!existsSync(JOURNAL_PATH)) return [];
  const raw = readFileSync(JOURNAL_PATH, "utf-8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => JSON.parse(line));
}

export function appendJournalEntry(entry: JournalEntry): void {
  appendFileSync(JOURNAL_PATH, JSON.stringify(entry) + "\n");
}

export function updateJournalEntry(
  id: string,
  patch: Partial<JournalEntry>
): void {
  const entries = readJournal();
  const updated = entries.map((e) =>
    e.id === id ? { ...e, ...patch } : e
  );
  writeFileSync(
    JOURNAL_PATH,
    updated.map((e) => JSON.stringify(e)).join("\n") + "\n"
  );
}
