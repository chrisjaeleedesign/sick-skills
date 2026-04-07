/* ── Config loading and model resolution ── */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";
import type { AppConfig } from "./types";

const PROVIDERS: Record<string, string> = {
  openai: "openai",
  openrouter: "openrouter",
};

let _cachedConfig: AppConfig | null = null;

/**
 * Find config.yaml. Checks in order:
 * 1. Local config.yaml (copied by ui-init into .agents/chat/)
 * 2. Walk up to find skills/ask/config.yaml (when running from the sick-skills repo)
 */
function findConfigPath(): string {
  // Check for local config.yaml first (deployed via ui-init)
  const localConfig = resolve(process.cwd(), "config.yaml");
  if (existsSync(localConfig)) return localConfig;

  // Walk up from cwd to find repo root (contains "skills" dir)
  let dir = resolve(process.cwd());
  for (let i = 0; i < 10; i++) {
    const candidate = resolve(dir, "skills/ask/config.yaml");
    if (existsSync(candidate)) return candidate;
    dir = resolve(dir, "..");
  }

  throw new Error(
    "Could not find config.yaml. Ensure it was copied during setup, or run from the repo."
  );
}

export function loadConfig(): AppConfig {
  if (_cachedConfig) return _cachedConfig;
  const configPath = findConfigPath();
  const raw = readFileSync(configPath, "utf-8");
  _cachedConfig = yaml.load(raw) as AppConfig;
  return _cachedConfig;
}

/**
 * Resolve a model alias or full "provider/model" string.
 * Returns [providerName, modelId].
 */
export function resolveModel(
  modelStr: string,
  config: AppConfig
): [string, string] {
  const aliases = config.aliases ?? {};

  const fullId = aliases[modelStr] ?? modelStr;

  if (!fullId.includes("/")) {
    throw new Error(
      `Cannot resolve model '${modelStr}'. Use an alias (${Object.keys(aliases).join(", ")}) or provider/model format.`
    );
  }

  const slashIdx = fullId.indexOf("/");
  const provider = fullId.slice(0, slashIdx);
  const modelId = fullId.slice(slashIdx + 1);

  if (!(provider in PROVIDERS)) {
    throw new Error(
      `Unknown provider '${provider}'. Known: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }

  return [provider, modelId];
}

/**
 * Get all available model aliases with their provider info.
 */
export function getModelAliases(
  config: AppConfig
): { alias: string; provider: string; modelId: string }[] {
  const aliases = config.aliases ?? {};
  return Object.entries(aliases).map(([alias, fullId]) => {
    const slashIdx = fullId.indexOf("/");
    return {
      alias,
      provider: fullId.slice(0, slashIdx),
      modelId: fullId.slice(slashIdx + 1),
    };
  });
}
