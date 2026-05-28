import assert from "node:assert/strict";
import test from "node:test";

import {
  queryManifest,
  rankManifestRows,
  sheetRange,
} from "../scripts/kb-query.mjs";

test("rankManifestRows ignores removed rows and ranks title/tags/summary matches", () => {
  const rows = [
    { title: "Company Thesis", tags: "strategy", summary: "Pebble positioning", status: "active" },
    { title: "Old Thesis", tags: "strategy", summary: "Pebble positioning", status: "removed" },
    { title: "Random", tags: "", summary: "misc", status: "active" },
  ];

  assert.deepEqual(
    rankManifestRows(rows, "Pebble thesis", 5).map((row) => row.title),
    ["Company Thesis"],
  );
});

test("sheetRange quotes sheet names with spaces and escapes apostrophes", () => {
  assert.equal(sheetRange("Dashboard"), "Dashboard!A1:H8");
  assert.equal(sheetRange("Observed Changes"), "'Observed Changes'!A1:H8");
  assert.equal(sheetRange("Chris's Notes"), "'Chris''s Notes'!A1:H8");
});

test("queryManifest returns structured doc and sheet sources", () => {
  const values = [
    ["Title", "Type", "Doc ID", "Summary", "Tags", "Last Modified", "Status"],
    ["Company Thesis", "doc", "doc-1", "Pebble thesis and positioning", "strategy", "t1", "active"],
    ["Competitors", "sheet", "sheet-1", "Pebble competitor workbook", "competitors", "t2", "active"],
    ["Old", "doc", "old-1", "Pebble old direction", "strategy", "t3", "removed"],
  ];
  const matches = queryManifest(values, "Pebble thesis competitors", 3, {
    readDoc: () => ({
      body: {
        content: [{ paragraph: { elements: [{ textRun: { content: "Thesis content." } }] } }],
      },
    }),
    readSpreadsheet: () => ({
      properties: { title: "Competitors" },
      sheets: [{ properties: { title: "Dashboard" } }],
    }),
    readSheetValues: () => [["section", "item"], ["Coverage", "235 competitors"]],
  });

  assert.equal(matches.length, 2);
  const thesis = matches.find((match) => match.title === "Company Thesis");
  const competitors = matches.find((match) => match.title === "Competitors");
  assert.equal(thesis.source.kind, "doc");
  assert.equal(competitors.source.kind, "sheet");
  assert.deepEqual(competitors.source.previewTabs[0].values[1], ["Coverage", "235 competitors"]);
});
