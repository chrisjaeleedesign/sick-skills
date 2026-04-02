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
  CheckSquare,
  Square,
} from "lucide-react";
import type { Family } from "@/app/lib/manifest";
import { COLOR_PALETTE } from "@/app/lib/types";
import { timeAgo } from "@/app/lib/utils";

export function FamilyCard({
  family,
  isCurrent,
  currentVersion,
  showThumbnail,
  isTrashView,
  isSelected,
  onTrash,
  onRestore,
  onSelect,
}: {
  family: Family;
  isCurrent: boolean;
  currentVersion: number | null;
  showThumbnail: boolean;
  isTrashView?: boolean;
  isSelected?: boolean;
  onTrash?: (slug: string) => void;
  onRestore?: (slug: string) => void;
  onSelect?: (slug: string, e: React.MouseEvent) => void;
}) {
  const latest = family.versions[family.versions.length - 1];
  const [thumbExpanded, setThumbExpanded] = useState(true);
  const [thumbError, setThumbError] = useState(false);
  useEffect(() => setThumbError(false), [family.slug]);

  return (
    <div
      className={`group/card relative rounded-lg border p-4 transition-colors ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : isCurrent ? "border-primary/30 bg-card" : "border-border bg-card"
      }`}
    >
      {/* Selection checkbox — top-left, visible on hover or when selected */}
      {onSelect && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(family.slug, e);
          }}
          className={`absolute left-2 top-2 z-10 rounded p-0.5 transition-opacity ${
            isSelected
              ? "opacity-100 text-primary"
              : "opacity-0 text-text-tertiary group-hover/card:opacity-100 hover:text-primary"
          }`}
        >
          {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
      )}

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

      {/* Header — links to latest version */}
      <Link
        href={`/prototypes/${family.slug}/v${latest.number}`}
        className="block hover:opacity-90 transition-opacity"
      >
        <div className="flex items-baseline justify-between pr-6">
          <div className="flex items-center gap-1.5 min-w-0">
            {family.color && (
              <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_PALETTE[family.color].dot}`} />
            )}
            <h2 className="text-sm font-medium text-text-primary truncate">
              {family.name}
            </h2>
          </div>
          {isCurrent && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
              current
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-text-tertiary leading-relaxed">
          {family.description}
        </p>
      </Link>

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
            <Link href={`/prototypes/${family.slug}/v${latest.number}`}>
              <img
                src={`/api/screenshot/${family.slug}/${latest.number}`}
                alt={family.name}
                loading="lazy"
                className="mt-1 w-full rounded border border-border hover:opacity-90 transition-opacity"
                onError={() => setThumbError(true)}
              />
            </Link>
          )}
        </div>
      )}

      {/* Version list — each row links to its specific version */}
      <div className="mt-3 space-y-0.5">
        {family.versions.map((v) => {
          const isCurrentVersion = isCurrent && currentVersion === v.number;
          return (
            <Link
              key={v.number}
              href={`/prototypes/${family.slug}/v${v.number}`}
              className={`flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                isCurrentVersion ? "bg-surface-2" : "hover:bg-surface-1"
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
