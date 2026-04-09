/**
 * Conception probability by day of intercourse relative to ovulation.
 *
 * Source: Ovia Health analysis (2019), based on a large cohort of app users
 * tracking ovulation via BBT, LH strips, and cervical mucus.
 * Consistent with Wilcox AJ et al. (1995) and subsequent app-based replications.
 *
 * Day 0 = ovulation day. Negative values = days before ovulation.
 * Probability represents the likelihood of conception from a single act of
 * intercourse on that day.
 */

export type OviaConceptionDataPoint = {
  /** Day relative to ovulation (−5 through +1) */
  dayRelativeToOvulation: number;
  /** Probability of conception (%) */
  conceptionProbability: number;
};

export const OVIA_CONCEPTION_DATA: OviaConceptionDataPoint[] = [
  { dayRelativeToOvulation: -5, conceptionProbability: 5 },
  { dayRelativeToOvulation: -4, conceptionProbability: 10 },
  { dayRelativeToOvulation: -3, conceptionProbability: 14 },
  { dayRelativeToOvulation: -2, conceptionProbability: 22 },
  { dayRelativeToOvulation: -1, conceptionProbability: 28 },
  { dayRelativeToOvulation: 0, conceptionProbability: 30 },
  { dayRelativeToOvulation: 1, conceptionProbability: 5 },
];
