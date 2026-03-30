/**
 * Unit tests for src/lib/miscarriageModel.ts
 *
 * Coverage targets:
 *  - getMiscarriageRisk (core model)
 *  - getMiscarriageRiskCurve (convenience wrapper)
 *  - Age multiplier branches
 *  - Prior miscarriage multiplier branches
 *  - Prior live-birth multiplier branches
 *  - Error / range validation
 *  - dailyRisk array properties
 */

import { describe, it, expect } from "vitest";
import { getMiscarriageRisk, getMiscarriageRiskCurve } from "@/lib/miscarriageModel";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Reference params: 28yo, no prior losses, 1 prior live birth. */
const REFERENCE_PARAMS = {
  maternalAge: 28,
  priorMiscarriages: 0,
  priorLiveBirths: 1,
};

// ---------------------------------------------------------------------------
// getMiscarriageRisk — basic output shape
// ---------------------------------------------------------------------------

describe("getMiscarriageRisk", () => {
  describe("output shape", () => {
    it("returns an object with cumulativeRisk, remainingRiskReduction, and dailyRisk", () => {
      const result = getMiscarriageRisk({ weeksGestation: 6, ...REFERENCE_PARAMS });
      expect(result).toHaveProperty("cumulativeRisk");
      expect(result).toHaveProperty("remainingRiskReduction");
      expect(result).toHaveProperty("dailyRisk");
    });

    it("cumulativeRisk is a number in [0, 1]", () => {
      const result = getMiscarriageRisk({ weeksGestation: 6, ...REFERENCE_PARAMS });
      expect(result.cumulativeRisk).toBeGreaterThanOrEqual(0);
      expect(result.cumulativeRisk).toBeLessThanOrEqual(1);
    });

    it("remainingRiskReduction is a number in [0, 1]", () => {
      const result = getMiscarriageRisk({ weeksGestation: 6, ...REFERENCE_PARAMS });
      expect(result.remainingRiskReduction).toBeGreaterThanOrEqual(0);
      expect(result.remainingRiskReduction).toBeLessThanOrEqual(1);
    });

    it("dailyRisk is an array of numbers", () => {
      const result = getMiscarriageRisk({ weeksGestation: 6, ...REFERENCE_PARAMS });
      expect(Array.isArray(result.dailyRisk)).toBe(true);
      result.dailyRisk.forEach((v) => expect(typeof v).toBe("number"));
    });
  });

  // ---------------------------------------------------------------------------
  // dailyRisk array length
  // ---------------------------------------------------------------------------

  describe("dailyRisk array length", () => {
    it("has 7 × (weeks remaining) elements from the query week to week 20", () => {
      for (const week of [4, 6, 8, 10, 12, 16, 20]) {
        const result = getMiscarriageRisk({
          weeksGestation: week,
          ...REFERENCE_PARAMS,
        });
        const expectedDays = (20 - week + 1) * 7;
        expect(result.dailyRisk).toHaveLength(expectedDays);
      }
    });

    it("dailyRisk has 7 elements when queried at week 20", () => {
      const result = getMiscarriageRisk({ weeksGestation: 20, ...REFERENCE_PARAMS });
      expect(result.dailyRisk).toHaveLength(7);
    });

    it("dailyRisk has 119 elements when queried at week 4 (17 weeks × 7 days)", () => {
      const result = getMiscarriageRisk({ weeksGestation: 4, ...REFERENCE_PARAMS });
      expect(result.dailyRisk).toHaveLength(119);
    });
  });

  // ---------------------------------------------------------------------------
  // dailyRisk values
  // ---------------------------------------------------------------------------

  describe("dailyRisk values", () => {
    it("each daily risk value is non-negative", () => {
      const result = getMiscarriageRisk({ weeksGestation: 4, ...REFERENCE_PARAMS });
      result.dailyRisk.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    });

    it("daily risk values sum to approximately cumulativeRisk", () => {
      const result = getMiscarriageRisk({ weeksGestation: 4, ...REFERENCE_PARAMS });
      const sum = result.dailyRisk.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(result.cumulativeRisk, 4);
    });

    it("daily risks are higher in early weeks than later weeks", () => {
      const result = getMiscarriageRisk({ weeksGestation: 4, ...REFERENCE_PARAMS });
      // First week's sum vs last week's sum.
      const firstWeekSum = result.dailyRisk.slice(0, 7).reduce((a, b) => a + b, 0);
      const lastWeekSum = result.dailyRisk.slice(-7).reduce((a, b) => a + b, 0);
      expect(firstWeekSum).toBeGreaterThan(lastWeekSum);
    });

    it("all 7 daily values within a single week are equal (uniform spread)", () => {
      const result = getMiscarriageRisk({ weeksGestation: 6, ...REFERENCE_PARAMS });
      // Days 0-6 are week 6, days 7-13 are week 7, etc.
      for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
        const start = weekOffset * 7;
        const weekDays = result.dailyRisk.slice(start, start + 7);
        weekDays.forEach((v) => expect(v).toBeCloseTo(weekDays[0], 10));
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Monotone risk reduction
  // ---------------------------------------------------------------------------

  describe("risk decreases as gestational age increases", () => {
    it("cumulativeRisk at week 6 is less than at week 4", () => {
      const week4 = getMiscarriageRisk({ weeksGestation: 4, ...REFERENCE_PARAMS });
      const week6 = getMiscarriageRisk({ weeksGestation: 6, ...REFERENCE_PARAMS });
      expect(week6.cumulativeRisk).toBeLessThan(week4.cumulativeRisk);
    });

    it("cumulativeRisk is strictly decreasing from week 4 to week 20", () => {
      const risks = Array.from({ length: 17 }, (_, i) =>
        getMiscarriageRisk({ weeksGestation: 4 + i, ...REFERENCE_PARAMS })
          .cumulativeRisk
      );
      for (let i = 1; i < risks.length; i++) {
        expect(risks[i]).toBeLessThan(risks[i - 1]);
      }
    });

    it("cumulativeRisk at week 20 is near 0 (very low remaining risk)", () => {
      const result = getMiscarriageRisk({ weeksGestation: 20, ...REFERENCE_PARAMS });
      // At week 20 there is only the week-20 hazard remaining.
      expect(result.cumulativeRisk).toBeLessThan(0.01);
    });
  });

  // ---------------------------------------------------------------------------
  // remainingRiskReduction
  // ---------------------------------------------------------------------------

  describe("remainingRiskReduction", () => {
    it("is 0 when queried at week 4 (no risk has been survived yet)", () => {
      const result = getMiscarriageRisk({ weeksGestation: 4, ...REFERENCE_PARAMS });
      expect(result.remainingRiskReduction).toBe(0);
    });

    it("increases as gestational week increases", () => {
      const reductions = Array.from({ length: 17 }, (_, i) =>
        getMiscarriageRisk({ weeksGestation: 4 + i, ...REFERENCE_PARAMS })
          .remainingRiskReduction
      );
      for (let i = 1; i < reductions.length; i++) {
        expect(reductions[i]).toBeGreaterThanOrEqual(reductions[i - 1]);
      }
    });

    it("cumulativeRisk + remainingRiskReduction ≈ total risk from week 4", () => {
      const week4Risk = getMiscarriageRisk({
        weeksGestation: 4,
        ...REFERENCE_PARAMS,
      }).cumulativeRisk;

      for (const week of [6, 8, 10, 12]) {
        const result = getMiscarriageRisk({
          weeksGestation: week,
          ...REFERENCE_PARAMS,
        });
        expect(result.cumulativeRisk + result.remainingRiskReduction).toBeCloseTo(
          week4Risk,
          4
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Base risk curve magnitude
  // ---------------------------------------------------------------------------

  describe("base risk curve magnitude (reference params: age 28, 0 prior losses, 1 prior birth)", () => {
    it("cumulative risk at week 4 is approximately 10-20% (no live birth modifier)", () => {
      // Base hazards sum to ~17.9% across weeks 4-20 with no multipliers.
      // This reflects the Tong 2008 life-table aggregate risk across the window.
      const result = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 28,
        priorMiscarriages: 0,
        priorLiveBirths: 0,
      });
      expect(result.cumulativeRisk).toBeGreaterThan(0.10);
      expect(result.cumulativeRisk).toBeLessThan(0.25);
    });

    it("cumulative risk at week 12 is less than 4% (reference params, no live birth)", () => {
      // Most risk has passed by week 12; remaining ~2.2% from week 12 to 20.
      const result = getMiscarriageRisk({
        weeksGestation: 12,
        maternalAge: 28,
        priorMiscarriages: 0,
        priorLiveBirths: 0,
      });
      expect(result.cumulativeRisk).toBeLessThan(0.04);
    });
  });

  // ---------------------------------------------------------------------------
  // Age multiplier
  // ---------------------------------------------------------------------------

  describe("age multiplier", () => {
    it("risk for age 40+ is higher than for age 28", () => {
      const young = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 28,
        priorMiscarriages: 0,
        priorLiveBirths: 0,
      });
      const older = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 40,
        priorMiscarriages: 0,
        priorLiveBirths: 0,
      });
      expect(older.cumulativeRisk).toBeGreaterThan(young.cumulativeRisk);
    });

    it("risk for age 45+ is higher than for age 40", () => {
      const age40 = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 40,
        priorMiscarriages: 0,
        priorLiveBirths: 0,
      });
      const age45 = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 45,
        priorMiscarriages: 0,
        priorLiveBirths: 0,
      });
      expect(age45.cumulativeRisk).toBeGreaterThan(age40.cumulativeRisk);
    });

    it("risk for age under 25 is lower than for age 28", () => {
      const young = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 22,
        priorMiscarriages: 0,
        priorLiveBirths: 0,
      });
      const ref = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 28,
        priorMiscarriages: 0,
        priorLiveBirths: 0,
      });
      expect(young.cumulativeRisk).toBeLessThan(ref.cumulativeRisk);
    });

    it("covers all age bands: <25, 25-29, 30-34, 35-39, 40-44, >=45", () => {
      const ages = [22, 27, 32, 37, 42, 46];
      const risks = ages.map((age) =>
        getMiscarriageRisk({
          weeksGestation: 4,
          maternalAge: age,
          priorMiscarriages: 0,
          priorLiveBirths: 0,
        }).cumulativeRisk
      );
      // Each successive band should produce a higher risk than the reference (28).
      // Here we just verify all are in a plausible range.
      risks.forEach((r) => {
        expect(r).toBeGreaterThan(0);
        expect(r).toBeLessThan(1);
      });
      // Monotonically increasing after age 24 (22 < 27 < 32 < 37 < 42 < 46).
      for (let i = 1; i < risks.length; i++) {
        expect(risks[i]).toBeGreaterThan(risks[i - 1]);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Prior miscarriage multiplier
  // ---------------------------------------------------------------------------

  describe("prior miscarriage multiplier", () => {
    function riskAt4Weeks(priorMiscarriages: number) {
      return getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 28,
        priorMiscarriages,
        priorLiveBirths: 0,
      }).cumulativeRisk;
    }

    it("1 prior miscarriage produces higher risk than 0", () => {
      expect(riskAt4Weeks(1)).toBeGreaterThan(riskAt4Weeks(0));
    });

    it("2 prior miscarriages produces higher risk than 1", () => {
      expect(riskAt4Weeks(2)).toBeGreaterThan(riskAt4Weeks(1));
    });

    it("3 prior miscarriages produces higher risk than 2", () => {
      expect(riskAt4Weeks(3)).toBeGreaterThan(riskAt4Weeks(2));
    });

    it("4 or more prior miscarriages uses the same multiplier as 3", () => {
      expect(riskAt4Weeks(4)).toBeCloseTo(riskAt4Weeks(3), 6);
    });
  });

  // ---------------------------------------------------------------------------
  // Prior live birth multiplier
  // ---------------------------------------------------------------------------

  describe("prior live birth multiplier", () => {
    it("1 prior live birth reduces risk compared to 0 prior live births", () => {
      const noBirth = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 28,
        priorMiscarriages: 0,
        priorLiveBirths: 0,
      });
      const oneBirth = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 28,
        priorMiscarriages: 0,
        priorLiveBirths: 1,
      });
      expect(oneBirth.cumulativeRisk).toBeLessThan(noBirth.cumulativeRisk);
    });

    it("2 prior live births produce the same risk as 1 (multiplier saturates at 1+)", () => {
      const one = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 28,
        priorMiscarriages: 0,
        priorLiveBirths: 1,
      });
      const two = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 28,
        priorMiscarriages: 0,
        priorLiveBirths: 2,
      });
      expect(one.cumulativeRisk).toBeCloseTo(two.cumulativeRisk, 6);
    });
  });

  // ---------------------------------------------------------------------------
  // Boundary: week 4 and week 20
  // ---------------------------------------------------------------------------

  describe("boundary gestational weeks", () => {
    it("accepts weeksGestation = 4 (lower boundary)", () => {
      expect(() =>
        getMiscarriageRisk({ weeksGestation: 4, ...REFERENCE_PARAMS })
      ).not.toThrow();
    });

    it("accepts weeksGestation = 20 (upper boundary)", () => {
      expect(() =>
        getMiscarriageRisk({ weeksGestation: 20, ...REFERENCE_PARAMS })
      ).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe("error handling", () => {
    it("throws RangeError when weeksGestation < 4", () => {
      expect(() =>
        getMiscarriageRisk({ weeksGestation: 3, ...REFERENCE_PARAMS })
      ).toThrow(RangeError);
    });

    it("throws RangeError when weeksGestation > 20", () => {
      expect(() =>
        getMiscarriageRisk({ weeksGestation: 21, ...REFERENCE_PARAMS })
      ).toThrow(RangeError);
    });

    it("error message includes the invalid value", () => {
      expect(() =>
        getMiscarriageRisk({ weeksGestation: 0, ...REFERENCE_PARAMS })
      ).toThrow("0");
    });

    it("throws RangeError for a negative week", () => {
      expect(() =>
        getMiscarriageRisk({ weeksGestation: -1, ...REFERENCE_PARAMS })
      ).toThrow(RangeError);
    });
  });

  // ---------------------------------------------------------------------------
  // Extreme multiplier combinations
  // ---------------------------------------------------------------------------

  describe("extreme combinations", () => {
    it("cumulativeRisk never exceeds 1.0 even for high-risk params", () => {
      const result = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 45,
        priorMiscarriages: 3,
        priorLiveBirths: 0,
      });
      expect(result.cumulativeRisk).toBeLessThanOrEqual(1.0);
    });

    it("cumulativeRisk is always non-negative for low-risk params", () => {
      const result = getMiscarriageRisk({
        weeksGestation: 20,
        maternalAge: 22,
        priorMiscarriages: 0,
        priorLiveBirths: 2,
      });
      expect(result.cumulativeRisk).toBeGreaterThanOrEqual(0);
    });

    it("high-risk params produce higher risk than low-risk params", () => {
      const high = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 45,
        priorMiscarriages: 3,
        priorLiveBirths: 0,
      });
      const low = getMiscarriageRisk({
        weeksGestation: 4,
        maternalAge: 22,
        priorMiscarriages: 0,
        priorLiveBirths: 1,
      });
      expect(high.cumulativeRisk).toBeGreaterThan(low.cumulativeRisk);
    });
  });

  // ---------------------------------------------------------------------------
  // Precision
  // ---------------------------------------------------------------------------

  describe("numeric precision", () => {
    it("cumulativeRisk is rounded to 6 decimal places", () => {
      const result = getMiscarriageRisk({ weeksGestation: 7, ...REFERENCE_PARAMS });
      const asString = result.cumulativeRisk.toString();
      const decimals = asString.includes(".") ? asString.split(".")[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(6);
    });

    it("remainingRiskReduction is rounded to 6 decimal places", () => {
      const result = getMiscarriageRisk({ weeksGestation: 7, ...REFERENCE_PARAMS });
      const asString = result.remainingRiskReduction.toString();
      const decimals = asString.includes(".") ? asString.split(".")[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(6);
    });
  });
});

