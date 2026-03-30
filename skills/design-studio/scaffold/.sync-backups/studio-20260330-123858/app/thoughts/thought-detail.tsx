"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Plus, Clock, Link2, Trash2 } from "lucide-react";
import type {
  Thought,
  Revision,
  Attachment,
  ThoughtRelation,
  Conviction,
} from "@/app/lib/types";
import { COLOR_PALETTE } from "@/app/lib/types";
import { KindBadge, ConvictionBadge } from "./thought-card";
import { TagPill, FamilyBadge } from "@/app/components/badges";

// ---------------------------------------------------------------------------
// ThoughtDetail — expanded view with revision stack, relations, edit controls
// ---------------------------------------------------------------------------

interface ThoughtDetailData extends Thought {
  revisions: Revision[];
  attachments: Attachment[];
  relations: ThoughtRelation[];
}

export function ThoughtDetail({
  thoughtId,
  onClose,
  onUpdate,
  onDelete,
}: {
  thoughtId: string;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
}) {
  const [data, setData] = useState<ThoughtDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newRevisionBody, setNewRevisionBody] = useState("");
  const [addingRevision, setAddingRevision] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/thoughts?id=${thoughtId}`);
      setData(await res.json());
    } catch {
      // fail silently
    }
    setLoading(false);
  }, [thoughtId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (addingRevision) textareaRef.current?.focus();
  }, [addingRevision]);

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleAddRevision() {
    if (!newRevisionBody.trim()) return;
    await fetch("/api/thoughts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-revision",
        thought_id: thoughtId,
        body: newRevisionBody.trim(),
        source: "manual",
      }),
    });
    setNewRevisionBody("");
    setAddingRevision(false);
    fetchDetail();
    onUpdate();
  }

  async function handleConvictionChange(conviction: Conviction) {
    await fetch("/api/thoughts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-thought", id: thoughtId, patch: { conviction } }),
    });
    fetchDetail();
    onUpdate();
  }

  async function handleRemoveRelation(fromId: string, toId: string) {
    await fetch("/api/thoughts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-relation", from_id: fromId, to_id: toId }),
    });
    fetchDetail();
  }

  if (loading || !data) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-border bg-surface-1 shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-sm text-text-tertiary">Loading...</span>
          <button onClick={onClose} className="rounded-lg p-2 text-text-tertiary hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  const colorStyles = data.color ? COLOR_PALETTE[data.color] : null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-surface-1 shadow-xl">
      {/* Header */}
      <div className={`border-b border-border px-6 py-4 ${colorStyles ? colorStyles.bg : ""}`}>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KindBadge kind={data.kind} />
            <ConvictionBadge conviction={data.conviction} />
            {data.color && (
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${COLOR_PALETTE[data.color].dot}`} />
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onDelete(thoughtId);
                onClose();
              }}
              className="rounded-lg p-2 text-text-tertiary hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="rounded-lg p-2 text-text-tertiary hover:bg-surface-2">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.family && (
            <FamilyBadge family={data.family} />
          )}
          {data.tags.map((tag) => <TagPill key={tag} tag={tag} />)}
        </div>
        {/* Conviction selector */}
        <div className="mt-2 flex items-center gap-1">
          {(["hunch", "leaning", "confident", "core"] as const).map((c) => (
            <button
              key={c}
              onClick={() => handleConvictionChange(c)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                data.conviction === c
                  ? "bg-primary text-white"
                  : "text-text-tertiary hover:bg-surface-2"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Revision stack */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
            <Clock className="h-3.5 w-3.5" />
            Revisions ({data.revisions.length})
          </h3>
          <button
            onClick={() => setAddingRevision(!addingRevision)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-text-tertiary hover:bg-surface-2"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {addingRevision && (
          <div className="mb-4 rounded-xl border border-border bg-card p-3">
            <textarea
              ref={textareaRef}
              value={newRevisionBody}
              onChange={(e) => {
                setNewRevisionBody(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              placeholder="New revision..."
              className="mb-2 w-full resize-none rounded-lg border border-border bg-surface-1 px-3 py-2 text-[13px] leading-6 text-text-primary outline-none focus:border-surface-3"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                disabled={!newRevisionBody.trim()}
                onClick={handleAddRevision}
                className="rounded-lg bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => { setAddingRevision(false); setNewRevisionBody(""); }}
                className="rounded-lg px-3 py-1 text-xs text-text-tertiary hover:bg-surface-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {data.revisions.map((rev, i) => (
            <div
              key={rev.id}
              className={`rounded-xl border px-4 py-3 ${
                i === 0 ? "border-border bg-card" : "border-surface-2 bg-surface-1/50"
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] font-medium text-text-tertiary">v{rev.seq}</span>
                <span className="text-[10px] text-text-tertiary">
                  {new Date(rev.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {rev.source !== "manual" && (
                  <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[9px] text-text-tertiary">
                    {rev.source}
                  </span>
                )}
              </div>
              {rev.body && <p className="text-[13px] leading-6 text-text-secondary">{rev.body}</p>}
            </div>
          ))}
        </div>

        {/* Relations */}
        {data.relations.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
              <Link2 className="h-3.5 w-3.5" />
              Relations ({data.relations.length})
            </h3>
            <div className="space-y-1">
              {data.relations.map((rel) => (
                <div
                  key={`${rel.from_id}-${rel.to_id}`}
                  className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-1.5"
                >
                  <span className="text-[11px] text-text-secondary">
                    {rel.type} → {rel.from_id === thoughtId ? rel.to_id : rel.from_id}
                  </span>
                  <button
                    onClick={() => handleRemoveRelation(rel.from_id, rel.to_id)}
                    className="rounded p-0.5 text-text-tertiary hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
