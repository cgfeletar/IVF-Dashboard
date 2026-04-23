/**
 * transforms.ts
 *
 * All raw CDC API data → Nivo-ready shape logic.
 * Chart components are stateless — they receive shaped data from here.
 *
 * Panels covered:
 *  1. transformSuccessRatesByAge  → Panel 1 (grouped bar)
 *  2. transformClinicExplorer     → Panel 2 (horizontal bar)
 *  3. transformMiscarriageRisk    → Panel 4 (area line)
 *     Panel 3 (hCG) is static data shaped directly by hcgData.ts.
 */

import { AGE_BRACKETS } from "@/lib/constants";
import type { AgeBracket } from "@/lib/constants";
import type { CdcArtRecord } from "@/types/cdc";
import type {
  SuccessRateBarDatum,
  ClinicBarDatum,
  NivoLineSeries,
  MiscarriageRiskDatum,
  DpoBarDatum,
  ConceptionTimingBarDatum,
} from "@/types/charts";
import type { HcgDataPoint } from "@/lib/hcgData";
import type { DpoDataPoint } from "@/lib/dpoData";
import type { OviaConceptionDataPoint } from "@/lib/oviaConceptionData";
import type { PgtAgeDatum } from "@/lib/sartPgtData";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a CDC `data_value` string into a float, returning null when missing. */
function parseRate(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw.trim() === "") return null;
  const n = parseFloat(raw);
  return isNaN(n) ? null : n;
}

/** True when the question field describes a percentage rate (not a count). */
function isRateQuestion(question: string | undefined): boolean {
  if (!question) return false;
  const q = question.toLowerCase();
  return q.includes("percentage") || q.includes("rate");
}

/** Normalise a CDC age-bracket string to one of the canonical brackets. */
function normaliseAgeBracket(breakout: string | undefined): AgeBracket | null {
  if (!breakout) return null;
  const trimmed = breakout.trim();
  if ((AGE_BRACKETS as readonly string[]).includes(trimmed)) {
    return trimmed as AgeBracket;
  }
  // Some API responses use alternate labels — map them defensively.
  const lower = trimmed.toLowerCase();
  if (lower === "under 35" || lower === "< 35") return "<35";
  if (lower === "35 to 37" || lower === "35–37") return "35-37";
  if (lower === "38 to 40" || lower === "38–40") return "38-40";
  if (lower === "over 40" || lower === "> 40") return ">40";
  return null;
}

// ---------------------------------------------------------------------------
// Panel 1 — IVF Success Rates by Age
// ---------------------------------------------------------------------------

export type SuccessRatesOptions = {
  /**
   * "own"   → filter to questions containing "own eggs"
   * "donor" → filter to questions containing "donor"
   * "both"  → include all records (one series per question keyword)
   */
  eggSource: "own" | "donor" | "both";
  /**
   * Series label shown in the legend.  Defaults to "Own Eggs" / "Donor Eggs".
   */
  seriesLabel?: string;
};

/**
 * Transform CDC ART records into a Nivo grouped-bar datum array for Panel 1.
 *
 * Each element represents one age bracket.  The numeric keys are the series
 * labels (e.g. "Own Eggs" or "Donor Eggs") mapped to live-birth rate %.
 *
 * Records with suppressed or missing `data_value` are skipped.
 */
