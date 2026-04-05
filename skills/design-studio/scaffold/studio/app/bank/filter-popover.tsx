"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

// ---------------------------------------------------------------------------
// FilterPopover
// ---------------------------------------------------------------------------

interface FilterPopoverProps {
  label: string;
  activeCount?: number;
  children: React.ReactNode;
  compact?: boolean;
  onClear?: () => void;
  onClose?: () => void;
}

export function FilterPopover({ label, activeCount, children, compact, onClear, onClose }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  // Close on click-outside or Escape
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) handleClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
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
          {onClear && isActive && (
            <>
              <button
                onClick={() => { onClear(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-text-tertiary hover:bg-surface-2 hover:text-text-secondary transition"
              >
                <X className="h-3 w-3" />
                <span>Clear selection</span>
              </button>
              <div className="my-1 h-px bg-border" />
            </>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SelectItem — unified checkbox/radio indicator
// ---------------------------------------------------------------------------

interface SelectItemProps {
  type?: "checkbox" | "radio";
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: React.ReactNode;
}

export function SelectItem({ type = "checkbox", label, checked, onChange, icon }: SelectItemProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-text-primary hover:bg-surface-2 transition"
    >
      <span
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center ${
          type === "radio" ? "rounded-full" : "rounded"
        } ${
          type === "radio"
            ? checked ? "border border-primary" : "border border-border"
            : checked ? "bg-primary" : "border border-border"
        }`}
      >
        {checked && (
          type === "radio"
            ? <span className="h-2 w-2 rounded-full bg-primary" />
            : <Check className="h-2.5 w-2.5 text-white" />
        )}
      </span>
      {icon && <span className="flex shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </button>
  );
}
