"use client";

import { useState } from "react";
import {
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Thought, Revision } from "@/app/lib/types";
import { COLOR_PALETTE } from "@/app/lib/types";
import { TagPill, FamilyBadge, KindBadge, ImportanceBadge } from "@/app/components/badges";

// ---------------------------------------------------------------------------
// ThoughtCard
// ---------------------------------------------------------------------------

export function ThoughtCard({
  thought,
  latestRevision,
  revisions,
  onClick,
  onTogglePin,
}: {
  thought: Thought;
  latestRevision?: Revision;
  revisions?: Revision[];
  onClick?: () => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const colorStyles = thought.color ? COLOR_PALETTE[thought.color] : null;
  const revisionCount = revisions?.length ?? 0;

  return (
    <div
      className={`group rounded-xl border px-4 py-3 transition cursor-pointer ${
        colorStyles
          ? `${colorStyles.bg} ${colorStyles.border} hover:shadow-md`
          : "border-border bg-card hover:border-surface-3 hover:shadow-md"
      }`}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <KindBadge kind={thought.kind} />
        {thought.importance && <ImportanceBadge importance={thought.importance} />}
        {thought.pinned && (
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        )}
        <div className="flex-1" />
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(thought.id, !thought.pinned);
            }}
            className="rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:text-amber-500 group-hover:opacity-100"
          >
            <Star className={`h-3.5 w-3.5 ${thought.pinned ? "fill-amber-400 text-amber-400" : ""}`} />
          </button>
        )}
        <span className="text-[10px] text-text-tertiary">
          {new Date(thought.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Body — latest revision */}
      {latestRevision?.body && (
        <p className="text-[13px] leading-6 text-text-secondary">
          {latestRevision.body}
        </p>
      )}

      {/* Color dot + family */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {thought.color && (
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${COLOR_PALETTE[thought.color].dot}`} />
        )}
        {thought.family && (
          <FamilyBadge family={thought.family} />
        )}
        {thought.tags.length > 0 && thought.tags.slice(0, 3).map((tag) => (
          <TagPill key={tag} tag={tag} />
        ))}
        {thought.tags.length > 3 && (
          <span className="text-[10px] text-text-tertiary">+{thought.tags.length - 3}</span>
        )}
      </div>

      {/* Expandable revision history */}
      {revisionCount > 1 && (
        <div className="mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-secondary"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {revisionCount} revisions
          </button>
          {expanded && revisions && (
            <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
              {revisions.slice(1).map((rev) => (
                <div key={rev.id} className="text-[11px] text-text-tertiary">
                  <span className="text-[10px] text-text-tertiary">
                    {new Date(rev.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  {rev.body && <p className="mt-0.5 leading-5">{rev.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
