"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Pencil, Plus } from "lucide-react";
import type { Section } from "@/app/lib/manifest";

// ---------------------------------------------------------------------------
// Inline-editable section name
// ---------------------------------------------------------------------------

export function SectionName({
  name,
  onRename,
  autoEdit,
}: {
  name: string;
  onRename: (next: string) => void;
  autoEdit?: boolean;
}) {
  const [editing, setEditing] = useState(autoEdit ?? false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (autoEdit) setEditing(true); }, [autoEdit]);
  useEffect(() => { if (!editing) setValue(name); }, [name, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = value.trim();
          if (trimmed) onRename(trimmed);
          setEditing(false);
        }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            const trimmed = value.trim();
            if (trimmed) onRename(trimmed);
            setEditing(false);
          }}
          className="rounded border border-border bg-surface-2 px-2 py-0.5 text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-primary"
        />
        <button type="submit" className="text-text-tertiary hover:text-primary">
          <Check className="h-3.5 w-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-text-secondary">{name}</span>
      <button
        onClick={() => { setValue(name); setEditing(true); }}
        className="text-text-tertiary opacity-0 transition-opacity group-hover/section:opacity-100 hover:text-text-secondary"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable section wrapper
// ---------------------------------------------------------------------------

export function SortableSection({ id, children }: { id: string; children: (dragHandleProps: Record<string, unknown>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isOver } = useSortable({ id: `section:${id}` });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={isOver ? "border-t-2 border-accent-blue" : "border-t-2 border-transparent"}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid primitives
// ---------------------------------------------------------------------------

export function DroppableCell({ id, children }: { id: string; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] rounded-lg border transition-colors ${
        isOver ? "border-primary/40 bg-primary/5"
          : children ? "border-transparent" : "border-dashed border-border"
      }`}
    >
      {children}
    </div>
  );
}

export function DraggableCard({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: slug });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} data-family-slug={slug}
      className={`cursor-grab touch-none active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}>
      {children}
    </div>
  );
}

export function GutterRight({ sectionId, row }: { sectionId: string; row: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${sectionId}:gutter-right:${row}` });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] flex items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
        isOver
          ? "border-primary/40 bg-primary/5"
          : "border-transparent hover:border-border"
      }`}
    >
      <Plus className="h-3 w-3 text-text-tertiary opacity-0 transition-opacity group-hover/section:opacity-100" />
    </div>
  );
}

export function GutterBottom({ sectionId, col }: { sectionId: string; col: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${sectionId}:gutter-bottom:${col}` });
  return (
    <div
      ref={setNodeRef}
      className={`h-8 rounded-lg border-2 border-dashed transition-colors ${
        isOver ? "border-primary/40 bg-primary/5" : "border-transparent"
      }`}
    />
  );
}

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

export function canRemoveDimension(section: Section, axis: "row" | "col"): { allowed: boolean; reason: string } {
  const size = axis === "row" ? section.rows : section.columns;
  if (size <= 1) return { allowed: false, reason: `Minimum 1 ${axis}` };
  const last = size - 1;
  for (let i = 0; i < (axis === "row" ? section.columns : section.rows); i++) {
    const key = axis === "row" ? `${last}:${i}` : `${i}:${last}`;
    if (section.grid[key]) return { allowed: false, reason: `Last ${axis} has cards — move them first` };
  }
  return { allowed: true, reason: "" };
}
