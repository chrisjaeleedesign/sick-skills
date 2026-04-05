"use client";

import { useEffect, useCallback, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Masonry } from "@/app/bank/masonry";
import { BankItem } from "@/app/bank/bank-item";
import { FilterBar } from "@/app/bank/filter-bar";
import { useBankItems } from "@/app/bank/use-bank-items";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BankDrawerProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  onItemAdded: () => void;
  existingItemIds: Set<string>;
}

// ---------------------------------------------------------------------------
// BankDrawer — slide-in right panel for adding items to a board
// ---------------------------------------------------------------------------

export function BankDrawer({ open, onClose, boardId, onItemAdded, existingItemIds }: BankDrawerProps) {
  const { items, loading, fetchItems } = useBankItems();
  const filterParams = useRef<Record<string, string>>({});

  // Fetch when drawer opens
  useEffect(() => {
    if (open) fetchItems({ limit: "100", ...filterParams.current });
  }, [open, fetchItems]);

  const handleFilterChange = useCallback(
    (params: Record<string, string>) => {
      filterParams.current = params;
      fetchItems({ limit: "100", ...params });
    },
    [fetchItems],
  );

  const handleAddItem = useCallback(
    async (entryId: string) => {
      if (existingItemIds.has(entryId)) return;
      try {
        await fetch("/api/entries/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-item",
            board_id: boardId,
            entry_id: entryId,
          }),
        });
        onItemAdded();
      } catch (err) {
        console.error("Failed to add item to board:", err);
      }
    },
    [boardId, existingItemIds, onItemAdded],
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
          />
          <motion.div
            key="drawer-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed inset-y-0 right-0 z-50 flex w-[380px] flex-col border-l border-border bg-surface-0 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-text-primary">Bank</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-2 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-border px-4 py-3">
              <FilterBar onFilterChange={handleFilterChange} compact />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
                </div>
              ) : items.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-xs text-text-tertiary">
                  No items found
                </div>
              ) : (
                <Masonry
                  items={items}
                  columnWidth={180}
                  renderItem={(item) => {
                    const isExisting = existingItemIds.has(item.id);
                    return (
                      <div className={isExisting ? "opacity-30 pointer-events-none" : ""}>
                        <BankItem
                          item={item}
                          onClick={() => handleAddItem(item.id)}
                        />
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
