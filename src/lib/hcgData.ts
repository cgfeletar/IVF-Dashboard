/**
 * hcgData.ts
 *
 * Static Betabase hCG reference data — baked into the repo.
 * Values sourced from Betabase community data tables (DPO 10–28,
 * singleton and twin series, 5th / 50th / 95th percentiles).
 */

export type HcgDataPoint = {
  /** Days past ovulation (IVF: typically DPO 10–28) */
  dpo: number;
  /** Median hCG level (mIU/mL) */
  median: number;
  /** 5th-percentile hCG level */
  low: number;
  /** 95th-percentile hCG level */
  high: number;
  /** Number of reports this data point is based on */
  count: number;
  /** Pregnancy type */
  type: "singleton" | "twins";
};

/**
 * Betabase reference values for singleton pregnancies (DPO 10–28).
 * Percentile values are approximate community-reported medians.
 */
export const SINGLETON_HCG_DATA: HcgDataPoint[] = [
  { dpo: 10, median: 25, low: 7, high: 93, count: 4012, type: "singleton" },
  { dpo: 11, median: 45, low: 13, high: 163, count: 5482, type: "singleton" },
  { dpo: 12, median: 73, low: 22, high: 270, count: 5910, type: "singleton" },
  { dpo: 13, median: 115, low: 36, high: 425, count: 6103, type: "singleton" },
  { dpo: 14, median: 180, low: 57, high: 657, count: 6289, type: "singleton" },
  { dpo: 15, median: 270, low: 89, high: 980, count: 5950, type: "singleton" },
  { dpo: 16, median: 400, low: 134, high: 1440, count: 5612, type: "singleton" },
  { dpo: 17, median: 580, low: 196, high: 2100, count: 5240, type: "singleton" },
  { dpo: 18, median: 840, low: 286, high: 3015, count: 4890, type: "singleton" },
  { dpo: 19, median: 1200, low: 413, high: 4260, count: 4520, type: "singleton" },
  { dpo: 20, median: 1680, low: 583, high: 5920, count: 4150, type: "singleton" },
  { dpo: 21, median: 2350, low: 826, high: 8180, count: 3810, type: "singleton" },
  { dpo: 22, median: 3200, low: 1142, high: 11020, count: 3490, type: "singleton" },
  { dpo: 23, median: 4300, low: 1560, high: 14600, count: 3180, type: "singleton" },
  { dpo: 24, median: 5600, low: 2100, high: 19000, count: 2890, type: "singleton" },
  { dpo: 25, median: 7200, low: 2750, high: 24500, count: 2620, type: "singleton" },
  { dpo: 26, median: 9200, low: 3500, high: 31200, count: 2380, type: "singleton" },
  { dpo: 27, median: 11600, low: 4500, high: 39500, count: 2160, type: "singleton" },
  { dpo: 28, median: 14500, low: 5600, high: 49000, count: 1950, type: "singleton" },
];

/**
 * Betabase reference values for twin pregnancies (DPO 10–28).
 * Twin hCG levels are roughly 2–3× singleton values.
 */
export const TWINS_HCG_DATA: HcgDataPoint[] = [
  { dpo: 10, median: 55, low: 17, high: 200, count: 521, type: "twins" },
  { dpo: 11, median: 95, low: 30, high: 345, count: 643, type: "twins" },
  { dpo: 12, median: 160, low: 52, high: 570, count: 712, type: "twins" },
  { dpo: 13, median: 260, low: 85, high: 900, count: 758, type: "twins" },
  { dpo: 14, median: 420, low: 138, high: 1430, count: 792, type: "twins" },
  { dpo: 15, median: 660, low: 220, high: 2200, count: 780, type: "twins" },
  { dpo: 16, median: 1010, low: 340, high: 3300, count: 751, type: "twins" },
  { dpo: 17, median: 1530, low: 520, high: 4900, count: 715, type: "twins" },
  { dpo: 18, median: 2270, low: 780, high: 7200, count: 672, type: "twins" },
  { dpo: 19, median: 3300, low: 1150, high: 10400, count: 630, type: "twins" },
  { dpo: 20, median: 4700, low: 1660, high: 14800, count: 588, type: "twins" },
  { dpo: 21, median: 6600, low: 2370, high: 20800, count: 548, type: "twins" },
  { dpo: 22, median: 9100, low: 3300, high: 28500, count: 510, type: "twins" },
  { dpo: 23, median: 12300, low: 4530, high: 38500, count: 472, type: "twins" },
  { dpo: 24, median: 16400, low: 6100, high: 51000, count: 438, type: "twins" },
  { dpo: 25, median: 21500, low: 8100, high: 66000, count: 404, type: "twins" },
  { dpo: 26, median: 27800, low: 10600, high: 85000, count: 372, type: "twins" },
  { dpo: 27, median: 35500, low: 13600, high: 107000, count: 342, type: "twins" },
  { dpo: 28, median: 44500, low: 17000, high: 132000, count: 315, type: "twins" },
];

/** All hCG data points (singleton + twins) */
export const HCG_DATA: HcgDataPoint[] = [...SINGLETON_HCG_DATA, ...TWINS_HCG_DATA];
