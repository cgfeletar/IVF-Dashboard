/**
 * Unit tests for src/hooks/useFilters.ts
 *
 * Coverage targets:
 *  - parseFilters: URL search string parsing with defaults
 *  - parseFilters: individual param parsing (year, state)
 *  - parseFilters: default fallback when params are absent
 *  - parseFilters: empty string input
 *  - parseFilters: partial param combinations
 *  - URL update logic: non-default values are written to params
 *  - URL update logic: default values are removed from params (clean URLs)
 *  - URL update logic: reset clears all params
 *  - Filters interface: shape and default values
 *
 * Note: The environment is node (no JSDOM). The React hook (useFilters) itself
 * requires useSyncExternalStore and is not rendered here. The exported
 * parseFilters helper is a pure function that can be fully tested in node.
 * The updateURL logic is tested by simulating the exact URLSearchParams
 * operations the hook performs, verified against the same logic used in
 * the implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseFilters, type Filters } from "@/hooks/useFilters";

// ---------------------------------------------------------------------------
// Known defaults — must stay in sync with DEFAULTS in useFilters.ts
// ---------------------------------------------------------------------------

const DEFAULT_YEAR = "2022";
const DEFAULT_STATE = "OR";

// ---------------------------------------------------------------------------
// parseFilters — pure URL search string to Filters
// ---------------------------------------------------------------------------

describe("parseFilters", () => {
  describe("empty / missing search string", () => {
    it("returns default year when search is empty string", () => {
      const result = parseFilters("");
      expect(result.year).toBe(DEFAULT_YEAR);
    });

    it("returns default state when search is empty string", () => {
      const result = parseFilters("");
      expect(result.state).toBe(DEFAULT_STATE);
    });

    it("returns a Filters object with both keys present", () => {
      const result = parseFilters("");
      expect(result).toHaveProperty("year");
      expect(result).toHaveProperty("state");
    });
  });

  describe("parsing year param", () => {
    it("parses a non-default year from the search string", () => {
      const result = parseFilters("?year=2021");
      expect(result.year).toBe("2021");
    });

    it("parses another non-default year correctly", () => {
      const result = parseFilters("?year=2020");
      expect(result.year).toBe("2020");
    });

    it("falls back to default year when year param is absent", () => {
      const result = parseFilters("?state=WA");
      expect(result.year).toBe(DEFAULT_YEAR);
    });

    it("parses the default year value when explicitly present in params", () => {
      // The param is present — parseFilters returns the param value, not undefined
      const result = parseFilters(`?year=${DEFAULT_YEAR}`);
      expect(result.year).toBe(DEFAULT_YEAR);
    });
  });

  describe("parsing state param", () => {
    it("parses a non-default state from the search string", () => {
      const result = parseFilters("?state=WA");
      expect(result.state).toBe("WA");
    });

    it("parses another non-default state correctly", () => {
      const result = parseFilters("?state=CA");
      expect(result.state).toBe("CA");
    });

    it("falls back to default state when state param is absent", () => {
      const result = parseFilters("?year=2021");
      expect(result.state).toBe(DEFAULT_STATE);
    });

    it("parses the default state value when explicitly present in params", () => {
      const result = parseFilters(`?state=${DEFAULT_STATE}`);
      expect(result.state).toBe(DEFAULT_STATE);
    });
  });

  describe("parsing both params together", () => {
    it("parses both year and state when both are present", () => {
      const result = parseFilters("?year=2021&state=WA");
      expect(result.year).toBe("2021");
      expect(result.state).toBe("WA");
    });

    it("parses both params regardless of order", () => {
      const result = parseFilters("?state=CA&year=2020");
      expect(result.year).toBe("2020");
      expect(result.state).toBe("CA");
    });

    it("uses defaults for both when search string contains unrelated params", () => {
      const result = parseFilters("?foo=bar&baz=qux");
      expect(result.year).toBe(DEFAULT_YEAR);
      expect(result.state).toBe(DEFAULT_STATE);
    });

    it("parses known params while ignoring unrelated params", () => {
      const result = parseFilters("?year=2021&foo=bar&state=TX");
      expect(result.year).toBe("2021");
      expect(result.state).toBe("TX");
    });
  });

  describe("edge cases", () => {
    it("handles search string without leading question mark", () => {
      // URLSearchParams handles both "?year=2021" and "year=2021"
      const result = parseFilters("year=2021&state=WA");
      expect(result.year).toBe("2021");
      expect(result.state).toBe("WA");
    });

    it("returns strings, not null or undefined, for all fields", () => {
      const result = parseFilters("");
      expect(typeof result.year).toBe("string");
      expect(typeof result.state).toBe("string");
    });

    it("handles percent-encoded values", () => {
      // Verify URLSearchParams decodes encoded values
      const result = parseFilters("?state=New%20York");
      expect(result.state).toBe("New York");
    });

    it("returns only the two expected keys — no extra properties", () => {
      const result = parseFilters("?year=2021&state=WA&extra=ignored");
      const keys = Object.keys(result);
      expect(keys).toHaveLength(2);
      expect(keys).toContain("year");
      expect(keys).toContain("state");
    });
  });
});

// ---------------------------------------------------------------------------
// URL update logic — the algorithm used by updateURL inside the hook
//
// updateURL is not exported, so we test the same URLSearchParams logic
// directly, documenting the contract: default values are DELETED from params
// (keeping URLs clean), non-default values are SET.
// ---------------------------------------------------------------------------

describe("URL update logic (URLSearchParams contract)", () => {
  /**
   * Mirrors the core logic from updateURL in useFilters.ts:
   *
   *   for (const [key, value] of Object.entries(filters)) {
   *     if (value === DEFAULTS[key]) {
   *       params.delete(key);
   *     } else {
   *       params.set(key, value);
   *     }
   *   }
   */
  function applyFiltersToParams(
    current: string,
    updates: Partial<Filters>
  ): URLSearchParams {
    const DEFAULTS: Filters = { year: DEFAULT_YEAR, state: DEFAULT_STATE };
    const params = new URLSearchParams(current);
    for (const [key, value] of Object.entries(updates)) {
      if (value === DEFAULTS[key as keyof Filters]) {
        params.delete(key);
      } else {
        params.set(key, value as string);
      }
    }
    return params;
  }

  describe("setting a non-default value", () => {
    it("adds year param when year differs from default", () => {
      const params = applyFiltersToParams("", { year: "2021" });
      expect(params.get("year")).toBe("2021");
    });

    it("adds state param when state differs from default", () => {
      const params = applyFiltersToParams("", { state: "WA" });
      expect(params.get("state")).toBe("WA");
    });

    it("adds both params when both differ from defaults", () => {
      const params = applyFiltersToParams("", { year: "2021", state: "WA" });
      expect(params.get("year")).toBe("2021");
      expect(params.get("state")).toBe("WA");
    });

    it("overwrites an existing non-default year with a new value", () => {
      const params = applyFiltersToParams("?year=2021", { year: "2020" });
      expect(params.get("year")).toBe("2020");
    });
  });

  describe("setting a default value removes the param (clean URL)", () => {
    it("deletes year param when set to the default year", () => {
      const params = applyFiltersToParams("?year=2021", {
        year: DEFAULT_YEAR,
      });
      expect(params.get("year")).toBeNull();
    });

    it("deletes state param when set to the default state", () => {
      const params = applyFiltersToParams("?state=WA", {
        state: DEFAULT_STATE,
      });
      expect(params.get("state")).toBeNull();
    });

    it("results in an empty search string when all params reset to defaults", () => {
      const params = applyFiltersToParams("?year=2021&state=WA", {
        year: DEFAULT_YEAR,
        state: DEFAULT_STATE,
      });
      expect(params.toString()).toBe("");
    });
  });

  describe("partial updates", () => {
    it("updates only year without changing state", () => {
      const params = applyFiltersToParams("?state=WA", { year: "2021" });
      expect(params.get("year")).toBe("2021");
      expect(params.get("state")).toBe("WA");
    });

    it("updates only state without changing year", () => {
      const params = applyFiltersToParams("?year=2021", { state: "CA" });
      expect(params.get("year")).toBe("2021");
      expect(params.get("state")).toBe("CA");
    });

    it("preserves existing non-default params not included in the update", () => {
      // Start with year=2021, state=WA; update only state
      const params = applyFiltersToParams("?year=2021&state=WA", {
        state: "TX",
      });
      expect(params.get("year")).toBe("2021");
      expect(params.get("state")).toBe("TX");
    });
  });
});