export function transformSuccessRatesByAge(
  records: CdcArtRecord[],
  options: SuccessRatesOptions = { eggSource: "own" }
): SuccessRateBarDatum[] {
  const { eggSource, seriesLabel } = options;

  // Decide which records to keep and what label to give each series.
  // The egg-source info lives in `subtopic`, not `question`.
  function labelFor(rec: CdcArtRecord): string | null {
    const s = (rec.subtopic ?? "").toLowerCase();
    const q = (rec.question ?? "").toLowerCase();
    const text = `${s} ${q}`;

    const isOwn =
      text.includes("own egg") || text.includes("own-egg") || text.includes("their own");
    const isDonor = text.includes("donor");

    if (eggSource === "own") {
      if (!isOwn) return null;
      return seriesLabel ?? "Own Eggs";
    }
    if (eggSource === "donor") {
      if (!isDonor) return null;
      return seriesLabel ?? "Donor Eggs";
    }
    // "both" — assign label by content
    if (isDonor) return "Donor Eggs";
    if (isOwn) return "Own Eggs";
    return null;
  }

  // Accumulate sum + count per [ageBracket][series] for averaging.
  type Accumulator = Record<string, Record<string, { sum: number; count: number }>>;
  const acc: Accumulator = {};

  for (const age of AGE_BRACKETS) {
    acc[age] = {};
  }

  for (const rec of records) {
    if (!isRateQuestion(rec.question)) continue;

    const rate = parseRate(rec.data_value);
    if (rate === null) continue;

    const age = normaliseAgeBracket(rec.breakout);
    if (age === null) continue;

    const label = labelFor(rec);
    if (label === null) continue;

    if (!acc[age][label]) {
      acc[age][label] = { sum: 0, count: 0 };
    }
    acc[age][label].sum += rate;
    acc[age][label].count += 1;
  }

  return AGE_BRACKETS.map((age) => {
    const datum: SuccessRateBarDatum = { ageGroup: age };
    for (const [series, { sum, count }] of Object.entries(acc[age])) {
      datum[series] = parseFloat((sum / count).toFixed(1));
    }
    return datum;
  });
}

/**
 * Multi-year variant: takes an array of { year, records } and produces
 * grouped-bar data where each series key is a year (e.g. "2020", "2021", "2022").
 * Averages own-egg success rates per age bracket per year.
 */
export function transformSuccessRatesByAgeMultiYear(
  yearData: Array<{ year: string; records: CdcArtRecord[] }>,
): SuccessRateBarDatum[] {
  // acc[ageBracket][year] = { sum, count }
  type Acc = Record<string, Record<string, { sum: number; count: number }>>;
  const acc: Acc = {};
  for (const age of AGE_BRACKETS) {
    acc[age] = {};
  }

  for (const { year, records } of yearData) {
    for (const rec of records) {
      if (!isRateQuestion(rec.question)) continue;

      const text = `${(rec.subtopic ?? "").toLowerCase()} ${(rec.question ?? "").toLowerCase()}`;
      const isOwn =
        text.includes("own egg") || text.includes("own-egg") || text.includes("their own");
      if (!isOwn) continue;

      const rate = parseRate(rec.data_value);
      if (rate === null) continue;

      const age = normaliseAgeBracket(rec.breakout);
      if (age === null) continue;

      if (!acc[age][year]) {
        acc[age][year] = { sum: 0, count: 0 };
      }
      acc[age][year].sum += rate;
      acc[age][year].count += 1;
    }
  }

  return AGE_BRACKETS.map((age) => {
    const datum: SuccessRateBarDatum = { ageGroup: age };
    for (const [year, { sum, count }] of Object.entries(acc[age])) {
      datum[year] = parseFloat((sum / count).toFixed(1));
    }
    return datum;
  });
}

/**
 * Transform CDC ART records (9tjt-seye dataset) into PGT-A vs Non-PGT-A
 * live birth rate data per age bracket.
 *
 * The 9tjt-seye summary dataset encodes PGT status in the question text:
 *   - "preimplantation genetic testing performed" → PGT-A series
 *   - "preimplantation genetic testing not performed" → Non-PGT-A series
 * Rates are sourced from the "Percentage of intended retrievals resulting in
 * live-birth deliveries" question, filtered to own-egg subtopics.
 */
