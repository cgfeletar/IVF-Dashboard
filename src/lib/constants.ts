export const CHART_COLORS = {
  primary: "#C05E3C",
  secondary: "#5B7FA6",
  muted: "#A8B4BE",
  positive: "#5A8A6A",
  range: "rgba(192, 94, 60, 0.15)",
} as const;

export const NIVO_THEME = {
  fontSize: 12,
  fontFamily: "DM Sans, sans-serif",
  textColor: "#4A4A4A",
  grid: { line: { stroke: "#E8E8E8" } },
  axis: { ticks: { line: { stroke: "#CCCCCC" } } },
} as const;

export const AGE_BRACKETS = ["<35", "35-37", "38-40", ">40"] as const;
export type AgeBracket = (typeof AGE_BRACKETS)[number];

export const YEARS = ["2020", "2021", "2022"] as const;
export type Year = (typeof YEARS)[number];

/** CDC Summary dataset resource IDs — each year is a separate dataset. */
export const CDC_SUMMARY_DATASETS: Record<Year, string> = {
  "2020": "4yy2-qa9v",
  "2021": "24w5-nppr",
  "2022": "9tjt-seye",
};

/** One color per year for multi-year charts. */
export const YEAR_COLORS: Record<Year, string> = {
  "2020": "#A8B4BE",
  "2021": "#5B7FA6",
  "2022": "#C05E3C",
};

export const US_STATES = [
  { abbr: "AZ", label: "Arizona" },
  { abbr: "CA", label: "California" },
  { abbr: "CO", label: "Colorado" },
  { abbr: "FL", label: "Florida" },
  { abbr: "IL", label: "Illinois" },
  { abbr: "MA", label: "Massachusetts" },
  { abbr: "NY", label: "New York" },
  { abbr: "OR", label: "Oregon" },
  { abbr: "TX", label: "Texas" },
  { abbr: "WA", label: "Washington" },
] as const;
