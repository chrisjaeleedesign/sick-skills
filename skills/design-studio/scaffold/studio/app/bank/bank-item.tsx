"use client";

import { Star, Plus, Link2, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import type { Color, EntryKind } from "@/app/lib/types";
import { COLOR_PALETTE } from "@/app/lib/types";
import { KindBadge } from "@/app/components/badges";

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
  onClick?: () => void;
  onAddToBoard?: () => void;
  onHide?: () => void;
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
        const dotColor = b.color && COLOR_PALETTE[b.color as Color]
          ? COLOR_PALETTE[b.color as Color].dot
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
  onHide,
}: {
  item: BankItemData;
  onAddToBoard?: () => void;
  onHide?: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between rounded-xl bg-black/60 p-3 opacity-0 transition-opacity group-hover:opacity-100">
      {/* Top: badges */}
      <div className="flex items-center gap-2">
        <KindBadge kind={item.kind as EntryKind} />
        {item.pinned && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        <div className="flex-1" />
        {onHide && (
          <button
            onClick={(e) => { e.stopPropagation(); onHide(); }}
            className="rounded-md bg-white/10 p-1 text-white hover:bg-white/20 transition"
            title="Hide"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        )}
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
// BankItem — unified render path
// ---------------------------------------------------------------------------

export function BankItem({ item, onClick, onAddToBoard, onHide }: BankItemProps) {
  const isImage = item.attachment && isImageAttachment(item.attachment.type);
  const colorStyles = item.color ? COLOR_PALETTE[item.color as Color] : null;

  return (
    <motion.div
      className="group relative w-full cursor-pointer overflow-hidden rounded-xl bg-surface-1"
      onClick={onClick}
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      transition={{ duration: 0.15 }}
    >
      <BoardDots boards={item.boards} />

      {isImage && item.attachment ? (
        <img
          src={`/api/media/${item.attachment.path}`}
          alt={item.latest_revision_body ?? ""}
          className="w-full"
          loading="lazy"
        />
      ) : (
        <div className={`p-3 ${colorStyles ? `border-l-2 ${colorStyles.border}` : ""}`}>
          <div className="mb-1 flex items-center gap-1.5">
            {item.source_type === "link" && (
              <Link2 className="h-3.5 w-3.5 shrink-0 text-accent-blue" />
            )}
            <KindBadge kind={item.kind as EntryKind} />
            {item.pinned && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
          </div>
          {item.latest_revision_body && (
            <p className="text-[11px] leading-4 text-text-secondary line-clamp-4">
              {item.latest_revision_body}
            </p>
          )}
          {item.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-tertiary">
                  {tag}
                </span>
              ))}
              {item.tags.length > 4 && (
                <span className="text-[9px] text-text-tertiary">+{item.tags.length - 4}</span>
              )}
            </div>
          )}
        </div>
      )}

      <HoverOverlay item={item} onAddToBoard={onAddToBoard} onHide={onHide} />
    </motion.div>
  );
}
