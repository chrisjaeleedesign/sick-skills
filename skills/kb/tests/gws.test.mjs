import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertAuthedStatus,
  GOOGLE_MIME_TYPES,
  loadConfig,
  mapMimeType,
  parseGwsJson,
  withSharedDriveListParams,
  withSharedDriveUpdateParams,
} from "../scripts/gws.mjs";

test("parseGwsJson strips keyring noise before parsing", () => {
  assert.deepEqual(
    parseGwsJson('Using keyring backend: file\n{"ok":true,"count":2}\n'),
    { ok: true, count: 2 },
  );
});

test("shared-drive params are included for Drive list and update calls", () => {
  assert.deepEqual(withSharedDriveListParams({ pageSize: 10 }), {
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  assert.deepEqual(withSharedDriveUpdateParams({ fileId: "sheet" }), {
    fileId: "sheet",
    supportsAllDrives: true,
  });
});

test("mapMimeType handles supported Google types and unknowns", () => {
  assert.equal(mapMimeType(GOOGLE_MIME_TYPES.doc), "doc");
  assert.equal(mapMimeType(GOOGLE_MIME_TYPES.sheet), "sheet");
  assert.equal(mapMimeType(GOOGLE_MIME_TYPES.slides), "slides");
  assert.equal(mapMimeType(GOOGLE_MIME_TYPES.pdf), "pdf");
  assert.equal(mapMimeType(GOOGLE_MIME_TYPES.folder), "folder");
  assert.equal(mapMimeType("application/octet-stream"), "other");
});

test("assertAuthedStatus rejects missing or invalid auth", () => {
  assert.throws(() => assertAuthedStatus({ auth_method: "none" }), /not authenticated/);
  assert.throws(() => assertAuthedStatus({ auth_method: "oauth2", token_valid: false }), /not authenticated/);
  assert.equal(assertAuthedStatus({ auth_method: "oauth2", token_valid: true }).token_valid, true);
});

test("loadConfig requires folder_id and manifest_sheet_id", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kb-config-"));
  const badPath = path.join(dir, "bad.json");
  const goodPath = path.join(dir, "good.json");
  fs.writeFileSync(badPath, JSON.stringify({ folder_id: "folder" }));
  fs.writeFileSync(
    goodPath,
    JSON.stringify({ folder_id: "folder", manifest_sheet_id: "manifest" }),
  );

  assert.throws(() => loadConfig(badPath), /manifest_sheet_id/);
  assert.deepEqual(loadConfig(goodPath), {
    folder_id: "folder",
    manifest_sheet_id: "manifest",
  });
});
