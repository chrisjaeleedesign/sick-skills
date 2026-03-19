import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

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
  createdAt: string;
  versions: Version[];
}

export interface Section {
  id: string;
  name: string;
  focus: boolean;
  collapsed: boolean;
  columns: number;
  rows: number;
  grid: Record<string, string>; // "row:col" -> familySlug
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

const MANIFEST_PATH = join(process.cwd(), "../manifest.json");

const DEFAULT_SETTINGS: Settings = { port: 3001, showThumbnails: false };

/** Migrate old familySlugs-based sections to grid format */
function migrateSections(raw: any): Section[] {
  if (!raw.sections?.length) return [];
  return raw.sections.map((s: any) => {
    if (s.grid) return s; // already migrated
    const slugs: string[] = s.familySlugs || [];
    const grid: Record<string, string> = {};
    slugs.forEach((slug, i) => { grid[`${i}:0`] = slug; });
    return {
      id: s.id,
      name: s.name,
      focus: s.focus ?? false,
      collapsed: s.collapsed ?? false,
      columns: 1,
      rows: Math.max(slugs.length, 1),
      grid,
    };
  });
}

export function readManifest(): Manifest {
  try {
    const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    const needsMigration = raw.sections?.some((s: any) => s.familySlugs && !s.grid);
    const manifest: Manifest = {
      current: raw.current ?? null,
      sections: needsMigration ? migrateSections(raw) : (raw.sections ?? []),
      families: raw.families ?? {},
      settings: { ...DEFAULT_SETTINGS, ...raw.settings },
    };
    if (needsMigration) writeManifest(manifest);
    return manifest;
  } catch {
    return { current: null, sections: [], families: {}, settings: DEFAULT_SETTINGS };
  }
}

export function writeManifest(manifest: Manifest): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}
