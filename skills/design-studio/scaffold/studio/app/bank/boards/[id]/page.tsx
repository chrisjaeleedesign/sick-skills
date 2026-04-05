"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Board } from "@/app/lib/types";
import { Masonry } from "@/app/bank/masonry";
import { BankItem } from "@/app/bank/bank-item";
import type { BankItemData } from "@/app/bank/bank-item";
import { EntryDetail } from "@/app/components/entry-detail";
import { BankDrawer } from "../bank-drawer";

const PANEL_WIDTH = 520;

export default function BoardDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const project = searchParams.get("project");
  const projectSuffix = project ? `?project=${encodeURIComponent(project)}` : "";

  const [board, setBoard] = useState<Board | null>(null);
  const [entries, setEntries] = useState<BankItemData[]>([]);
  const [boardItemIds, setBoardItemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries/boards?id=${id}&enriched=true`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setBoard(data.board);
      const enrichedEntries: BankItemData[] = data.entries ?? [];
      setBoardItemIds(new Set(enrichedEntries.map((e) => e.id)));
      setEntries(enrichedEntries);
    } catch (err) {
      console.error("Failed to fetch board:", err);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const handleRefresh = useCallback(() => fetchBoard(), [fetchBoard]);

  const handleDelete = useCallback(
    async (entryId: string) => {
      try {
        await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete-entry", id: entryId }),
        });
        setSelectedId(null);
        handleRefresh();
      } catch (err) {
        console.error("Failed to delete entry:", err);
      }
    },
    [handleRefresh],
  );

  const panelOpen = selectedId !== null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div
        className="flex-1 overflow-y-auto transition-[padding] duration-200"
        style={{ padding: panelOpen ? "24px 16px" : "24px 8%" }}
      >
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

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
            <p className="text-sm">This board is empty</p>
            <p className="mt-1 text-xs">Click "Add from bank" to add items</p>
          </div>
        ) : (
          <Masonry
            items={entries}
            renderItem={(item) => (
              <BankItem
                item={item}
                onClick={() => setSelectedId(item.id)}
              />
            )}
          />
        )}
      </div>

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            key="detail-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: PANEL_WIDTH, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="shrink-0 overflow-hidden"
          >
            <div style={{ width: PANEL_WIDTH }}>
              <EntryDetail
                entryId={selectedId}
                onClose={() => setSelectedId(null)}
                onUpdate={handleRefresh}
                onDelete={handleDelete}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BankDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        boardId={id}
        onItemAdded={handleRefresh}
        existingItemIds={boardItemIds}
      />
    </div>
  );
}
