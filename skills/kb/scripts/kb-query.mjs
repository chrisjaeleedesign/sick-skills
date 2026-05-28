#!/usr/bin/env node
import {
  loadConfig,
  readDoc,
  readSheetValues,
  readSpreadsheet,
} from "./gws.mjs";
import { extractDocText, parseManifestRows } from "./kb-update.mjs";

export function parseArgs(argv) {
  const args = { limit: 3 };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--config") {
      args.config = argv[(i += 1)];
    } else if (value === "--question") {
      args.question = argv[(i += 1)];
    } else if (value === "--limit") {
      args.limit = Number(argv[(i += 1)]);
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  if (!args.config) throw new Error("Pass --config <path>");
  if (!args.question) throw new Error('Pass --question "<question>"');
  if (!Number.isInteger(args.limit) || args.limit < 1) {
    throw new Error("--limit must be a positive integer");
  }
  return args;
}

export function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

export function scoreRow(row, question) {
  const tokens = tokenize(question);
  const title = tokenize(row.title);
  const tags = tokenize(row.tags);
  const summary = tokenize(row.summary);
  let score = 0;

  for (const token of tokens) {
    if (title.includes(token)) score += 5;
    if (tags.includes(token)) score += 3;
    if (summary.includes(token)) score += 1;
  }

  return score;
}

export function rankManifestRows(rows, question, limit = 3) {
  return rows
    .filter((row) => row.status === "active")
    .map((row) => ({ ...row, score: scoreRow(row, question) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function excerptText(text, maxLength = 1200) {
  const compact = String(text ?? "").replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength)}...`;
}

export function sheetRange(title, range = "A1:H8") {
  if (/^[A-Za-z0-9_]+$/.test(title)) {
    return `${title}!${range}`;
  }
  return `'${title.replaceAll("'", "''")}'!${range}`;
}

export function fetchSource(row, readers = {}) {
  if (row.type === "doc") {
    const doc = readers.readDoc ? readers.readDoc(row.docId) : readDoc(row.docId);
    return {
      kind: "doc",
      excerpt: excerptText(extractDocText(doc)),
    };
  }

  if (row.type === "sheet") {
    const metadata = readers.readSpreadsheet
      ? readers.readSpreadsheet(row.docId)
      : readSpreadsheet(row.docId);
    const tabs = (metadata?.sheets ?? [])
      .map((sheet) => sheet?.properties?.title)
      .filter(Boolean);
    const previewTabs = tabs.slice(0, 2).map((title) => {
      const values = readers.readSheetValues
        ? readers.readSheetValues(row.docId, sheetRange(title))
        : readSheetValues(row.docId, sheetRange(title));
      return { title, values };
    });
    return {
      kind: "sheet",
      title: metadata?.properties?.title ?? row.title,
      tabs,
      previewTabs,
    };
  }

  return {
    kind: row.type,
    excerpt: row.summary,
  };
}

export function queryManifest(values, question, limit = 3, readers = {}) {
  const rows = parseManifestRows(values);
  const matches = rankManifestRows(rows, question, limit);
  return matches.map((row) => ({
    title: row.title,
    type: row.type,
    docId: row.docId,
    summary: row.summary,
    tags: row.tags,
    score: row.score,
    source: fetchSource(row, readers),
  }));
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const config = loadConfig(args.config);
  const values = readSheetValues(config.manifest_sheet_id, "Sheet1!A:G");
  return {
    question: args.question,
    manifest_sheet_id: config.manifest_sheet_id,
    matches: queryManifest(values, args.question, args.limit),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
