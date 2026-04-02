"use client";

import { Star, Plus, Link2 } from "lucide-react";
import type { ThoughtColor } from "@/app/lib/types";
import { COLOR_PALETTE } from "@/app/lib/types";
import { KindBadge } from "@/app/components/badges";
import type { ThoughtKind } from "@/app/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BankItemData {
  id: string;
  kind: string;
  source_type?: string;
  family?: string;
  tags: string[];
  color?: string;
  pinned: boolean;
  created_at: string;
  latest_revision_body?: string;
  attachment?: { path: string; type: string } | null;
  boards?: { id: string; name: string; color: string | null }[];
}

interface BankItemProps {
  item: BankItemData;
  tileWidth: number;
  tileHeight: number;
  onClick?: () => void;
  onAddToBoard?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isImageAttachment(type?: string): boolean {
  return type === "image" || type === "screenshot";
}

function BoardDots({ boards }: { boards?: BankItemData["boards"] }) {
  if (!boards || boards.length === 0) return null;
  return (
    <div className="absolute top-2 left-2 z-10 flex gap-1">
      {boards.slice(0, 5).map((b) => {
        const dotColor = b.color && COLOR_PALETTE[b.color as ThoughtColor]
          ? COLOR_PALETTE[b.color as ThoughtColor].dot
          : "bg-text-tertiary";
        return (
          <span
            key={b.id}
            className={`h-2 w-2 rounded-full ${dotColor}`}
            title={b.name}
          />
        );
      })}
    </div>
  );
}

function HoverOverlay({
  item,
  onAddToBoard,
}: {
  item: BankItemData;
  onAddToBoard?: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between rounded-xl bg-black/60 p-3 opacity-0 transition-opacity group-hover:opacity-100">
      {/* Top: badges */}
      <div className="flex items-center gap-2">
        <KindBadge kind={item.kind as ThoughtKind} />
        {item.pinned && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        <div className="flex-1" />
        {onAddToBoard && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToBoard(); }}
            className="rounded-md bg-white/10 p-1 text-white hover:bg-white/20 transition"
            title="Add to board"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Bottom: text + tags */}
      <div className="space-y-1">
        {item.latest_revision_body && (
          <p className="line-clamp-3 text-[12px] leading-5 text-white/90">
            {item.latest_revision_body}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/70">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BankItem
// ---------------------------------------------------------------------------

export function BankItem({ item, tileWidth, tileHeight, onClick, onAddToBoard }: BankItemProps) {
  const isLarge = tileWidth >= 2 || tileHeight >= 2;
  const isImage = item.attachment && isImageAttachment(item.attachment.type);
  const isLink = item.source_type === "link";

  // Image tile
  if (isImage && item.attachment) {
    return (
      <div
        className="group relative h-full w-full cursor-pointer overflow-hidden rounded-xl"
        onClick={onClick}
      >
        <BoardDots boards={item.boards} />
        <img
          src={`/api/media/${item.attachment.path}`}
          alt={item.latest_revision_body ?? ""}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <HoverOverlay item={item} onAddToBoard={onAddToBoard} />
      </div>
    );
  }

  // Link tile
  if (isLink) {
    const colorStyles = item.color ? COLOR_PALETTE[item.color as ThoughtColor] : null;
    return (
      <div
        className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border transition hover:shadow-md ${
          colorStyles
            ? `${colorStyles.border} bg-surface-1`
            : "border-border bg-surface-1"
        }`}
        onClick={onClick}
      >
        <BoardDots boards={item.boards} />

        {/* Link header */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Link2 className="h-3.5 w-3.5 text-accent-blue shrink-0" />
          <span className="truncate text-[11px] font-medium text-accent-blue">
            Link
          </span>
          {item.pinned && <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />}
          <div className="flex-1" />
          {onAddToBoard && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToBoard(); }}
              className="rounded-md p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-surface-2 group-hover:opacity-100"
              title="Add to board"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 px-3 py-2">
          {item.latest_revision_body && (
            <p className={`text-text-secondary leading-5 ${
              isLarge ? "text-[13px] line-clamp-6" : "text-[12px] line-clamp-3"
            }`}>
              {item.latest_revision_body}
            </p>
          )}
        </div>

        {/* Footer */}
        {isLarge && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            {item.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-tertiary">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Text-only thought
  const colorStyles = item.color ? COLOR_PALETTE[item.color as ThoughtColor] : null;
  return (
    <div
      className={`group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border transition hover:shadow-md ${
        colorStyles
          ? `${colorStyles.border} bg-surface-1`
          : "border-border bg-surface-1"
      }`}
      onClick={onClick}
    >
      <BoardDots boards={item.boards} />

      {/* Colored left border accent */}
      {colorStyles && (
        <div className={`absolute left-0 top-0 h-full w-1 ${colorStyles.dot}`} />
      )}

      {/* Content */}
      <div className={`flex flex-1 flex-col px-3 py-2 ${colorStyles ? "pl-4" : ""}`}>
        {/* Header */}
        <div className="mb-1.5 flex items-center gap-2">
          <KindBadge kind={item.kind as ThoughtKind} />
          {item.pinned && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
          <div className="flex-1" />
          {onAddToBoard && (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToBoard(); }}
              className="rounded-md p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-surface-2 group-hover:opacity-100"
              title="Add to board"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
          <span className="text-[10px] text-text-tertiary">
            {new Date(item.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Body */}
        {item.latest_revision_body && (
          <p className={`flex-1 text-text-secondary leading-5 ${
            isLarge ? "text-[13px] line-clamp-8" : "text-[12px] line-clamp-3"
          }`}>
            {item.latest_revision_body}
          </p>
        )}

        {/* Footer: tags + family */}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1.5">
          {item.color && (
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${COLOR_PALETTE[item.color as ThoughtColor].dot}`} />
          )}
          {item.family && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
              {item.family}
            </span>
          )}
          {item.tags.length > 0 && (isLarge ? item.tags.slice(0, 4) : item.tags.slice(0, 2)).map((tag) => (
            <span key={tag} className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-tertiary">
              {tag}
            </span>
          ))}
          {item.tags.length > (isLarge ? 4 : 2) && (
            <span className="text-[9px] text-text-tertiary">
              +{item.tags.length - (isLarge ? 4 : 2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
