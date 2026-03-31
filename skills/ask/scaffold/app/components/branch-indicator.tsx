"use client";

import { useState } from "react";
import { GitBranch } from "lucide-react";

interface BranchIndicatorProps {
  branches: Array<{ filename: string; title?: string | null }>;
  onNavigate: (filename: string) => void;
}

export default function BranchIndicator({
  branches,
  onNavigate,
}: BranchIndicatorProps) {
  const [open, setOpen] = useState(false);

  if (branches.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-text-muted hover:text-accent
                   text-xs transition-colors px-1.5 py-0.5 rounded hover:bg-surface-3"
      >
        <GitBranch size={12} />
        <span>{branches.length}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-1 z-20 bg-surface-2 border border-border
                        rounded-lg shadow-lg py-1 min-w-[200px]"
          >
            {branches.map((b) => (
              <button
                key={b.filename}
                onClick={() => {
                  onNavigate(b.filename);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-1.5 text-xs text-text-secondary
                           hover:bg-surface-3 hover:text-text-primary transition-colors"
              >
                {b.title || b.filename}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
