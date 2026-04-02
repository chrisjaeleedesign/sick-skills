"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import type { Board, BoardItem } from "@/app/lib/types";
import { BentoGrid } from "@/app/bank/bento-grid";
import type { BentoItem } from "@/app/bank/bento-grid";
import { BankItem } from "@/app/bank/bank-item";
import type { BankItemData } from "@/app/bank/bank-item";
import { ThoughtDetail } from "@/app/thoughts/thought-detail";
import { BankDrawer } from "../bank-drawer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BoardThought = BankItemData & BentoItem;

// ---------------------------------------------------------------------------
// Board Detail page
// ---------------------------------------------------------------------------

export default function BoardDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const project = searchParams.get("project");
  const projectSuffix = project ? `?project=${encodeURIComponent(project)}` : "";

  const [board, setBoard] = useState<Board | null>(null);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [thoughts, setThoughts] = useState<BoardThought[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/thoughts/boards?id=${id}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setBoard(data.board);
      const items: BoardItem[] = data.items ?? [];
      setBoardItems(items);

      // Fetch thought data for each board item
      if (items.length === 0) {
        setThoughts([]);
        setLoading(false);
        return;
      }

      // Batch fetch thoughts with bank view
      const qs = new URLSearchParams({ view: "bank", limit: "200" });
      if (project) qs.set("project", project);
      const thoughtsRes = await fetch(`/api/thoughts?${qs}`);
      if (!thoughtsRes.ok) throw new Error(`${thoughtsRes.status}`);
      const allThoughts: BankItemData[] = await thoughtsRes.json();

      // Filter to only board items, apply board layout positions
      const itemMap = new Map(items.map((bi) => [bi.thought_id, bi]));
      const boardThoughts: BoardThought[] = allThoughts
        .filter((t) => itemMap.has(t.id))
        .map((t) => {
          const bi = itemMap.get(t.id)!;
          return {
            ...t,
            layout_x: bi.x,
            layout_y: bi.y,
            layout_w: bi.w,
            layout_h: bi.h,
          };
        });

      setThoughts(boardThoughts);
    } catch (err) {
      console.error("Failed to fetch board:", err);
    }
    setLoading(false);
  }, [id, project]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleLayoutChange = useCallback(
    async (layouts: { id: string; x: number; y: number; w: number; h: number }[]) => {
      try {
        await fetch("/api/thoughts/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bulk-update-board-layout",
            board_id: id,
            items: layouts.map((l) => ({
              thought_id: l.id,
              x: l.x,
              y: l.y,
              w: l.w,
              h: l.h,
            })),
          }),
        });
      } catch (err) {
        console.error("Failed to save board layout:", err);
      }
    },
    [id],
  );

  const handleRefresh = useCallback(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleDelete = useCallback(
    async (thoughtId: string) => {
      try {
        await fetch("/api/thoughts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete-thought", id: thoughtId }),
        });
        setSelectedId(null);
        handleRefresh();
      } catch (err) {
        console.error("Failed to delete thought:", err);
      }
    },
    [handleRefresh],
  );

  const existingItemIds = new Set(boardItems.map((bi) => bi.thought_id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link
            href={`/bank/boards${projectSuffix}`}
            className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Boards
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-lg font-semibold text-text-primary">{board?.name}</h1>
          <div className="flex-1" />
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add from bank
          </button>
        </div>

        {/* Board grid */}
        {thoughts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
            <p className="text-sm">This board is empty</p>
            <p className="mt-1 text-xs">Click "Add from bank" to add items</p>
          </div>
        ) : (
          <BentoGrid
            items={thoughts}
            columns={board?.columns ?? 6}
            rowHeight={90}
            onLayoutChange={handleLayoutChange}
            renderItem={(item) => {
              const thought = item as BoardThought;
              return (
                <BankItem
                  item={thought}
                  tileWidth={thought.layout_w ?? 1}
                  tileHeight={thought.layout_h ?? 1}
                  onClick={() => setSelectedId(thought.id)}
                />
              );
            }}
          />
        )}
      </div>

      {/* Detail panel */}
      {selectedId && (
        <ThoughtDetail
          thoughtId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={handleRefresh}
          onDelete={handleDelete}
        />
      )}

      {/* Bank drawer */}
      <BankDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        boardId={id}
        onItemAdded={handleRefresh}
        existingItemIds={existingItemIds}
      />
    </div>
  );
}
