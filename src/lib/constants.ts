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

export const AGE_BRACKETS = ["<35", "35-37", "38-40", "41-42", ">42"] as const;
export type AgeBracket = (typeof AGE_BRACKETS)[number];

export const YEARS = ["2019", "2020", "2021", "2022"] as const;
export type Year = (typeof YEARS)[number];

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
