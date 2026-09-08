#!/usr/bin/env bun
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// LifeOS owns routing, validation, task writes, locking, and audit.
try {
  if (process.env.CJL_TASK_VAULT !== undefined) throw new Error("CJL_TASK_VAULT is retired. Use the LifeOS vault; CJL_LIFE_OS_ROOT relocates its checkout.");
  const root = process.env.CJL_LIFE_OS_ROOT || "/Volumes/Misc/life_os";
  if (!path.isAbsolute(root) || path.resolve(root) === path.parse(root).root) throw new Error("CJL_LIFE_OS_ROOT must be an absolute LifeOS checkout directory");
  const script = path.join(root, "apps/pi-mono/src/task-cli.ts");
  if (!fs.existsSync(script)) throw new Error("LifeOS task CLI unavailable at " + script + "; no fallback store is created");
  const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
}
