/**
 * Server-side helpers for parsing Next.js Route Handler requests.
 *
 * Pair with `useProjectQuery()` from `app/lib/hooks.ts` on the client side.
 */

/**
 * Read the active project from a Request's query string.
 *
 * Defaults to `"default"` when missing. Pass through `"*"` to mean
 * "all projects" — callers that support this escape hatch should skip
 * their project WHERE clause when they see it.
 */
export function getProject(request: Request): string {
  return new URL(request.url).searchParams.get("project") || "default";
}

/**
 * Read the project filter as a query-shaped value:
 *  - comma-separated → string[] for multi-project queries
 *  - `"*"` → `undefined` (skip the WHERE clause)
 *  - single value or missing → string (with "default" fallback)
 */
export function getProjectFilter(request: Request): string | string[] | undefined {
  const raw = new URL(request.url).searchParams.get("project");
  if (raw && raw.includes(",")) return raw.split(",").filter(Boolean);
  const p = raw || "default";
  return p === "*" ? undefined : p;
}
