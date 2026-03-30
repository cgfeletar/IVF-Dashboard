// Shared chart prop types used by Nivo chart wrapper components

import type { AgeBracket } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Panel 1 — IVF Success Rates by Age (grouped bar)
// ---------------------------------------------------------------------------

/**
 * One bar-group in the Nivo grouped bar chart.
 * Each key besides `ageGroup` is a series name (e.g. "Own Eggs", "Donor Eggs")
 * whose value is the live-birth rate percentage.
 */
export type SuccessRateBarDatum = {
  ageGroup: AgeBracket;
  [series: string]: number | AgeBracket;
};

// ---------------------------------------------------------------------------
// Panel 2 — Clinic Explorer (horizontal bar)
// ---------------------------------------------------------------------------

/** One row / bar in the clinic horizontal bar chart */
export type ClinicBarDatum = {
  /** Clinic name (used as the indexBy value) */
  clinic: string;
  /** Live birth rate percentage */
  livebirthRate: number;
  /** Number of transfers performed (used for tooltip / min-cycle filter) */
  numTransfers: number;
  /** State abbreviation */
  state: string;
};

// ---------------------------------------------------------------------------
// Panel 3 — hCG Curve Explorer (line + confidence band)
// ---------------------------------------------------------------------------

/** A single point in a Nivo line series */
export type NivoLineDatum = {
  x: number | string;
  y: number | null;
};

/** A Nivo line series object */
export type NivoLineSeries = {
  id: string;
  data: NivoLineDatum[];
};

// ---------------------------------------------------------------------------
// Panel 4 — Miscarriage Risk (area line)
// ---------------------------------------------------------------------------

/** A single point in the miscarriage risk area chart */
export type MiscarriageRiskDatum = {
  /** Gestational week (4–20) */
  week: number;
  /** Cumulative miscarriage risk from this week to 20 weeks (0–100 %) */
  risk: number;
};
