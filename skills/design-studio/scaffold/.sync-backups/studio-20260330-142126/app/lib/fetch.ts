/**
 * Thin wrapper around fetch that throws on non-OK responses and parses JSON.
 * Used by client components to replace raw fetch + silent catch.
 */
export async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
