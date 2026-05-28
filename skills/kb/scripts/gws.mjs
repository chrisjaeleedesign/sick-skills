import { spawnSync } from "node:child_process";
import fs from "node:fs";

export const GOOGLE_MIME_TYPES = {
  doc: "application/vnd.google-apps.document",
  sheet: "application/vnd.google-apps.spreadsheet",
  slides: "application/vnd.google-apps.presentation",
  folder: "application/vnd.google-apps.folder",
  pdf: "application/pdf",
};

export class GwsError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "GwsError";
    this.details = details;
  }
}

export function parseGwsJson(output) {
  const text = String(output ?? "")
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("Using keyring backend:"))
    .join("\n")
    .trim();
  const start = [...text]
    .map((char, index) => (char === "{" || char === "[" ? index : -1))
    .find((index) => index >= 0);

  if (start === undefined) {
    throw new GwsError("gws did not return JSON", { output });
  }

  try {
    return JSON.parse(text.slice(start));
  } catch (error) {
    throw new GwsError("Failed to parse gws JSON output", {
      output,
      parseError: error.message,
    });
  }
}

export function runGws(args, options = {}) {
  const result = spawnSync("gws", args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    input: options.input,
  });

  if (result.error) {
    throw new GwsError("Failed to execute gws", {
      args,
      error: result.error.message,
    });
  }

  if (result.status !== 0) {
    const message =
      result.status === 2
        ? "gws authentication failed or expired"
        : "gws command failed";
    throw new GwsError(message, {
      args,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  }

  return result.stdout;
}

export function runGwsJson(args, options = {}) {
  return parseGwsJson(runGws(args, options));
}

export function assertAuthedStatus(status) {
  if (!status || status.auth_method === "none" || status.token_valid === false) {
    throw new GwsError("gws is not authenticated", { status });
  }
  return status;
}

export function checkAuth() {
  return assertAuthedStatus(runGwsJson(["auth", "status"]));
}

export function loadConfig(path) {
  if (!path) {
    throw new Error("Missing --config path");
  }
  if (!fs.existsSync(path)) {
    throw new Error(`KB config not found: ${path}`);
  }

  const config = JSON.parse(fs.readFileSync(path, "utf8"));
  if (!config.folder_id) {
    throw new Error(`KB config missing folder_id: ${path}`);
  }
  if (!config.manifest_sheet_id) {
    throw new Error(`KB config missing manifest_sheet_id: ${path}`);
  }
  return config;
}

export function withSharedDriveListParams(params) {
  return {
    ...params,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  };
}

export function withSharedDriveUpdateParams(params) {
  return {
    ...params,
    supportsAllDrives: true,
  };
}

export function mapMimeType(mimeType) {
  switch (mimeType) {
    case GOOGLE_MIME_TYPES.doc:
      return "doc";
    case GOOGLE_MIME_TYPES.sheet:
      return "sheet";
    case GOOGLE_MIME_TYPES.slides:
      return "slides";
    case GOOGLE_MIME_TYPES.folder:
      return "folder";
    case GOOGLE_MIME_TYPES.pdf:
      return "pdf";
    default:
      return "other";
  }
}

export function listDriveFolder(folderId) {
  return runGwsJson([
    "drive",
    "files",
    "list",
    "--params",
    JSON.stringify(
      withSharedDriveListParams({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id,name,mimeType,modifiedTime,parents,webViewLink)",
        pageSize: 1000,
      }),
    ),
  ]).files ?? [];
}

export function readSheetValues(spreadsheetId, range) {
  return runGwsJson([
    "sheets",
    "spreadsheets",
    "values",
    "get",
    "--params",
    JSON.stringify({ spreadsheetId, range }),
  ]).values ?? [];
}

export function writeSheetValues(spreadsheetId, range, values) {
  return runGwsJson([
    "sheets",
    "spreadsheets",
    "values",
    "update",
    "--params",
    JSON.stringify({ spreadsheetId, range, valueInputOption: "RAW" }),
    "--json",
    JSON.stringify({ values }),
  ]);
}

export function readDoc(documentId) {
  return runGwsJson([
    "docs",
    "documents",
    "get",
    "--params",
    JSON.stringify({ documentId }),
  ]);
}

export function readSpreadsheet(spreadsheetId) {
  return runGwsJson([
    "sheets",
    "spreadsheets",
    "get",
    "--params",
    JSON.stringify({
      spreadsheetId,
      fields: "spreadsheetId,properties.title,sheets.properties.title,spreadsheetUrl",
    }),
  ]);
}
