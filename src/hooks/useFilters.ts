import { useCallback, useMemo, useSyncExternalStore } from "react";

export interface Filters {
  year: string;
  state: string;
}

const DEFAULTS: Filters = {
  year: "2022",
  state: "OR",
};

function getSnapshot(): string {
  return window.location.search;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

export function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search);
  return {
    year: params.get("year") ?? DEFAULTS.year,
    state: params.get("state") ?? DEFAULTS.state,
  };
}

function updateURL(filters: Partial<Filters>) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(filters)) {
    if (value === DEFAULTS[key as keyof Filters]) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const url = new URL(window.location.href);
  url.search = params.toString();
  window.history.replaceState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useFilters(): {
  filters: Filters;
  setFilter: (key: keyof Filters, value: string) => void;
  resetFilters: () => void;
} {
  const search = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const filters = useMemo(() => parseFilters(search), [search]);

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    updateURL({ [key]: value });
  }, []);

  const resetFilters = useCallback(() => {
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return { filters, setFilter, resetFilters };
}
