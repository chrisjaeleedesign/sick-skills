import { useState, useRef, useEffect, type RefObject } from "react";

interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Drag-to-select hook: draws a selection rectangle and returns
 * the set of `[data-family-slug]` elements that intersect it.
 */
export function useDragSelect(
  containerRef: RefObject<HTMLElement | null>,
  onSelectionChange: (slugs: Set<string>) => void,
) {
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const isDragSelectingRef = useRef(false);

  function handleMouseDown(e: React.MouseEvent) {
    // Only start drag-select on left click on empty space (not on cards, buttons, inputs)
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't start if clicking on interactive elements or card content
    if (target.closest("a, button, input, [data-drag-handle], .group\\/card")) return;

    dragOriginRef.current = { x: e.clientX, y: e.clientY };
    isDragSelectingRef.current = false;
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragOriginRef.current) return;
      const dx = e.clientX - dragOriginRef.current.x;
      const dy = e.clientY - dragOriginRef.current.y;
      // Require minimum drag distance to start
      if (!isDragSelectingRef.current && Math.abs(dx) + Math.abs(dy) < 10) return;
      isDragSelectingRef.current = true;

      const x = Math.min(e.clientX, dragOriginRef.current.x);
      const y = Math.min(e.clientY, dragOriginRef.current.y);
      const w = Math.abs(dx);
      const h = Math.abs(dy);
      setSelectionRect({ x, y, w, h });

      // Find all card elements within the rectangle
      if (!containerRef.current) return;
      const cards = containerRef.current.querySelectorAll("[data-family-slug]");
      const next = new Set<string>();
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const slug = card.getAttribute("data-family-slug");
        if (!slug) return;
        // Check intersection
        if (rect.right >= x && rect.left <= x + w && rect.bottom >= y && rect.top <= y + h) {
          next.add(slug);
        }
      });
      onSelectionChange(next);
    }

    function handleMouseUp() {
      dragOriginRef.current = null;
      isDragSelectingRef.current = false;
      setSelectionRect(null);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [containerRef, onSelectionChange]);

  return { selectionRect, handleMouseDown };
}
