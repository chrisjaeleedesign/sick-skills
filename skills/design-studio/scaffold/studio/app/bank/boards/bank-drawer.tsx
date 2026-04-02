"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { BentoGrid } from "@/app/bank/bento-grid";
import type { BentoItem } from "@/app/bank/bento-grid";
import { BankItem } from "@/app/bank/bank-item";
import type { BankItemData } from "@/app/bank/bank-item";
import { FilterBar } from "@/app/bank/filter-bar";

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

type DrawerItem = BankItemData & BentoItem;

// ---------------------------------------------------------------------------
// BankDrawer — slide-in right panel for adding items to a board
// ---------------------------------------------------------------------------

export function BankDrawer({ open, onClose, boardId, onItemAdded, existingItemIds }: BankDrawerProps) {
  const [items, setItems] = useState<DrawerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const filterParams = useRef<Record<string, string>>({});

  const fetchItems = useCallback(async (params: Record<string, string> = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ view: "bank", limit: "100", ...params });
      const res = await fetch(`/api/thoughts?${qs}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data: DrawerItem[] = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch drawer items:", err);
    }
    setLoading(false);
  }, []);

  // Fetch when drawer opens
  useEffect(() => {
    if (open) fetchItems(filterParams.current);
  }, [open, fetchItems]);

  const handleFilterChange = useCallback(
    (params: Record<string, string>) => {
      filterParams.current = params;
      fetchItems(params);
    },
    [fetchItems],
  );

  const handleAddItem = useCallback(
    async (thoughtId: string) => {
      if (existingItemIds.has(thoughtId)) return;
      try {
        await fetch("/api/thoughts/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-item",
            board_id: boardId,
            thought_id: thoughtId,
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
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-[380px] flex-col border-l border-border bg-surface-0 shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Bank</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-surface-2 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-border px-4 py-3">
          <FilterBar onFilterChange={handleFilterChange} compact />
        </div>

        {/* Items */}
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
            <BentoGrid
              items={items}
              columns={3}
              rowHeight={80}
              isDraggable={false}
              isResizable={false}
              renderItem={(item) => {
                const drawerItem = item as DrawerItem;
                const isExisting = existingItemIds.has(drawerItem.id);
                return (
                  <div className={isExisting ? "opacity-30 pointer-events-none" : ""}>
                    <BankItem
                      item={drawerItem}
                      tileWidth={drawerItem.layout_w ?? 1}
                      tileHeight={drawerItem.layout_h ?? 1}
                      onClick={() => handleAddItem(drawerItem.id)}
                    />
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
