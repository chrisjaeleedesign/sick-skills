/** Generates a unique ID with the given prefix (e.g. "th", "rev", "feat"). */
export function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
