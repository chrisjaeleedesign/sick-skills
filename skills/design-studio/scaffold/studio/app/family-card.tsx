"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Star,
  GitBranch,
  Trash2,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Family } from "@/app/lib/manifest";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function FamilyCard({
  family,
  isCurrent,
  currentVersion,
  showThumbnail,
  isTrashView,
  onTrash,
  onRestore,
}: {
  family: Family;
  isCurrent: boolean;
  currentVersion: number | null;
  showThumbnail: boolean;
  isTrashView?: boolean;
  onTrash?: (slug: string) => void;
  onRestore?: (slug: string) => void;
}) {
  const latest = family.versions[family.versions.length - 1];
  const [thumbExpanded, setThumbExpanded] = useState(true);
  const [thumbError, setThumbError] = useState(false);
  useEffect(() => setThumbError(false), [family.slug]);

  return (
    <div
      className={`group/card relative rounded-lg border p-4 transition-colors ${
        isCurrent ? "border-primary/30 bg-card" : "border-border bg-card"
      }`}
    >
      {/* Action button — top-right, visible on hover */}
      {!isTrashView && onTrash && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onTrash(family.slug);
          }}
          className="absolute right-2 top-2 rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:text-accent-red group-hover/card:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
      {isTrashView && onRestore && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onRestore(family.slug);
          }}
          className="absolute right-2 top-2 rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:text-primary group-hover/card:opacity-100"
        >
          <ArchiveRestore className="h-3.5 w-3.5" />
        </button>
      )}

      <Link
        href={`/prototypes/${family.slug}/v${latest.number}`}
        className="block hover:opacity-90 transition-opacity"
      >
        {/* Header */}
        <div className="flex items-baseline justify-between pr-6">
          <h2 className="text-sm font-medium text-text-primary truncate">
            {family.name}
          </h2>
          {isCurrent && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
              current
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-text-tertiary truncate">
          {family.description}
        </p>

        {/* Thumbnail */}
        {showThumbnail && !thumbError && (
          <div className="mt-2">
            <div className="flex justify-end">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setThumbExpanded(!thumbExpanded);
                }}
                className="text-text-tertiary hover:text-text-secondary"
              >
                {thumbExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            </div>
            {thumbExpanded && (
              <img
                src={`/api/screenshot/${family.slug}/${latest.number}`}
                alt={family.name}
                className="mt-1 w-full rounded border border-border"
                onError={() => setThumbError(true)}
              />
            )}
          </div>
        )}

        {/* Version list */}
        <div className="mt-3 space-y-0.5">
          {family.versions.map((v) => {
            const isCurrentVersion = isCurrent && currentVersion === v.number;
            return (
              <div
                key={v.number}
                className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                  isCurrentVersion ? "bg-surface-2" : ""
                }`}
              >
                <span className="w-6 shrink-0 font-mono text-text-tertiary">
                  v{v.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-text-secondary">
                  {v.direction}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {v.starred && (
                    <Star className="h-3 w-3 fill-accent-amber text-accent-amber" />
                  )}
                  {v.parentVersion && (
                    <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary">
                      <GitBranch className="h-3 w-3" />v{v.parentVersion}
                    </span>
                  )}
                  <span className="text-[10px] text-text-tertiary">
                    {timeAgo(v.createdAt)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </Link>
    </div>
  );
}
