"use client";

import { ChevronRight, ChevronDown, Pencil } from "lucide-react";
import type { Feature, FeatureConnection } from "./features";
import { getChildIds, areaColor } from "./features";

// --- Tree types & builder ---

export interface TreeNode { feature: Feature; children: TreeNode[]; otherParents: string[]; }

export function buildTree(features: Feature[], connections: FeatureConnection[]): TreeNode[] {
  const fMap = new Map(features.map((f) => [f.id, f]));
  const childToParents = new Map<string, string[]>();
  for (const c of connections) if (c.type === "parent") childToParents.set(c.a_id, [...(childToParents.get(c.a_id) ?? []), c.b_id]);
  const roots = features.filter((f) => !childToParents.has(f.id));

  function build(f: Feature, visited: Set<string>): TreeNode {
    if (visited.has(f.id)) return { feature: f, children: [], otherParents: [] };
    visited.add(f.id);
    const kids = getChildIds(f.id, connections).map((id) => fMap.get(id)).filter(Boolean).map((c) => build(c!, new Set(visited)));
    const pNames = (childToParents.get(f.id) ?? []).map((pid) => fMap.get(pid)?.name ?? pid);
    return { feature: f, children: kids, otherParents: pNames };
  }
  return roots.map((f) => build(f, new Set()));
}

// --- Tree row component ---

export function TreeRow({ node, depth, selectedId, highlightedSet, expandedSet, searchQuery, onToggle, onSelect, onEdit }: {
  node: TreeNode; depth: number; selectedId: string | null; highlightedSet: Set<string>;
  expandedSet: Set<string>; searchQuery: string;
  onToggle: (id: string) => void; onSelect: (id: string) => void; onEdit: (id: string) => void;
}) {
  const expanded = expandedSet.has(node.feature.id);
  const hasKids = node.children.length > 0;
  const selected = selectedId === node.feature.id;
  const highlighted = highlightedSet.has(node.feature.id);
  const match = searchQuery && node.feature.name.toLowerCase().includes(searchQuery.toLowerCase());
  return (<>
    <div className={`group flex items-center border-b py-2 px-3 transition-colors cursor-pointer ${selected ? "bg-surface-2" : highlighted ? "bg-surface-1" : "hover:bg-surface-1"} ${match ? "ring-1 ring-inset ring-primary/40" : ""}`}
      style={{ paddingLeft: depth * 20 + 12, borderColor: "var(--border)" }} onClick={() => onSelect(node.feature.id)}>
      <button onClick={(e) => { e.stopPropagation(); if (hasKids) onToggle(node.feature.id); }}
        className="mr-1.5 rounded p-0.5 text-text-tertiary hover:text-text-primary" style={{ visibility: hasKids ? "visible" : "hidden" }}>
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      <span className="mr-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: areaColor(node.feature.area) }} />
      <span className="flex-1 truncate text-sm font-medium text-text-primary">{node.feature.name}</span>
      {node.otherParents.length > 0 && <span className="mr-2 text-[10px] text-text-tertiary">also in: {node.otherParents.join(", ")}</span>}
      {hasKids && <span className="mr-2 text-[10px] text-text-tertiary">{node.children.length} children</span>}
      <button onClick={(e) => { e.stopPropagation(); onEdit(node.feature.id); }}
        className="rounded p-1 text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-text-primary hover:bg-surface-2"><Pencil className="h-3 w-3" /></button>
    </div>
    {expanded && node.children.map((child) => (
      <TreeRow key={`${node.feature.id}-${child.feature.id}`} node={child} depth={depth + 1}
        selectedId={selectedId} highlightedSet={highlightedSet} expandedSet={expandedSet}
        searchQuery={searchQuery} onToggle={onToggle} onSelect={onSelect} onEdit={onEdit} />
    ))}
  </>);
}