export function transformLiveBirthRatesByAgePgt(
  records: CdcArtRecord[],
): SuccessRateBarDatum[] {
  type Acc = Record<string, Record<string, { sum: number; count: number }>>;
  const acc: Acc = {};
  for (const age of AGE_BRACKETS) {
    acc[age] = { "PGT-A": { sum: 0, count: 0 }, "Non-PGT-A": { sum: 0, count: 0 } };
  }

  for (const rec of records) {
    const q = (rec.question ?? "").toLowerCase();
    const s = (rec.subtopic ?? "").toLowerCase();

    // Must be a live-birth rate for own-egg cycles
    const isLiveBirth = q.includes("live-birth") || q.includes("live birth");
    const isOwn = s.includes("own egg") || s.includes("their own");
    if (!isLiveBirth || !isOwn) continue;

    const rate = parseRate(rec.data_value);
    if (rate === null) continue;

    const age = normaliseAgeBracket(rec.breakout);
    if (age === null) continue;

    // Detect PGT status from question text
    const hasPgt = q.includes("preimplantation genetic") || q.includes("pgt");
    const isNotPerformed = q.includes("not performed");

    let series: string;
    if (hasPgt && isNotPerformed) {
      series = "Non-PGT-A";
    } else if (hasPgt) {
      series = "PGT-A";
    } else {
      continue;
    }

    acc[age][series].sum += rate;
    acc[age][series].count += 1;
  }

  return AGE_BRACKETS.map((age) => {
    const datum: SuccessRateBarDatum = { ageGroup: age };
    for (const series of ["PGT-A", "Non-PGT-A"] as const) {
      const { sum, count } = acc[age][series];
      if (count > 0) {
        datum[series] = parseFloat((sum / count).toFixed(1));
      }
    }
    return datum;
  });
}

/**
 * Shape SART PGT static data into Nivo grouped-bar data.
 * Each row maps one age group to its PGT-A and Non-PGT-A live birth rates.
 */
export function transformSartPgtData(data: PgtAgeDatum[]): SuccessRateBarDatum[] {
  return data.map((d) => ({
    ageGroup: d.ageGroup,
    "PGT-A": d.pgtA,
    "Non-PGT-A": d.nonPgtA,
  }));
}

// ---------------------------------------------------------------------------
// Panel 2 — Clinic Explorer
// ---------------------------------------------------------------------------

export type ClinicExplorerOptions = {
  /** State abbreviation to filter by, e.g. "OR". Pass undefined to include all. */
  state?: string;
  /** Minimum number of transfers required to include a clinic. Default: 0. */
  minTransfers?: number;
  /** Maximum number of clinics to return (sorted by livebirthRate desc). Default: 20. */
  topN?: number;
};

/**
 * Transform CDC ART records into Nivo horizontal-bar data for Panel 2.
 *
 * Returns up to `topN` clinics sorted by live-birth rate descending,
 * each with an aggregated rate (average across questions matching "live birth").
 */
export function transformClinicExplorer(
  records: CdcArtRecord[],
  options: ClinicExplorerOptions = {}
): ClinicBarDatum[] {
  const { state, minTransfers = 0, topN = 20 } = options;

  // Filter records relevant to clinic-level live birth rates.
  function isLiveBirthRecord(rec: CdcArtRecord): boolean {
    return rec.question.toLowerCase().includes("live birth");
  }

  // Aggregate per clinic: sum rates + count records, track transfers.
  type ClinicAcc = {
    rateSum: number;
    rateCount: number;
    numTransfers: number;
    state: string;
  };
  const clinicMap = new Map<string, ClinicAcc>();

  for (const rec of records) {
    if (state && rec.locationabbr.toUpperCase() !== state.toUpperCase()) continue;
    if (!isLiveBirthRecord(rec)) continue;

    const rate = parseRate(rec.data_value);
    if (rate === null) continue;

    const transfers = rec.num_transfers ? parseInt(rec.num_transfers, 10) : 0;
    const existing = clinicMap.get(rec.facilityname);

    if (existing) {
      existing.rateSum += rate;
      existing.rateCount += 1;
      // Use the largest transfer count seen across records for this clinic.
      if (transfers > existing.numTransfers) {
        existing.numTransfers = transfers;
      }
    } else {
      clinicMap.set(rec.facilityname, {
        rateSum: rate,
        rateCount: 1,
        numTransfers: transfers,
        state: rec.locationabbr,
      });
    }
  }

  const results: ClinicBarDatum[] = [];

  for (const [clinic, data] of clinicMap.entries()) {
    if (data.numTransfers < minTransfers) continue;
    results.push({
      clinic,
      livebirthRate: parseFloat((data.rateSum / data.rateCount).toFixed(1)),
      numTransfers: data.numTransfers,
      state: data.state,
    });
  }

  // Sort by rate descending, then cap at topN.
  results.sort((a, b) => b.livebirthRate - a.livebirthRate);
  return results.slice(0, topN);
}

