"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Tag, ChevronDown, ChevronRight } from "lucide-react";
import { fetchScenarios, createScenario, deleteScenario } from "@/lib/api";
import type { Scenario } from "@/lib/types";

interface Props {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export default function ScenarioLibrary({
  selectedIds,
  onSelectionChange,
}: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    input: "",
    expected_behavior: "",
    tags: "",
    eval_rules: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchScenarios()
      .then(setScenarios)
      .catch(() => {});
  }, []);

  function toggleSelection(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }

  function toggleAll() {
    if (selectedIds.size === scenarios.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(scenarios.map((s) => s.id)));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.input) return;
    setSubmitting(true);
    try {
      const scenario = await createScenario({
        title: form.title,
        input: form.input,
        expected_behavior: form.expected_behavior,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        eval_rules: form.eval_rules
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
      });
      setScenarios((prev) => [...prev, scenario]);
      setForm({
        title: "",
        input: "",
        expected_behavior: "",
        tags: "",
        eval_rules: "",
      });
      setShowForm(false);
    } catch {
      // handle
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteScenario(id);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      const next = new Set(selectedIds);
      next.delete(id);
      onSelectionChange(next);
    } catch {
      // handle
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-text-primary">Scenarios</h3>
          <span className="text-xs text-text-tertiary">
            {selectedIds.size}/{scenarios.length} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          {scenarios.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {selectedIds.size === scenarios.length
                ? "Deselect all"
                : "Select all"}
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 rounded-md bg-surface-1 px-2.5 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-2 rounded-lg border border-border-subtle bg-surface-0 p-3"
        >
          <input
            type="text"
            placeholder="Scenario title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <textarea
            placeholder="User input / message"
            value={form.input}
            onChange={(e) => setForm({ ...form, input: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-1.5 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <textarea
            placeholder="Expected behavior (optional)"
            value={form.expected_behavior}
            onChange={(e) =>
              setForm({ ...form, expected_behavior: e.target.value })
            }
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <textarea
            placeholder="Eval rules (one per line)"
            value={form.eval_rules}
            onChange={(e) => setForm({ ...form, eval_rules: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-border-subtle bg-background px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md px-3 py-1 text-xs text-text-tertiary hover:text-text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.title || !form.input}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Scenario list */}
      <div className="space-y-1">
        {scenarios.map((s) => (
          <ScenarioRow
            key={s.id}
            scenario={s}
            selected={selectedIds.has(s.id)}
            onToggle={() => toggleSelection(s.id)}
            onDelete={() => handleDelete(s.id)}
          />
        ))}
        {scenarios.length === 0 && !showForm && (
          <div className="py-8 text-center text-xs text-text-tertiary">
            No scenarios yet. Add some to start testing.
          </div>
        )}
      </div>
    </div>
  );
}

function ScenarioRow({
  scenario,
  selected,
  onToggle,
  onDelete,
}: {
  scenario: Scenario;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-lg border transition-colors ${
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border-subtle bg-surface-0"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-3.5 w-3.5 rounded border-surface-2 accent-primary"
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-text-tertiary"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <div className="flex-1 min-w-0" onClick={onToggle}>
          <span className="text-sm font-medium text-text-primary cursor-pointer">
            {scenario.title}
          </span>
        </div>
        {scenario.tags.length > 0 && (
          <div className="flex items-center gap-1">
            {scenario.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-0.5 rounded-full bg-surface-1 px-2 py-0.5 text-[10px] text-text-tertiary"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={onDelete}
          className="text-text-tertiary opacity-0 transition-opacity hover:text-accent-red group-hover:opacity-100 [div:hover>&]:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-border-subtle px-3 py-2 space-y-1.5">
          <div>
            <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
              Input
            </span>
            <p className="mt-0.5 font-mono text-xs text-text-secondary whitespace-pre-wrap">
              {scenario.input}
            </p>
          </div>
          {scenario.expected_behavior && (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
                Expected
              </span>
              <p className="mt-0.5 text-xs text-text-secondary">
                {scenario.expected_behavior}
              </p>
            </div>
          )}
          {scenario.eval_rules.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
                Eval Rules
              </span>
              <ul className="mt-0.5 space-y-0.5">
                {scenario.eval_rules.map((r, i) => (
                  <li key={i} className="text-xs text-text-secondary">
                    &bull; {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
