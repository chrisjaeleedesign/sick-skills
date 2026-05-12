"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProjectQuery } from "@/app/lib/hooks";

const STORAGE_KEY = "pebble-studio-project";

/** Native <select> for switching the active project; visible on every page. */
export function ProjectPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const { project } = useProjectQuery();
  const [projects, setProjects] = useState<string[]>([]);
  const restoredRef = useRef(false);

  useEffect(() => {
    fetch("/api/manifest/projects")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // On mount: if URL has no ?project= but localStorage has one, restore it once.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (project) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) router.replace(`${pathname}?project=${encodeURIComponent(stored)}`);
  }, [project, pathname, router]);

  // Mirror current project to localStorage.
  useEffect(() => {
    if (typeof window === "undefined" || !project) return;
    window.localStorage.setItem(STORAGE_KEY, project);
  }, [project]);

  if (projects.length === 0) return null;
  const selected = project ?? "default";

  return (
    <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
      <span>Group</span>
      <select
        value={selected}
        onChange={(e) => router.replace(`${pathname}?project=${encodeURIComponent(e.target.value)}`)}
        className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary outline-none"
      >
        {projects.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </label>
  );
}
