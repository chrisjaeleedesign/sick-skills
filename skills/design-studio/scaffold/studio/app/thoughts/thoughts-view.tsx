"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Star, LayoutGrid, List } from "lucide-react";
import type {
  Thought,
  Revision,
  Event,
  Importance,
  ThoughtColor,
} from "@/app/lib/types";
import { COLOR_PALETTE } from "@/app/lib/types";
import { ThoughtCard } from "./thought-card";
import { KindBadge, ImportanceBadge } from "@/app/components/badges";
import { ThoughtDetail } from "./thought-detail";

import { EventRow } from "@/app/components/event-row";
import { TagPill, FamilyBadge, Separator } from "@/app/components/badges";
import { fetchApi } from "@/app/lib/fetch";

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

// ---------------------------------------------------------------------------
// ThoughtsView — single filterable page
// ---------------------------------------------------------------------------

type ThoughtWithRevision = Thought & {
  latest_revision_body?: string;
  latest_revision_seq?: number;
  latest_revision_created_at?: string;
};

type TimelineItem =
  | { type: "thought"; thought: ThoughtWithRevision; revision?: Revision }
  | { type: "event"; event: Event };

export function ThoughtsView() {
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState("all");
  const [importanceFilter, setImportanceFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState<ThoughtColor | "">("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [familyFilter, setFamilyFilter] = useState("");
  const [availableFamilies, setAvailableFamilies] = useState<string[]>([]);
  const [selectedThought, setSelectedThought] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch meta on mount
  useEffect(() => {
    fetchApi<{ families: string[] }>("/api/thoughts/meta")
      .then((data) => setAvailableFamilies(data.families))
      .catch(console.error);
  }, []);

  // Unified fetch — thoughts + events, merged chronologically
  const fetchAll = useCallback(async () => {
    setLoading(true);

    // If searching, use dedicated search endpoint
    if (debouncedSearch) {
      try {
        const data = await fetchApi<ThoughtWithRevision[]>(`/api/thoughts/search?q=${encodeURIComponent(debouncedSearch)}&limit=50`);
        setItems(data.map((t) => ({
          type: "thought" as const,
          thought: t,
          revision: t.latest_revision_body
            ? { body: t.latest_revision_body, seq: t.latest_revision_seq, created_at: t.latest_revision_created_at } as Revision
            : undefined,
        })));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
      return;
    }

    // Standard filtered query — thoughts + events in parallel
    const params = new URLSearchParams();
    if (kindFilter !== "all") params.set("kind", kindFilter);
    if (importanceFilter !== "all") params.set("importance", importanceFilter);
    if (colorFilter) params.set("color", colorFilter);
    if (pinnedOnly) params.set("pinned", "true");
    if (familyFilter) params.set("family", familyFilter);
    params.set("limit", "200");

    try {
      const [thoughts, events] = await Promise.all([
        fetchApi<ThoughtWithRevision[]>(`/api/thoughts?${params.toString()}`),
        fetchApi<Event[]>("/api/journal?table=events&limit=200"),
      ]);

      const merged: TimelineItem[] = [
        ...thoughts.map((t) => ({
          type: "thought" as const,
          thought: t,
          revision: t.latest_revision_body
            ? { body: t.latest_revision_body, seq: t.latest_revision_seq, created_at: t.latest_revision_created_at } as Revision
            : undefined,
        })),
        ...events.map((e) => ({ type: "event" as const, event: e })),
      ];
      merged.sort((a, b) => {
        const tsA = a.type === "thought" ? a.thought.created_at : a.event.ts;
        const tsB = b.type === "thought" ? b.thought.created_at : b.event.ts;
        return new Date(tsB).getTime() - new Date(tsA).getTime();
      });
      setItems(merged);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [debouncedSearch, kindFilter, importanceFilter, colorFilter, pinnedOnly, familyFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Toggle pin
  async function handleTogglePin(id: string, pinned: boolean) {
    await fetch("/api/thoughts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-thought", id, patch: { pinned } }),
    });
    setItems((prev) =>
      prev.map((item) =>
        item.type === "thought" && item.thought.id === id
          ? { ...item, thought: { ...item.thought, pinned } }
          : item
      )
    );
  }

  // Delete thought
  async function handleDelete(id: string) {
    await fetch("/api/thoughts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-thought", id }),
    });
    setItems((prev) => prev.filter((item) => item.type !== "thought" || item.thought.id !== id));
  }

  const thoughtItems = items.filter((i): i is Extract<TimelineItem, { type: "thought" }> => i.type === "thought");
  const thoughtCount = thoughtItems.length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Thoughts</h1>
          <p className="text-[12px] text-text-tertiary">
            {thoughtCount} thought{thoughtCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search thoughts..."
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-8 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-surface-3 focus:ring-1 focus:ring-surface-3"
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


      {/* Filter row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Kind filter */}
        {KIND_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setKindFilter(f.value)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              kindFilter === f.value
                ? "bg-primary text-white"
                : "text-text-tertiary hover:bg-surface-2"
            }`}
          >
            {f.label}
          </button>
        ))}

        <Separator />

        {/* Importance filter */}
        {IMPORTANCE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setImportanceFilter(f.value)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              importanceFilter === f.value
                ? "bg-primary text-white"
                : "text-text-tertiary hover:bg-surface-2"
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="inline-flex rounded-full bg-surface-2 p-0.5">
          <button
            onClick={() => setViewMode("cards")}
            className={`rounded-full p-1.5 transition ${
              viewMode === "cards" ? "bg-card text-text-primary shadow-sm" : "text-text-tertiary"
            }`}
            title="Cards"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`rounded-full p-1.5 transition ${
              viewMode === "timeline" ? "bg-card text-text-primary shadow-sm" : "text-text-tertiary"
            }`}
            title="Timeline"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Pinned toggle */}
        <button
          onClick={() => setPinnedOnly(!pinnedOnly)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
            pinnedOnly
              ? "bg-accent-amber/20 text-accent-amber"
              : "text-text-tertiary hover:bg-surface-2"
          }`}
        >
          <Star className={`h-3 w-3 ${pinnedOnly ? "fill-amber-400" : ""}`} />
          Pinned
        </button>

        {/* Family filter */}
        {availableFamilies.length > 0 && (
          <select
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            className="rounded-full border border-border px-2.5 py-1 text-[11px] text-text-tertiary outline-none focus:border-surface-3"
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
              onClick={() => setColorFilter(colorFilter === c ? "" : c)}
              className={`h-3.5 w-3.5 rounded-full ${COLOR_PALETTE[c].dot} ${
                colorFilter === c ? "ring-2 ring-text-tertiary ring-offset-1" : ""
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <p className="py-8 text-center text-sm text-text-tertiary">Loading...</p>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {items.map((item) =>
            item.type === "event" ? (
              <div key={item.event.id} className="col-span-full">
                <EventRow event={item.event} />
              </div>
            ) : (
              <ThoughtCard
                key={item.thought.id}
                thought={item.thought}
                latestRevision={item.revision}
                onClick={() => setSelectedThought(item.thought.id)}
                onTogglePin={handleTogglePin}
              />
            )
          )}
          {items.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-text-tertiary">
              No thoughts match this filter.
            </p>
          )}
        </div>
      ) : (
        <div className="max-w-3xl space-y-1">
          {items.map((item) =>
            item.type === "event" ? (
              <EventRow key={item.event.id} event={item.event} />
            ) : (
              <div
                key={item.thought.id}
                className="relative flex gap-3 pb-4 pl-6 cursor-pointer"
                onClick={() => setSelectedThought(item.thought.id)}
              >
                {/* Dot + line */}
                <div className="absolute left-0 top-0 flex h-full w-4 flex-col items-center">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full border-2 border-current ${
                    item.thought.color ? COLOR_PALETTE[item.thought.color].text : "text-text-tertiary"
                  }`} />
                  <div className="w-px flex-1 bg-border" />
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <KindBadge kind={item.thought.kind} />
                    {item.thought.importance && <ImportanceBadge importance={item.thought.importance} />}
                    <span className="text-[10px] text-text-tertiary">
                      {new Date(item.thought.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {item.thought.family && (
                      <FamilyBadge family={item.thought.family} />
                    )}
                  </div>
                  {item.revision?.body && (
                    <p className="text-[12px] leading-5 text-text-secondary">{item.revision.body}</p>
                  )}
                  {item.thought.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.thought.tags.map((tag) => (
                        <TagPill key={tag} tag={tag} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-text-tertiary">
              No activity yet.
            </p>
          )}
        </div>
      )}

      {/* Detail panel */}
      {selectedThought && (
        <ThoughtDetail
          thoughtId={selectedThought}
          onClose={() => setSelectedThought(null)}
          onUpdate={fetchAll}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}