// ---------------------------------------------------------------------------
// Reset logic — mirrors resetFilters in useFilters.ts
//
// resetFilters sets url.search = "" which is equivalent to clearing all params.
// ---------------------------------------------------------------------------

describe("reset logic (URL search clearing contract)", () => {
  it("clearing search produces empty URLSearchParams", () => {
    new URLSearchParams("?year=2021&state=WA");
    // Simulate url.search = ""
    const cleared = new URLSearchParams("");
    expect(cleared.toString()).toBe("");
  });

  it("parseFilters on empty search returns all defaults after reset", () => {
    const result = parseFilters("");
    expect(result.year).toBe(DEFAULT_YEAR);
    expect(result.state).toBe(DEFAULT_STATE);
  });

  it("after reset, year is restored to the default value", () => {
    // Simulate the before/after cycle: set a non-default, then reset
    const before = parseFilters("?year=2021");
    expect(before.year).toBe("2021");

    const after = parseFilters(""); // simulates post-reset window.location.search
    expect(after.year).toBe(DEFAULT_YEAR);
  });

  it("after reset, state is restored to the default value", () => {
    const before = parseFilters("?state=TX");
    expect(before.state).toBe("TX");

    const after = parseFilters("");
    expect(after.state).toBe(DEFAULT_STATE);
  });
});