// ---------------------------------------------------------------------------
// getMiscarriageRiskCurve
// ---------------------------------------------------------------------------

describe("getMiscarriageRiskCurve", () => {
  it("returns an array of 17 values (weeks 4 through 20 inclusive)", () => {
    const curve = getMiscarriageRiskCurve({ ...REFERENCE_PARAMS });
    expect(curve).toHaveLength(17);
  });

  it("all values are in the range [0, 100]", () => {
    const curve = getMiscarriageRiskCurve({ ...REFERENCE_PARAMS });
    curve.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  it("values are strictly decreasing (each week lower than the previous)", () => {
    const curve = getMiscarriageRiskCurve({ ...REFERENCE_PARAMS });
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]).toBeLessThan(curve[i - 1]);
    }
  });

  it("first value (week 4) is approximately 5-15 percent", () => {
    // Reference params include 1 prior live birth (0.68 multiplier) which
    // reduces the ~17.9% base to ~12.5%. The range here is intentionally
    // wide enough to accommodate the full multiplier space of these params.
    const curve = getMiscarriageRiskCurve({ ...REFERENCE_PARAMS });
    expect(curve[0]).toBeGreaterThan(5);
    expect(curve[0]).toBeLessThan(15);
  });

  it("last value (week 20) is less than 1 percent", () => {
    const curve = getMiscarriageRiskCurve({ ...REFERENCE_PARAMS });
    expect(curve[curve.length - 1]).toBeLessThan(1);
  });

  it("values are rounded to 2 decimal places", () => {
    const curve = getMiscarriageRiskCurve({ ...REFERENCE_PARAMS });
    curve.forEach((v) => {
      const asString = v.toString();
      const decimals = asString.includes(".") ? asString.split(".")[1].length : 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  it("higher age produces a uniformly higher risk curve", () => {
    const young = getMiscarriageRiskCurve({
      maternalAge: 28,
      priorMiscarriages: 0,
      priorLiveBirths: 0,
    });
    const older = getMiscarriageRiskCurve({
      maternalAge: 42,
      priorMiscarriages: 0,
      priorLiveBirths: 0,
    });
    young.forEach((v, i) => expect(older[i]).toBeGreaterThan(v));
  });

  it("matches individual getMiscarriageRisk calls for each week", () => {
    const curve = getMiscarriageRiskCurve({ ...REFERENCE_PARAMS });
    curve.forEach((v, i) => {
      const individual = getMiscarriageRisk({
        weeksGestation: 4 + i,
        ...REFERENCE_PARAMS,
      });
      expect(v).toBeCloseTo(individual.cumulativeRisk * 100, 1);
    });
  });
});
