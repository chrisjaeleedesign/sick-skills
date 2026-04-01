"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
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
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  Target,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Image,
  ImageOff,
  Filter,
  GripVertical,
  X,
} from "lucide-react";
import type { Manifest, Family, Section, Settings } from "@/app/lib/manifest";
import { COLOR_PALETTE } from "@/app/lib/types";
import { parseDropId, applyDragResult } from "@/app/lib/grid";
import { FamilyCard } from "./family-card";
import { GallerySidebar } from "./gallery-sidebar";
import { Separator } from "@/app/components/badges";
import { useDragSelect } from "@/app/lib/use-drag-select";
import {
  SectionName,
  SortableSection,
  DroppableCell,
  DraggableCard,
  GutterRight,
  GutterBottom,
  canRemoveDimension,
} from "./gallery-primitives";

// ---------------------------------------------------------------------------
// Gallery (main export)
// ---------------------------------------------------------------------------

export function Gallery({ manifest, project = "default", projects = [] }: { manifest: Manifest; project?: string; projects?: string[] }) {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>(manifest.sections);
  const [families, setFamilies] = useState<Record<string, Family>>(manifest.families);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(manifest.settings.showThumbnails);
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    () => new Set(manifest.sections.map((s) => s.id))
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const lastSelectedRef = useRef<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const { selectionRect, handleMouseDown: handleDragSelectMouseDown } = useDragSelect(mainRef, setSelectedSlugs);

  useEffect(() => setMounted(true), []);

  // Reset all state when project changes (manifest prop updates from server)
  useEffect(() => {
    setSections(manifest.sections);
    setFamilies(manifest.families);
    setShowThumbnails(manifest.settings.showThumbnails);
    setVisibleSections(new Set(manifest.sections.map((s) => s.id)));
    setSelectedSlugs(new Set());
    setEditingSectionId(null);
    lastSelectedRef.current = null;
  }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close filter dropdown on outside click
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

  // Derived values
  const assignedSlugs = new Set(sections.flatMap((s) => Object.values(s.grid)));
  const unsortedSlugs = Object.keys(families).filter(
    (slug) => !assignedSlugs.has(slug) && !families[slug].archived
  );
  const trashedFamilies = Object.values(families).filter((f) => f.archived);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Persist changes — serialized to prevent concurrent read-modify-write on the server
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
  }, []);

  // -- Drag handlers --

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id.toString();
    if (id.startsWith("section:")) return;
    setActiveId(id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeStr = active.id.toString();
    const overStr = over.id.toString();

    if (activeStr.startsWith("section:")) {
      if (!overStr.startsWith("section:")) return;
      const oldId = activeStr.slice(8);
      const newId = overStr.slice(8);
      if (oldId === newId) return;
      const oldIndex = sections.findIndex(s => s.id === oldId);
      const newIndex = sections.findIndex(s => s.id === newId);
      if (oldIndex === -1 || newIndex === -1) return;
      save({ sections: arrayMove(sections, oldIndex, newIndex) });
      return;
    }

    // Card drag — delegate to pure function
    const target = parseDropId(overStr);
    if (!target) return;

    const result = applyDragResult(sections, activeStr, target);
    if (!result) return;

    save({ sections: result });
  }

  // -- Trash / Restore --

  function trashFamily(slug: string) {
    const nextFamilies = { ...families, [slug]: { ...families[slug], archived: true } };
    const nextSections = sections.map((s) => {
      const entry = Object.entries(s.grid).find(([, v]) => v === slug);
      if (!entry) return s;
      const nextGrid = { ...s.grid };
      delete nextGrid[entry[0]];
      return { ...s, grid: nextGrid };
    });
    save({ sections: nextSections, families: nextFamilies });
  }

  function restoreFamily(slug: string) {
    save({ families: { ...families, [slug]: { ...families[slug], archived: false } } });
  }

  // -- Section management --

  function addSection() {
    const id = `sec-${Date.now()}`;
    setVisibleSections((prev) => new Set([...prev, id]));
    setEditingSectionId(id);
    save({
      sections: [{ id, name: "New Section", focus: false, collapsed: false, columns: 2, rows: 1, grid: {} }, ...sections],
    });
  }

  function updateSection(id: string, patch: Partial<Section>) {
    save({ sections: sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  function deleteSection(id: string) {
    setVisibleSections((prev) => { const next = new Set(prev); next.delete(id); return next; });
    save({ sections: sections.filter((s) => s.id !== id) });
  }

  function removeRow(id: string) {
    const s = sections.find((sec) => sec.id === id);
    if (!s || !canRemoveDimension(s, "row").allowed) return;
    updateSection(id, { rows: s.rows - 1 });
  }

  function removeColumn(id: string) {
    const s = sections.find((sec) => sec.id === id);
    if (!s || !canRemoveDimension(s, "col").allowed) return;
    updateSection(id, { columns: s.columns - 1 });
  }

  // -- Selection --

  /** Build an ordered list of all visible (non-archived) slugs for shift-click range. */
  function allVisibleSlugs(): string[] {
    const slugs: string[] = [];
    for (const section of sections) {
      if (!visibleSections.has(section.id)) continue;
      for (let r = 0; r < section.rows; r++) {
        for (let c = 0; c < section.columns; c++) {
          const slug = section.grid[`${r}:${c}`];
          if (slug && families[slug] && !families[slug].archived) slugs.push(slug);
        }
      }
    }
    for (const slug of unsortedSlugs) slugs.push(slug);
    return slugs;
  }

  function handleSelect(slug: string, e: React.MouseEvent) {
    setSelectedSlugs(prev => {
      const next = new Set(prev);

      if (e.shiftKey && lastSelectedRef.current) {
        // Range select
        const ordered = allVisibleSlugs();
        const a = ordered.indexOf(lastSelectedRef.current);
        const b = ordered.indexOf(slug);
        if (a !== -1 && b !== -1) {
          const [start, end] = a < b ? [a, b] : [b, a];
          for (let i = start; i <= end; i++) next.add(ordered[i]);
        }
      } else {
        // Toggle — always add/remove without clearing others
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

  const selectedFamilies = Array.from(selectedSlugs)
    .map(s => families[s])
    .filter(Boolean);

  // -- Render --

  const activeFamily = activeId ? families[activeId] : null;
  const isEmpty = Object.keys(families).length === 0 || Object.values(families).every((f) => f.archived);

  // DndContext and createPortal require the DOM — guard until after hydration.
  if (!mounted) return <main className="mx-auto max-w-6xl px-6 py-10" />;

  // Toolbar portaled into the header
  const toolbarTarget = document.getElementById("header-toolbar");
  const toolbar = toolbarTarget && createPortal(
    <>
      {/* Project switcher */}
      {projects.length > 0 && (
        <select
          value={project}
          onChange={(e) => router.push(`/?project=${encodeURIComponent(e.target.value)}`)}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary outline-none"
        >
          {projects.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}

      <button
        onClick={addSection}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2"
      >
        <Plus className="h-3.5 w-3.5" />
        Section
      </button>

      {/* Section filter */}
      <div ref={filterRef} className="relative">
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2"
        >
          <Filter className="h-3.5 w-3.5" />
          Sections
        </button>
        {filterOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-card p-2 shadow-lg">
            {sections.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleSections.has(s.id)}
                  onChange={() => {
                    const next = new Set(visibleSections);
                    if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                    setVisibleSections(next);
                  }}
                />
                {s.name}
              </label>
            ))}
            <label className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-2 cursor-pointer border-t border-border mt-1 pt-1.5">
              <input
                type="checkbox"
                checked={visibleSections.has("__trash")}
                onChange={() => {
                  const next = new Set(visibleSections);
                  if (next.has("__trash")) next.delete("__trash"); else next.add("__trash");
                  setVisibleSections(next);
                }}
              />
              Trash
            </label>
          </div>
        )}
      </div>

      {/* Thumbnail toggle */}
      <button
        onClick={() => save({ settings: { showThumbnails: !showThumbnails } })}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2"
      >
        {showThumbnails ? <Image className="h-3.5 w-3.5" /> : <ImageOff className="h-3.5 w-3.5" />}
        Thumbnails
      </button>

      {/* Selection indicator */}
      {selectedSlugs.size > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5">
          <span className="text-xs font-medium text-primary">
            {selectedSlugs.size} selected
          </span>
          <button
            onClick={clearSelection}
            className="rounded p-0.5 text-primary hover:bg-primary/10"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </>,
    toolbarTarget
  );

  const sidebarOpen = selectedSlugs.size > 0;

  return (
    <main
      ref={mainRef}
      onMouseDown={handleDragSelectMouseDown}
      className={`mx-auto px-6 py-10 transition-all ${sidebarOpen ? "mr-96 max-w-5xl" : "max-w-6xl"}`}
    >
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
      <DndContext
        id="gallery-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Sections — rendered in manifest order (newest first) */}
        <SortableContext
          items={sections.filter(s => visibleSections.has(s.id)).map(s => `section:${s.id}`)}
          strategy={verticalListSortingStrategy}
        >
        {sections.filter((s) => visibleSections.has(s.id)).map((section) => {
          const cardCount = Object.keys(section.grid).length;
          const rowCheck = canRemoveDimension(section, "row");
          const colCheck = canRemoveDimension(section, "col");
          return (
            <SortableSection key={section.id} id={section.id}>
              {(dragHandleProps) => (
            // 18px = 16px (pl-4) + 2px (border-l-2 on focused sections)
            <div
              className={`group/section mb-8 ${section.focus ? "border-l-2 border-accent-blue pl-4" : "pl-[18px]"}`}
            >
              {/* Section header */}
              <div className="mb-3 flex items-center gap-2 px-1">
                <button
                  {...dragHandleProps}
                  className="cursor-grab text-text-tertiary opacity-0 transition-opacity group-hover/section:opacity-100 hover:text-text-secondary touch-none active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <button
                  onClick={() => updateSection(section.id, { focus: !section.focus })}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                    section.focus
                      ? "border-accent-blue bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20"
                      : "border-border text-text-tertiary hover:border-accent-blue/40 hover:text-text-secondary"
                  }`}
                  title={section.focus ? "Remove from focus" : "Add to focus"}
                >
                  <Target className={`h-3 w-3 ${section.focus ? "fill-accent-blue/20" : ""}`} />
                  Focus
                </button>
                {section.color && (
                  <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_PALETTE[section.color].dot}`} />
                )}
                <SectionName name={section.name} onRename={(name) => { updateSection(section.id, { name }); setEditingSectionId(null); }} autoEdit={editingSectionId === section.id} />
                <span className="text-[10px] text-text-tertiary">{cardCount}</span>
                <div className="flex-1" />
                <button
                  onClick={() => updateSection(section.id, { collapsed: !section.collapsed })}
                  className="text-text-tertiary hover:text-text-secondary"
                >
                  {section.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {cardCount === 0 && (
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="text-text-tertiary opacity-0 transition-opacity group-hover/section:opacity-100 hover:text-accent-red"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Grid */}
              {!section.collapsed && (
                <div>
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr)) 24px`
                    }}
                  >
                    {Array.from({ length: section.rows }).map((_, row) => {
                      const cells = Array.from({ length: section.columns }).map((_, col) => {
                        const key = `${row}:${col}`;
                        const slug = section.grid[key];
                        const family = slug ? families[slug] : null;
                        const cellId = `${section.id}:${row}:${col}`;
                        return (
                          <DroppableCell key={cellId} id={cellId}>
                            {family && (
                              <DraggableCard slug={slug}>
                                <FamilyCard
                                  family={family}
                                  isCurrent={currentFamily === slug}
                                  currentVersion={currentVersion}
                                  showThumbnail={showThumbnails}
                                  isSelected={selectedSlugs.has(slug)}
                                  onTrash={trashFamily}
                                  onSelect={handleSelect}
                                />
                              </DraggableCard>
                            )}
                          </DroppableCell>
                        );
                      });
                      return (
                        <React.Fragment key={row}>
                          {cells}
                          <GutterRight
                            sectionId={section.id}
                            row={row}
                          />
                        </React.Fragment>
                      );
                    })}
                    {activeId && Array.from({ length: section.columns }).map((_, col) => (
                      <GutterBottom key={`gutter-bottom-${col}`} sectionId={section.id} col={col} />
                    ))}
                  </div>
                  {/* Row/col controls */}
                  <div className="mt-2 flex items-center gap-1">
                    <button onClick={() => updateSection(section.id, { rows: section.rows + 1 })}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-tertiary hover:bg-surface-2 hover:text-text-secondary">
                      <Plus className="h-3 w-3" /> Row
                    </button>
                    <button
                      onClick={() => removeRow(section.id)}
                      disabled={!rowCheck.allowed}
                      title={rowCheck.allowed ? "Remove last row" : rowCheck.reason}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                        rowCheck.allowed
                          ? "text-text-tertiary hover:bg-surface-2 hover:text-text-secondary"
                          : "text-text-tertiary/30 cursor-not-allowed"
                      }`}
                    >
                      <Minus className="h-3 w-3" /> Row
                    </button>
                    <Separator />
                    <button
                      onClick={() => updateSection(section.id, { columns: section.columns + 1 })}
                      title="Add column"
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-tertiary hover:bg-surface-2 hover:text-text-secondary"
                    >
                      <Plus className="h-3 w-3" /> Col
                    </button>
                    <button
                      onClick={() => removeColumn(section.id)}
                      disabled={!colCheck.allowed}
                      title={colCheck.allowed ? "Remove last column" : colCheck.reason}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                        colCheck.allowed
                          ? "text-text-tertiary hover:bg-surface-2 hover:text-text-secondary"
                          : "text-text-tertiary/30 cursor-not-allowed"
                      }`}
                    >
                      <Minus className="h-3 w-3" /> Col
                    </button>
                  </div>
                </div>
              )}
            </div>
              )}
            </SortableSection>
          );
        })}
        </SortableContext>

        {/* Unsorted families */}
        {unsortedSlugs.length > 0 && (
          /* 18px = 16px (pl-4) + 2px (border-l-2 on focused sections) */
          <div className="mb-8 pl-[18px]">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="text-sm font-medium text-text-tertiary">Unsorted</span>
              <span className="text-[10px] text-text-tertiary">{unsortedSlugs.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {unsortedSlugs.map((slug) => {
                const family = families[slug];
                if (!family) return null;
                return (
                  <DraggableCard key={slug} slug={slug}>
                    <FamilyCard family={family} isCurrent={currentFamily === slug}
                      currentVersion={currentVersion} showThumbnail={showThumbnails}
                      isSelected={selectedSlugs.has(slug)} onTrash={trashFamily} onSelect={handleSelect} />
                  </DraggableCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Trash section */}
        {visibleSections.has("__trash") && trashedFamilies.length > 0 && (
          /* 18px = 16px (pl-4) + 2px (border-l-2 on focused sections) */
          <div className="mb-8 pl-[18px]">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="text-sm font-medium text-text-tertiary">Trash</span>
              <span className="text-[10px] text-text-tertiary">{trashedFamilies.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 opacity-60">
              {trashedFamilies.map((family) => (
                <FamilyCard key={family.slug} family={family} isCurrent={false}
                  currentVersion={null} showThumbnail={showThumbnails} isTrashView onRestore={restoreFamily} />
              ))}
            </div>
          </div>
        )}

        {/* Drag overlay */}
        <DragOverlay>
          {activeFamily ? (
            <div className="w-full max-w-sm rounded-lg border border-primary/30 bg-card p-4 shadow-lg">
              <FamilyCard family={activeFamily} isCurrent={currentFamily === activeFamily.slug}
                currentVersion={currentVersion} showThumbnail={showThumbnails} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}
      {sidebarOpen && (
        <GallerySidebar
          selectedFamilies={selectedFamilies}
          onClose={clearSelection}
        />
      )}
      {/* Drag-to-select rectangle overlay */}
      {selectionRect && (
        <div
          className="pointer-events-none fixed z-50 rounded border border-primary/50 bg-primary/10"
          style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.w,
            height: selectionRect.h,
          }}
        />
      )}
    </main>
  );
}
