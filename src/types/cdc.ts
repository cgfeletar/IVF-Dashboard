// TypeScript types for CDC NASS ART API response shapes
// API endpoint: https://data.cdc.gov/resource/9tjt-seye.json

export type CdcArtRecord = {
  /** Two-letter state abbreviation, e.g. "OR", "US" for national */
  locationabbr: string;
  /** Full clinic name */
  facilityname: string;
  /**
   * Age group breakout — one of the five CDC age brackets:
   * "<35" | "35-37" | "38-40" | ">40"
   */
  breakout?: string;
  /**
   * Success rate as a numeric string (percentage, e.g. "42.5").
   * May be undefined/empty when suppressed for small sample sizes.
   */
  data_value?: string;
  /**
   * Category of rate, e.g.:
   * "Cumulative ART Success Rates"
   * "Non-Donor ART Success Rates"
   * "Donor ART Success Rates"
   */
  subtopic: string;
  /**
   * Specific question / metric, e.g.:
   * "Live births per transfer (fresh embryos from own eggs)"
   * "Live births per transfer (frozen embryos from own eggs)"
   * "Live births per transfer (fresh donor eggs)"
   */
  question: string;
  /** Year the data was collected (string, e.g. "2022") */
  year?: string;
  /** Total number of ART cycles performed (string) */
  num_cycles?: string;
  /** Total number of transfers performed (string) */
  num_transfers?: string;
};

export type CdcApiResponse = CdcArtRecord[];

/**
 * Record shape from the CDC ART PGT-specific dataset.
 * Each row represents one combination of age group × PGT status.
 */
export type CdcPgtRecord = {
  /** "Yes" or "No" — whether PGT was used */
  pgt_used?: string;
  /** Age group, e.g. "<35", "35-37", "38-40", ">40" */
  age_group?: string;
  /** Number of transfers (string) */
  transfers?: string;
  /** Number of live births (string) */
  live_births?: string;
  /** Live birth rate per transfer as a numeric string, e.g. "52.3" */
  live_birth_rate?: string;
};

export type CdcPgtApiResponse = CdcPgtRecord[];
