"use client";

import {
  GitCommit,
  RefreshCw,
  Archive,
  MoveHorizontal,
  MessageCircle,
} from "lucide-react";
import type { Event, EventType } from "@/app/lib/types";
import { FamilyBadge, TagPill } from "./badges";

// ---------------------------------------------------------------------------
// Event type metadata
// ---------------------------------------------------------------------------

const EVENT_META: Record<
  EventType,
  { label: string; icon: typeof GitCommit; color: string }
> = {
  created: { label: "Created", icon: GitCommit, color: "text-emerald-500" },
  iterated: { label: "Iterated", icon: RefreshCw, color: "text-blue-500" },
  archived: { label: "Archived", icon: Archive, color: "text-zinc-400" },
  moved: { label: "Moved", icon: MoveHorizontal, color: "text-amber-500" },
  feedback: { label: "Feedback", icon: MessageCircle, color: "text-purple-500" },
};

// ---------------------------------------------------------------------------
// EventRow — timeline item
// ---------------------------------------------------------------------------

export function EventRow({ event }: { event: Event }) {
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;

  return (
    <div className="relative flex gap-3 pb-4 pl-6">
      {/* Dot + line */}
      <div className="absolute left-0 top-0 flex h-full w-4 flex-col items-center">
        <div
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full border-2 border-current ${meta.color}`}
        />
        <div className="w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${meta.color}`}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          <span className="text-[10px] text-text-tertiary">
            {new Date(event.ts).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          {event.family && <FamilyBadge family={event.family} />}
        </div>
        <p className="text-[12px] leading-5 text-text-secondary">{event.body}</p>
        {event.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {event.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
