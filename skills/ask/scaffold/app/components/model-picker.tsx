"use client";

import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface ModelPickerProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}

export default function ModelPicker({
  label,
  value,
  options,
  onChange,
  className = "",
}: ModelPickerProps) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <label className="text-[11px] text-text-muted uppercase tracking-wide mr-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-surface-2 border border-border text-text-secondary text-xs
                     rounded-md pl-2.5 pr-7 py-1.5 cursor-pointer hover:border-accent/40
                     focus:outline-none focus:border-accent/60 transition-colors"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
      </div>
    </div>
  );
}
