"use client";

import { useEffect, useState } from "react";
import { Loader2, GitCompare, Play } from "lucide-react";
import Sidebar from "@/components/sidebar";
import VersionCompare from "@/components/version-compare";
import ScenarioLibrary from "@/components/scenario-library";
import {
  fetchPrompts,
  fetchPrompt,
  fetchPromptVersion,
  fetchConfig,
  compareVersions,
} from "@/lib/api";
import { useStreaming } from "@/lib/use-streaming";
import type { PromptMeta, AppConfig, ScenarioResult } from "@/lib/types";

export default function ComparePage() {
  const [prompts, setPrompts] = useState<PromptMeta[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<PromptMeta | null>(null);
  const [versionA, setVersionA] = useState<number>(0);
  const [versionB, setVersionB] = useState<number>(0);
  const [model, setModel] = useState("");
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(
    new Set()
  );
  const [contentA, setContentA] = useState("");
  const [contentB, setContentB] = useState("");
  const [resultsA, setResultsA] = useState<ScenarioResult[]>([]);
  const [resultsB, setResultsB] = useState<ScenarioResult[]>([]);
  const [phase, setPhase] = useState<"setup" | "running" | "done">("setup");

  const streamA = useStreaming();
  const streamB = useStreaming();

  useEffect(() => {
    fetchPrompts()
      .then(setPrompts)
      .catch(() => {});
    fetchConfig()
      .then((cfg) => {
        setConfig(cfg);
        setModel(cfg.default_model);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedPromptId) return;
    fetchPrompt(selectedPromptId)
      .then((p) => {
        setSelectedPrompt(p);
        if (p.versions.length >= 2) {
          setVersionA(p.versions[p.versions.length - 2]);
          setVersionB(p.versions[p.versions.length - 1]);
        } else if (p.versions.length === 1) {
          setVersionA(p.versions[0]);
          setVersionB(p.versions[0]);
        }
      })
      .catch(() => {});
  }, [selectedPromptId]);

  // Load prompt contents when versions change
  useEffect(() => {
    if (!selectedPromptId || !versionA) return;
    fetchPromptVersion(selectedPromptId, versionA)
      .then((v) => setContentA(v.content))
      .catch(() => {});
  }, [selectedPromptId, versionA]);

  useEffect(() => {
    if (!selectedPromptId || !versionB) return;
    fetchPromptVersion(selectedPromptId, versionB)
      .then((v) => setContentB(v.content))
      .catch(() => {});
  }, [selectedPromptId, versionB]);

  // Collect results when streams finish
  useEffect(() => {
    if (!streamA.isStreaming && streamA.results.length > 0) {
      setResultsA(streamA.results);
    }
  }, [streamA.isStreaming, streamA.results]);

  useEffect(() => {
    if (!streamB.isStreaming && streamB.results.length > 0) {
      setResultsB(streamB.results);
    }
  }, [streamB.isStreaming, streamB.results]);

  useEffect(() => {
    if (
      phase === "running" &&
      !streamA.isStreaming &&
      !streamB.isStreaming &&
      resultsA.length > 0 &&
      resultsB.length > 0
    ) {
      setPhase("done");
    }
  }, [phase, streamA.isStreaming, streamB.isStreaming, resultsA, resultsB]);

  function handleRun() {
    if (selectedScenarioIds.size === 0 || !selectedPromptId) return;
    setPhase("running");
    setResultsA([]);
    setResultsB([]);

    const esA = compareVersions({
      prompt_id: selectedPromptId,
      version_a: versionA,
      version_b: versionA, // run version A scenarios
      model,
      scenario_ids: Array.from(selectedScenarioIds),
    });
    streamA.start(esA);

    const esB = compareVersions({
      prompt_id: selectedPromptId,
      version_a: versionB,
      version_b: versionB,
      model,
      scenario_ids: Array.from(selectedScenarioIds),
    });
    streamB.start(esB);
  }

  const canRun =
    selectedPromptId &&
    versionA &&
    versionB &&
    selectedScenarioIds.size > 0 &&
    phase !== "running";

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-10">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <GitCompare className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">
              Compare Versions
            </h1>
          </div>

          {/* Setup */}
          <div className="mb-6 space-y-4 rounded-xl border border-border-subtle bg-surface-0 p-5">
            <div className="grid grid-cols-4 gap-4">
              {/* Prompt picker */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide text-text-tertiary">
                  Prompt
                </label>
                <select
                  value={selectedPromptId}
                  onChange={(e) => setSelectedPromptId(e.target.value)}
                  className="block w-full rounded-md border border-border-subtle bg-background px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="">Select prompt...</option>
                  {prompts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Version A */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide text-text-tertiary">
                  Version A
                </label>
                <select
                  value={versionA}
                  onChange={(e) => setVersionA(Number(e.target.value))}
                  className="block w-full rounded-md border border-border-subtle bg-background px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  {selectedPrompt?.versions.map((v) => (
                    <option key={v} value={v}>
                      v{v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Version B */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide text-text-tertiary">
                  Version B
                </label>
                <select
                  value={versionB}
                  onChange={(e) => setVersionB(Number(e.target.value))}
                  className="block w-full rounded-md border border-border-subtle bg-background px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  {selectedPrompt?.versions.map((v) => (
                    <option key={v} value={v}>
                      v{v}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide text-text-tertiary">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="block w-full rounded-md border border-border-subtle bg-background px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
                >
                  {config?.models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scenario selection */}
            <ScenarioLibrary
              selectedIds={selectedScenarioIds}
              onSelectionChange={setSelectedScenarioIds}
            />

            {/* Run button */}
            <div className="flex justify-end">
              <button
                onClick={handleRun}
                disabled={!canRun}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40"
              >
                {phase === "running" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {phase === "running" ? "Running..." : "Run Comparison"}
              </button>
            </div>
          </div>

          {/* Results */}
          {phase === "done" && (
            <VersionCompare
              versionA={{
                version: versionA,
                content: contentA,
                results: resultsA,
              }}
              versionB={{
                version: versionB,
                content: contentB,
                results: resultsB,
              }}
            />
          )}

          {/* Running state */}
          {phase === "running" && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-3 text-sm text-text-secondary">
                  Running scenarios against both versions...
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  v{versionA}: {streamA.results.length} done &middot; v
                  {versionB}: {streamB.results.length} done
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
