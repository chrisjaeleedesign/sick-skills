"use client";

import { useState, useRef, useCallback } from "react";
import {
  Plus, Search, ZoomIn, ZoomOut, RotateCcw,
  LayoutGrid, List,
} from "lucide-react";
import { EditPanel } from "./edit-panel";
import { buildTree, TreeRow } from "./tree";

// --- Types (exported for extracted modules) ---

export interface Feature {
  id: string; area: string; name: string; description: string;
  notes: string; priority: string; status: string;
  x: number; y: number; created_at: string; updated_at: string;
}

export interface FeatureConnection {
  a_id: string; b_id: string; type: "parent" | "related";
  note: string; created_at: string;
}

interface FeaturesProps {
  initialFeatures: Feature[];
  initialConnections: FeatureConnection[];
  initialAreas: string[];
}

// --- Constants ---

const AREA_COLORS: Record<string, string> = {
  assistants: "#8B5CF6", "main-screens": "#3B82F6",
  mobile: "#22C55E", items: "#F97316",
};
const DEFAULT_AREA_COLOR = "#6B7280";
export const areaColor = (area: string) => AREA_COLORS[area] ?? DEFAULT_AREA_COLOR;

// --- DAG helpers ---

export const getParentIds = (id: string, c: FeatureConnection[]) => c.filter((x) => x.type === "parent" && x.a_id === id).map((x) => x.b_id);
export const getChildIds = (id: string, c: FeatureConnection[]) => c.filter((x) => x.type === "parent" && x.b_id === id).map((x) => x.a_id);
const getRelatedIds = (id: string, c: FeatureConnection[]) =>
  c.filter((x) => x.type === "related" && (x.a_id === id || x.b_id === id)).map((x) => x.a_id === id ? x.b_id : x.a_id);

function collect(id: string, conns: FeatureConnection[], getNext: (id: string, c: FeatureConnection[]) => string[]) {
  const result = new Set<string>();
  const stack = getNext(id, conns);
  while (stack.length) { const cur = stack.pop()!; if (!result.has(cur)) { result.add(cur); stack.push(...getNext(cur, conns)); } }
  return result;
}

function getHighlightedSet(selectedId: string, conns: FeatureConnection[]): Set<string> {
  const set = new Set([selectedId]);
  Array.from(collect(selectedId, conns, getParentIds)).forEach((id) => set.add(id));
  Array.from(collect(selectedId, conns, getChildIds)).forEach((id) => set.add(id));
  getRelatedIds(selectedId, conns).forEach((id) => set.add(id));
  return set;
}

async function apiPost(body: Record<string, unknown>) {
  const res = await fetch("/api/features", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

// --- Toolbar ---

function Toolbar({ mode, setMode, areas, areaFilter, setAreaFilter, searchQuery, setSearchQuery, zoom, setZoom, onAdd }: {
  mode: "canvas" | "list"; setMode: (m: "canvas" | "list") => void; areas: string[];
  areaFilter: string; setAreaFilter: (a: string) => void; searchQuery: string;
  setSearchQuery: (q: string) => void; zoom: number; setZoom: (z: number) => void; onAdd: () => void;
}) {
  const sep = <div className="mx-1 h-5 w-px bg-border" />;
  const active = "bg-surface-2 text-text-primary";
  const inactive = "text-text-tertiary hover:text-text-secondary";
  return (
    <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-surface-0/90 px-3 py-2 shadow-lg backdrop-blur border border-border">
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button onClick={() => setMode("canvas")} className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition ${mode === "canvas" ? active : inactive}`}>
          <LayoutGrid className="h-3.5 w-3.5" /> Canvas
        </button>
        <button onClick={() => setMode("list")} className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition ${mode === "list" ? active : inactive}`}>
          <List className="h-3.5 w-3.5" /> List
        </button>
      </div>
      {sep}
      <button onClick={() => setAreaFilter("all")} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${areaFilter === "all" ? "bg-text-primary text-surface-0" : inactive}`}>All</button>
      {areas.map((area) => (
        <button key={area} onClick={() => setAreaFilter(area)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${areaFilter === area ? "bg-text-primary text-surface-0" : inactive}`}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: areaColor(area) }} />{area}
        </button>
      ))}
      {sep}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-tertiary" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..."
          className="w-32 rounded-lg border border-border bg-surface-1 py-1 pl-7 pr-2 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-ring" />
      </div>
      {sep}
      <button onClick={onAdd} className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">
        <Plus className="h-3.5 w-3.5" /> Add
      </button>
      {mode === "canvas" && (<>
        {sep}
        <button onClick={() => setZoom(Math.min(2, zoom + 0.15))} className="rounded p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-2"><ZoomIn className="h-3.5 w-3.5" /></button>
        <span className="text-[10px] text-text-tertiary w-8 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(Math.max(0.3, zoom - 0.15))} className="rounded p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-2"><ZoomOut className="h-3.5 w-3.5" /></button>
        <button onClick={() => setZoom(1)} className="rounded p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-2"><RotateCcw className="h-3.5 w-3.5" /></button>
      </>)}
    </div>
  );
}

