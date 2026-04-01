"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { fetchRuns } from "@/lib/api";
import type { RunMeta } from "@/lib/types";

function scoreBadgeColor(score: number): string {
  if (score >= 4) return "text-accent-green";
  if (score >= 3) return "text-accent-yellow";
  return "text-accent-red";
}

interface Props {
  promptId: string;
}

export default function RunHistory({ promptId }: Props) {
  const [runs, setRuns] = useState<RunMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRuns(promptId)
      .then(setRuns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [promptId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-text-tertiary">
        No runs yet. Run some scenarios to see history.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {runs.map((run) => (
        <div
          key={run.run_id}
          className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-0 px-4 py-3 transition-colors hover:bg-surface-1"
        >
          {/* Status */}
          {run.status === "running" ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0 text-accent-green" />
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-text-primary">
                v{run.prompt_version}
              </span>
              <span className="text-text-tertiary">&middot;</span>
              <span className="text-text-secondary">{run.model}</span>
              <span className="text-text-tertiary">&middot;</span>
              <span className="text-text-tertiary">
                {run.scenario_ids.length} scenario
                {run.scenario_ids.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <Clock className="h-3 w-3" />
              {new Date(run.created).toLocaleString()}
              {run.avg_score !== undefined && (
                <>
                  <span>&middot;</span>
                  <span className={scoreBadgeColor(run.avg_score)}>
                    avg {run.avg_score.toFixed(1)}
                  </span>
                </>
              )}
              {run.reviewed && (
                <>
                  <span>&middot;</span>
                  <span className="text-accent-green">Reviewed</span>
                </>
              )}
            </div>
          </div>

          {/* Action */}
          <Link
            href={`/review/${run.run_id}`}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-tertiary opacity-0 transition-all hover:text-text-secondary group-hover:opacity-100"
          >
            Review
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ))}
    </div>
  );
}
