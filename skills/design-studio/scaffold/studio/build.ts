/**
 * Transient prototype compiler — the "compile" half of compile-on-write.
 *
 * Usage:
 *   bun build.ts <family> <version>   # compile one prototype
 *   bun build.ts --all                # compile every app/prototypes/<f>/v<N>
 *
 * Bundles the prototype page + device-frame shim with Bun.build, generates
 * scoped CSS with Tailwind 4 (scanning only this prototype + the shim), and
 * emits a self-contained index.html. Runs for ~a second and exits — this is
 * what lets server.ts stay tiny: no compiler ever lives in the server process.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const STUDIO_ROOT = import.meta.dirname;
const PROTOTYPES = path.join(STUDIO_ROOT, "app", "prototypes");
const SHIM_DIR = path.join(STUDIO_ROOT, "build-shim");
const GLOBALS_CSS = path.join(STUDIO_ROOT, "app", "globals.css");

async function buildPrototype(family: string, version: string): Promise<void> {
  const srcDir = path.join(PROTOTYPES, family, `v${version}`);
  const page = path.join(srcDir, "page.tsx");
  if (!existsSync(page)) {
    throw new Error(`No prototype at app/prototypes/${family}/v${version}/page.tsx`);
  }

  const outDir = path.join(STUDIO_ROOT, "dist", "prototypes", family, `v${version}`);
  mkdirSync(outDir, { recursive: true });

  // --- JS bundle: temp entry that mounts the page inside the frame shim ----
  const entryPath = path.join(SHIM_DIR, `.entry-${family}-v${version}.tsx`);
  writeFileSync(
    entryPath,
    `import { createRoot } from "react-dom/client";
import Frame from "./frame";
import Page from ${JSON.stringify(page)};
createRoot(document.getElementById("root")!).render(<Frame><Page /></Frame>);
`,
  );

  try {
    const result = await Bun.build({
      entrypoints: [entryPath],
      outdir: outDir,
      target: "browser",
      format: "esm",
      naming: "bundle.[ext]",
      minify: true,
      define: { "process.env.NODE_ENV": '"production"' },
    });
    if (!result.success) {
      throw new Error(result.logs.map((l) => l.message).join("\n"));
    }

    // --- CSS: Tailwind 4, scanning only this prototype + the shim ---------
    // source(none) disables project-wide auto-detection so each prototype's
    // stylesheet reflects just its own class usage. Font imports are carried
    // over from globals.css; tokens live in app/theme.css.
    const fontImports = readFileSync(GLOBALS_CSS, "utf-8")
      .split("\n")
      .filter((line) => line.startsWith("@import url("));
    const scoped = [
      ...fontImports,
      `@import "tailwindcss" source(none);`,
      `@source ${JSON.stringify(srcDir)};`,
      `@source ${JSON.stringify(path.join(SHIM_DIR, "frame.tsx"))};`,
      `@import "./app/theme.css";`,
    ].join("\n");
    const cssInputPath = path.join(STUDIO_ROOT, `.tw-input-${family}-v${version}.css`);
    writeFileSync(cssInputPath, scoped);
    try {
      const css = await postcss([tailwindcss()]).process(scoped, {
        from: cssInputPath,
        to: path.join(outDir, "styles.css"),
      });
      writeFileSync(path.join(outDir, "styles.css"), css.css);
    } finally {
      rmSync(cssInputPath, { force: true });
    }

    // --- HTML shell (absolute asset paths: the page URL has no trailing /) -
    const base = `/prototypes/${family}/v${version}`;
    writeFileSync(
      path.join(outDir, "index.html"),
      `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${family} v${version} — Design Studio</title>
<link rel="stylesheet" href="${base}/styles.css" />
</head>
<body class="min-h-screen bg-background text-foreground antialiased">
<div id="root"></div>
<script type="module" src="${base}/bundle.js"></script>
</body>
</html>
`,
    );
  } finally {
    rmSync(entryPath, { force: true });
  }

  console.log(`built ${family}/v${version} → dist/prototypes/${family}/v${version}/`);
}

function allPrototypes(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const family of readdirSync(PROTOTYPES)) {
    const familyDir = path.join(PROTOTYPES, family);
    let versions: string[];
    try {
      versions = readdirSync(familyDir);
    } catch {
      continue; // not a directory (e.g. .DS_Store)
    }
    for (const v of versions) {
      const m = v.match(/^v(\d+)$/);
      if (m && existsSync(path.join(familyDir, v, "page.tsx"))) {
        out.push([family, m[1]]);
      }
    }
  }
  return out;
}

const args = process.argv.slice(2);
if (args[0] === "--all") {
  const targets = allPrototypes();
  let failed = 0;
  for (const [family, version] of targets) {
    try {
      await buildPrototype(family, version);
    } catch (err) {
      failed++;
      console.error(`FAILED ${family}/v${version}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`done: ${targets.length - failed}/${targets.length} prototypes built`);
  if (failed > 0) process.exit(1);
} else if (args.length === 2) {
  await buildPrototype(args[0], args[1].replace(/^v/, ""));
} else {
  console.error("Usage: bun build.ts <family> <version> | bun build.ts --all");
  process.exit(1);
}
