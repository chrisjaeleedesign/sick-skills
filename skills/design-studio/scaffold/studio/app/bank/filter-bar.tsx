"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Star, Save, Clock, Image, FileText, Camera, Link2 } from "lucide-react";
import type { ThoughtColor, ThoughtKind, Importance, SourceType } from "@/app/lib/types";
import { COLOR_PALETTE } from "@/app/lib/types";
import { Separator } from "@/app/components/badges";

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

const KIND_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "observation", label: "Observation" },
  { value: "question", label: "Question" },
  { value: "principle", label: "Principle" },
  { value: "reference", label: "Reference" },
];

const IMPORTANCE_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "invalidated", label: "Invalidated" },
  { value: "signal", label: "Signal" },
  { value: "assumption", label: "Assumption" },
  { value: "guiding", label: "Guiding" },
  { value: "foundational", label: "Foundational" },
];

const SOURCE_TYPE_FILTERS: { value: string; label: string; icon: typeof Image }[] = [
  { value: "image", label: "Image", icon: Image },
  { value: "thought", label: "Thought", icon: FileText },
  { value: "screenshot", label: "Screenshot", icon: Camera },
  { value: "link", label: "Link", icon: Link2 },
];

const TIME_RANGES: { value: string; label: string }[] = [
  { value: "", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterBarProps {
  onFilterChange: (params: Record<string, string>) => void;
  compact?: boolean;
}

interface MetaData {
  families: string[];
  tags?: string[];
  colors?: string[];
  kinds?: string[];
}

interface SavedFilter {
  id: string;
  name: string;
  filter_json: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

export function FilterBar({ onFilterChange, compact }: FilterBarProps) {
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [importanceFilter, setImportanceFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState<ThoughtColor | "">("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [familyFilter, setFamilyFilter] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("");
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  // Meta state
  const [availableFamilies, setAvailableFamilies] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [savingFilter, setSavingFilter] = useState(false);
  const [filterName, setFilterName] = useState("");

  // Refs
  const isFirstRender = useRef(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch metadata on mount
  useEffect(() => {
    fetch("/api/thoughts/meta")
      .then((r) => r.json())
      .then((data: MetaData) => {
        setAvailableFamilies(data.families ?? []);
        setAvailableTags(data.tags ?? []);
      })
      .catch(console.error);
  }, []);

  // Fetch saved filters on mount
  useEffect(() => {
    fetch("/api/saved-filters")
      .then((r) => r.json())
      .then((data) => setSavedFilters(data.filters ?? []))
      .catch(console.error);
  }, []);

  // Build query params and notify parent
  const buildParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (kindFilter !== "all") params.kind = kindFilter;
    if (importanceFilter !== "all") params.importance = importanceFilter;
    if (colorFilter) params.color = colorFilter;
    if (pinnedOnly) params.pinned = "true";
    if (familyFilter) params.family = familyFilter;
    if (sourceTypeFilter.length > 0) params.source_type = sourceTypeFilter.join(",");
    if (tagFilter.length > 0) params.tags = tagFilter.join(",");

    // Time range
    if (timeRange) {
      const now = new Date();
      let since: Date;
      if (timeRange === "today") {
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeRange === "week") {
        since = new Date(now);
        since.setDate(now.getDate() - 7);
      } else {
        since = new Date(now);
        since.setMonth(now.getMonth() - 1);
      }
      params.since = since.toISOString();
    }

    return params;
  }, [debouncedSearch, kindFilter, importanceFilter, colorFilter, pinnedOnly, familyFilter, sourceTypeFilter, tagFilter, timeRange]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onFilterChange(buildParams());
  }, [buildParams, onFilterChange]);

  // Toggle source type
  function toggleSourceType(value: string) {
    setSourceTypeFilter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  // Toggle tag
  function toggleTag(value: string) {
    setTagFilter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  // Apply saved filter
  function applySavedFilter(filter: SavedFilter) {
    const f = filter.filter_json as Record<string, unknown>;
    setActiveFilterId(filter.id);
    setKindFilter((f.kind as string) ?? "all");
    setImportanceFilter((f.importance as string) ?? "all");
    setColorFilter((f.color as ThoughtColor) ?? "");
    setPinnedOnly((f.pinned as boolean) ?? false);
    setFamilyFilter((f.family as string) ?? "");
    setSourceTypeFilter((f.source_type as string[]) ?? []);
    setTagFilter((f.tags as string[]) ?? []);
    setTimeRange((f.timeRange as string) ?? "");
  }

  // Save current filter
  async function handleSaveFilter() {
    if (!filterName.trim()) return;
    const state = {
      kind: kindFilter,
      importance: importanceFilter,
      color: colorFilter,
      pinned: pinnedOnly,
      family: familyFilter,
      source_type: sourceTypeFilter,
      tags: tagFilter,
      timeRange,
    };
    try {
      const res = await fetch("/api/saved-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: filterName, filter_json: state }),
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedFilters((prev) => [...prev, saved]);
        setSavingFilter(false);
        setFilterName("");
      }
    } catch (err) {
      console.error(err);
    }
  }

  const chipBase = compact
    ? "rounded-full px-2 py-0.5 text-[10px] font-medium transition"
    : "rounded-full px-3 py-1 text-[11px] font-medium transition";

  const chipActive = "bg-primary text-white";
  const chipInactive = "text-text-tertiary hover:bg-surface-2";

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bank..."
          className={`w-full rounded-lg border border-border bg-card pl-9 pr-8 text-text-primary outline-none placeholder:text-text-tertiary focus:border-surface-3 focus:ring-1 focus:ring-surface-3 ${
            compact ? "py-1.5 text-[12px]" : "py-2 text-[13px]"
          }`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-tertiary hover:text-text-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Saved filter chips */}
      {savedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-text-tertiary">Saved:</span>
          {savedFilters.map((sf) => (
            <button
              key={sf.id}
              onClick={() => applySavedFilter(sf)}
              className={`${chipBase} ${activeFilterId === sf.id ? chipActive : chipInactive}`}
            >
              {sf.name}
            </button>
          ))}
        </div>
      )}

      {/* Kind filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {KIND_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setKindFilter(f.value); setActiveFilterId(null); }}
            className={`${chipBase} ${kindFilter === f.value ? chipActive : chipInactive}`}
          >
            {f.label}
          </button>
        ))}

        <Separator />

        {/* Importance filters */}
        {IMPORTANCE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setImportanceFilter(f.value); setActiveFilterId(null); }}
            className={`${chipBase} ${importanceFilter === f.value ? chipActive : chipInactive}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Source type + time + pinned row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {SOURCE_TYPE_FILTERS.map((f) => {
          const Icon = f.icon;
          const active = sourceTypeFilter.includes(f.value);
          return (
            <button
              key={f.value}
              onClick={() => { toggleSourceType(f.value); setActiveFilterId(null); }}
              className={`${chipBase} flex items-center gap-1 ${active ? chipActive : chipInactive}`}
            >
              <Icon className="h-3 w-3" />
              {f.label}
            </button>
          );
        })}

        <Separator />

        {/* Time range */}
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-text-tertiary" />
          <select
            value={timeRange}
            onChange={(e) => { setTimeRange(e.target.value); setActiveFilterId(null); }}
            className={`rounded-full border border-border bg-transparent px-2 py-0.5 text-text-tertiary outline-none focus:border-surface-3 ${
              compact ? "text-[10px]" : "text-[11px]"
            }`}
          >
            {TIME_RANGES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <Separator />

        {/* Pinned toggle */}
        <button
          onClick={() => { setPinnedOnly(!pinnedOnly); setActiveFilterId(null); }}
          className={`flex items-center gap-1 ${chipBase} ${
            pinnedOnly ? "bg-accent-amber/20 text-accent-amber" : chipInactive
          }`}
        >
          <Star className={`h-3 w-3 ${pinnedOnly ? "fill-amber-400" : ""}`} />
          Pinned
        </button>

        {/* Family filter */}
        {availableFamilies.length > 0 && (
          <select
            value={familyFilter}
            onChange={(e) => { setFamilyFilter(e.target.value); setActiveFilterId(null); }}
            className={`rounded-full border border-border bg-transparent px-2.5 py-0.5 text-text-tertiary outline-none focus:border-surface-3 ${
              compact ? "text-[10px]" : "text-[11px]"
            }`}
          >
            <option value="">All families</option>
            {availableFamilies.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        )}

        {/* Color filter */}
        <div className="flex items-center gap-1">
          {colorFilter && (
            <button
              onClick={() => setColorFilter("")}
              className="text-[10px] text-text-tertiary hover:text-text-secondary"
            >
              clear
            </button>
          )}
          {(["red", "blue", "emerald", "amber", "purple", "pink", "gray"] as ThoughtColor[]).map((c) => (
            <button
              key={c}
              onClick={() => { setColorFilter(colorFilter === c ? "" : c); setActiveFilterId(null); }}
              className={`h-3.5 w-3.5 rounded-full ${COLOR_PALETTE[c].dot} ${
                colorFilter === c ? "ring-2 ring-text-tertiary ring-offset-1" : ""
              }`}
            />
          ))}
        </div>
      </div>

      {/* Tag chips */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-text-tertiary">Tags:</span>
          {availableTags.slice(0, 20).map((tag) => (
            <button
              key={tag}
              onClick={() => { toggleTag(tag); setActiveFilterId(null); }}
              className={`${chipBase} ${tagFilter.includes(tag) ? chipActive : chipInactive}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Save filter button */}
      <div className="flex items-center gap-2">
        {savingFilter ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filter name..."
              className="rounded-md border border-border bg-card px-2 py-1 text-[12px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-surface-3"
              onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
              autoFocus
            />
            <button
              onClick={handleSaveFilter}
              className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-white"
            >
              Save
            </button>
            <button
              onClick={() => { setSavingFilter(false); setFilterName(""); }}
              className="text-[11px] text-text-tertiary hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSavingFilter(true)}
            className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition"
          >
            <Save className="h-3 w-3" />
            Save filter
          </button>
        )}
      </div>
    </div>
  );
}
