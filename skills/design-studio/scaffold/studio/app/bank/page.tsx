"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BentoGrid } from "./bento-grid";
import type { BentoItem } from "./bento-grid";
import { BankItem } from "./bank-item";
import type { BankItemData } from "./bank-item";
import { FilterBar } from "./filter-bar";
import { ThoughtDetail } from "@/app/components/thought-detail";

// ---------------------------------------------------------------------------
// All Items page — main bank view
// ---------------------------------------------------------------------------

type BankThought = BankItemData & BentoItem;

export default function BankPage() {
  const searchParams = useSearchParams();
  const project = searchParams.get("project");

  const [items, setItems] = useState<BankThought[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filterParams = useRef<Record<string, string>>({});

  const fetchItems = useCallback(async (params: Record<string, string> = {}) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ view: "bank", limit: "200", ...params });
      if (project) qs.set("project", project);
      const res = await fetch(`/api/thoughts?${qs}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data: BankThought[] = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch bank items:", err);
    }
    setLoading(false);
  }, [project]);

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleFilterChange = useCallback(
    (params: Record<string, string>) => {
      filterParams.current = params;
      fetchItems(params);
    },
    [fetchItems],
  );

  const handleLayoutChange = useCallback(
    async (layouts: { id: string; x: number; y: number; w: number; h: number }[]) => {
      try {
        await fetch("/api/thoughts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bulk-update-layout",
            items: layouts.map((l) => ({
              id: l.id,
              layout_x: l.x,
              layout_y: l.y,
              layout_w: l.w,
              layout_h: l.h,
            })),
          }),
        });
      } catch (err) {
        console.error("Failed to save layout:", err);
      }
    },
    [],
  );

  const handleRefresh = useCallback(() => {
    fetchItems(filterParams.current);
  }, [fetchItems]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/thoughts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete-thought", id }),
        });
        setSelectedId(null);
        handleRefresh();
      } catch (err) {
        console.error("Failed to delete thought:", err);
      }
    },
    [handleRefresh],
  );

  return (
    <div className="flex h-full">
      {/* Main content area */}
      <div className={`flex-1 overflow-y-auto p-6 ${selectedId ? "pr-0" : ""}`}>
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
            <BentoGrid
              items={items}
              columns={6}
              rowHeight={90}
              onLayoutChange={handleLayoutChange}
              renderItem={(item) => {
                const bankItem = item as BankThought;
                return (
                  <BankItem
                    item={bankItem}
                    tileWidth={bankItem.layout_w ?? 1}
                    tileHeight={bankItem.layout_h ?? 1}
                    onClick={() => setSelectedId(bankItem.id)}
                  />
                );
              }}
            />
          </div>
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
    </div>
  );
}
