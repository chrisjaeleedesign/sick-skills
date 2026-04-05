"use client";

import { COLOR_PALETTE } from "@/app/lib/types";
import type { Color } from "@/app/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BoardCardProps {
  board: {
    id: string;
    name: string;
    description: string;
    color?: Color;
    columns: number;
    created_at: string;
    updated_at: string;
  };
  itemCount: number;
  previewPaths: string[];
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { timeAgo } from "@/app/lib/utils";

// ---------------------------------------------------------------------------
// BoardCard
// ---------------------------------------------------------------------------

export function BoardCard({ board, itemCount, previewPaths, onClick }: BoardCardProps) {
  const colorStyles = board.color ? COLOR_PALETTE[board.color] : null;

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4 text-left transition hover:border-primary/30 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {colorStyles && (
          <span className={`h-3 w-3 rounded-full ${colorStyles.dot}`} />
        )}
        <h3 className="flex-1 truncate text-sm font-medium text-text-primary">
          {board.name}
        </h3>
      </div>

      {/* Description */}
      {board.description && (
        <p className="line-clamp-2 text-xs text-text-tertiary">{board.description}</p>
      )}

      {/* Mini preview — 2x2 grid */}
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        {[0, 1, 2, 3].map((i) => {
          const path = previewPaths[i];
          return (
            <div
              key={i}
              className="aspect-square rounded-md overflow-hidden bg-surface-2"
            >
              {path ? (
                <img
                  src={`/api/media/${path}`}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className={`h-full w-full ${
                    i < itemCount
                      ? colorStyles
                        ? `${colorStyles.bg} opacity-40`
                        : "bg-surface-3/30"
                      : "bg-surface-2"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-text-tertiary">
        <span>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
        <span>updated {timeAgo(board.updated_at)}</span>
      </div>
    </button>
  );
}
