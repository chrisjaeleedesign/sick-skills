"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import type { Feature, FeatureConnection } from "@/app/lib/types";
import { getParentIds, getChildIds, areaColor } from "./features";

// --- Chip helpers ---

function FeatureChip({ f, onRemove }: { f: Feature; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-text-secondary">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: areaColor(f.area) }} />{f.name}
      {onRemove && <button onClick={onRemove} className="text-text-tertiary hover:text-destructive"><X className="h-2.5 w-2.5" /></button>}
    </span>
  );
}

function FeatureSearchDropdown({ features, onSelect }: { features: Feature[]; onSelect: (f: Feature) => void }) {
  return (
    <div className="max-h-28 overflow-y-auto rounded-lg border border-border bg-surface-1">
      {features.slice(0, 8).map((f) => (
        <button key={f.id} onClick={() => onSelect(f)} className="flex w-full items-center gap-1.5 px-2 py-1 text-xs text-text-primary hover:bg-surface-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: areaColor(f.area) }} />{f.name}
        </button>
      ))}
    </div>
  );
}

// --- Edit panel ---

export function EditPanel({ feature, features, connections, areas, onUpdate, onClose, onRemoveConnection, onAddConnection, onNavigate }: {
  feature: Feature; features: Feature[]; connections: FeatureConnection[]; areas: string[];
  onUpdate: (id: string, u: Partial<Feature>) => void; onClose: () => void;
  onRemoveConnection: (a: string, b: string) => void; onAddConnection: (a: string, b: string, t: "parent" | "related", n: string) => void;
  onNavigate: (id: string) => void;
}) {
  const [form, setForm] = useState({ ...feature });
  useEffect(() => setForm({ ...feature }), [feature.id]);
  const [parentSearch, setParentSearch] = useState(""); const [relatedSearch, setRelatedSearch] = useState("");
  const [showPS, setShowPS] = useState(false); const [showRS, setShowRS] = useState(false);
  const fMap = new Map(features.map((f) => [f.id, f]));
  const parents = getParentIds(feature.id, connections).map((id) => fMap.get(id)).filter(Boolean) as Feature[];
  const children = getChildIds(feature.id, connections).map((id) => fMap.get(id)).filter(Boolean) as Feature[];
  const related = connections
    .filter((c) => c.type === "related" && (c.a_id === feature.id || c.b_id === feature.id))
    .map((c) => { const oid = c.a_id === feature.id ? c.b_id : c.a_id; return { feature: fMap.get(oid)!, note: c.note, conn: c }; })
    .filter((r) => r.feature);
  const usedIds = new Set([feature.id, ...parents.map((p) => p.id), ...children.map((c) => c.id), ...related.map((r) => r.feature.id)]);
  const avail = (q: string) => features.filter((f) => !usedIds.has(f.id) && f.name.toLowerCase().includes(q.toLowerCase()));

  function save() {
    const u: Partial<Feature> = {};
    for (const k of ["name", "area", "description", "notes", "priority", "status"] as const)
      if (form[k] !== feature[k]) (u as Record<string, string>)[k] = form[k];
    if (Object.keys(u).length) onUpdate(feature.id, u);
  }

  const cls = "w-full rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-primary outline-none focus:border-ring";
  const lbl = "mb-1 block text-[10px] font-medium uppercase text-text-tertiary tracking-wider";

  return (<>
    <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
    <div className="fixed right-0 top-0 z-40 h-full w-[360px] overflow-y-auto border-l border-border bg-surface-0 shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-0 px-4 py-3">
        <span className="text-xs font-medium text-text-secondary">Edit Feature</span>
        <button onClick={() => { save(); onClose(); }} className="rounded p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-2"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4 p-4">
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onBlur={save} className={`${cls} !text-lg !font-semibold`} />
        <div><label className={lbl}>Area</label>
          <select value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} onBlur={save} className={`${cls} appearance-none`}>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Description</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} onBlur={save} rows={3} className={`${cls} resize-none`} />
        </div>
        <div><label className={lbl}>Notes</label>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} onBlur={save} rows={3} className={`${cls} resize-none`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Priority</label><input value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} onBlur={save} className={cls} /></div>
          <div><label className={lbl}>Status</label><input value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} onBlur={save} className={cls} /></div>
        </div>

        {/* Parents */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={lbl}>Parents</span>
            <button onClick={() => setShowPS(!showPS)} className="rounded p-0.5 text-text-tertiary hover:text-text-primary"><Plus className="h-3 w-3" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {parents.map((p) => <FeatureChip key={p.id} f={p} onRemove={() => onRemoveConnection(feature.id, p.id)} />)}
            {parents.length === 0 && !showPS && <span className="text-[11px] text-text-tertiary">None</span>}
          </div>
          {showPS && <div className="mt-1.5">
            <input value={parentSearch} onChange={(e) => setParentSearch(e.target.value)} placeholder="Search..." className={`${cls} mb-1`} autoFocus />
            <FeatureSearchDropdown features={avail(parentSearch)} onSelect={(f) => { onAddConnection(feature.id, f.id, "parent", ""); setShowPS(false); setParentSearch(""); }} />
          </div>}
        </div>

        {/* Children */}
        <div>
          <span className={`${lbl} mb-1.5`}>Children</span>
          <div className="flex flex-wrap gap-1.5">
            {children.map((c) => (
              <button key={c.id} onClick={() => onNavigate(c.id)} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-text-secondary hover:bg-surface-3">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: areaColor(c.area) }} />{c.name}
              </button>
            ))}
            {children.length === 0 && <span className="text-[11px] text-text-tertiary">None</span>}
          </div>
        </div>

        {/* Related */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={lbl}>Related</span>
            <button onClick={() => setShowRS(!showRS)} className="rounded p-0.5 text-text-tertiary hover:text-text-primary"><Plus className="h-3 w-3" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {related.map((r) => (
              <span key={r.feature.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-text-secondary">
                {r.feature.name}{r.note && <span className="text-text-tertiary">({r.note})</span>}
                <button onClick={() => onRemoveConnection(r.conn.a_id, r.conn.b_id)} className="text-text-tertiary hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
              </span>
            ))}
            {related.length === 0 && !showRS && <span className="text-[11px] text-text-tertiary">None</span>}
          </div>
          {showRS && <div className="mt-1.5">
            <input value={relatedSearch} onChange={(e) => setRelatedSearch(e.target.value)} placeholder="Search..." className={`${cls} mb-1`} autoFocus />
            <FeatureSearchDropdown features={avail(relatedSearch)} onSelect={(f) => { onAddConnection(feature.id, f.id, "related", ""); setShowRS(false); setRelatedSearch(""); }} />
          </div>}
        </div>

        <button onClick={() => { save(); onClose(); }} className="w-full rounded-lg bg-primary py-2 text-xs font-medium text-primary-foreground hover:opacity-90">Save & Close</button>
      </div>
    </div>
  </>);
}
