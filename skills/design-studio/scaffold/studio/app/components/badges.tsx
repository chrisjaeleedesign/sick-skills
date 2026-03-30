"use client";

import {
  Eye,
  HelpCircle,
  Landmark,
  BookMarked,
} from "lucide-react";
import type { ThoughtKind, Importance } from "@/app/lib/types";

// ---------------------------------------------------------------------------
// Kind / importance metadata
// ---------------------------------------------------------------------------

export const KIND_META: Record<ThoughtKind, { label: string; icon: typeof Eye; color: string; bg: string }> = {
  observation: { label: "Observation", icon: Eye,         color: "text-accent-blue",    bg: "bg-accent-blue/10" },
  question:    { label: "Question",    icon: HelpCircle,  color: "text-purple-500",    bg: "bg-purple-500/10" },
  principle:   { label: "Principle",   icon: Landmark,    color: "text-accent-amber",   bg: "bg-accent-amber/10" },
  reference:   { label: "Reference",   icon: BookMarked,  color: "text-accent-green",  bg: "bg-accent-green/10" },
};

export const IMPORTANCE_META: Record<Importance, { label: string; opacity: string }> = {
  invalidated:  { label: "Invalidated",  opacity: "opacity-30" },
  signal:       { label: "Signal",       opacity: "opacity-50" },
  assumption:   { label: "Assumption",   opacity: "opacity-70" },
  guiding:      { label: "Guiding",      opacity: "opacity-85" },
  foundational: { label: "Foundational", opacity: "opacity-100" },
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export function KindBadge({ kind }: { kind: ThoughtKind }) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export function ImportanceBadge({ importance }: { importance: Importance }) {
  const meta = IMPORTANCE_META[importance];
  return (
    <span className={`rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-secondary ${meta.opacity}`}>
      {meta.label}
    </span>
  );
}

export function TagPill({ tag }: { tag: string }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-tertiary">
      {tag}
    </span>
  );
}

export function FamilyBadge({ family }: { family: string }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
      {family}
    </span>
  );
}

export function Separator() {
  return <div className="h-4 w-px bg-border" />;
}

