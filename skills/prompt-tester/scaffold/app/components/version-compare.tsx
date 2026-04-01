"use client";

import ReactMarkdown from "react-markdown";
import type { ScenarioResult } from "@/lib/types";

function scoreBadgeColor(score: number): string {
  if (score >= 4) return "text-accent-green";
  if (score >= 3) return "text-accent-yellow";
  return "text-accent-red";
}

function avgScore(r: ScenarioResult): number {
  if (!r.scores) return 0;
  return (
    (r.scores.instruction_following.score +
      r.scores.eval_rules.score +
      r.scores.quality.score) /
    3
  );
}

interface Props {
  versionA: { version: number; content: string; results: ScenarioResult[] };
  versionB: { version: number; content: string; results: ScenarioResult[] };
}

export default function VersionCompare({ versionA, versionB }: Props) {
  const avgA =
    versionA.results.length > 0
      ? versionA.results.reduce((sum, r) => sum + avgScore(r), 0) /
        versionA.results.length
      : 0;
  const avgB =
    versionB.results.length > 0
      ? versionB.results.reduce((sum, r) => sum + avgScore(r), 0) /
        versionB.results.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Aggregate scores */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border-subtle bg-surface-0 p-4 text-center">
          <div className="text-xs text-text-tertiary">Version {versionA.version}</div>
          <div className={`text-2xl font-bold ${scoreBadgeColor(avgA)}`}>
            {avgA.toFixed(1)}
          </div>
          <div className="text-xs text-text-tertiary">avg score</div>
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface-0 p-4 text-center">
          <div className="text-xs text-text-tertiary">Version {versionB.version}</div>
          <div className={`text-2xl font-bold ${scoreBadgeColor(avgB)}`}>
            {avgB.toFixed(1)}
          </div>
          <div className="text-xs text-text-tertiary">avg score</div>
        </div>
      </div>

      {/* Prompt diff */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-primary">
          Prompt Diff
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-border-subtle bg-surface-0 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-text-tertiary">
              v{versionA.version}
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs text-text-secondary leading-relaxed">
              {versionA.content}
            </pre>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-0 p-3">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-text-tertiary">
              v{versionB.version}
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs text-text-secondary leading-relaxed">
              {versionB.content}
            </pre>
          </div>
        </div>
      </div>

      {/* Per-scenario results */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-primary">
          Scenario Results
        </h3>
        <div className="space-y-4">
          {versionA.results.map((rA, idx) => {
            const rB = versionB.results[idx];
            if (!rB) return null;
            return (
              <div
                key={rA.scenario_id}
                className="rounded-lg border border-border-subtle overflow-hidden"
              >
                <div className="bg-surface-1/50 px-4 py-2 text-sm font-medium text-text-primary">
                  {rA.scenario_title || rA.scenario_id}
                </div>
                <div className="grid grid-cols-2 divide-x divide-border-subtle">
                  {/* Version A */}
                  <div className="p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[10px] uppercase text-text-tertiary">
                        v{versionA.version}
                      </span>
                      <span className={`text-xs font-medium ${scoreBadgeColor(avgScore(rA))}`}>
                        {avgScore(rA).toFixed(1)}
                      </span>
                    </div>
                    <div className="prose-response max-h-48 overflow-y-auto text-xs text-text-secondary">
                      <ReactMarkdown>{rA.output}</ReactMarkdown>
                    </div>
                  </div>
                  {/* Version B */}
                  <div className="p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[10px] uppercase text-text-tertiary">
                        v{versionB.version}
                      </span>
                      <span className={`text-xs font-medium ${scoreBadgeColor(avgScore(rB))}`}>
                        {avgScore(rB).toFixed(1)}
                      </span>
                    </div>
                    <div className="prose-response max-h-48 overflow-y-auto text-xs text-text-secondary">
                      <ReactMarkdown>{rB.output}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
