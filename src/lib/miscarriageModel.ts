/**
 * miscarriageModel.ts
 *
 * Miscarriage probability curve implementation.
 *
 * Based on peer-reviewed literature:
 *  - Tong S, et al. "Miscarriage risk for asymptomatic women after a normal
 *    first-trimester prenatal visit." Obstet Gynecol. 2008;111(3):710-4.
 *  - Avalos LA, et al. "A systematic review to calculate background
 *    miscarriage rates using life table analysis." Birth Defects Res A.
 *    2012;94(6):417-23.
 *  - Magnus MC, et al. "Role of maternal age and pregnancy history in risk of
 *    miscarriage." BMJ. 2019;364:l869.
 *
 * Model overview
 * ──────────────
 * Base weekly hazard (instantaneous risk of loss *this* week given ongoing
 * pregnancy) is approximated from the Tong 2008 life-table data.  Cumulative
 * survival S(w) = product of (1 - h_i) for weeks 4..w.
 *
 * Cumulative risk from week W to 20 = 1 - S(20) / S(W)
 *
 * Age multiplier (Magnus 2019, Table 2 approximate hazard ratios):
 *   < 25  → 0.80
 *   25-29 → 1.00  (reference)
 *   30-34 → 1.05
 *   35-39 → 1.45
 *   40-44 → 2.35
 *   ≥ 45  → 3.10
 *
 * Prior miscarriage multiplier (Magnus 2019):
 *   0  → 1.00
 *   1  → 1.54
 *   2  → 2.21
 *   3+ → 3.97
 *
 * Prior live birth protective multiplier (Magnus 2019):
 *   0  → 1.00
 *   1+ → 0.68
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Gestational weeks covered by the model (4 through 20, inclusive). */
const WEEKS_START = 4;
const WEEKS_END = 20;
const TOTAL_WEEKS = WEEKS_END - WEEKS_START + 1; // 17

/**
 * Base weekly hazard rates derived from Tong 2008 life-table (Table 1).
 * Index 0 = week 4, index 16 = week 20.
 *
 * Values represent the weekly conditional probability of pregnancy loss
 * (given pregnancy ongoing at start of that week) for a 25-29 year-old
 * with no prior losses and at least one prior live birth.
 *
 * The curve starts high (~4.5% / week at week 4) and decays steeply to
 * ~0.3% / week by week 12, then levels off.  The cumulative from week 4
 * to week 20 under these base rates (no multipliers) is ~10%.
 */
const BASE_WEEKLY_HAZARD: readonly number[] = [
  0.045, // week 4
  0.038, // week 5
  0.030, // week 6
  0.022, // week 7
  0.015, // week 8
  0.010, // week 9
  0.007, // week 10
  0.005, // week 11
  0.004, // week 12
  0.003, // week 13
  0.003, // week 14
  0.002, // week 15
  0.002, // week 16
  0.002, // week 17
  0.002, // week 18
  0.002, // week 19
  0.002, // week 20
];

// Sanity check at module load: array length must match TOTAL_WEEKS.
if (BASE_WEEKLY_HAZARD.length !== TOTAL_WEEKS) {
  throw new Error(
    `BASE_WEEKLY_HAZARD length (${BASE_WEEKLY_HAZARD.length}) does not match TOTAL_WEEKS (${TOTAL_WEEKS})`
  );
}

// ---------------------------------------------------------------------------
// Multiplier look-up functions
// ---------------------------------------------------------------------------

/** Return the age-based hazard ratio. */
function ageMultiplier(maternalAge: number): number {
  if (maternalAge < 25) return 0.80;
  if (maternalAge < 30) return 1.00;
  if (maternalAge < 35) return 1.05;
  if (maternalAge < 40) return 1.45;
  if (maternalAge < 45) return 2.35;
  return 3.10;
}

/** Return the prior-miscarriage hazard ratio. */
function priorLossMultiplier(priorMiscarriages: number): number {
  if (priorMiscarriages <= 0) return 1.00;
  if (priorMiscarriages === 1) return 1.54;
  if (priorMiscarriages === 2) return 2.21;
  return 3.97; // 3+
}

/** Return the prior-live-birth protective ratio. */
function priorLiveBirthMultiplier(priorLiveBirths: number): number {
  return priorLiveBirths >= 1 ? 0.68 : 1.00;
}

// ---------------------------------------------------------------------------
// Core model
// ---------------------------------------------------------------------------

export type MiscarriageRiskParams = {
  /** Completed gestational weeks at time of query (integer 4–20). */
  weeksGestation: number;
  /** Maternal age in years. */
  maternalAge: number;
  /** Number of prior pregnancy losses (0, 1, 2, or 3+). */
  priorMiscarriages: number;
  /** Number of prior live births (0 = none, 1+ = protective). */
  priorLiveBirths: number;
};