// --- SVG connection lines ---

function ConnectionLines({ features, connections, selectedId, highlightedSet }: {
  features: Feature[]; connections: FeatureConnection[]; selectedId: string | null; highlightedSet: Set<string>;
}) {
  const fMap = new Map(features.map((f) => [f.id, f]));
  const W = 160, H = 64;
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: "10000px", height: "10000px" }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {connections.map((conn) => {
        const a = fMap.get(conn.a_id), b = fMap.get(conn.b_id);
        if (!a || !b) return null;
        const ax = a.x + W / 2, ay = a.y + H / 2, bx = b.x + W / 2, by = b.y + H / 2;
        const involves = selectedId && (conn.a_id === selectedId || conn.b_id === selectedId);
        const highlighted = selectedId && (highlightedSet.has(conn.a_id) || highlightedSet.has(conn.b_id));
        const dimmed = selectedId && !highlighted;
        const isParent = conn.type === "parent";
        return (
          <g key={`${conn.a_id}-${conn.b_id}`} style={{ opacity: dimmed ? 0.1 : involves ? 1 : 0.6 }}>
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke={isParent ? areaColor(a.area) : "var(--text-tertiary)"}
              strokeWidth={isParent ? (involves ? 3 : 2) : (involves ? 2 : 1)} strokeDasharray={isParent ? undefined : "6 4"}
              markerEnd={isParent ? "url(#arrow)" : undefined} />
            {involves && conn.note && <text x={(ax + bx) / 2} y={(ay + by) / 2 - 6} textAnchor="middle" fill="var(--text-secondary)" fontSize="10">{conn.note}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// --- Feature node (canvas) ---

function FeatureNode({ feature, isSelected, isDimmed, searchMatch, childCount, parentCount,
  onMouseDown, onClick, onDoubleClick, onHandleMouseDown }: {
  feature: Feature; isSelected: boolean; isDimmed: boolean; searchMatch: boolean;
  childCount: number; parentCount: number; onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void; onDoubleClick: () => void; onHandleMouseDown: (e: React.MouseEvent) => void;
}) {
  const color = areaColor(feature.area);
  return (
    <div className="group absolute select-none" style={{ left: feature.x, top: feature.y, width: 160, opacity: isDimmed ? 0.15 : 1, transition: "opacity 0.2s, box-shadow 0.15s" }}
      onMouseDown={onMouseDown} onClick={onClick} onDoubleClick={onDoubleClick}>
      <div className={`rounded-xl border bg-surface-0 px-3 py-2.5 cursor-grab active:cursor-grabbing ${isSelected ? "shadow-md border-primary" : "border-border hover:shadow-sm"} ${searchMatch ? "ring-2 ring-primary/50 animate-pulse" : ""}`}
        style={{ borderLeftWidth: 3, borderLeftColor: color }}>
        <p className="text-sm font-medium text-text-primary truncate">{feature.name}</p>
        <div className="mt-1 flex gap-1.5">
          {childCount > 0 && <span className="text-[10px] text-text-tertiary">{childCount} children</span>}
          {parentCount > 1 && <span className="text-[10px] text-text-tertiary">{parentCount} parents</span>}
        </div>
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-3 w-3 rounded-full opacity-0 group-hover:opacity-100 cursor-crosshair transition-opacity"
        style={{ backgroundColor: color }} onMouseDown={(e) => { e.stopPropagation(); onHandleMouseDown(e); }} />
    </div>
  );
}

// --- Connection popover ---

function ConnectionPopover({ position, targetName, onSave, onCancel }: {
  position: { x: number; y: number }; targetName: string;
  onSave: (type: "parent" | "related", note: string) => void; onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="fixed z-50 rounded-xl border border-border bg-surface-0 p-3 shadow-xl" style={{ left: position.x, top: position.y }}>
      <p className="text-xs text-text-secondary mb-2">Connect to <strong>{targetName}</strong></p>
      <div className="flex gap-2 mb-2">
        <button onClick={() => onSave("parent", note)} className="rounded-lg bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:opacity-90">Parent of {targetName}</button>
        <button onClick={() => onSave("related", note)} className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-primary hover:bg-surface-2">Related</button>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded-lg border border-border bg-surface-1 px-2 py-1 text-xs text-text-primary outline-none" />
      <button onClick={onCancel} className="mt-2 text-[10px] text-text-tertiary hover:text-text-secondary">Cancel</button>
    </div>
  );
}

// --- Main component ---

export function Features({ initialFeatures, initialConnections, initialAreas }: FeaturesProps) {
  const [features, setFeatures] = useState<Feature[]>(initialFeatures);
  const [connections, setConnections] = useState<FeatureConnection[]>(initialConnections);
  const [areas] = useState<string[]>(initialAreas);
  const [mode, setMode] = useState<"canvas" | "list">("canvas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(0.7);
  const [panOffset, setPanOffset] = useState(() => {
    if (initialFeatures.length === 0) return { x: 0, y: 0 };
    const xs = initialFeatures.map(f => f.x);
    const ys = initialFeatures.map(f => f.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { x: -cx + 600, y: -cy + 400 };
  });
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; origPanX: number; origPanY: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawingFrom, setDrawingFrom] = useState<string | null>(null);
  const [drawingLine, setDrawingLine] = useState<{ x: number; y: number } | null>(null);
  const [connPopover, setConnPopover] = useState<{ fromId: string; toId: string; position: { x: number; y: number } } | null>(null);
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);

  const filtered = features.filter((f) => areaFilter === "all" || f.area === areaFilter);
  const filteredIds = new Set(filtered.map((f) => f.id));
  const filteredConns = connections.filter((c) => filteredIds.has(c.a_id) && filteredIds.has(c.b_id));
  const highlighted = selectedId ? getHighlightedSet(selectedId, filteredConns) : new Set<string>();
  const fMap = new Map(features.map((f) => [f.id, f]));

  const childCounts = new Map<string, number>();
  const parentCounts = new Map<string, number>();
  for (const c of filteredConns) if (c.type === "parent") {
    childCounts.set(c.b_id, (childCounts.get(c.b_id) ?? 0) + 1);
    parentCounts.set(c.a_id, (parentCounts.get(c.a_id) ?? 0) + 1);
  }

  const searchMatches = searchQuery ? new Set(filtered.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map((f) => f.id)) : new Set<string>();

  const scheduleSave = useCallback((updates: { id: string; x: number; y: number }[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => apiPost({ action: "update-positions", updates }), 500);
  }, []);

  function onCanvasMouseDown(e: React.MouseEvent) {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains("canvas-bg")) return;
    setSelectedId(null);
    panRef.current = { startX: e.clientX, startY: e.clientY, origPanX: panOffset.x, origPanY: panOffset.y };
  }

  function onCanvasMouseMove(e: React.MouseEvent) {
    if (panRef.current) {
      setPanOffset({ x: panRef.current.origPanX + (e.clientX - panRef.current.startX) / zoom, y: panRef.current.origPanY + (e.clientY - panRef.current.startY) / zoom });
    }
    if (dragRef.current) {
      const dx = (e.clientX - dragRef.current.startX) / zoom, dy = (e.clientY - dragRef.current.startY) / zoom;
      setFeatures((prev) => prev.map((f) => f.id === dragRef.current!.id ? { ...f, x: dragRef.current!.origX + dx, y: dragRef.current!.origY + dy } : f));
    }
    if (drawingFrom && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDrawingLine({ x: (e.clientX - rect.left) / zoom - panOffset.x, y: (e.clientY - rect.top) / zoom - panOffset.y });
    }
  }

  function onCanvasMouseUp(e: React.MouseEvent) {
    if (dragRef.current) { const f = features.find((x) => x.id === dragRef.current!.id); if (f) scheduleSave([{ id: f.id, x: f.x, y: f.y }]); dragRef.current = null; }
    panRef.current = null;
    if (drawingFrom) {
      setDrawingLine(null);
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = target?.closest("[data-feature-id]");
      if (nodeEl) { const toId = nodeEl.getAttribute("data-feature-id")!; if (toId !== drawingFrom) setConnPopover({ fromId: drawingFrom, toId, position: { x: e.clientX, y: e.clientY } }); }
      setDrawingFrom(null);
    }
  }

  function onWheel(e: React.WheelEvent) { e.preventDefault(); setZoom((z) => Math.max(0.3, Math.min(2, z + (e.deltaY > 0 ? -0.08 : 0.08)))); }

  async function handleCreate() {
    const nf = { name: "New Feature", area: areaFilter !== "all" ? areaFilter : areas[0] ?? "", description: "", notes: "", priority: "", status: "", x: (-panOffset.x + 400) | 0, y: (-panOffset.y + 300) | 0 };
    try { const r = await apiPost({ action: "create", feature: nf }); setFeatures((p) => [...p, r.feature]); setEditingId(r.feature.id); } catch { /* */ }
  }

  async function handleUpdate(id: string, updates: Partial<Feature>) {
    setFeatures((p) => p.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    try { await apiPost({ action: "update", id, feature: updates }); } catch { /* optimistic */ }
  }

  async function handleAddConn(aId: string, bId: string, type: "parent" | "related", note: string) {
    setConnections((p) => [...p, { a_id: aId, b_id: bId, type, note, created_at: new Date().toISOString() }]);
    try { await apiPost({ action: "add-connection", a_id: aId, b_id: bId, type, note }); } catch { /* */ }
  }

  async function handleRemoveConn(aId: string, bId: string) {
    setConnections((p) => p.filter((c) => !(c.a_id === aId && c.b_id === bId)));
    try { await apiPost({ action: "remove-connection", a_id: aId, b_id: bId }); } catch { /* */ }
  }

  const treeNodes = mode === "list" ? buildTree(filtered, filteredConns) : [];
  const editingFeature = editingId ? fMap.get(editingId) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <Toolbar mode={mode} setMode={setMode} areas={areas} areaFilter={areaFilter} setAreaFilter={setAreaFilter}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery} zoom={zoom} setZoom={setZoom} onAdd={handleCreate} />

      {mode === "canvas" && (
        <div ref={canvasRef} className="h-full w-full cursor-default" style={{ overflow: "hidden" }}
          onMouseDown={onCanvasMouseDown} onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onWheel={onWheel}>
          <div className="canvas-bg absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`, backgroundPosition: `${panOffset.x * zoom}px ${panOffset.y * zoom}px`,
          }} />
          <div style={{ transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0 }}>
            <ConnectionLines features={filtered} connections={filteredConns} selectedId={selectedId} highlightedSet={highlighted} />
            {drawingFrom && drawingLine && (() => { const ff = fMap.get(drawingFrom); if (!ff) return null; return (
              <svg className="absolute inset-0 pointer-events-none" style={{ width: "10000px", height: "10000px" }}>
                <line x1={ff.x + 160} y1={ff.y + 32} x2={drawingLine.x} y2={drawingLine.y} stroke="var(--text-tertiary)" strokeWidth={1.5} strokeDasharray="4 4" />
              </svg>); })()}
            {filtered.map((feature) => (
              <div key={feature.id} data-feature-id={feature.id}>
                <FeatureNode feature={feature} isSelected={selectedId === feature.id} isDimmed={!!selectedId && !highlighted.has(feature.id)}
                  searchMatch={searchMatches.has(feature.id)} childCount={childCounts.get(feature.id) ?? 0} parentCount={parentCounts.get(feature.id) ?? 0}
                  onMouseDown={(e) => { e.stopPropagation(); dragRef.current = { id: feature.id, startX: e.clientX, startY: e.clientY, origX: feature.x, origY: feature.y }; }}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(feature.id); }}
                  onDoubleClick={() => setEditingId(feature.id)} onHandleMouseDown={() => setDrawingFrom(feature.id)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "list" && (
        <div className="h-full w-full overflow-y-auto pt-16">
          <div className="mx-auto max-w-4xl">
            {treeNodes.length === 0 && <p className="py-16 text-center text-sm text-text-tertiary">No features match this filter.</p>}
            {treeNodes.map((n) => (
              <TreeRow key={n.feature.id} node={n} depth={0} selectedId={selectedId} highlightedSet={highlighted}
                expandedSet={expandedSet} searchQuery={searchQuery}
                onToggle={(id) => setExpandedSet((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                onSelect={setSelectedId} onEdit={setEditingId} />
            ))}
          </div>
        </div>
      )}

      {connPopover && <ConnectionPopover position={connPopover.position} targetName={fMap.get(connPopover.toId)?.name ?? ""}
        onSave={(type, note) => { handleAddConn(connPopover.fromId, connPopover.toId, type, note); setConnPopover(null); }} onCancel={() => setConnPopover(null)} />}

      {editingFeature && <EditPanel feature={editingFeature} features={features} connections={connections} areas={areas}
        onUpdate={handleUpdate} onClose={() => setEditingId(null)} onRemoveConnection={handleRemoveConn} onAddConnection={handleAddConn}
        onNavigate={(id) => { setEditingId(id); setSelectedId(id); }} />}
    </div>
  );
}
