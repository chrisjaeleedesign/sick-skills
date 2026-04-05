"use client";

import { useSearchParams } from "next/navigation";

/** Read the current project from URL query params and return a suffix for links. */
export function useProjectQuery() {
  const searchParams = useSearchParams();
  const project = searchParams.get("project");
  const suffix = project ? `?project=${encodeURIComponent(project)}` : "";
  return { project, suffix };
}
