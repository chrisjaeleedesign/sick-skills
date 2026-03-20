"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Plus,
  Lightbulb,
  Compass,
  MessageSquare,
  BookOpen,
  Gavel,
  ChevronDown,
} from "lucide-react";

interface JournalEntry {
  ts: string;
  type: "preference" | "direction" | "reaction" | "learning" | "decision";
  id: string;
  tags: string[];
  body: string;
  status: "active" | "superseded" | "killed" | "final";
  refs?: string[];
  family?: string;
  superseded_by?: string;
}

const TYPE_META: Record<
  JournalEntry["type"],
  { label: string; icon: typeof Lightbulb; color: string; bg: string }
> = {
  preference: {
    label: "Preference",
    icon: Lightbulb,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  direction: {
    label: "Direction",
    icon: Compass,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  reaction: {
    label: "Reaction",
    icon: MessageSquare,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  learning: {
    label: "Learning",
    icon: BookOpen,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  decision: {
    label: "Decision",
    icon: Gavel,
    color: "text-red-600",
    bg: "bg-red-50",
  },
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  superseded: "bg-zinc-100 text-zinc-500 line-through",
  killed: "bg-red-50 text-red-600",
  final: "bg-zinc-800 text-zinc-100",
};

function TypeBadge({ type }: { type: JournalEntry["type"] }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-500"}`}
    >
      {status}
    </span>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500">
      {tag}
    </span>
  );
}

function EntryRow({
  entry,
  onUpdate,
}: {
  entry: JournalEntry;
  onUpdate: (id: string, patch: Partial<JournalEntry>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(entry.body);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [editing]);

  const isInactive =
    entry.status === "superseded" || entry.status === "killed";

  return (
    <div
      className={`group rounded-xl border px-4 py-3 transition ${
        isInactive
          ? "border-zinc-100 bg-zinc-50/50 opacity-60"
          : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <TypeBadge type={entry.type} />
        <StatusBadge status={entry.status} />
        <span className="text-[10px] text-zinc-400">{entry.id}</span>
        <div className="flex-1" />
        <span className="text-[10px] text-zinc-400">
          {new Date(entry.ts).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={editBody}
            onChange={(e) => {
              setEditBody(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] leading-6 text-zinc-800 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                onUpdate(entry.id, { body: editBody });
                setEditing(false);
              }}
              className="rounded-lg bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditBody(entry.body);
                setEditing(false);
              }}
              className="rounded-lg px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`cursor-pointer text-[13px] leading-6 ${
            isInactive ? "text-zinc-400 line-through" : "text-zinc-700"
          }`}
          onClick={() => {
            if (!isInactive) setEditing(true);
          }}
        >
          {entry.body}
        </p>
      )}

      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </div>
      )}

      {!isInactive && entry.status !== "final" && (
        <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onUpdate(entry.id, { status: "killed" })}
            className="rounded px-2 py-0.5 text-[10px] text-red-500 hover:bg-red-50"
          >
            Kill
          </button>
          {entry.type === "decision" && (
            <button
              onClick={() => onUpdate(entry.id, { status: "final" })}
              className="rounded px-2 py-0.5 text-[10px] text-zinc-600 hover:bg-zinc-100"
            >
              Lock
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NewEntryForm({
  onSubmit,
}: {
  onSubmit: (entry: JournalEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<JournalEntry["type"]>("learning");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-[13px] text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-600"
      >
        <Plus className="h-4 w-4" />
        Add entry
      </button>
    );
  }

  const prefix =
    type === "preference"
      ? "pref"
      : type === "direction"
        ? "dir"
        : type === "reaction"
          ? "rxn"
          : type === "learning"
            ? "lrn"
            : "dec";
  const id = `${prefix}-${Date.now().toString(36)}`;

  return (
    <div className="rounded-xl border border-zinc-300 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative">
          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value as JournalEntry["type"])
            }
            className="appearance-none rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-3 pr-8 text-xs text-zinc-700 outline-none focus:border-zinc-400"
          >
            <option value="learning">Learning</option>
            <option value="preference">Preference</option>
            <option value="reaction">Reaction</option>
            <option value="direction">Direction</option>
            <option value="decision">Decision</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
        </div>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="tags (comma-separated)"
          className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 outline-none focus:border-zinc-400"
        />
      </div>
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        placeholder="What did you learn, decide, or notice?"
        className="mb-3 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] leading-6 text-zinc-800 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300"
        rows={3}
      />
      <div className="flex gap-2">
        <button
          disabled={!body.trim()}
          onClick={() => {
            onSubmit({
              ts: new Date().toISOString(),
              type,
              id,
              tags: tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
              body: body.trim(),
              status: type === "decision" ? "final" : "active",
            });
            setBody("");
            setTags("");
            setOpen(false);
          }}
          className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          Add
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setBody("");
            setTags("");
          }}
          className="rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

type FilterType = JournalEntry["type"] | "all";

export function JournalModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showInactive, setShowInactive] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const fetchEntries = useCallback(async () => {
    const res = await fetch("/api/journal");
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleAppend(entry: JournalEntry) {
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "append", entry }),
    });
    setEntries((prev) => [...prev, entry]);
  }

  async function handleUpdate(id: string, patch: Partial<JournalEntry>) {
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, patch }),
    });
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );
  }

  const filtered = entries.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (
      !showInactive &&
      (e.status === "superseded" || e.status === "killed")
    )
      return false;
    return true;
  });

  const counts = entries.reduce(
    (acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      acc.all = (acc.all || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/20 backdrop-blur-sm pt-12"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="flex h-[calc(100vh-6rem)] w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-zinc-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Design Journal
            </h2>
            <p className="text-[12px] text-zinc-400">
              {entries.length} entries
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 border-b border-zinc-200 px-6 py-3">
          {(
            ["all", "preference", "learning", "reaction", "direction", "decision"] as FilterType[]
          ).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                filter === t
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {t === "all" ? "All" : TYPE_META[t].label}
              {counts[t] ? (
                <span className="ml-1 opacity-60">{counts[t]}</span>
              ) : null}
            </button>
          ))}
          <div className="flex-1" />
          <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={() => setShowInactive(!showInactive)}
              className="rounded"
            />
            Show killed
          </label>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              Loading...
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onUpdate={handleUpdate}
                />
              ))}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-zinc-400">
                  No entries match this filter.
                </p>
              )}
            </div>
          )}
        </div>

        {/* New entry form */}
        <div className="border-t border-zinc-200 px-6 py-4">
          <NewEntryForm onSubmit={handleAppend} />
        </div>
      </div>
    </div>
  );
}
