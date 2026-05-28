import assert from "node:assert/strict";
import test from "node:test";

import {
  activeKnowledgeFiles,
  buildUpdatedManifest,
  diffManifest,
  extractDocText,
  parseArgs,
  parseManifestRows,
  serializeManifestRows,
} from "../scripts/kb-update.mjs";
import { GOOGLE_MIME_TYPES } from "../scripts/gws.mjs";

test("parseArgs requires exactly one of dry-run or write", () => {
  assert.throws(() => parseArgs(["--config", "x"]), /exactly one/);
  assert.throws(() => parseArgs(["--config", "x", "--dry-run", "--write"]), /exactly one/);
  assert.deepEqual(parseArgs(["--config", "x", "--dry-run"]), {
    config: "x",
    dryRun: true,
    write: false,
  });
});

test("activeKnowledgeFiles skips manifest and folders", () => {
  const files = activeKnowledgeFiles([
    { id: "manifest", name: "_kb_manifest", mimeType: GOOGLE_MIME_TYPES.sheet },
    { id: "folder", name: "Archive", mimeType: GOOGLE_MIME_TYPES.folder },
    {
      id: "doc",
      name: "Company Thesis",
      mimeType: GOOGLE_MIME_TYPES.doc,
      modifiedTime: "2026-01-01T00:00:00Z",
    },
  ]);

  assert.deepEqual(files, [
    {
      title: "Company Thesis",
      type: "doc",
      docId: "doc",
      lastModified: "2026-01-01T00:00:00Z",
      mimeType: GOOGLE_MIME_TYPES.doc,
    },
  ]);
});

test("manifest rows parse and serialize stably", () => {
  const values = [
    ["Title", "Type", "Doc ID", "Summary", "Tags", "Last Modified", "Status"],
    ["Doc", "doc", "doc-1", "Summary", "tag", "time", "active"],
  ];
  assert.deepEqual(serializeManifestRows(parseManifestRows(values)), values);
});

test("diffManifest classifies new, modified, unchanged, restored, and removed", () => {
  const files = [
    { docId: "same", title: "Same", lastModified: "t1", type: "doc" },
    { docId: "mod", title: "Mod", lastModified: "t2", type: "doc" },
    { docId: "restore", title: "Restore", lastModified: "t3", type: "doc" },
    { docId: "new", title: "New", lastModified: "t4", type: "sheet" },
  ];
  const rows = [
    { docId: "same", title: "Same", lastModified: "t1", status: "active" },
    { docId: "mod", title: "Mod", lastModified: "old", status: "active" },
    { docId: "restore", title: "Restore", lastModified: "t3", status: "removed" },
    { docId: "gone", title: "Gone", lastModified: "t5", status: "active" },
    { docId: "old-gone", title: "Old Gone", lastModified: "t6", status: "removed" },
  ];

  assert.deepEqual(
    diffManifest(files, rows).map((change) => change.kind),
    ["unchanged", "modified", "restored", "new", "removed"],
  );
});

test("buildUpdatedManifest preserves removed rows and updates active rows", () => {
  const files = [
    { docId: "same", title: "Same", lastModified: "t1", type: "doc" },
    { docId: "mod", title: "Mod", lastModified: "t2", type: "doc" },
    { docId: "restore", title: "Restore", lastModified: "t3", type: "doc" },
    { docId: "new", title: "New", lastModified: "t4", type: "sheet" },
  ];
  const rows = [
    { docId: "same", title: "Same", type: "doc", summary: "Keep", tags: "tag", lastModified: "t1", status: "active" },
    { docId: "mod", title: "Mod", type: "doc", summary: "Old", tags: "", lastModified: "old", status: "active" },
    { docId: "restore", title: "Restore", type: "doc", summary: "Old", tags: "", lastModified: "t3", status: "removed" },
    { docId: "gone", title: "Gone", type: "doc", summary: "Gone", tags: "", lastModified: "t5", status: "active" },
    { docId: "old-gone", title: "Old Gone", type: "doc", summary: "Old Gone", tags: "", lastModified: "t6", status: "removed" },
  ];
  const update = buildUpdatedManifest(files, rows, {
    readers: {
      readDoc: () => ({
        body: { content: [{ paragraph: { elements: [{ textRun: { content: "Fresh summary text." } }] } }] },
      }),
      readSpreadsheet: () => ({
        properties: { title: "New" },
        sheets: [{ properties: { title: "Dashboard" } }],
      }),
    },
  });

  assert.deepEqual(update.counts, {
    added: 1,
    updated: 1,
    restored: 1,
    removed: 1,
    unchanged: 1,
    total: 6,
  });
  assert.equal(update.rows.find((row) => row.docId === "same").summary, "Keep");
  assert.equal(update.rows.find((row) => row.docId === "gone").status, "removed");
  assert.equal(update.rows.find((row) => row.docId === "old-gone").status, "removed");
});

test("extractDocText reads nested Google Docs text runs", () => {
  assert.equal(
    extractDocText({
      body: {
        content: [
          { paragraph: { elements: [{ textRun: { content: "Hello " } }] } },
          { paragraph: { elements: [{ textRun: { content: "world" } }] } },
        ],
      },
    }),
    "Hello world",
  );
});
