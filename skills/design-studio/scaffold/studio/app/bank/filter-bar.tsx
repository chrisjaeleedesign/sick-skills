"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Star, Save, Image, FileText, Camera, Link2 } from "lucide-react";
import type { ThoughtColor } from "@/app/lib/types";
import { COLOR_PALETTE } from "@/app/lib/types";
import { FilterPopover, CheckboxItem, RadioItem } from "./filter-popover";

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "observation", label: "Observation" },
  { value: "question", label: "Question" },
  { value: "principle", label: "Principle" },
  { value: "reference", label: "Reference" },
];

const IMPORTANCE_OPTIONS: { value: string; label: string }[] = [
  { value: "signal", label: "Signal" },
  { value: "assumption", label: "Assumption" },
  { value: "guiding", label: "Guiding" },
  { value: "foundational", label: "Foundational" },
  { value: "invalidated", label: "Invalidated" },
];

const SOURCE_TYPE_OPTIONS: { value: string; label: string; icon: typeof Image }[] = [
  { value: "image", label: "Image", icon: Image },
  { value: "thought", label: "Thought", icon: FileText },
  { value: "screenshot", label: "Screenshot", icon: Camera },
  { value: "link", label: "Link", icon: Link2 },
];

const TIME_PRESETS: { value: string; label: string }[] = [
  { value: "", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom range" },
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
  const [kindFilter, setKindFilter] = useState<string[]>([]);
  const [importanceFilter, setImportanceFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<ThoughtColor | "">("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [familyFilter, setFamilyFilter] = useState<string[]>([]);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");
  const prevTimeRangeRef = useRef("");
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

  // Meta state
  const [availableFamilies, setAvailableFamilies] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [savingFilter, setSavingFilter] = useState(false);
  const [filterName, setFilterName] = useState("");

  // Tag search within popover
  const [tagSearch, setTagSearch] = useState("");

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
    if (debouncedSearch) params.search = debouncedSearch;
    if (kindFilter.length > 0) params.kind = kindFilter.join(",");
    if (importanceFilter.length > 0) params.importance = importanceFilter.join(",");
    if (colorFilter) params.color = colorFilter;
    if (pinnedOnly) params.pinned = "true";
    if (familyFilter.length > 0) params.family = familyFilter.join(",");
    if (sourceTypeFilter.length > 0) params.source_type = sourceTypeFilter.join(",");
    if (tagFilter.length > 0) params.tags = tagFilter.join(",");

    // Time range
    if (timeRange === "custom") {
      if (customSince) params.since = new Date(customSince).toISOString();
      if (customUntil) params.until = new Date(customUntil).toISOString();
    } else if (timeRange) {
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
  }, [debouncedSearch, kindFilter, importanceFilter, colorFilter, pinnedOnly, familyFilter, sourceTypeFilter, tagFilter, timeRange, customSince, customUntil]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onFilterChange(buildParams());
  }, [buildParams, onFilterChange]);

  // Toggle helpers
  function toggleArrayFilter(setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) {
    setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
    setActiveFilterId(null);
  }

  // Apply saved filter
  function applySavedFilter(filter: SavedFilter) {
    const f = filter.filter_json as Record<string, unknown>;
    setActiveFilterId(filter.id);

    // Handle kind — legacy string or new array
    const rawKind = f.kind;
    if (Array.isArray(rawKind)) {
      setKindFilter(rawKind as string[]);
    } else if (typeof rawKind === "string" && rawKind !== "all") {
      setKindFilter([rawKind]);
    } else {
      setKindFilter([]);
    }

    // Handle importance — legacy string or new array
    const rawImp = f.importance;
    if (Array.isArray(rawImp)) {
      setImportanceFilter(rawImp as string[]);
    } else if (typeof rawImp === "string" && rawImp !== "all") {
      setImportanceFilter([rawImp]);
    } else {
      setImportanceFilter([]);
    }

    // Handle family — legacy string or new array
    const rawFam = f.family;
    if (Array.isArray(rawFam)) {
      setFamilyFilter(rawFam as string[]);
    } else if (typeof rawFam === "string" && rawFam) {
      setFamilyFilter([rawFam]);
    } else {
      setFamilyFilter([]);
    }

    setColorFilter((f.color as ThoughtColor) ?? "");
    setPinnedOnly((f.pinned as boolean) ?? false);
    setSourceTypeFilter((f.source_type as string[]) ?? []);
    setTagFilter((f.tags as string[]) ?? []);
    setTimeRange((f.timeRange as string) ?? "");
    setCustomSince((f.customSince as string) ?? "");
    setCustomUntil((f.customUntil as string) ?? "");
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
      customSince,
      customUntil,
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

  // Check if any filter is active (for save button styling)
  const hasActiveFilters =
    kindFilter.length > 0 ||
    importanceFilter.length > 0 ||
    colorFilter !== "" ||
    pinnedOnly ||
    familyFilter.length > 0 ||
    sourceTypeFilter.length > 0 ||
    tagFilter.length > 0 ||
    timeRange !== "";

  const chipBase = compact
    ? "rounded-full px-2 py-0.5 text-[10px] font-medium transition"
    : "rounded-full px-3 py-1 text-[11px] font-medium transition";

  const chipActive = "bg-primary text-white";
  const chipInactive = "text-text-tertiary hover:bg-surface-2";

  // Filtered tags for popover
  const filteredTags = availableTags
    .filter((t) => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase()))
    .slice(0, 20);

  return (
    <div className="space-y-2">
      {/* Row 1: Search */}
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

      {/* Row 2: Faceted filter triggers */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Save filter */}
        {savingFilter ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filter name..."
              className="rounded-md border border-border bg-card px-2 py-1 text-[12px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-surface-3 w-32"
              onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
              autoFocus
            />
            <button onClick={handleSaveFilter} className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-white">Save</button>
            <button onClick={() => { setSavingFilter(false); setFilterName(""); }} className="text-[11px] text-text-tertiary hover:text-text-secondary">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setSavingFilter(true)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 ${
              compact ? "text-[10px]" : "text-[11px]"
            } font-medium transition ${
              hasActiveFilters
                ? "text-text-tertiary hover:bg-surface-2 hover:text-text-secondary"
                : "text-text-tertiary/50 hover:bg-surface-2 hover:text-text-tertiary"
            }`}
          >
            <Save className="h-3 w-3" />
            Save
          </button>
        )}

        {/* Pinned toggle */}
        <button
          onClick={() => { setPinnedOnly(!pinnedOnly); setActiveFilterId(null); }}
          className={`flex items-center gap-1 rounded-md px-2 py-1 ${
            compact ? "text-[10px]" : "text-[11px]"
          } font-medium transition ${
            pinnedOnly ? "bg-accent-amber/20 text-accent-amber" : "text-text-tertiary hover:bg-surface-2 hover:text-text-secondary"
          }`}
        >
          <Star className={`h-3 w-3 ${pinnedOnly ? "fill-amber-400" : ""}`} />
          Pinned
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Kind */}
        <FilterPopover label="Kind" activeCount={kindFilter.length} compact={compact} onClear={() => setKindFilter([])}>
          {KIND_OPTIONS.map((opt) => (
            <CheckboxItem
              key={opt.value}
              label={opt.label}
              checked={kindFilter.includes(opt.value)}
              onChange={() => toggleArrayFilter(setKindFilter, opt.value)}
            />
          ))}
        </FilterPopover>

        {/* Importance */}
        <FilterPopover label="Importance" activeCount={importanceFilter.length} compact={compact} onClear={() => setImportanceFilter([])}>
          {IMPORTANCE_OPTIONS.map((opt) => (
            <CheckboxItem
              key={opt.value}
              label={opt.label}
              checked={importanceFilter.includes(opt.value)}
              onChange={() => toggleArrayFilter(setImportanceFilter, opt.value)}
            />
          ))}
        </FilterPopover>

        {/* Type (source type) */}
        <FilterPopover label="Type" activeCount={sourceTypeFilter.length} compact={compact} onClear={() => setSourceTypeFilter([])}>
          {SOURCE_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <CheckboxItem
                key={opt.value}
                label={opt.label}
                checked={sourceTypeFilter.includes(opt.value)}
                onChange={() => toggleArrayFilter(setSourceTypeFilter, opt.value)}
                icon={<Icon className="h-3 w-3 text-text-tertiary" />}
              />
            );
          })}
        </FilterPopover>

        {/* Family */}
        {availableFamilies.length > 0 && (
          <FilterPopover label="Family" activeCount={familyFilter.length} compact={compact} onClear={() => setFamilyFilter([])}>
            {availableFamilies.map((fam) => (
              <CheckboxItem
                key={fam}
                label={fam}
                checked={familyFilter.includes(fam)}
                onChange={() => toggleArrayFilter(setFamilyFilter, fam)}
              />
            ))}
          </FilterPopover>
        )}

        {/* Time */}
        <FilterPopover
          label="Time"
          activeCount={timeRange ? 1 : 0}
          compact={compact}
          onClear={() => { setTimeRange(""); setCustomSince(""); setCustomUntil(""); }}
        >
          {TIME_PRESETS.map((preset) => (
            <RadioItem
              key={preset.value}
              label={preset.label}
              checked={timeRange === preset.value}
              onChange={() => {
                if (preset.value === "custom") {
                  prevTimeRangeRef.current = timeRange;
                }
                setTimeRange(preset.value);
                setActiveFilterId(null);
              }}
            />
          ))}
          {timeRange === "custom" && (
            <div className="mt-2 space-y-1.5 border-t border-border pt-2 px-1">
              <div>
                <label className="text-[10px] text-text-tertiary">Since</label>
                <input
                  type="date"
                  value={customSince}
                  onChange={(e) => setCustomSince(e.target.value)}
                  className="w-full rounded border border-border bg-card px-2 py-1 text-[11px] text-text-primary outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-tertiary">Until</label>
                <input
                  type="date"
                  value={customUntil}
                  onChange={(e) => setCustomUntil(e.target.value)}
                  className="w-full rounded border border-border bg-card px-2 py-1 text-[11px] text-text-primary outline-none"
                />
              </div>
            </div>
          )}
        </FilterPopover>

        {/* Tags */}
        {availableTags.length > 0 && (
          <FilterPopover label="Tags" activeCount={tagFilter.length} compact={compact} onClear={() => setTagFilter([])}>
            <div className="mb-1">
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search tags..."
                className="w-full rounded border border-border bg-card px-2 py-1 text-[11px] text-text-primary outline-none placeholder:text-text-tertiary"
              />
            </div>
            {filteredTags.map((tag) => (
              <CheckboxItem
                key={tag}
                label={tag}
                checked={tagFilter.includes(tag)}
                onChange={() => toggleArrayFilter(setTagFilter, tag)}
              />
            ))}
          </FilterPopover>
        )}

        {/* Color dots */}
        <div className="flex items-center gap-1">
          {(["red", "blue", "emerald", "amber", "purple", "pink", "gray"] as ThoughtColor[]).map((c) => (
            <button
              key={c}
              onClick={() => { setColorFilter(colorFilter === c ? "" : c); setActiveFilterId(null); }}
              className={`h-3.5 w-3.5 rounded-full ${COLOR_PALETTE[c].dot} ${
                colorFilter === c ? "ring-2 ring-text-tertiary ring-offset-1" : ""
              }`}
            />
          ))}
          {colorFilter && (
            <button
              onClick={() => setColorFilter("")}
              className="ml-0.5 rounded p-0.5 text-text-tertiary hover:text-text-secondary"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Row 3: Saved filter chips */}
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
    </div>
  );
}
