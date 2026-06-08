#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const artifactDir = process.argv[2];

if (!artifactDir) {
  console.error("Usage: validate-artifact.mjs <artifact-dir>");
  process.exit(1);
}

const root = path.resolve(artifactDir);
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((value) => value.trim() !== ""));
}

function parseTable(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`${relativePath} is missing`);
    return { headers: [], rows: [] };
  }

  const rows = parseCsv(read(filePath));
  if (rows.length === 0) {
    fail(`${relativePath} is empty`);
    return { headers: [], rows: [] };
  }

  return {
    headers: rows[0].map((header) => header.trim()),
    rows: rows.slice(1),
  };
}

function requireHeaders(relativePath, actualHeaders, requiredHeaders) {
  const missing = requiredHeaders.filter((header) => !actualHeaders.includes(header));
  if (missing.length > 0) {
    fail(`${relativePath} missing header(s): ${missing.join(", ")}`);
  }
}

function rowObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
}

if (!fs.existsSync(root)) {
  fail(`artifact directory does not exist: ${root}`);
} else {
  for (const required of ["RESEARCH.md", "sources.csv", "claims.csv"]) {
    if (!exists(required)) {
      fail(`${required} is missing`);
    }
  }

  if (exists("RESEARCH.md")) {
    const research = read(path.join(root, "RESEARCH.md")).trim();
    if (research.length < 500) {
      warn("RESEARCH.md is short; make sure it contains real analysis, not just a stub");
    }
  }

  const sources = parseTable("sources.csv");
  requireHeaders("sources.csv", sources.headers, [
    "source_id",
    "title",
    "url",
    "source_type",
    "publisher",
    "date_accessed",
    "reliability",
    "notes",
  ]);

  const sourceIds = new Set();
  const sourceRows = sources.rows.map((row) => rowObject(sources.headers, row));

  if (sourceRows.length === 0) {
    fail("sources.csv has no source rows");
  }

  for (const [index, source] of sourceRows.entries()) {
    const rowNumber = index + 2;
    const id = source.source_id?.trim();
    if (!id) {
      fail(`sources.csv row ${rowNumber} has no source_id`);
    } else if (sourceIds.has(id)) {
      fail(`sources.csv duplicate source_id: ${id}`);
    } else {
      sourceIds.add(id);
    }

    if (!source.url?.trim()) {
      fail(`sources.csv row ${rowNumber} has no url`);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(source.date_accessed ?? "")) {
      fail(`sources.csv row ${rowNumber} date_accessed must be YYYY-MM-DD`);
    }
  }

  const claims = parseTable("claims.csv");
  requireHeaders("claims.csv", claims.headers, [
    "claim_id",
    "claim",
    "claim_type",
    "subject",
    "source_ids",
    "confidence",
    "status",
    "notes",
  ]);

  const claimIds = new Set();
  const allowedClaimTypes = new Set(["fact", "estimate", "inference", "open_question"]);
  const allowedConfidence = new Set(["high", "medium", "low", "unknown"]);
  const allowedStatus = new Set(["supported", "weak", "unsupported", "unknown", "open_question"]);

  const claimRows = claims.rows.map((row) => rowObject(claims.headers, row));

  if (claimRows.length === 0) {
    fail("claims.csv has no claim rows");
  }

  for (const [index, claim] of claimRows.entries()) {
    const rowNumber = index + 2;
    const id = claim.claim_id?.trim();
    const claimText = claim.claim?.trim();
    const claimType = claim.claim_type?.trim();
    const confidence = claim.confidence?.trim();
    const status = claim.status?.trim();
    const linkedSources = (claim.source_ids ?? "")
      .split(";")
      .map((sourceId) => sourceId.trim())
      .filter(Boolean);

    if (!id) {
      fail(`claims.csv row ${rowNumber} has no claim_id`);
    } else if (claimIds.has(id)) {
      fail(`claims.csv duplicate claim_id: ${id}`);
    } else {
      claimIds.add(id);
    }

    if (!claimText) {
      fail(`claims.csv row ${rowNumber} has no claim`);
    }

    if (!allowedClaimTypes.has(claimType)) {
      fail(`claims.csv row ${rowNumber} has invalid claim_type: ${claimType}`);
    }

    if (!allowedConfidence.has(confidence)) {
      fail(`claims.csv row ${rowNumber} has invalid confidence: ${confidence}`);
    }

    if (!allowedStatus.has(status)) {
      fail(`claims.csv row ${rowNumber} has invalid status: ${status}`);
    }

    for (const sourceId of linkedSources) {
      if (!sourceIds.has(sourceId)) {
        fail(`claims.csv row ${rowNumber} references unknown source_id: ${sourceId}`);
      }
    }

    const needsEvidence = ["fact", "estimate"].includes(claimType) && ["supported", "weak"].includes(status);
    if (needsEvidence && linkedSources.length === 0) {
      fail(`claims.csv row ${rowNumber} is ${status} ${claimType} but has no source_ids`);
    }

    if (claimType === "inference" && linkedSources.length === 0) {
      warn(`claims.csv row ${rowNumber} is an inference with no source_ids; acceptable only for clearly labeled reasoning`);
    }
  }

  const tablesDir = path.join(root, "tables");
  if (fs.existsSync(tablesDir)) {
    for (const fileName of fs.readdirSync(tablesDir).filter((name) => name.endsWith(".csv")).sort()) {
      const relativePath = path.join("tables", fileName);
      const table = parseTable(relativePath);
      if (table.rows.length === 0) {
        warn(`${relativePath} has no data rows`);
      }
      requireHeaders(relativePath, table.headers, ["source_ids", "confidence", "notes"]);

      for (const [index, row] of table.rows.map((csvRow) => rowObject(table.headers, csvRow)).entries()) {
        const rowNumber = index + 2;
        const confidence = row.confidence?.trim();
        const linkedSources = (row.source_ids ?? "")
          .split(";")
          .map((sourceId) => sourceId.trim())
          .filter(Boolean);

        if (confidence && !allowedConfidence.has(confidence)) {
          fail(`${relativePath} row ${rowNumber} has invalid confidence: ${confidence}`);
        }

        if (linkedSources.length === 0) {
          warn(`${relativePath} row ${rowNumber} has no source_ids`);
        }

        for (const sourceId of linkedSources) {
          if (!sourceIds.has(sourceId)) {
            fail(`${relativePath} row ${rowNumber} references unknown source_id: ${sourceId}`);
          }
        }
      }
    }
  }
}

for (const message of warnings) {
  console.warn(`warning: ${message}`);
}

for (const message of errors) {
  console.error(`error: ${message}`);
}

if (errors.length > 0) {
  process.exit(1);
}

console.log(`Market research artifact looks valid: ${root}`);
