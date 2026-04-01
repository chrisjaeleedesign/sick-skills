import type {
  PromptMeta,
  PromptVersion,
  Scenario,
  RunMeta,
  ScenarioResult,
  Review,
  AppConfig,
} from "./types";

const BASE = "/api";

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Prompts ──────────────────────────────────────────────────────────────────

export function fetchPrompts(): Promise<PromptMeta[]> {
  return json("/prompts");
}

export function fetchPrompt(id: string): Promise<PromptMeta> {
  return json(`/prompts/${id}`);
}

export function createPrompt(opts: {
  title: string;
  description: string;
  content: string;
}): Promise<PromptMeta> {
  return json("/prompts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
}

export function updatePrompt(
  id: string,
  content: string
): Promise<PromptVersion> {
  return json(`/prompts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function fetchPromptVersion(
  id: string,
  version: number
): Promise<PromptVersion> {
  return json(`/prompts/${id}/versions/${version}`);
}

// ── Scenarios ────────────────────────────────────────────────────────────────

export function fetchScenarios(): Promise<Scenario[]> {
  return json("/scenarios");
}

export function createScenario(opts: {
  title: string;
  input: string;
  expected_behavior: string;
  tags: string[];
  eval_rules: string[];
}): Promise<Scenario> {
  return json("/scenarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
}

export function deleteScenario(id: string): Promise<void> {
  return json(`/scenarios/${id}`, { method: "DELETE" });
}

// ── Runs ─────────────────────────────────────────────────────────────────────

export function startRun(opts: {
  prompt_id: string;
  prompt_version: number;
  model: string;
  thinking_level?: string;
  scenario_ids: string[];
}): EventSource {
  const params = new URLSearchParams({
    prompt_id: opts.prompt_id,
    prompt_version: String(opts.prompt_version),
    model: opts.model,
    scenario_ids: opts.scenario_ids.join(","),
  });
  if (opts.thinking_level) params.set("thinking_level", opts.thinking_level);
  return new EventSource(`${BASE}/runs/stream?${params}`);
}

export function fetchRuns(promptId?: string): Promise<RunMeta[]> {
  const q = promptId ? `?prompt_id=${promptId}` : "";
  return json(`/runs${q}`);
}

export function fetchRun(
  id: string
): Promise<{ meta: RunMeta; results: ScenarioResult[] }> {
  return json(`/runs/${id}`);
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export function submitReview(
  runId: string,
  reviews: Review[]
): Promise<{ ok: boolean }> {
  return json(`/runs/${runId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviews }),
  });
}

// ── Improve ──────────────────────────────────────────────────────────────────

export function improvePrompt(
  runId: string,
  model: string
): Promise<PromptVersion> {
  return json(`/runs/${runId}/improve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
}

// ── Compare ──────────────────────────────────────────────────────────────────

export function compareVersions(opts: {
  prompt_id: string;
  version_a: number;
  version_b: number;
  model: string;
  scenario_ids: string[];
}): EventSource {
  const params = new URLSearchParams({
    prompt_id: opts.prompt_id,
    version_a: String(opts.version_a),
    version_b: String(opts.version_b),
    model: opts.model,
    scenario_ids: opts.scenario_ids.join(","),
  });
  return new EventSource(`${BASE}/compare/stream?${params}`);
}

// ── Config ───────────────────────────────────────────────────────────────────

export function fetchConfig(): Promise<AppConfig> {
  return json("/config");
}