// ---------------------------------------------------------------------------
// Panel 3 — hCG Curve Explorer
// ---------------------------------------------------------------------------

export type HcgSeriesFilter = "singleton" | "twins" | "both";

/**
 * Transform static hCG data points into Nivo line series for Panel 3.
 *
 * Returns three series per type (median, low, high) so the chart can render
 * the confidence band using an area layer between `low` and `high`.
 */
export function transformHcgCurve(
  dataPoints: HcgDataPoint[],
  filter: HcgSeriesFilter = "singleton"
): NivoLineSeries[] {
  const types: Array<"singleton" | "twins"> =
    filter === "both" ? ["singleton", "twins"] : [filter];

  const series: NivoLineSeries[] = [];

  for (const type of types) {
    const filtered = dataPoints
      .filter((p) => p.type === type)
      .sort((a, b) => a.dpo - b.dpo);

    const label = type === "singleton" ? "Singleton" : "Twins";

    series.push({
      id: `${label} Median`,
      data: filtered.map((p) => ({ x: p.dpo, y: p.median })),
    });
    series.push({
      id: `${label} Low (5th)`,
      data: filtered.map((p) => ({ x: p.dpo, y: p.low })),
    });
    series.push({
      id: `${label} High (95th)`,
      data: filtered.map((p) => ({ x: p.dpo, y: p.high })),
    });
  }

  return series;
}

/**
 * Build a single "user beta" point series so the user can plot their own
 * hCG value against the reference curves.
 */
export function transformUserBeta(dpo: number, value: number): NivoLineSeries {
  return {
    id: "My Beta",
    data: [{ x: dpo, y: value }],
  };
}

// ---------------------------------------------------------------------------
// Panel 4 — Miscarriage Risk
// ---------------------------------------------------------------------------

/**
 * Shape weekly miscarriage risk data (from getMiscarriageRisk or a precomputed
 * array) into a Nivo line series array for Panel 4.
 *
 * @param weeklyRisks Array indexed 0-based from week 4, each element is the
 *   cumulative risk (0–100 %) at that gestational week.
 * @param startWeek  The gestational week of the first element (default 4).
 */
export function transformMiscarriageRiskCurve(
  weeklyRisks: number[],
  startWeek = 4
): NivoLineSeries[] {
  const data: MiscarriageRiskDatum[] = weeklyRisks.map((risk, i) => ({
    week: startWeek + i,
    risk: parseFloat(risk.toFixed(2)),
  }));

  return [
    {
      id: "Miscarriage Risk",
      data: data.map((d) => ({ x: d.week, y: d.risk })),
    },
  ];
}

// ---------------------------------------------------------------------------
// Panel 5 — DPO Test Accuracy (diverging bar)
// ---------------------------------------------------------------------------

/**
 * Transform DPO data points into a diverging bar shape for Nivo.
 *
 * False-negative values are negated so bars extend left of center.
 * The `dpo` field is stringified for use as the Nivo index key.
 */
export function transformDpoTestAccuracy(
  dataPoints: DpoDataPoint[],
): DpoBarDatum[] {
  return dataPoints.map((p) => ({
    dpo: `${p.dpo} DPO`,
    positive: p.positive,
    falseNegative: -p.falseNegative,
    interpolated: !!p.interpolated,
  }));
}

// ---------------------------------------------------------------------------
// Conception Timing — Ovia 2019 (vertical bar)
// ---------------------------------------------------------------------------

/**
 * Transform Ovia conception data points into a Nivo bar shape.
 *
 * Day labels use a minus sign (−) for days before ovulation and "Ovulation"
 * for day 0, making the x-axis immediately readable.
 */
export function transformConceptionTiming(
  dataPoints: OviaConceptionDataPoint[],
): ConceptionTimingBarDatum[] {
  return dataPoints.map((p) => {
    let label: string;
    if (p.dayRelativeToOvulation === 0) {
      label = "Ovulation";
    } else if (p.dayRelativeToOvulation > 0) {
      label = `+${p.dayRelativeToOvulation}`;
    } else {
      label = `${p.dayRelativeToOvulation}`;
    }
    return { label, probability: p.conceptionProbability, day: p.dayRelativeToOvulation };
  });
}
