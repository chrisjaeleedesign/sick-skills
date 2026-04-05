"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Target,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Image,
  ImageOff,
  Filter,
  GripVertical,
  X,
  Check,
  Pencil,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Manifest, Family, Section, Settings } from "@/app/lib/manifest";
import { COLOR_PALETTE } from "@/app/lib/types";
import { FamilyCard } from "./family-card";
import { GallerySidebar } from "./gallery-sidebar";

// ---------------------------------------------------------------------------
// SectionName (inline rename widget)
// ---------------------------------------------------------------------------

function SectionName({ name, onRename, autoEdit }: { name: string; onRename: (next: string) => void; autoEdit?: boolean }) {
  const [editing, setEditing] = useState(autoEdit ?? false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (autoEdit) setEditing(true); }, [autoEdit]);
  useEffect(() => { if (!editing) setValue(name); }, [name, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  if (editing) {
    return (
      <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); const t = value.trim(); if (t) onRename(t); setEditing(false); }}>
        <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
          onBlur={() => { const t = value.trim(); if (t) onRename(t); setEditing(false); }}
          className="rounded border border-border bg-surface-2 px-2 py-0.5 text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-primary" />
        <button type="submit" className="text-text-tertiary hover:text-primary"><Check className="h-3.5 w-3.5" /></button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-text-secondary">{name}</span>
      <button onClick={() => { setValue(name); setEditing(true); }}
        className="text-text-tertiary opacity-0 transition-opacity group-hover/section:opacity-100 hover:text-text-secondary">
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableSection (drag handle for section reorder)
// ---------------------------------------------------------------------------

function SortableSection({ id, children }: { id: string; children: (dragHandleProps: Record<string, unknown>) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isOver } = useSortable({ id: `section:${id}` });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={isOver ? "border-t-2 border-accent-blue" : "border-t-2 border-transparent"}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableCard (drag wrapper for individual cards within a section grid)
// ---------------------------------------------------------------------------

function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: "grab" as const,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export function Gallery({ manifest, project = "default", projects = [] }: { manifest: Manifest; project?: string; projects?: string[] }) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(manifest.sections);
  const [families, setFamilies] = useState<Record<string, Family>>(manifest.families);
  const [mounted, setMounted] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(manifest.settings.showThumbnails);
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    () => new Set(manifest.sections.map((s) => s.id))
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const lastSelectedRef = useRef<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setSections(manifest.sections);
    setFamilies(manifest.families);
    setShowThumbnails(manifest.settings.showThumbnails);
    setVisibleSections(new Set(manifest.sections.map((s) => s.id)));
    setSelectedSlugs(new Set());
    setEditingSectionId(null);
    lastSelectedRef.current = null;
  }, [project, manifest]);

  useEffect(() => {
    if (!filterOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);

  const currentFamily = manifest.current?.family ?? null;
  const currentVersion = manifest.current?.version ?? null;
  const assignedSlugs = new Set(sections.flatMap((s) => s.items));
  const unsortedSlugs = Object.keys(families).filter(
    (slug) => !assignedSlugs.has(slug) && !families[slug].archived
  );
  const trashedFamilies = Object.values(families).filter((f) => f.archived);

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const cardSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Persist changes
  const pendingRef = useRef<Promise<void>>(Promise.resolve());
  const save = useCallback((updates: {
    sections?: Section[];
    families?: Record<string, Family>;
    settings?: Partial<Settings>;
  }) => {
    if (updates.sections) setSections(updates.sections);
    if (updates.families) setFamilies(updates.families);
    if (updates.settings?.showThumbnails !== undefined)
      setShowThumbnails(updates.settings.showThumbnails);
    pendingRef.current = pendingRef.current.then(() =>
      fetch(`/api/manifest?project=${encodeURIComponent(project)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).then(() => {}).catch(console.error)
    );
  }, [project]);

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeStr = active.id.toString();
    const overStr = over.id.toString();
    if (!activeStr.startsWith("section:") || !overStr.startsWith("section:")) return;
    const oldId = activeStr.slice(8);
    const newId = overStr.slice(8);
    if (oldId === newId) return;
    const oldIndex = sections.findIndex((s) => s.id === oldId);
    const newIndex = sections.findIndex((s) => s.id === newId);
    if (oldIndex === -1 || newIndex === -1) return;
    save({ sections: arrayMove(sections, oldIndex, newIndex) });
  }

  function trashFamily(slug: string) {
    const nextFamilies = { ...families, [slug]: { ...families[slug], archived: true } };
    const nextSections = sections.map((s) => ({
      ...s,
      items: s.items.filter((item) => item !== slug),
    }));
    save({ sections: nextSections, families: nextFamilies });
  }

  function restoreFamily(slug: string) {
    save({ families: { ...families, [slug]: { ...families[slug], archived: false } } });
  }

  function addSection() {
    const id = `sec-${Date.now()}`;
    setVisibleSections((prev) => new Set([...prev, id]));
    setEditingSectionId(id);
    save({ sections: [{ id, name: "New Section", focus: false, collapsed: false, items: [] }, ...sections] });
  }

  function updateSection(id: string, patch: Partial<Section>) {
    save({ sections: sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  function deleteSection(id: string) {
    setVisibleSections((prev) => { const next = new Set(prev); next.delete(id); return next; });
    save({ sections: sections.filter((s) => s.id !== id) });
  }

  const allVisibleSlugs = useMemo(() => {
    const slugs: string[] = [];
    for (const section of sections) {
      if (!visibleSections.has(section.id)) continue;
      for (const slug of section.items) {
        if (families[slug] && !families[slug].archived) slugs.push(slug);
      }
    }
    for (const slug of unsortedSlugs) slugs.push(slug);
    return slugs;
  }, [sections, visibleSections, families, unsortedSlugs]);

  function handleSelect(slug: string, e: React.MouseEvent) {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (e.shiftKey && lastSelectedRef.current) {
        const a = allVisibleSlugs.indexOf(lastSelectedRef.current);
        const b = allVisibleSlugs.indexOf(slug);
        if (a !== -1 && b !== -1) {
          const [start, end] = a < b ? [a, b] : [b, a];
          for (let i = start; i <= end; i++) next.add(allVisibleSlugs[i]);
        }
      } else {
        if (next.has(slug)) next.delete(slug); else next.add(slug);
      }
      lastSelectedRef.current = slug;
      return next;
    });
  }

  function clearSelection() {
    setSelectedSlugs(new Set());
    lastSelectedRef.current = null;
  }

  const selectedFamilies = Array.from(selectedSlugs).map((s) => families[s]).filter(Boolean);
  const isEmpty = Object.keys(families).length === 0 || Object.values(families).every((f) => f.archived);
  const sidebarOpen = selectedSlugs.size > 0;

  if (!mounted) return <main className="mx-auto max-w-6xl px-6 py-10" />;

  const toolbarTarget = document.getElementById("header-toolbar");
  const toolbar = toolbarTarget && createPortal(
    <>
      {projects.length > 0 && (
        <select
          value={project}
          onChange={(e) => router.push(`/?project=${encodeURIComponent(e.target.value)}`)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary outline-none"
        >
          {projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
      <button onClick={addSection} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2">
        <Plus className="h-3.5 w-3.5" /> Section
      </button>
      <div ref={filterRef} className="relative">
        <button onClick={() => setFilterOpen(!filterOpen)} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2">
          <Filter className="h-3.5 w-3.5" /> Sections
        </button>
        {filterOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-card p-2 shadow-lg">
            {sections.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-2 cursor-pointer">
                <input type="checkbox" checked={visibleSections.has(s.id)}
                  onChange={() => { const next = new Set(visibleSections); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); setVisibleSections(next); }} />
                {s.name}
              </label>
            ))}
            <label className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-2 cursor-pointer border-t border-border mt-1 pt-1.5">
              <input type="checkbox" checked={visibleSections.has("__trash")}
                onChange={() => { const next = new Set(visibleSections); if (next.has("__trash")) next.delete("__trash"); else next.add("__trash"); setVisibleSections(next); }} />
              Trash
            </label>
          </div>
        )}
      </div>
      <button onClick={() => save({ settings: { showThumbnails: !showThumbnails } })} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2">
        {showThumbnails ? <Image className="h-3.5 w-3.5" /> : <ImageOff className="h-3.5 w-3.5" />} Thumbnails
      </button>
      {selectedSlugs.size > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5">
          <span className="text-xs font-medium text-primary">{selectedSlugs.size} selected</span>
          <button onClick={clearSelection} className="rounded p-0.5 text-primary hover:bg-primary/10"><X className="h-3 w-3" /></button>
        </div>
      )}
    </>,
    toolbarTarget
  );

  // Render a section's card grid with per-section drag-reorder

  function renderSectionGrid(sectionId: string, slugs: string[], onReorder?: (newSlugs: string[]) => void) {
    function handleDragStart(event: DragStartEvent) {
      setActiveDragId(event.active.id as string);
    }

    function handleDragEnd(event: DragEndEvent) {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorder) return;
      const oldIdx = slugs.indexOf(active.id as string);
      const newIdx = slugs.indexOf(over.id as string);
      if (oldIdx === -1 || newIdx === -1) return;
      onReorder(arrayMove(slugs, oldIdx, newIdx));
    }

    const activeFamily = activeDragId ? families[activeDragId] : null;

    return (
      <DndContext id={`cards-${sectionId}`} sensors={cardSensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragId(null)}>
        <SortableContext items={slugs} strategy={rectSortingStrategy}>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {slugs.map((slug) => {
              const family = families[slug];
              if (!family) return null;
              return (
                <SortableCard key={slug} id={slug}>
                  <FamilyCard
                    family={family}
                    isCurrent={currentFamily === slug}
                    currentVersion={currentVersion}
                    showThumbnail={showThumbnails}
                    isSelected={selectedSlugs.has(slug)}
                    onSelect={handleSelect}
                    onTrash={trashFamily}
                  />
                </SortableCard>
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeFamily ? (
            <div style={{ opacity: 0.9, cursor: "grabbing" }}>
              <FamilyCard
                family={activeFamily}
                isCurrent={currentFamily === activeDragId}
                currentVersion={currentVersion}
                showThumbnail={showThumbnails}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  }

  return (
    <main className={`mx-auto px-6 py-10 transition-all ${sidebarOpen ? "mr-96 max-w-5xl" : "max-w-6xl"}`}>
      {toolbar}
      {isEmpty ? (
        <div className="py-24 text-center">
          <p className="text-sm text-text-tertiary">
            No prototypes yet. Use{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-mono">/design-studio {project}</code>{" "}
            to create one.
          </p>
        </div>
      ) : (
        <DndContext id="gallery-sections-dnd" sensors={sectionSensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sections.filter((s) => visibleSections.has(s.id)).map((s) => `section:${s.id}`)} strategy={verticalListSortingStrategy}>
            {sections.filter((s) => visibleSections.has(s.id)).map((section) => {
              const sectionSlugs = section.items.filter((slug) => families[slug] && !families[slug].archived);
              return (
                <SortableSection key={section.id} id={section.id}>
                  {(dragHandleProps) => (
                    <div className={`group/section mb-8 ${section.focus ? "border-l-2 border-accent-blue pl-4" : "pl-[18px]"}`}>
                      <div className="mb-3 flex items-center gap-2 px-1">
                        <button {...dragHandleProps} className="cursor-grab text-text-tertiary opacity-0 transition-opacity group-hover/section:opacity-100 hover:text-text-secondary touch-none active:cursor-grabbing">
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateSection(section.id, { focus: !section.focus })}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                            section.focus
                              ? "border-accent-blue bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20"
                              : "border-border text-text-tertiary hover:border-accent-blue/40 hover:text-text-secondary"
                          }`}
                        >
                          <Target className={`h-3 w-3 ${section.focus ? "fill-accent-blue/20" : ""}`} /> Focus
                        </button>
                        {section.color && (
                          <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_PALETTE[section.color].dot}`} />
                        )}
                        <SectionName
                          name={section.name}
                          onRename={(name) => { updateSection(section.id, { name }); setEditingSectionId(null); }}
                          autoEdit={editingSectionId === section.id}
                        />
                        <span className="text-[10px] text-text-tertiary">{sectionSlugs.length}</span>
                        <div className="flex-1" />
                        <button onClick={() => updateSection(section.id, { collapsed: !section.collapsed })} className="text-text-tertiary hover:text-text-secondary">
                          {section.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {sectionSlugs.length === 0 && (
                          <button onClick={() => deleteSection(section.id)} className="text-text-tertiary opacity-0 transition-opacity group-hover/section:opacity-100 hover:text-accent-red">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <AnimatePresence initial={false}>
                        {!section.collapsed && sectionSlugs.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {renderSectionGrid(section.id, sectionSlugs, (newSlugs) => {
                              save({ sections: sections.map((s) => s.id === section.id ? { ...s, items: newSlugs } : s) });
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </SortableSection>
              );
            })}
          </SortableContext>

          {unsortedSlugs.length > 0 && (
            <div className="mb-8 pl-[18px]">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="text-sm font-medium text-text-tertiary">Unsorted</span>
                <span className="text-[10px] text-text-tertiary">{unsortedSlugs.length}</span>
              </div>
              {renderSectionGrid("unsorted", unsortedSlugs)}
            </div>
          )}

          {visibleSections.has("__trash") && trashedFamilies.length > 0 && (
            <div className="mb-8 pl-[18px]">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className="text-sm font-medium text-text-tertiary">Trash</span>
                <span className="text-[10px] text-text-tertiary">{trashedFamilies.length}</span>
              </div>
              <div className="grid gap-3 opacity-60" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                {trashedFamilies.map((family) => (
                  <FamilyCard
                    key={family.slug}
                    family={family}
                    isCurrent={false}
                    currentVersion={null}
                    showThumbnail={showThumbnails}
                    isTrashView
                    onRestore={restoreFamily}
                  />
                ))}
              </div>
            </div>
          )}
        </DndContext>
      )}

      {sidebarOpen && (
        <GallerySidebar selectedFamilies={selectedFamilies} onClose={clearSelection} />
      )}
    </main>
  );
}
