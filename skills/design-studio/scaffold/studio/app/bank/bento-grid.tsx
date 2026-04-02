"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import ReactGridLayout, { verticalCompactor } from "react-grid-layout";
import type { LayoutItem, Layout } from "react-grid-layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BentoItem {
  id: string;
  layout_x?: number | null;
  layout_y?: number | null;
  layout_w?: number;
  layout_h?: number;
}

interface BentoGridProps {
  items: BentoItem[];
  columns?: number;
  rowHeight?: number;
  onLayoutChange?: (layouts: { id: string; x: number; y: number; w: number; h: number }[]) => void;
  renderItem: (item: BentoItem) => React.ReactNode;
  isDraggable?: boolean;
  isResizable?: boolean;
  className?: string;
  width?: number;
}

// ---------------------------------------------------------------------------
// BentoGrid
// ---------------------------------------------------------------------------

export function BentoGrid({
  items,
  columns = 6,
  rowHeight = 90,
  onLayoutChange,
  renderItem,
  isDraggable = true,
  isResizable = true,
  className,
  width: externalWidth,
}: BentoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(externalWidth ?? 1200);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Auto-detect container width via ResizeObserver
  useEffect(() => {
    if (externalWidth != null) {
      setContainerWidth(externalWidth);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    // Set initial width
    setContainerWidth(el.clientWidth || 1200);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setContainerWidth(w);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [externalWidth]);

  // Convert items to react-grid-layout Layout format
  const layout: Layout = useMemo(
    () =>
      items.map((item): LayoutItem => ({
        i: item.id,
        x: item.layout_x ?? 0,
        y: item.layout_y != null ? item.layout_y : Infinity,
        w: item.layout_w ?? 1,
        h: item.layout_h ?? 1,
      })),
    [items]
  );

  // Debounced layout change handler
  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      if (!onLayoutChange) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const mapped = newLayout.map((l) => ({
          id: l.i,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
        }));
        onLayoutChange(mapped);
      }, 500);
    },
    [onLayoutChange]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <ReactGridLayout
        layout={layout}
        gridConfig={{
          cols: columns,
          rowHeight,
          margin: [12, 12] as const,
          containerPadding: [0, 0] as const,
          maxRows: Infinity,
        }}
        dragConfig={{ enabled: isDraggable }}
        resizeConfig={{ enabled: isResizable }}
        compactor={verticalCompactor}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
      >
        {items.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-xl">
            {renderItem(item)}
          </div>
        ))}
      </ReactGridLayout>
    </div>
  );
}
