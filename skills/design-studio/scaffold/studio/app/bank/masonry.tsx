"use client";

// ---------------------------------------------------------------------------
// Masonry — CSS columns-based masonry layout
// ---------------------------------------------------------------------------

interface MasonryProps<T extends { id: string }> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  columnWidth?: number;
  gap?: number;
}

export function Masonry<T extends { id: string }>({
  items,
  renderItem,
  columnWidth = 240,
  gap = 12,
}: MasonryProps<T>) {
  return (
    <div
      style={{
        columnWidth,
        columnGap: gap,
      }}
    >
      {items.map((item) => (
        <div key={item.id} style={{ breakInside: "avoid", marginBottom: gap }}>
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
