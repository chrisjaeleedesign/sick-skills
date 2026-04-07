"use client";

import { ChevronDown } from "lucide-react";

interface ModelPickerProps {
  models: { alias: string; provider: string; modelId: string }[];
  selected: string;
  onChange: (alias: string) => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  openrouter: "OpenRouter",
};

export default function ModelPicker({ models, selected, onChange }: ModelPickerProps) {
  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-border bg-surface-1 px-3 py-1.5 pr-8 text-sm text-text-primary outline-none transition-colors hover:bg-surface-2 focus:ring-2 focus:ring-ring"
      >
        {models.map((m) => (
          <option key={m.alias} value={m.alias}>
            {m.alias} ({PROVIDER_LABELS[m.provider] ?? m.provider})
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
    </div>
  );
}
