"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Play, Plus, Sparkles, ArrowRight } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { fetchPrompts, fetchRuns, createPrompt } from "@/lib/api";
import type { PromptMeta, RunMeta } from "@/lib/types";

export default function Dashboard() {
  const [prompts, setPrompts] = useState<PromptMeta[]>([]);
  const [runs, setRuns] = useState<RunMeta[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPrompts()
      .then(setPrompts)
      .catch(() => {});
    fetchRuns()
      .then(setRuns)
      .catch(() => {});
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const p = await createPrompt({
        title: "Untitled Prompt",
        description: "",
        content: "You are a helpful assistant.",
      });
      window.location.href = `/prompts/${p.id}`;
    } catch {
      setCreating(false);
    }
  }

  const completedRuns = runs.filter((r) => r.status === "completed");
  const reviewedRuns = runs.filter((r) => r.reviewed);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-10">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Write prompts, run scenarios, evaluate results.
              </p>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              New Prompt
            </button>
          </div>

          {/* Stats */}
          <div className="mb-8 grid grid-cols-4 gap-4">
            {[
              {
                label: "Prompts",
                value: prompts.length,
                icon: FileText,
                color: "text-primary",
              },
              {
                label: "Total Runs",
                value: runs.length,
                icon: Play,
                color: "text-accent-green",
              },
              {
                label: "Completed",
                value: completedRuns.length,
                icon: Sparkles,
                color: "text-accent-yellow",
              },
              {
                label: "Reviewed",
                value: reviewedRuns.length,
                icon: Sparkles,
                color: "text-accent-green",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border-subtle bg-surface-0 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">
                    {stat.label}
                  </span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="mt-1 text-2xl font-bold text-text-primary">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Prompt list */}
          <div>
            <h2 className="mb-3 text-sm font-medium text-text-primary">
              All Prompts
            </h2>
            <div className="space-y-2">
              {prompts.map((p) => (
                <Link
                  key={p.id}
                  href={`/prompts/${p.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-0 px-5 py-4 transition-colors hover:bg-surface-1"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary">
                      {p.title}
                    </div>
                    {p.description && (
                      <div className="mt-0.5 text-xs text-text-tertiary truncate">
                        {p.description}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-xs text-text-tertiary">
                      <span>
                        {p.versions.length} version
                        {p.versions.length !== 1 ? "s" : ""}
                      </span>
                      <span>&middot;</span>
                      <span>
                        Updated {new Date(p.updated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
              {prompts.length === 0 && (
                <div className="rounded-xl border border-dashed border-surface-2 px-8 py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-text-tertiary" />
                  <p className="mt-3 text-sm text-text-secondary">
                    No prompts yet
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    Create your first prompt to get started.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
