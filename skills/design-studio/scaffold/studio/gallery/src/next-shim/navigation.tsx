/**
 * History-API replacement for "next/navigation" — aliased in vite.config.ts
 * so the existing app/ components compile unchanged.
 */
import { createContext, useContext, useSyncExternalStore } from "react";

let snapshot = { pathname: window.location.pathname, search: window.location.search };

function refreshSnapshot() {
  snapshot = { pathname: window.location.pathname, search: window.location.search };
}

const listeners = new Set<() => void>();

function emit() {
  refreshSnapshot();
  for (const l of listeners) l();
}

window.addEventListener("popstate", emit);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function navigate(href: string) {
  window.history.pushState(null, "", href);
  emit();
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => snapshot.pathname);
}

export function useSearchParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, () => snapshot.search);
  return new URLSearchParams(search);
}

export function useRouter() {
  return {
    push: navigate,
    replace: (href: string) => {
      window.history.replaceState(null, "", href);
      emit();
    },
    back: () => window.history.back(),
  };
}

export const ParamsContext = createContext<Record<string, string>>({});

export function useParams(): Record<string, string> {
  return useContext(ParamsContext);
}
