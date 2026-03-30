"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronDown, ChevronRight, Plus, Loader2 } from "lucide-react";
import { COLOR_PALETTE } from "@/app/lib/types";
import type { Thought, Revision } from "@/app/lib/types";
import type { Family } from "@/app/lib/manifest";
import { KindBadge, ImportanceBadge } from "@/app/components/badges";
import { fetchApi } from "@/app/lib/fetch";

// ---------------------------------------------------------------------------
// Thought card (compact, expandable for revision history)
// ---------------------------------------------------------------------------

interface ThoughtWithRevisions extends Thought {
  revisions?: Revision[];
  score?: number;
}

function ThoughtCard({ thought }: { thought: ThoughtWithRevisions }) {
  const [expanded, setExpanded] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>(thought.revisions ?? []);
  const latestBody = revisions[0]?.body ?? "(no content)";

  useEffect(() => {
    if (!expanded || revisions.length > 0) return;
    fetchApi<{ revisions?: Revision[] }>(`/api/thoughts?id=${thought.id}`)
      .then(data => { if (data.revisions) setRevisions(data.revisions); })
      .catch(console.error);
  }, [expanded, thought.id, revisions.length]);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        {thought.color && (
          <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${COLOR_PALETTE[thought.color].dot}`} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <KindBadge kind={thought.kind} />
            {thought.importance && <ImportanceBadge importance={thought.importance} />}
            {thought.family && (
              <span className="text-[10px] text-text-tertiary truncate">{thought.family}</span>
            )}
          </div>
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
            {latestBody}
          </p>
        </div>
      </div>

      {/* Expand for revision history */}
      {revisions.length > 1 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-secondary"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          {revisions.length} revisions
        </button>
      )}
      {expanded && revisions.length > 1 && (
        <div className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
          {revisions.slice(1).map(rev => (
            <div key={rev.id} className="text-[11px] text-text-tertiary">
              <span className="font-mono text-[10px]">v{rev.seq}</span>{" "}
              <span className="text-text-secondary">{rev.body?.slice(0, 80)}{(rev.body?.length ?? 0) > 80 ? "..." : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick-add input
// ---------------------------------------------------------------------------

function QuickAdd({ familySlugs, onAdded }: { familySlugs: string[]; onAdded: () => void }) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = value.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-thought",
          thought: {
            kind: "observation",
            body,
            family: familySlugs[0],
            tags: [],
            source: "gallery-sidebar",
          },
        }),
      });
      setValue("");
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Quick thought..."
        className="flex-1 rounded border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:ring-1 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={!value.trim() || submitting}
        className="flex items-center gap-1 rounded bg-primary px-2.5 py-1.5 text-xs text-white disabled:opacity-40"
      >
        {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Gallery sidebar (main export)
// ---------------------------------------------------------------------------

export function GallerySidebar({
  selectedFamilies,
  onClose,
}: {
  selectedFamilies: Family[];
  onClose: () => void;
}) {
  const [linkedThoughts, setLinkedThoughts] = useState<ThoughtWithRevisions[]>([]);
  const [relatedThoughts, setRelatedThoughts] = useState<ThoughtWithRevisions[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const familySlugs = selectedFamilies.map(f => f.slug);
  const familyNames = selectedFamilies.map(f => f.name);
  const familyKey = useMemo(() => familySlugs.join(","), [familySlugs]);

  const fetchThoughts = useCallback(async () => {
    if (familySlugs.length === 0) return;
    setLoading(true);
    try {
      // Fetch linked thoughts (by family match)
      const linkedResults = await Promise.all(
        familySlugs.map(slug =>
          fetchApi<ThoughtWithRevisions[]>(`/api/thoughts?family=${encodeURIComponent(slug)}&limit=20`)
            .catch((err) => { console.error(err); return [] as ThoughtWithRevisions[]; })
        )
      );
      const allLinked: ThoughtWithRevisions[] = linkedResults.flat();
      // Deduplicate by thought id
      const seen = new Set<string>();
      const deduped = allLinked.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
      setLinkedThoughts(deduped);

      // Fetch related thoughts via semantic search (use first family's description)
      const firstFamily = selectedFamilies[0];
      if (firstFamily) {
        const searchText = `${firstFamily.name} ${firstFamily.description}`;
        const related = await fetchApi<ThoughtWithRevisions[]>(
          `/api/thoughts/search?q=${encodeURIComponent(searchText)}&limit=10`
        ).catch((err) => { console.error(err); return [] as ThoughtWithRevisions[]; });
        // Filter out already-linked thoughts
        const linkedIds = new Set(deduped.map(t => t.id));
        setRelatedThoughts(
          (Array.isArray(related) ? related : []).filter(
            (t: ThoughtWithRevisions) => !linkedIds.has(t.id)
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [familyKey, refreshKey]);

  useEffect(() => { fetchThoughts(); }, [fetchThoughts]);

  return (
    <div className="fixed right-0 top-0 z-40 flex h-full w-96 flex-col border-l border-border bg-surface-0 pt-12 shadow-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-text-primary truncate">
            {familyNames.length === 1
              ? familyNames[0]
              : `${familyNames.length} prototypes`}
          </h3>
          {familyNames.length > 1 && (
            <p className="text-[10px] text-text-tertiary truncate">
              {familyNames.join(", ")}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-text-tertiary hover:text-text-secondary hover:bg-surface-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
          </div>
        )}

        {!loading && (
          <>
            {/* Linked thoughts */}
            <section>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Linked Thoughts
                {linkedThoughts.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-normal">{linkedThoughts.length}</span>
                )}
              </h4>
              {linkedThoughts.length === 0 ? (
                <p className="text-xs text-text-tertiary">No thoughts linked to this family yet.</p>
              ) : (
                <div className="space-y-2">
                  {linkedThoughts.map(t => <ThoughtCard key={t.id} thought={t} />)}
                </div>
              )}
            </section>

            {/* Related thoughts (semantic) */}
            {relatedThoughts.length > 0 && (
              <section>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Related
                  <span className="ml-1.5 text-[10px] font-normal">{relatedThoughts.length}</span>
                </h4>
                <div className="space-y-2">
                  {relatedThoughts.map(t => <ThoughtCard key={t.id} thought={t} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Quick-add footer */}
      <div className="border-t border-border px-4 py-3">
        <QuickAdd
          familySlugs={familySlugs}
          onAdded={() => setRefreshKey(k => k + 1)}
        />
      </div>
    </div>
  );
}
