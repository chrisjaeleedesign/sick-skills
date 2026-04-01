"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Plus, Sparkles, GitCompare } from "lucide-react";
import { fetchPrompts, createPrompt } from "@/lib/api";
import type { PromptMeta } from "@/lib/types";

export default function Sidebar() {
  const pathname = usePathname();
  const [prompts, setPrompts] = useState<PromptMeta[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPrompts()
      .then(setPrompts)
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
      setPrompts((prev) => [p, ...prev]);
      window.location.href = `/prompts/${p.id}`;
    } catch {
      // API not ready
    } finally {
      setCreating(false);
    }
  }

  const activeId = pathname.match(/\/prompts\/([^/]+)/)?.[1];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border-subtle bg-surface-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-text-primary">
          Prompt Tester
        </span>
      </div>

      {/* New prompt */}
      <div className="px-3 pt-3">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-surface-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          New Prompt
        </button>
      </div>

      {/* Prompt list */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-0.5">
          {prompts.map((p) => (
            <Link
              key={p.id}
              href={`/prompts/${p.id}`}
              className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                activeId === p.id
                  ? "bg-surface-1 text-text-primary"
                  : "text-text-secondary hover:bg-surface-1 hover:text-text-primary"
              }`}
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
              <div className="min-w-0">
                <div className="truncate font-medium">{p.title}</div>
                {p.description && (
                  <div className="truncate text-xs text-text-tertiary">
                    {p.description}
                  </div>
                )}
                <div className="mt-0.5 text-xs text-text-tertiary">
                  v{p.latest_version} &middot;{" "}
                  {new Date(p.updated).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
          {prompts.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-text-tertiary">
              No prompts yet.
              <br />
              Create one to get started.
            </div>
          )}
        </div>
      </nav>

      {/* Footer nav */}
      <div className="border-t border-border-subtle px-3 py-2">
        <Link
          href="/compare"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/compare"
              ? "bg-surface-1 text-text-primary"
              : "text-text-secondary hover:bg-surface-1 hover:text-text-primary"
          }`}
        >
          <GitCompare className="h-4 w-4" />
          Compare Versions
        </Link>
      </div>
    </aside>
  );
}
