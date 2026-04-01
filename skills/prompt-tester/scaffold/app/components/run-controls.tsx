"use client";

import { useState, useEffect } from "react";
import { Play, Loader2, Settings2 } from "lucide-react";
import { fetchConfig, startRun } from "@/lib/api";
import { useStreaming } from "@/lib/use-streaming";
import ResponseCard from "./response-card";
import type { AppConfig, PromptMeta } from "@/lib/types";

interface Props {
  prompt: PromptMeta;
  activeVersion: number;
  selectedScenarioIds: Set<string>;
}

export default function RunControls({
  prompt,
  activeVersion,
  selectedScenarioIds,
}: Props) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [model, setModel] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState("");
  const stream = useStreaming();

  useEffect(() => {
    fetchConfig()
      .then((cfg) => {
        setConfig(cfg);
        setModel(cfg.default_model);
        setThinkingLevel(cfg.default_thinking_level);
      })
      .catch(() => {});
  }, []);

  function handleRun() {
    if (selectedScenarioIds.size === 0 || stream.isStreaming) return;
    const es = startRun({
      prompt_id: prompt.id,
      prompt_version: activeVersion,
      model,
      thinking_level: thinkingLevel,
      scenario_ids: Array.from(selectedScenarioIds),
    });
    stream.start(es);
  }

  const canRun = selectedScenarioIds.size > 0 && model && !stream.isStreaming;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Model picker */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-text-tertiary">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="block rounded-md border border-border-subtle bg-surface-0 px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            {config?.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Thinking level */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-text-tertiary">
            <Settings2 className="mr-1 inline h-3 w-3" />
            Thinking
          </label>
          <select
            value={thinkingLevel}
            onChange={(e) => setThinkingLevel(e.target.value)}
            className="block rounded-md border border-border-subtle bg-surface-0 px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            {config?.thinking_levels.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={!canRun}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40"
        >
          {stream.isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {stream.isStreaming ? "Running..." : "Run"}
          {!stream.isStreaming && (
            <span className="text-xs opacity-70">
              ({selectedScenarioIds.size})
            </span>
          )}
        </button>
      </div>

      {/* Progress indicators */}
      {stream.isStreaming && stream.progress.size > 0 && (
        <div className="space-y-1">
          {Array.from(stream.progress.entries()).map(([scenarioId, status]) => (
            <div
              key={scenarioId}
              className="flex items-center gap-2 text-xs text-text-tertiary"
            >
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="truncate">{scenarioId}</span>
              <span className="text-text-tertiary">{status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {stream.error && (
        <div className="rounded-lg border border-accent-red/30 bg-accent-red-dim px-4 py-3 text-sm text-accent-red">
          {stream.error}
        </div>
      )}

      {/* Results */}
      {stream.results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-primary">
            Results
            {stream.runId && (
              <span className="ml-2 text-xs font-normal text-text-tertiary">
                Run: {stream.runId.slice(0, 8)}
              </span>
            )}
          </h3>
          {stream.results.map((r, i) => (
            <ResponseCard key={r.scenario_id || i} result={r} />
          ))}
          {stream.runId && !stream.isStreaming && (
            <a
              href={`/review/${stream.runId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-green/10 px-4 py-2 text-sm font-medium text-accent-green transition-colors hover:bg-accent-green/20"
            >
              Review this run
            </a>
          )}
        </div>
      )}
    </div>
  );
}