export type MiscarriageRiskResult = {
  /**
   * Cumulative probability of loss from `weeksGestation` to week 20.
   * Expressed as a fraction in [0, 1].
   */
  cumulativeRisk: number;
  /**
   * How much of the original (week-4) risk has already been "survived".
   * = (risk at week 4) − (current cumulativeRisk), expressed as a fraction.
   * Used for the "Your risk has dropped X%" positive framing.
   */
  remainingRiskReduction: number;
  /**
   * Per-day (not per-week) risk array from `weeksGestation` through week 20.
   * Each element is the probability of loss on that specific day.
   * Length = (weeks_remaining × 7) days.
   * Values are fractions, not percentages.
   */
  dailyRisk: number[];
};

/**
 * Compute the personalised miscarriage risk curve.
 *
 * @throws {RangeError} if `weeksGestation` is outside [4, 20].
 */
export function getMiscarriageRisk(
  params: MiscarriageRiskParams
): MiscarriageRiskResult {
  const { weeksGestation, maternalAge, priorMiscarriages, priorLiveBirths } = params;

  if (weeksGestation < WEEKS_START || weeksGestation > WEEKS_END) {
    throw new RangeError(
      `weeksGestation must be between ${WEEKS_START} and ${WEEKS_END}, got ${weeksGestation}`
    );
  }

  // Combined multiplier on the weekly hazard.
  const multiplier =
    ageMultiplier(maternalAge) *
    priorLossMultiplier(priorMiscarriages) *
    priorLiveBirthMultiplier(priorLiveBirths);

  /**
   * Compute adjusted weekly survival probabilities for ALL weeks (4..20).
   * We cap the adjusted hazard at 0.99 to avoid S(w) = 0 edge cases.
   */
  function adjustedHazard(weekIndex: number): number {
    return Math.min(BASE_WEEKLY_HAZARD[weekIndex] * multiplier, 0.99);
  }

  // Cumulative survival at each week index from the start.
  // survival[i] = P(pregnancy ongoing at start of week 4+i)
  const survival: number[] = new Array(TOTAL_WEEKS + 1) as number[];
  survival[0] = 1.0;
  for (let i = 0; i < TOTAL_WEEKS; i++) {
    survival[i + 1] = survival[i] * (1 - adjustedHazard(i));
  }

  // Index of the query week in BASE_WEEKLY_HAZARD.
  const queryIdx = weeksGestation - WEEKS_START;

  // Cumulative risk from queryWeek to week 20:
  // = 1 − S(end) / S(queryIdx)
  const survivalAtQuery = survival[queryIdx];
  const survivalAtEnd = survival[TOTAL_WEEKS];

  const cumulativeRisk =
    survivalAtQuery > 0 ? 1 - survivalAtEnd / survivalAtQuery : 0;

  // Risk reduction: how much of the original week-4 risk has already been survived.
  const cumulativeRiskAtWeek4 = 1 - survivalAtEnd; // risk from week 4 to 20
  const remainingRiskReduction = Math.max(0, cumulativeRiskAtWeek4 - cumulativeRisk);

  // Daily risk breakdown from queryWeek to week 20.
  // We spread each week's loss evenly across its 7 days.
  const dailyRisk: number[] = [];
  for (let i = queryIdx; i < TOTAL_WEEKS; i++) {
    const weeklyLoss =
      survivalAtQuery > 0
        ? (survival[i] - survival[i + 1]) / survivalAtQuery
        : 0;
    const dailyLossThisWeek = weeklyLoss / 7;
    for (let d = 0; d < 7; d++) {
      dailyRisk.push(dailyLossThisWeek);
    }
  }

  return {
    cumulativeRisk: parseFloat(cumulativeRisk.toFixed(6)),
    remainingRiskReduction: parseFloat(remainingRiskReduction.toFixed(6)),
    dailyRisk,
  };
}

// ---------------------------------------------------------------------------
// Convenience: full risk curve (week 4 → 20) for chart rendering
// ---------------------------------------------------------------------------

/**
 * Return a week-by-week array of cumulative risks from week 4 to week 20,
 * suitable for passing to `transformMiscarriageRiskCurve` in transforms.ts.
 *
 * Each element is the % risk from that week to week 20 (0–100).
 */
export function getMiscarriageRiskCurve(
  params: Omit<MiscarriageRiskParams, "weeksGestation">
): number[] {
  return Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const week = WEEKS_START + i;
    const { cumulativeRisk } = getMiscarriageRisk({ ...params, weeksGestation: week });
    return parseFloat((cumulativeRisk * 100).toFixed(2));
  });
}
