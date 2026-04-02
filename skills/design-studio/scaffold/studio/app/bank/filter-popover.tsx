"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// FilterPopover
// ---------------------------------------------------------------------------

interface FilterPopoverProps {
  label: string;
  activeCount?: number;
  children: React.ReactNode;
  compact?: boolean;
}

export function FilterPopover({ label, activeCount, children, compact }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const isActive = activeCount !== undefined && activeCount > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-1 rounded-md px-2 py-1 transition ${
          compact ? "text-[10px]" : "text-[11px]"
        } font-medium ${
          isActive
            ? "bg-surface-2 text-text-primary"
            : "text-text-tertiary hover:bg-surface-2 hover:text-text-secondary"
        }`}
      >
        {label}
        {isActive && <span>({activeCount})</span>}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[180px] max-h-[280px] overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CheckboxItem
// ---------------------------------------------------------------------------

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}

export function CheckboxItem({ label, checked, onChange, icon }: CheckboxItemProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-text-primary hover:bg-surface-2 transition"
    >
      {/* Checkbox indicator */}
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded ${
          checked ? "bg-primary" : "border border-border"
        }`}
      >
        {checked && <Check className="h-2.5 w-2.5 text-white" />}
      </span>
      {icon && <span className="flex shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// RadioItem — circle indicator, radio-style (single select)
// ---------------------------------------------------------------------------

interface RadioItemProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

export function RadioItem({ label, checked, onChange }: RadioItemProps) {
  return (
    <button
      onClick={onChange}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-text-primary hover:bg-surface-2 transition"
    >
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
          checked ? "border-primary" : "border-border"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
