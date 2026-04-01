"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ScenarioResult } from "@/lib/types";

function scoreBadgeColor(score: number): string {
  if (score >= 4) return "bg-accent-green-dim text-accent-green";
  if (score >= 3) return "bg-accent-yellow-dim text-accent-yellow";
  return "bg-accent-red-dim text-accent-red";
}

function ScoreBadge({
  label,
  score,
  explanation,
  details,
}: {
  label: string;
  score: number;
  explanation: string;
  details?: Array<{ rule: string; passed: boolean }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${scoreBadgeColor(score)}`}
      >
        {label}: {score}/5
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>
      {open && (
        <div className="mt-1.5 rounded-md bg-surface-0 p-2.5 text-xs text-text-secondary">
          <p>{explanation}</p>
          {details && details.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {details.map((d, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className={d.passed ? "text-accent-green" : "text-accent-red"}>
                    {d.passed ? "\u2713" : "\u2717"}
                  </span>
                  {d.rule}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResponseCard({ result }: { result: ScenarioResult }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-0 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border-subtle bg-surface-1/50 px-4 py-2.5">
        <h4 className="text-sm font-medium text-text-primary">
          {result.scenario_title || result.scenario_id}
        </h4>
        {result.input && (
          <p className="mt-1 font-mono text-xs text-text-tertiary line-clamp-2">
            {result.input}
          </p>
        )}
      </div>

      {/* Response */}
      <div className="px-4 py-3">
        <div className="prose-response max-h-80 overflow-y-auto text-sm text-text-secondary">
          <ReactMarkdown>{result.output}</ReactMarkdown>
        </div>
      </div>

      {/* Scores */}
      {result.scores && (
        <div className="flex flex-wrap gap-2 border-t border-border-subtle px-4 py-2.5">
          <ScoreBadge
            label="Instruction"
            score={result.scores.instruction_following.score}
            explanation={result.scores.instruction_following.explanation}
          />
          <ScoreBadge
            label="Eval Rules"
            score={result.scores.eval_rules.score}
            explanation={result.scores.eval_rules.explanation}
            details={result.scores.eval_rules.details}
          />
          <ScoreBadge
            label="Quality"
            score={result.scores.quality.score}
            explanation={result.scores.quality.explanation}
          />
        </div>
      )}
    </div>
  );
}