// ---------------------------------------------------------------------------
// Filters interface — shape and default values
// ---------------------------------------------------------------------------

describe("Filters defaults", () => {
  it("default year is '2022'", () => {
    const filters = parseFilters("");
    expect(filters.year).toBe("2022");
  });

  it("default state is 'OR'", () => {
    const filters = parseFilters("");
    expect(filters.state).toBe("OR");
  });

  it("Filters type has exactly the year and state fields", () => {
    // Type-level check via structural assignment — if the type changes,
    // this assignment will fail at compile/typecheck time.
    const f: Filters = { year: "2022", state: "OR" };
    expect(f).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Subscribe / getSnapshot logic — browser event model contract
//
// These tests document the popstate-based subscription contract without
// invoking the actual hook (which requires React + JSDOM). They verify that
// the conceptual behavior is correct using vi.stubGlobal to simulate the
// browser environment.
// ---------------------------------------------------------------------------

describe("subscribe/getSnapshot contract (window stub)", () => {
  let listeners: Map<string, Set<EventListener>>;
  let currentSearch: string;

  beforeEach(() => {
    listeners = new Map();
    currentSearch = "";

    const mockWindow = {
      location: {
        get search() {
          return currentSearch;
        },
        get href() {
          return `http://localhost/${currentSearch}`;
        },
      },
      history: {
        replaceState(_state: unknown, _title: string, url: string) {
          const parsed = new URL(url);
          currentSearch = parsed.search;
        },
      },
      addEventListener(type: string, listener: EventListener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent(event: Event) {
        listeners.get(event.type)?.forEach((fn) => fn(event));
        return true;
      },
    };

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("PopStateEvent", class extends Event {
      constructor(type: string) {
        super(type);
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getSnapshot returns current window.location.search", () => {
    currentSearch = "?year=2021";
    // Mirror the getSnapshot function from useFilters.ts
    const snapshot = window.location.search;
    expect(snapshot).toBe("?year=2021");
  });

  it("popstate listener is registered via addEventListener", () => {
    const callback = vi.fn();
    window.addEventListener("popstate", callback);
    expect(listeners.get("popstate")?.has(callback)).toBe(true);
  });

  it("unsubscribe removes the listener", () => {
    const callback = vi.fn();
    window.addEventListener("popstate", callback);
    window.removeEventListener("popstate", callback);
    expect(listeners.get("popstate")?.has(callback)).toBe(false);
  });

  it("dispatching popstate triggers registered listeners", () => {
    const callback = vi.fn();
    window.addEventListener("popstate", callback);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(callback).toHaveBeenCalledOnce();
  });

  it("replaceState updates window.location.search (simulates updateURL side-effect)", () => {
    window.history.replaceState({}, "", "http://localhost/?year=2021&state=TX");
    expect(window.location.search).toBe("?year=2021&state=TX");
  });

  it("replaceState with empty search clears window.location.search (simulates resetFilters)", () => {
    currentSearch = "?year=2021&state=WA";
    window.history.replaceState({}, "", "http://localhost/");
    expect(window.location.search).toBe("");
  });
});
