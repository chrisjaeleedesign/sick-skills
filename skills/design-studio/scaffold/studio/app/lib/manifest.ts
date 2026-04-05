import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { DESIGN_ROOT } from "./db";
import type { Color } from "./types";

export interface Reference {
  type: "screenshot" | "file" | "text";
  path: string;
  description: string;
}

export interface Version {
  number: number;
  direction: string;
  parentVersion: number | null;
  starred: boolean;
  references: Reference[];
  createdAt: string;
}

export interface Family {
  name: string;
  slug: string;
  description: string;
  archived?: boolean;
  color?: Color;
  createdAt: string;
  versions: Version[];
}

export interface Section {
  id: string;
  name: string;
  focus: boolean;
  collapsed: boolean;
  color?: Color;
  columns?: number;  // optional — if set, masonry uses this exact count
  items: string[];   // ordered family slugs

  // Legacy fields — kept for migration, stripped on read
  rows?: number;
  grid?: Record<string, string>;
}

export interface Settings {
  port: number;
  showThumbnails: boolean;
}

export interface Manifest {
  current: { family: string; version: number } | null;
  sections: Section[];
  families: Record<string, Family>;
  settings: Settings;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PROJECTS_DIR = join(DESIGN_ROOT, "projects");
const LEGACY_MANIFEST_PATH = join(DESIGN_ROOT, "manifest.json");
const DEFAULT_SETTINGS: Settings = { port: 3001, showThumbnails: false };

function projectPath(project: string): string {
  return join(PROJECTS_DIR, `${project}.json`);
}

// ---------------------------------------------------------------------------
// Project management
// ---------------------------------------------------------------------------

export function listProjects(): string[] {
  ensureProjectsDir();
  return readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => basename(f, ".json"))
    .sort();
}

export function createProject(name: string): Manifest {
  ensureProjectsDir();
  const manifest: Manifest = {
    current: null,
    sections: [],
    families: {},
    settings: DEFAULT_SETTINGS,
  };
  writeFileSync(projectPath(name), JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

function ensureProjectsDir(): void {
  if (!existsSync(PROJECTS_DIR)) {
    mkdirSync(PROJECTS_DIR, { recursive: true });
  }
  // Migrate legacy manifest.json → projects/default.json
  if (existsSync(LEGACY_MANIFEST_PATH) && !existsSync(projectPath("default"))) {
    const raw = readFileSync(LEGACY_MANIFEST_PATH, "utf-8");
    writeFileSync(projectPath("default"), raw);
  }
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

/** Raw JSON shape before validation/migration */
interface RawSection {
  id: string;
  name: string;
  focus?: boolean;
  collapsed?: boolean;
  color?: Color;
  columns?: number;
  rows?: number;
  grid?: Record<string, string>;
  familySlugs?: string[];
  items?: string[];
}

interface RawManifest {
  current?: { family: string; version: number } | null;
  sections?: RawSection[];
  families?: Record<string, Family>;
  settings?: Partial<Settings>;
}

/** Convert a grid Record<"row:col", slug> to a flat items array in reading order. */
function gridToItems(grid: Record<string, string>, rows: number, columns: number): string[] {
  const items: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const slug = grid[`${r}:${c}`];
      if (slug) items.push(slug);
    }
  }
  return items;
}

/** Migrate any legacy section format to the current items-based format. */
function migrateSection(raw: RawSection): Section {
  // Already migrated
  if (raw.items && !raw.grid) {
    return {
      id: raw.id,
      name: raw.name,
      focus: raw.focus ?? false,
      collapsed: raw.collapsed ?? false,
      color: raw.color,
      columns: raw.columns,
      items: raw.items,
    };
  }

  // Legacy: familySlugs (oldest format)
  if (raw.familySlugs && !raw.grid) {
    return {
      id: raw.id,
      name: raw.name,
      focus: raw.focus ?? false,
      collapsed: raw.collapsed ?? false,
      color: raw.color,
      items: raw.familySlugs,
    };
  }

  // Legacy: grid coordinate format
  if (raw.grid) {
    const rows = raw.rows ?? 1;
    const cols = raw.columns ?? 1;
    return {
      id: raw.id,
      name: raw.name,
      focus: raw.focus ?? false,
      collapsed: raw.collapsed ?? false,
      color: raw.color,
      columns: cols > 1 ? cols : undefined, // preserve column preference if meaningful
      items: gridToItems(raw.grid, rows, cols),
    };
  }

  // Empty section
  return {
    id: raw.id,
    name: raw.name,
    focus: raw.focus ?? false,
    collapsed: raw.collapsed ?? false,
    color: raw.color,
    items: [],
  };
}

export function readManifest(project: string = "default"): Manifest {
  ensureProjectsDir();
  const path = projectPath(project);
  try {
    const raw: RawManifest = JSON.parse(readFileSync(path, "utf-8"));
    const sections = (raw.sections ?? []).map(migrateSection);
    const needsMigration = raw.sections?.some((s) => s.grid || s.familySlugs);
    const manifest: Manifest = {
      current: raw.current ?? null,
      sections,
      families: raw.families ?? {},
      settings: { ...DEFAULT_SETTINGS, ...raw.settings },
    };
    if (needsMigration) writeManifest(manifest, project);
    return manifest;
  } catch {
    return { current: null, sections: [], families: {}, settings: DEFAULT_SETTINGS };
  }
}

export function writeManifest(manifest: Manifest, project: string = "default"): void {
  ensureProjectsDir();
  writeFileSync(projectPath(project), JSON.stringify(manifest, null, 2) + "\n");
}
