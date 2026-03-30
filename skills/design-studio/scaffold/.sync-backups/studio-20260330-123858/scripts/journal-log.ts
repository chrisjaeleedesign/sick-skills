#!/usr/bin/env npx tsx
/**
 * CLI script for logging journal entries to SQLite.
 * Usage: npx tsx scripts/journal-log.ts --table <event|insight> --type <type> --body <text> [options]
 */
import { insertEvent, insertInsight } from "../app/lib/db";
import type { EventType, InsightType, InsightStatus } from "../app/lib/types";
import { INSIGHT_PREFIXES } from "../app/lib/types";

const USAGE = `Usage: npx tsx scripts/journal-log.ts --table <event|insight> --type <type> --body <text> [options]

Options:
  --table    Required. "event" or "insight"
  --type     Required. Event: created|iterated|archived|moved|feedback
                        Insight: preference|learning|reaction|direction|decision
  --body     Required. Entry text
  --family   Optional. Family slug
  --tags     Optional. Comma-separated tags
  --status   Optional. Insight status (default: active)
  --version  Optional. Version number (events only)
  --id       Optional. Custom entry ID`;

// --- Arg parser -----------------------------------------------------------

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && i + 1 < argv.length) {
      args[argv[i].slice(2)] = argv[++i];
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

// --- Validate required args -----------------------------------------------

if (!args.table || !args.type || !args.body) {
  console.error(USAGE);
  process.exit(1);
}

if (args.table !== "event" && args.table !== "insight") {
  console.error(`Error: --table must be "event" or "insight"\n\n${USAGE}`);
  process.exit(1);
}

// --- ID generation --------------------------------------------------------

function generateId(table: string, type: string): string {
  const ts = Date.now().toString(36);
  if (table === "event") return `evt-${ts}`;
  return `${INSIGHT_PREFIXES[type as InsightType] ?? type.slice(0, 3)}-${ts}`;
}

const id = args.id ?? generateId(args.table, args.type);
const tags = args.tags ? args.tags.split(",").map((t) => t.trim()) : [];

// --- Insert ---------------------------------------------------------------

if (args.table === "event") {
  insertEvent({
    id,
    type: args.type as EventType,
    body: args.body,
    family: args.family,
    version: args.version ? parseInt(args.version, 10) : undefined,
    tags,
    metadata: {},
  });
} else {
  insertInsight({
    id,
    type: args.type as InsightType,
    body: args.body,
    family: args.family,
    tags,
    status: (args.status as InsightStatus) ?? "active",
    refs: [],
  });
}

console.log(id);
