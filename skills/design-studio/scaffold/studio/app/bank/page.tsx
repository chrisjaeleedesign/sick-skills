"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Masonry } from "./masonry";
import { BankItem } from "./bank-item";
import type { BankItemData } from "./bank-item";
import { FilterBar } from "./filter-bar";
import { EntryDetail } from "@/app/components/entry-detail";
import { useBankItems } from "./use-bank-items";

const PANEL_WIDTH = 520;

export default function BankPage() {
  const searchParams = useSearchParams();
  const project = searchParams.get("project");

  const { items, setItems, loading, fetchItems } = useBankItems();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const filterParams = useRef<Record<string, string>>({});
  const hasSynced = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchWithProject = useCallback((params: Record<string, string> = {}) => {
    const merged: Record<string, string> = { limit: "500", ...params };
    return fetchItems(merged);
  }, [fetchItems]);

  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;
    fetchWithProject(filterParams.current);
  }, [fetchWithProject]);

  const handleFilterChange = useCallback(
    (params: Record<string, string>) => {
      filterParams.current = params;
      fetchWithProject(params);
    },
    [fetchWithProject],
  );

  const handleRefresh = useCallback(() => {
    fetchWithProject(filterParams.current);
  }, [fetchWithProject]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete-entry", id }),
        });
        setSelectedId(null);
        handleRefresh();
      } catch (err) {
        console.error("Failed to delete entry:", err);
      }
    },
    [handleRefresh],
  );

  const handleHide = useCallback((id: string) => {
    fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-entry", entry: { id, hidden: true } }),
    })
      .then(() => setItems((prev) => prev.filter((item) => item.id !== id)))
      .catch(console.error);
  }, []);

  const panelOpen = selectedId !== null;

  return (
    <div className="flex h-full">
      <div
        className={`flex-1 overflow-y-auto ${mounted ? "transition-[padding] duration-200" : ""}`}
        style={{ padding: panelOpen ? "24px 16px" : "24px 8%" }}
      >
        <FilterBar onFilterChange={handleFilterChange} />

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-tertiary">
            <p className="text-sm">No items found</p>
            <p className="mt-1 text-xs">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="mt-4">
            <Masonry
              items={items}
              renderItem={(item) => (
                <BankItem
                  item={item}
                  onClick={() => setSelectedId(item.id)}
                  onHide={() => handleHide(item.id)}
                />
              )}
            />
          </div>
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
    </div>
  );
}
