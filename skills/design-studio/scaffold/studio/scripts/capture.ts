import { chromium } from "playwright";
import { join } from "path";
import { DEVICE_PRESETS, type DevicePreset } from "../app/lib/constants";
import { getDb } from "../app/lib/db";
import { createEntry, addAttachment } from "../app/lib/db-entries";
import { readManifest } from "../app/lib/manifest";

const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, arg, i, arr) => {
    if (arg.startsWith("--") && arr[i + 1]) acc.push([arg.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const family = args.family;
const version = args.version ?? "1";
const device = (args.device ?? "desktop") as DevicePreset;
const port = args.port ?? "3001";
const project = args.project ?? "default";

if (!family) {
  console.error("Usage: --family <slug> [--version N] [--device desktop|laptop|tablet|mobile] [--port 3001] [--project default]");
  process.exit(1);
}

const preset = DEVICE_PRESETS[device] ?? DEVICE_PRESETS.desktop;
const suffix = device === "desktop" ? "" : `-${device}`;
const screenshotPath = `references/${family}-v${version}${suffix}.png`;
const outPath = join(process.cwd(), `../${screenshotPath}`);

// Capture screenshot
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: preset.width, height: preset.height } });
await page.goto(`http://localhost:${port}/prototypes/${family}/v${version}?capture=true&device=${device}`, { waitUntil: "networkidle" });
await page.screenshot({ path: outPath });
await browser.close();
console.log(`Saved ${outPath}`);

// Insert entry into design journal DB (deduplicates by source_url)
try {
  getDb(); // ensure DB is initialized
  const sourceUrl = `prototype://${project}/${family}/v${version}`;

  // Check for existing entry with same source_url
  const db = getDb();
  const existing = db.prepare("SELECT id FROM entries WHERE source_url = ?").get(sourceUrl);
  if (existing) {
    console.log(`Entry already exists for ${sourceUrl}, skipping`);
  } else {
    // Read manifest to get family name and version direction
    const manifest = readManifest(project);
    const fam = manifest.families[family];
    const ver = fam?.versions.find((v) => v.number === parseInt(version));
    const familyName = fam?.name ?? family;
    const direction = ver?.direction ?? "";
    const ts = ver?.createdAt ?? fam?.createdAt ?? new Date().toISOString();

    const result = createEntry({
      kind: "reference",
      source_type: "prototype",
      source_url: sourceUrl,
      source_meta: { project, slug: family, version: parseInt(version) },
      family,
      project,
      body: `${familyName} v${version} — ${direction}`,
      tags: ["prototype", "screenshot", project],
      revision_source: "capture",
    });
    addAttachment({
      entry_id: result.entry.id,
      type: "screenshot",
      path: screenshotPath,
    });
    console.log(`Created entry ${result.entry.id}`);
  }
} catch (err) {
  // Don't fail capture if DB insert fails
  console.error("Warning: Could not create journal entry:", err);
}
