import { chromium } from "playwright";
import { join } from "path";
import { DEVICE_PRESETS, type DevicePreset } from "../app/lib/constants";

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

if (!family) {
  console.error("Usage: --family <slug> [--version N] [--device desktop|laptop|tablet|mobile] [--port 3001]");
  process.exit(1);
}

const preset = DEVICE_PRESETS[device] ?? DEVICE_PRESETS.desktop;
const suffix = device === "desktop" ? "" : `-${device}`;
const outPath = join(process.cwd(), `../references/${family}-v${version}${suffix}.png`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: preset.width, height: preset.height } });
await page.goto(`http://localhost:${port}/prototypes/${family}/v${version}?capture=true&device=${device}`, { waitUntil: "networkidle" });
await page.screenshot({ path: outPath });
await browser.close();

console.log(`Saved ${outPath}`);
