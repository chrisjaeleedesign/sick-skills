"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Check,
  Pencil,
  Target,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Image,
  ImageOff,
  Filter,
} from "lucide-react";
import type { Manifest, Family, Section, Settings } from "@/app/lib/manifest";
import { FamilyCard } from "./family-card";

// ---------------------------------------------------------------------------
// Inline-editable section name
// ---------------------------------------------------------------------------

function SectionName({
  name,
  onRename,
}: {
  name: string;
  onRename: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setValue(name); }, [name, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  if (editing) {
    return (
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = value.trim();
          if (trimmed) onRename(trimmed);
          setEditing(false);
        }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            const trimmed = value.trim();
            if (trimmed) onRename(trimmed);
            setEditing(false);
          }}
          className="rounded border border-border bg-surface-2 px-2 py-0.5 text-sm font-medium text-text-primary outline-none focus:ring-1 focus:ring-primary"
        />
        <button type="submit" className="text-text-tertiary hover:text-primary">
          <Check className="h-3.5 w-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-text-secondary">{name}</span>
      <button
        onClick={() => { setValue(name); setEditing(true); }}
        className="text-text-tertiary opacity-0 transition-opacity group-hover/section:opacity-100 hover:text-text-secondary"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid primitives
// ---------------------------------------------------------------------------

function DroppableCell({ id, children }: { id: string; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] rounded-lg border transition-colors ${
        isOver ? "border-primary/40 bg-primary/5"
          : children ? "border-transparent" : "border-dashed border-border"
      }`}
    >
      {children}
    </div>
  );
}

function DraggableCard({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: slug });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={`cursor-grab touch-none active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

function canRemoveRow(section: Section): { allowed: boolean; reason: string } {
  if (section.rows <= 1) return { allowed: false, reason: "Minimum 1 row" };
  const lastRow = section.rows - 1;
  for (let c = 0; c < section.columns; c++) {
    if (section.grid[`${lastRow}:${c}`]) return { allowed: false, reason: "Last row has cards — move them first" };
  }
  return { allowed: true, reason: "" };
}

function canRemoveCol(section: Section): { allowed: boolean; reason: string } {
  if (section.columns <= 1) return { allowed: false, reason: "Minimum 1 column" };
  const lastCol = section.columns - 1;
  for (let r = 0; r < section.rows; r++) {
    if (section.grid[`${r}:${lastCol}`]) return { allowed: false, reason: "Last column has cards — move them first" };
  }
  return { allowed: true, reason: "" };
}

// ---------------------------------------------------------------------------
// Gallery (main export)
// ---------------------------------------------------------------------------

export function Gallery({ manifest }: { manifest: Manifest }) {
  const [sections, setSections] = useState<Section[]>(manifest.sections);
  const [families, setFamilies] = useState<Record<string, Family>>(manifest.families);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(manifest.settings.showThumbnails);
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    () => new Set(manifest.sections.map((s) => s.id))
  );
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

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
      fetch("/api/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).then(() => {})
    );
  }, []);

  // -- Drag handlers --

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const slug = active.id as string;
    const targetId = over.id as string;

    // Parse droppable id: "sectionId:row:col"
    const parts = targetId.split(":");
    if (parts.length < 3) return;
    const targetCol = parseInt(parts.pop()!, 10);
    const targetRow = parseInt(parts.pop()!, 10);
    const targetSectionId = parts.join(":");
    const targetKey = `${targetRow}:${targetCol}`;

    // Find source location
    let sourceSectionId: string | null = null;
    let sourceKey: string | null = null;
    for (const s of sections) {
      const entry = Object.entries(s.grid).find(([, v]) => v === slug);
      if (entry) { sourceSectionId = s.id; sourceKey = entry[0]; break; }
    }

    const targetSection = sections.find((s) => s.id === targetSectionId);
    if (!targetSection) return;

    const occupant = targetSection.grid[targetKey];
    if (sourceSectionId === targetSectionId && sourceKey === targetKey) return;

    const nextSections = sections.map((s) => {
      const isSource = s.id === sourceSectionId;
      const isTarget = s.id === targetSectionId;
      if (!isSource && !isTarget) return s;

      const nextGrid = { ...s.grid };
      if (isTarget) nextGrid[targetKey] = slug;
      if (isSource && sourceKey) {
        if (occupant) nextGrid[sourceKey] = occupant;
        else delete nextGrid[sourceKey];
      }
      return { ...s, grid: nextGrid };
    });

    save({ sections: nextSections });
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
    save({
      sections: [...sections, { id, name: "New Section", focus: false, collapsed: false, columns: 2, rows: 1, grid: {} }],
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
    if (!s || !canRemoveRow(s).allowed) return;
    updateSection(id, { rows: s.rows - 1 });
  }

  function removeColumn(id: string) {
    const s = sections.find((sec) => sec.id === id);
    if (!s || !canRemoveCol(s).allowed) return;
    updateSection(id, { columns: s.columns - 1 });
  }

  // -- Render --

  const activeFamily = activeId ? families[activeId] : null;

  if (Object.keys(families).length === 0 || Object.values(families).every((f) => f.archived)) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-24 text-center">
        <p className="text-sm text-text-tertiary">
          No prototypes yet. Use{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-mono">/design-studio</code>{" "}
          to create one.
        </p>
      </main>
    );
  }

  // DndContext and createPortal require the DOM — guard until after hydration.
  // The portal target (#header-toolbar) is rendered by layout.tsx (client component).
  if (!mounted) return <main className="mx-auto max-w-6xl px-6 py-10" />;

  // Toolbar portaled into the header
  const toolbarTarget = document.getElementById("header-toolbar");
  const toolbar = toolbarTarget && createPortal(
    <>
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
    </>,
    toolbarTarget
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {toolbar}
      <DndContext
        id="gallery-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Sections */}
        {sections.filter((s) => visibleSections.has(s.id)).map((section) => {
          const cardCount = Object.keys(section.grid).length;
          const rowCheck = canRemoveRow(section);
          const colCheck = canRemoveCol(section);
          return (
            <div
              key={section.id}
              className={`group/section mb-8 ${section.focus ? "border-l-2 border-accent-blue pl-4" : "pl-[18px]"}`}
            >
              {/* Section header */}
              <div className="mb-3 flex items-center gap-2 px-1">
                <button
                  onClick={() => updateSection(section.id, { focus: !section.focus })}
                  className={`transition-colors ${section.focus ? "text-accent-blue" : "text-text-tertiary hover:text-text-secondary"}`}
                  title={section.focus ? "Remove from focus" : "Add to focus"}
                >
                  <Target className={`h-4 w-4 ${section.focus ? "fill-accent-blue/20" : ""}`} />
                </button>
                <SectionName name={section.name} onRename={(name) => updateSection(section.id, { name })} />
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
                    style={{ gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: section.rows }).map((_, row) =>
                      Array.from({ length: section.columns }).map((_, col) => {
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
                                  onTrash={trashFamily}
                                />
                              </DraggableCard>
                            )}
                          </DroppableCell>
                        );
                      })
                    )}
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
                    <span className="mx-1 text-border">|</span>
                    <button onClick={() => updateSection(section.id, { columns: section.columns + 1 })}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-tertiary hover:bg-surface-2 hover:text-text-secondary">
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
          );
        })}

        {/* Unsorted families */}
        {unsortedSlugs.length > 0 && (
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
                      currentVersion={currentVersion} showThumbnail={showThumbnails} onTrash={trashFamily} />
                  </DraggableCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Trash section */}
        {visibleSections.has("__trash") && trashedFamilies.length > 0 && (
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

      {/* Add section button */}
      <button onClick={addSection}
        className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-secondary">
        <Plus className="h-3.5 w-3.5" /> Add Section
      </button>
    </main>
  );
}
