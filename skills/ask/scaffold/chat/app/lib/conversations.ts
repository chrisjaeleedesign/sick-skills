/* ── JSONL conversation file management ── */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import crypto from "crypto";
import type {
  ConversationMeta,
  ConversationMessage,
  UserMessage,
  AssistantMessage,
  ConversationListItem,
} from "./types";

/**
 * Get the conversation storage directory.
 * Uses .agents/model-calls/ in the repo root (same as ask.py).
 */
function findRepoRoot(): string {
  let dir = resolve(process.cwd());
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "skills")) && existsSync(join(dir, "scripts"))) return dir;
    dir = resolve(dir, "..");
  }
  // Fallback to cwd
  return process.cwd();
}

export function conversationDir(): string {
  const root = findRepoRoot();
  const d = join(root, ".agents", "model-calls");
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

function generateId(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 8);
}

function nowISO(): string {
  return new Date().toISOString();
}

function dateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── Read ── */

export function loadConversation(
  filepath: string
): { meta: ConversationMeta; messages: ConversationMessage[] } {
  const raw = readFileSync(filepath, "utf-8").trim();
  const lines = raw.split("\n");
  if (!lines.length) throw new Error(`Empty conversation file: ${filepath}`);

  const meta = JSON.parse(lines[0]) as ConversationMeta;
  const messages = lines.slice(1).map((l) => JSON.parse(l) as ConversationMessage);
  return { meta, messages };
}

/* ── Create ── */

export function createConversation(opts: {
  id?: string;
  title?: string;
  project?: string;
  tags?: string[];
  flow?: string;
  content?: string;
}): string {
  const convId = opts.id ?? generateId(opts.content ?? Date.now().toString());
  const date = dateStr();
  let filename = `${date}_${convId}.jsonl`;
  let filepath = join(conversationDir(), filename);

  let counter = 1;
  while (existsSync(filepath)) {
    filename = `${date}_${convId}_${counter}.jsonl`;
    filepath = join(conversationDir(), filename);
    counter++;
  }

  const meta: ConversationMeta = {
    type: "meta",
    id: convId,
    title: opts.title ?? null,
    summary: null,
    project: opts.project ?? null,
    created: nowISO(),
    updated: nowISO(),
    parent: null,
    branch_from: null,
    exchanges: 0,
    tags: opts.tags ?? [],
    flow: opts.flow ?? null,
  };

  writeFileSync(filepath, JSON.stringify(meta) + "\n");
  return filepath;
}

/* ── Append ── */

export function appendExchange(
  filepath: string,
  userMsg: Omit<UserMessage, "exchange">,
  assistantMsg: Omit<AssistantMessage, "exchange">,
  newTags?: string[]
): void {
  const raw = readFileSync(filepath, "utf-8").trim();
  const lines = raw.split("\n");
  const meta = JSON.parse(lines[0]) as ConversationMeta;

  meta.exchanges = (meta.exchanges ?? 0) + 1;
  meta.updated = nowISO();
  if (newTags) {
    const existing = new Set(meta.tags ?? []);
    newTags.forEach((t) => existing.add(t));
    meta.tags = [...existing].sort();
  }

  const exchangeNum = meta.exchanges;
  const fullUser = { ...userMsg, exchange: exchangeNum };
  const fullAssistant = { ...assistantMsg, exchange: exchangeNum };

  lines[0] = JSON.stringify(meta);
  lines.push(JSON.stringify(fullUser));
  lines.push(JSON.stringify(fullAssistant));

  writeFileSync(filepath, lines.join("\n") + "\n");
}

/* ── List ── */

export function listConversations(project?: string): ConversationListItem[] {
  const dir = conversationDir();
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const items: ConversationListItem[] = [];

  for (const f of files) {
    try {
      const filepath = join(dir, f);
      const firstLine = readFileSync(filepath, "utf-8").split("\n")[0];
      const meta = JSON.parse(firstLine) as ConversationMeta;

      if (project && meta.project !== project) continue;

      items.push({
        id: meta.id,
        title: meta.title,
        project: meta.project,
        updated: meta.updated,
        exchanges: meta.exchanges,
        filepath,
      });
    } catch {
      // Skip malformed files
    }
  }

  // Sort by updated desc
  items.sort((a, b) => b.updated.localeCompare(a.updated));
  return items;
}

/* ── List projects ── */

export function listProjects(): { id: string; name: string; conversationCount: number }[] {
  const dir = conversationDir();
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const projectMap = new Map<string, number>();

  for (const f of files) {
    try {
      const filepath = join(dir, f);
      const firstLine = readFileSync(filepath, "utf-8").split("\n")[0];
      const meta = JSON.parse(firstLine) as ConversationMeta;
      const proj = meta.project ?? "default";
      projectMap.set(proj, (projectMap.get(proj) ?? 0) + 1);
    } catch {
      // Skip
    }
  }

  return [...projectMap.entries()].map(([id, count]) => ({
    id,
    name: id,
    conversationCount: count,
  }));
}

/* ── Update metadata ── */

export function updateConversationMeta(
  filepath: string,
  updates: Partial<Pick<ConversationMeta, "title" | "project" | "summary">>
): void {
  const raw = readFileSync(filepath, "utf-8").trim();
  const lines = raw.split("\n");
  const meta = JSON.parse(lines[0]) as ConversationMeta;

  if (updates.title !== undefined) meta.title = updates.title;
  if (updates.project !== undefined) meta.project = updates.project;
  if (updates.summary !== undefined) meta.summary = updates.summary;
  meta.updated = nowISO();

  lines[0] = JSON.stringify(meta);
  writeFileSync(filepath, lines.join("\n") + "\n");
}

/* ── Delete ── */

export function deleteConversation(filepath: string): void {
  const { unlinkSync } = require("fs");
  unlinkSync(filepath);
}
