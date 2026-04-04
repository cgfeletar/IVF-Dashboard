/**
 * Crowd-sourced pregnancy test accuracy by days past ovulation (DPO).
 *
 * Source: Countdown to Pregnancy per-DPO pages.
 * DPO 9 and 12 are interpolated estimates — flagged with `interpolated: true`.
 */

export type DpoDataPoint = {
  dpo: number;
  /** % of pregnant women who got a positive test at this DPO */
  positive: number;
  /** % of pregnant women who got a false negative at this DPO */
  falseNegative: number;
  /** True when this data point is an interpolated estimate, not directly sourced */
  interpolated?: boolean;
};

export const DPO_DATA: DpoDataPoint[] = [
  { dpo: 8, positive: 18.1, falseNegative: 81.9 },
  { dpo: 9, positive: 25, falseNegative: 75, interpolated: true },
  { dpo: 10, positive: 66, falseNegative: 34 },
  { dpo: 11, positive: 79.4, falseNegative: 20.6 },
  { dpo: 12, positive: 80, falseNegative: 20, interpolated: true },
  { dpo: 13, positive: 87, falseNegative: 13 },
  { dpo: 14, positive: 95, falseNegative: 5 },
];
