#!/usr/bin/env node
import {
  checkAuth,
  listDriveFolder,
  loadConfig,
  mapMimeType,
  readDoc,
  readSheetValues,
  readSpreadsheet,
  writeSheetValues,
  GOOGLE_MIME_TYPES,
} from "./gws.mjs";

export const MANIFEST_HEADERS = [
  "Title",
  "Type",
  "Doc ID",
  "Summary",
  "Tags",
  "Last Modified",
  "Status",
];

export function parseArgs(argv) {
  const args = { dryRun: false, write: false };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--config") {
      args.config = argv[(i += 1)];
    } else if (value === "--dry-run") {
      args.dryRun = true;
    } else if (value === "--write") {
      args.write = true;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }

  if (!args.config) {
    throw new Error("Pass --config <path>");
  }
  if (args.dryRun === args.write) {
    throw new Error("Pass exactly one of --dry-run or --write");
  }
  return args;
}

export function parseManifestRows(values) {
  const rows = values.slice(1);
  return rows
    .filter((row) => row.some((cell) => String(cell ?? "").length > 0))
    .map((row) => ({
      title: row[0] ?? "",
      type: row[1] ?? "",
      docId: row[2] ?? "",
      summary: row[3] ?? "",
      tags: row[4] ?? "",
      lastModified: row[5] ?? "",
      status: row[6] ?? "",
    }))
    .filter((row) => row.docId);
}

export function serializeManifestRows(rows) {
  return [
    MANIFEST_HEADERS,
    ...rows.map((row) => [
      row.title,
      row.type,
      row.docId,
      row.summary,
      row.tags,
      row.lastModified,
      row.status,
    ]),
  ];
}

export function activeKnowledgeFiles(files) {
  return files
    .filter((file) => file.name !== "_kb_manifest")
    .filter((file) => file.mimeType !== GOOGLE_MIME_TYPES.folder)
    .map((file) => ({
      title: file.name,
      type: mapMimeType(file.mimeType),
      docId: file.id,
      lastModified: file.modifiedTime ?? "",
      mimeType: file.mimeType,
    }));
}

export function diffManifest(files, manifestRows) {
  const filesById = new Map(files.map((file) => [file.docId, file]));
  const rowsById = new Map(manifestRows.map((row) => [row.docId, row]));
  const changes = [];

  for (const file of files) {
    const existing = rowsById.get(file.docId);
    if (!existing) {
      changes.push({ kind: "new", file, existing: null });
    } else if (existing.status === "removed") {
      changes.push({ kind: "restored", file, existing });
    } else if (existing.lastModified !== file.lastModified) {
      changes.push({ kind: "modified", file, existing });
    } else {
      changes.push({ kind: "unchanged", file, existing });
    }
  }

  for (const row of manifestRows) {
    if (!filesById.has(row.docId) && row.status !== "removed") {
      changes.push({ kind: "removed", file: null, existing: row });
    }
  }

  return changes;
}

export function summarizeDocText(text) {
  const compact = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!compact) {
    return "Google Doc with no extractable text content. Reference this entry only after opening the source document.";
  }
  const preview = compact.slice(0, 420);
  return `Google Doc containing: ${preview}${compact.length > preview.length ? "..." : ""}`;
}

export function summarizeSheetMetadata(metadata) {
  const title = metadata?.properties?.title ?? "Untitled spreadsheet";
  const tabs = (metadata?.sheets ?? [])
    .map((sheet) => sheet?.properties?.title)
    .filter(Boolean);
  const tabText = tabs.length ? ` Tabs: ${tabs.join(", ")}.` : "";
  return `Google Sheet "${title}".${tabText} Reference this when the question matches the spreadsheet title, tabs, or tags.`;
}

export function summarizeFile(file, readers = {}) {
  if (file.type === "doc") {
    const doc = readers.readDoc ? readers.readDoc(file.docId) : readDoc(file.docId);
    return summarizeDocText(extractDocText(doc));
  }
  if (file.type === "sheet") {
    const sheet = readers.readSpreadsheet
      ? readers.readSpreadsheet(file.docId)
      : readSpreadsheet(file.docId);
    return summarizeSheetMetadata(sheet);
  }
  if (file.type === "slides") {
    return `Google Slides deck "${file.title}". Reference this when the question concerns this deck or its presentation content.`;
  }
  if (file.type === "pdf") {
    return `PDF "${file.title}". Reference this when the question concerns this document; inspect the source file for exact content.`;
  }
  return `File "${file.title}" of type ${file.type}. Reference this only when its title or tags match the user's question.`;
}

export function extractDocText(doc) {
  const parts = [];
  for (const block of doc?.body?.content ?? []) {
    for (const element of block?.paragraph?.elements ?? []) {
      const text = element?.textRun?.content;
      if (text) parts.push(text);
    }
  }
  return parts.join("");
}

export function buildUpdatedManifest(files, manifestRows, options = {}) {
  const changes = diffManifest(files, manifestRows);
  const changeById = new Map(
    changes
      .filter((change) => change.file)
      .map((change) => [change.file.docId, change]),
  );
  const rowsById = new Map(manifestRows.map((row) => [row.docId, row]));
  const outputRows = [];

  for (const file of files) {
    const change = changeById.get(file.docId);
    const existing = rowsById.get(file.docId);
    const shouldSummarize =
      change.kind === "new" ||
      change.kind === "modified" ||
      change.kind === "restored";
    const summary = shouldSummarize
      ? summarizeFile(file, options.readers)
      : existing.summary;

    outputRows.push({
      title: file.title,
      type: file.type,
      docId: file.docId,
      summary,
      tags: existing?.tags ?? "",
      lastModified: file.lastModified,
      status: "active",
    });
  }

  for (const row of manifestRows) {
    if (!rowsById.has(row.docId)) continue;
    if (!files.some((file) => file.docId === row.docId)) {
      outputRows.push({ ...row, status: "removed" });
    }
  }

  return {
    rows: outputRows,
    changes,
    counts: {
      added: changes.filter((change) => change.kind === "new").length,
      updated: changes.filter((change) => change.kind === "modified").length,
      restored: changes.filter((change) => change.kind === "restored").length,
      removed: changes.filter((change) => change.kind === "removed").length,
      unchanged: changes.filter((change) => change.kind === "unchanged").length,
      total: outputRows.length,
    },
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const config = loadConfig(args.config);
  checkAuth();

  const files = activeKnowledgeFiles(listDriveFolder(config.folder_id));
  const manifestRows = parseManifestRows(
    readSheetValues(config.manifest_sheet_id, "Sheet1!A:G"),
  );
  const update = buildUpdatedManifest(files, manifestRows);

  if (args.write) {
    writeSheetValues(
      config.manifest_sheet_id,
      "Sheet1!A1:G",
      serializeManifestRows(update.rows),
    );
  }

  return {
    mode: args.write ? "write" : "dry-run",
    manifest_sheet_id: config.manifest_sheet_id,
    counts: update.counts,
    changes: update.changes.map((change) => ({
      kind: change.kind,
      title: change.file?.title ?? change.existing?.title,
      docId: change.file?.docId ?? change.existing?.docId,
    })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      if (error.details) {
        process.stderr.write(`${JSON.stringify(error.details, null, 2)}\n`);
      }
      process.exitCode = 1;
    });
}
