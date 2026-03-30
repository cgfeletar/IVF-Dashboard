/**
 * Unit tests for src/lib/transforms.ts
 *
 * Coverage targets:
 *  - transformSuccessRatesByAge
 *  - transformClinicExplorer
 *  - transformHcgCurve
 *  - transformUserBeta
 *  - transformMiscarriageRiskCurve
 */

import { describe, it, expect } from "vitest";
import {
  transformSuccessRatesByAge,
  transformClinicExplorer,
  transformHcgCurve,
  transformUserBeta,
  transformMiscarriageRiskCurve,
} from "@/lib/transforms";
import type { CdcArtRecord } from "@/types/cdc";
import type { HcgDataPoint } from "@/lib/hcgData";
import { AGE_BRACKETS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<CdcArtRecord> = {}): CdcArtRecord {
  return {
    locationabbr: "OR",
    facilityname: "Oregon Fertility Institute",
    breakout: "<35",
    data_value: "50.0",
    subtopic: "Non-Donor ART Success Rates",
    question: "Live births per transfer (fresh embryos from own eggs)",
    year: "2022",
    num_transfers: "100",
    ...overrides,
  };
}

function makeHcgPoint(overrides: Partial<HcgDataPoint> = {}): HcgDataPoint {
  return {
    dpo: 14,
    median: 180,
    low: 57,
    high: 657,
    count: 6289,
    type: "singleton",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// transformSuccessRatesByAge
// ---------------------------------------------------------------------------

describe("transformSuccessRatesByAge", () => {
  describe("output shape", () => {
    it("always returns exactly five elements — one per age bracket", () => {
      const result = transformSuccessRatesByAge([]);
      expect(result).toHaveLength(5);
    });

    it("each element has an ageGroup matching a canonical bracket", () => {
      const result = transformSuccessRatesByAge([]);
      result.forEach((datum) => {
        expect(AGE_BRACKETS).toContain(datum.ageGroup);
      });
    });

    it("preserves the canonical bracket order", () => {
      const result = transformSuccessRatesByAge([]);
      expect(result.map((d) => d.ageGroup)).toEqual([...AGE_BRACKETS]);
    });
  });

  describe("own-eggs filtering (default)", () => {
    it("includes records whose question mentions 'own eggs'", () => {
      const records = [makeRecord({ breakout: "<35", data_value: "42.0" })];
      const result = transformSuccessRatesByAge(records);
      const under35 = result.find((d) => d.ageGroup === "<35");
      expect(under35?.["Own Eggs"]).toBe(42.0);
    });

    it("excludes donor-egg records when eggSource is 'own'", () => {
      const records = [
        makeRecord({
          breakout: "35-37",
          data_value: "35.0",
          question: "Live births per transfer (fresh donor eggs)",
        }),
      ];
      const result = transformSuccessRatesByAge(records, { eggSource: "own" });
      const bracket = result.find((d) => d.ageGroup === "35-37");
      expect(bracket?.["Own Eggs"]).toBeUndefined();
      expect(bracket?.["Donor Eggs"]).toBeUndefined();
    });

    it("uses 'Own Eggs' as the default series label", () => {
      const records = [makeRecord({ breakout: "<35", data_value: "40.0" })];
      const result = transformSuccessRatesByAge(records);
      const datum = result.find((d) => d.ageGroup === "<35")!;
      expect(Object.keys(datum)).toContain("Own Eggs");
    });

    it("uses a custom seriesLabel when provided", () => {
      const records = [makeRecord({ breakout: "<35", data_value: "40.0" })];
      const result = transformSuccessRatesByAge(records, {
        eggSource: "own",
        seriesLabel: "Fresh Own",
      });
      const datum = result.find((d) => d.ageGroup === "<35")!;
      expect(Object.keys(datum)).toContain("Fresh Own");
    });
  });

  describe("donor-egg filtering", () => {
    it("includes donor records when eggSource is 'donor'", () => {
      const records = [
        makeRecord({
          breakout: "38-40",
          data_value: "28.0",
          question: "Live births per transfer (fresh donor eggs)",
        }),
      ];
      const result = transformSuccessRatesByAge(records, { eggSource: "donor" });
      const bracket = result.find((d) => d.ageGroup === "38-40");
      expect(bracket?.["Donor Eggs"]).toBe(28.0);
    });

    it("excludes own-egg records when eggSource is 'donor'", () => {
      const records = [makeRecord({ breakout: "38-40", data_value: "40.0" })];
      const result = transformSuccessRatesByAge(records, { eggSource: "donor" });
      const bracket = result.find((d) => d.ageGroup === "38-40");
      expect(bracket?.["Own Eggs"]).toBeUndefined();
    });
  });

  describe("both mode", () => {
    it("returns both Own Eggs and Donor Eggs series when eggSource is 'both'", () => {
      const records = [
        makeRecord({ breakout: "<35", data_value: "45.0" }),
        makeRecord({
          breakout: "<35",
          data_value: "55.0",
          question: "Live births per transfer (fresh donor eggs)",
        }),
      ];
      const result = transformSuccessRatesByAge(records, { eggSource: "both" });
      const bracket = result.find((d) => d.ageGroup === "<35")!;
      expect(bracket["Own Eggs"]).toBe(45.0);
      expect(bracket["Donor Eggs"]).toBe(55.0);
    });

    it("skips records that match neither own-egg nor donor in 'both' mode", () => {
      const records = [
        makeRecord({
          breakout: "<35",
          data_value: "30.0",
          question: "Number of retrievals performed",
        }),
      ];
      const result = transformSuccessRatesByAge(records, { eggSource: "both" });
      const bracket = result.find((d) => d.ageGroup === "<35")!;
      // Neither "Own Eggs" nor "Donor Eggs" should be present.
      expect(bracket["Own Eggs"]).toBeUndefined();
      expect(bracket["Donor Eggs"]).toBeUndefined();
    });
  });

  describe("averaging", () => {
    it("averages multiple records for the same age bracket and series", () => {
      const records = [
        makeRecord({ breakout: "<35", data_value: "40.0" }),
        makeRecord({ breakout: "<35", data_value: "60.0" }),
      ];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === "<35")!;
      expect(bracket["Own Eggs"]).toBe(50.0);
    });

    it("rounds averaged values to one decimal place", () => {
      const records = [
        makeRecord({ breakout: "<35", data_value: "33.3" }),
        makeRecord({ breakout: "<35", data_value: "33.4" }),
        makeRecord({ breakout: "<35", data_value: "33.3" }),
      ];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === "<35")!;
      // (33.3 + 33.4 + 33.3) / 3 = 33.333... → 33.3
      expect(bracket["Own Eggs"]).toBe(33.3);
    });
  });

  describe("missing / suppressed data", () => {
    it("skips records with missing data_value", () => {
      const records = [makeRecord({ breakout: "<35", data_value: undefined })];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === "<35")!;
      expect(bracket["Own Eggs"]).toBeUndefined();
    });

    it("skips records with empty string data_value", () => {
      const records = [makeRecord({ breakout: "<35", data_value: "" })];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === "<35")!;
      expect(bracket["Own Eggs"]).toBeUndefined();
    });

    it("skips records with non-numeric data_value", () => {
      const records = [makeRecord({ breakout: "<35", data_value: "N/A" })];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === "<35")!;
      expect(bracket["Own Eggs"]).toBeUndefined();
    });
  });

  describe("age bracket normalisation", () => {
    it("handles canonical bracket strings as-is", () => {
      for (const bracket of AGE_BRACKETS) {
        const records = [makeRecord({ breakout: bracket, data_value: "30.0" })];
        const result = transformSuccessRatesByAge(records);
        const found = result.find((d) => d.ageGroup === bracket)!;
        expect(found["Own Eggs"]).toBe(30.0);
      }
    });

    it("maps 'Under 35' to '<35'", () => {
      const records = [makeRecord({ breakout: "Under 35", data_value: "42.0" })];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === "<35")!;
      expect(bracket["Own Eggs"]).toBe(42.0);
    });

    it("maps '35 to 37' to '35-37'", () => {
      const records = [makeRecord({ breakout: "35 to 37", data_value: "38.0" })];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === "35-37")!;
      expect(bracket["Own Eggs"]).toBe(38.0);
    });

    it("maps '38 to 40' to '38-40'", () => {
      const records = [makeRecord({ breakout: "38 to 40", data_value: "28.0" })];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === "38-40")!;
      expect(bracket["Own Eggs"]).toBe(28.0);
    });

    it("maps '41 to 42' to '41-42'", () => {
      const records = [makeRecord({ breakout: "41 to 42", data_value: "22.0" })];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === "41-42")!;
      expect(bracket["Own Eggs"]).toBe(22.0);
    });

    it("maps 'Over 42' to '>42'", () => {
      const records = [makeRecord({ breakout: "Over 42", data_value: "18.0" })];
      const result = transformSuccessRatesByAge(records);
      const bracket = result.find((d) => d.ageGroup === ">42")!;
      expect(bracket["Own Eggs"]).toBe(18.0);
    });

    it("ignores records with unrecognised age brackets", () => {
      const records = [makeRecord({ breakout: "Unknown", data_value: "50.0" })];
      const result = transformSuccessRatesByAge(records);
      // No bracket should receive a value.
      const hasAnyValue = result.some((d) => "Own Eggs" in d);
      expect(hasAnyValue).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// transformClinicExplorer
// ---------------------------------------------------------------------------

describe("transformClinicExplorer", () => {
  const orClinics: CdcArtRecord[] = [
    makeRecord({
      locationabbr: "OR",
      facilityname: "Alpha Fertility",
      data_value: "55.0",
      num_transfers: "120",
    }),
    makeRecord({
      locationabbr: "OR",
      facilityname: "Beta Clinic",
      data_value: "45.0",
      num_transfers: "80",
    }),
    makeRecord({
      locationabbr: "OR",
      facilityname: "Gamma IVF",
      data_value: "35.0",
      num_transfers: "200",
    }),
    // Different state — should be excluded when filtering by OR
    makeRecord({
      locationabbr: "WA",
      facilityname: "Washington Clinic",
      data_value: "60.0",
      num_transfers: "90",
    }),
  ];

  describe("state filtering", () => {
    it("includes only clinics matching the specified state", () => {
      const result = transformClinicExplorer(orClinics, { state: "OR" });
      expect(result.every((d) => d.state === "OR")).toBe(true);
      expect(result.find((d) => d.clinic === "Washington Clinic")).toBeUndefined();
    });

    it("is case-insensitive for state matching", () => {
      const result = transformClinicExplorer(orClinics, { state: "or" });
      expect(result.some((d) => d.clinic === "Alpha Fertility")).toBe(true);
    });

    it("returns all states when no state filter is provided", () => {
      const result = transformClinicExplorer(orClinics);
      expect(result.length).toBe(4);
    });
  });

  describe("output shape", () => {
    it("returns an array of ClinicBarDatum objects", () => {
      const result = transformClinicExplorer(orClinics, { state: "OR" });
      for (const datum of result) {
        expect(datum).toHaveProperty("clinic");
        expect(datum).toHaveProperty("livebirthRate");
        expect(datum).toHaveProperty("numTransfers");
        expect(datum).toHaveProperty("state");
      }
    });

    it("sorts results by livebirthRate descending", () => {
      const result = transformClinicExplorer(orClinics, { state: "OR" });
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].livebirthRate).toBeGreaterThanOrEqual(
          result[i].livebirthRate
        );
      }
    });
  });

  describe("minTransfers filter", () => {
    it("excludes clinics below the minimum transfer threshold", () => {
      const result = transformClinicExplorer(orClinics, {
        state: "OR",
        minTransfers: 100,
      });
      expect(result.every((d) => d.numTransfers >= 100)).toBe(true);
      expect(result.find((d) => d.clinic === "Beta Clinic")).toBeUndefined();
    });

    it("includes all clinics when minTransfers is 0 (default)", () => {
      const result = transformClinicExplorer(orClinics, { state: "OR" });
      expect(result).toHaveLength(3);
    });
  });

  describe("topN limit", () => {
    it("caps results at topN entries (default 20)", () => {
      const manyRecords = Array.from({ length: 25 }, (_, i) =>
        makeRecord({
          locationabbr: "OR",
          facilityname: `Clinic ${i}`,
          data_value: `${40 + i}`,
          num_transfers: "50",
        })
      );
      const result = transformClinicExplorer(manyRecords);
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it("respects a custom topN value", () => {
      const result = transformClinicExplorer(orClinics, { state: "OR", topN: 2 });
      expect(result).toHaveLength(2);
    });

    it("returns fewer than topN when there are fewer clinics", () => {
      const result = transformClinicExplorer(orClinics, { state: "OR", topN: 10 });
      expect(result).toHaveLength(3);
    });
  });

  describe("live birth question filtering", () => {
    it("excludes records whose question does not contain 'live birth'", () => {
      const nonLiveBirthRecords = [
        makeRecord({
          locationabbr: "OR",
          facilityname: "Test Clinic",
          data_value: "40.0",
          question: "Number of transfers",
        }),
      ];
      const result = transformClinicExplorer(nonLiveBirthRecords, { state: "OR" });
      expect(result).toHaveLength(0);
    });
  });

  describe("missing / suppressed data", () => {
    it("skips records with missing data_value", () => {
      const records = [
        makeRecord({
          locationabbr: "OR",
          facilityname: "Empty Clinic",
          data_value: undefined,
        }),
      ];
      const result = transformClinicExplorer(records, { state: "OR" });
      expect(result.find((d) => d.clinic === "Empty Clinic")).toBeUndefined();
    });
  });

  describe("aggregation across multiple records per clinic", () => {
    it("averages rates across multiple questions for the same clinic", () => {
      const records = [
        makeRecord({
          locationabbr: "OR",
          facilityname: "Multi Clinic",
          data_value: "40.0",
          question: "Live births per transfer (fresh embryos from own eggs)",
          num_transfers: "60",
        }),
        makeRecord({
          locationabbr: "OR",
          facilityname: "Multi Clinic",
          data_value: "60.0",
          question: "Live births per transfer (frozen embryos from own eggs)",
          num_transfers: "80",
        }),
      ];
      const result = transformClinicExplorer(records, { state: "OR" });
      expect(result).toHaveLength(1);
      expect(result[0].livebirthRate).toBe(50.0);
      // Uses the highest transfer count seen.
      expect(result[0].numTransfers).toBe(80);
    });

    it("keeps the first (higher) transfer count when a later record has fewer transfers", () => {
      // Exercises the false-branch of `if (transfers > existing.numTransfers)`.
      const records = [
        makeRecord({
          locationabbr: "OR",
          facilityname: "Descending Clinic",
          data_value: "50.0",
          question: "Live births per transfer (fresh embryos from own eggs)",
          num_transfers: "100",
        }),
        makeRecord({
          locationabbr: "OR",
          facilityname: "Descending Clinic",
          data_value: "60.0",
          question: "Live births per transfer (frozen embryos from own eggs)",
          num_transfers: "40",
        }),
      ];
      const result = transformClinicExplorer(records, { state: "OR" });
      expect(result).toHaveLength(1);
      // numTransfers should remain 100, not drop to 40.
      expect(result[0].numTransfers).toBe(100);
      expect(result[0].livebirthRate).toBe(55.0);
    });

    it("treats a missing num_transfers field as 0 transfers", () => {
      // Exercises the `rec.num_transfers ? ... : 0` fallback branch.
      const records = [
        makeRecord({
          locationabbr: "OR",
          facilityname: "No Transfer Count Clinic",
          data_value: "45.0",
          question: "Live births per transfer (fresh embryos from own eggs)",
          num_transfers: undefined,
        }),
      ];
      const result = transformClinicExplorer(records, { state: "OR" });
      expect(result).toHaveLength(1);
      expect(result[0].numTransfers).toBe(0);
    });
  });

  describe("empty input", () => {
    it("returns an empty array for empty records", () => {
      const result = transformClinicExplorer([]);
      expect(result).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// transformHcgCurve
// ---------------------------------------------------------------------------

describe("transformHcgCurve", () => {
  const singletonPoints: HcgDataPoint[] = [
    makeHcgPoint({ dpo: 10, median: 25, low: 7, high: 93, type: "singleton" }),
    makeHcgPoint({ dpo: 14, median: 180, low: 57, high: 657, type: "singleton" }),
    makeHcgPoint({ dpo: 18, median: 840, low: 286, high: 3015, type: "singleton" }),
  ];

  const twinPoints: HcgDataPoint[] = [
    makeHcgPoint({ dpo: 10, median: 55, low: 17, high: 200, type: "twins" }),
    makeHcgPoint({ dpo: 14, median: 420, low: 138, high: 1430, type: "twins" }),
  ];

  const mixedPoints = [...singletonPoints, ...twinPoints];

  describe("singleton filter (default)", () => {
    it("returns three series for singleton", () => {
      const result = transformHcgCurve(singletonPoints, "singleton");
      expect(result).toHaveLength(3);
    });

    it("series ids are 'Singleton Median', 'Singleton Low (5th)', 'Singleton High (95th)'", () => {
      const result = transformHcgCurve(singletonPoints, "singleton");
      expect(result.map((s) => s.id)).toEqual([
        "Singleton Median",
        "Singleton Low (5th)",
        "Singleton High (95th)",
      ]);
    });

    it("uses default 'singleton' filter when no filter arg given", () => {
      const result = transformHcgCurve(singletonPoints);
      expect(result[0].id).toBe("Singleton Median");
    });

    it("each data point has x = dpo and y = correct value", () => {
      const result = transformHcgCurve(singletonPoints, "singleton");
      const medianSeries = result.find((s) => s.id === "Singleton Median")!;
      expect(medianSeries.data[0]).toEqual({ x: 10, y: 25 });
      expect(medianSeries.data[1]).toEqual({ x: 14, y: 180 });
    });

    it("sorts data points by DPO ascending", () => {
      const shuffled = [
        makeHcgPoint({ dpo: 18, median: 840, type: "singleton" }),
        makeHcgPoint({ dpo: 10, median: 25, type: "singleton" }),
        makeHcgPoint({ dpo: 14, median: 180, type: "singleton" }),
      ];
      const result = transformHcgCurve(shuffled, "singleton");
      const dpos = result[0].data.map((d) => d.x);
      expect(dpos).toEqual([10, 14, 18]);
    });

    it("excludes twin data points", () => {
      const result = transformHcgCurve(mixedPoints, "singleton");
      const allDpos = result.flatMap((s) => s.data.map((d) => d.x as number));
      // Should only have DPOs from singletonPoints.
      expect(allDpos).toEqual(expect.arrayContaining([10, 14, 18]));
      expect(allDpos).toHaveLength(singletonPoints.length * 3);
    });
  });

  describe("twins filter", () => {
    it("returns three series for twins", () => {
      const result = transformHcgCurve(twinPoints, "twins");
      expect(result).toHaveLength(3);
    });

    it("series ids reference 'Twins'", () => {
      const result = transformHcgCurve(twinPoints, "twins");
      expect(result.map((s) => s.id)).toEqual([
        "Twins Median",
        "Twins Low (5th)",
        "Twins High (95th)",
      ]);
    });
  });

  describe("both filter", () => {
    it("returns six series (three per type) when filter is 'both'", () => {
      const result = transformHcgCurve(mixedPoints, "both");
      expect(result).toHaveLength(6);
    });

    it("contains series for both singleton and twins", () => {
      const result = transformHcgCurve(mixedPoints, "both");
      const ids = result.map((s) => s.id);
      expect(ids).toContain("Singleton Median");
      expect(ids).toContain("Twins Median");
    });
  });

  describe("empty input", () => {
    it("returns empty data arrays for each series when no points given", () => {
      const result = transformHcgCurve([], "singleton");
      expect(result).toHaveLength(3);
      result.forEach((s) => expect(s.data).toHaveLength(0));
    });
  });
});

// ---------------------------------------------------------------------------
// transformUserBeta
// ---------------------------------------------------------------------------

describe("transformUserBeta", () => {
  it("returns a single series with id 'My Beta'", () => {
    const result = transformUserBeta(14, 350);
    expect(result.id).toBe("My Beta");
  });

  it("contains exactly one data point", () => {
    const result = transformUserBeta(14, 350);
    expect(result.data).toHaveLength(1);
  });

  it("data point has correct x (dpo) and y (value)", () => {
    const result = transformUserBeta(14, 350);
    expect(result.data[0]).toEqual({ x: 14, y: 350 });
  });

  it("handles DPO 10", () => {
    const result = transformUserBeta(10, 22);
    expect(result.data[0]).toEqual({ x: 10, y: 22 });
  });

  it("handles DPO 28 with a large hCG value", () => {
    const result = transformUserBeta(28, 50000);
    expect(result.data[0]).toEqual({ x: 28, y: 50000 });
  });
});

// ---------------------------------------------------------------------------
// transformMiscarriageRiskCurve
// ---------------------------------------------------------------------------

describe("transformMiscarriageRiskCurve", () => {
  const sampleRisks = [10.0, 8.0, 6.0, 4.5, 3.5, 2.5, 1.8, 1.2, 0.9, 0.7, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1];

  it("returns an array with exactly one series", () => {
    const result = transformMiscarriageRiskCurve(sampleRisks);
    expect(result).toHaveLength(1);
  });

  it("series id is 'Miscarriage Risk'", () => {
    const result = transformMiscarriageRiskCurve(sampleRisks);
    expect(result[0].id).toBe("Miscarriage Risk");
  });

  it("data length matches the input array length", () => {
    const result = transformMiscarriageRiskCurve(sampleRisks);
    expect(result[0].data).toHaveLength(sampleRisks.length);
  });

  it("first data point x starts at week 4 by default", () => {
    const result = transformMiscarriageRiskCurve(sampleRisks);
    expect(result[0].data[0].x).toBe(4);
  });

  it("uses a custom startWeek when provided", () => {
    const result = transformMiscarriageRiskCurve([5.0, 3.0], 8);
    expect(result[0].data[0].x).toBe(8);
    expect(result[0].data[1].x).toBe(9);
  });

  it("x values increment by 1 for each subsequent week", () => {
    const result = transformMiscarriageRiskCurve(sampleRisks);
    result[0].data.forEach((point, i) => {
      expect(point.x).toBe(4 + i);
    });
  });

  it("y values are rounded to two decimal places", () => {
    const risks = [10.123456789, 5.987654321];
    const result = transformMiscarriageRiskCurve(risks, 4);
    expect(result[0].data[0].y).toBe(10.12);
    expect(result[0].data[1].y).toBe(5.99);
  });

  it("handles an empty array", () => {
    const result = transformMiscarriageRiskCurve([]);
    expect(result[0].data).toHaveLength(0);
  });

  it("handles a single-element array", () => {
    const result = transformMiscarriageRiskCurve([7.5], 10);
    expect(result[0].data).toHaveLength(1);
    expect(result[0].data[0]).toEqual({ x: 10, y: 7.5 });
  });
});
