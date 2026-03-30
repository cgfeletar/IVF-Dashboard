# IVF Data Hub — Project Plan

A portfolio data visualization dashboard built with React. The theme is IVF and fertility data — real datasets, real utility, personal motivation. Tagline: _"Data that helps you understand your journey."_

---

## Stack (non-negotiable, do not substitute)

| Tool           | Version | Purpose                        |
| -------------- | ------- | ------------------------------ |
| React          | 18      | UI framework                   |
| Vite           | latest  | Dev server + build             |
| TypeScript     | latest  | Type safety throughout         |
| Tailwind CSS   | v3      | Utility styling                |
| shadcn/ui      | latest  | Component system (Radix-based) |
| Nivo           | latest  | Primary charting library       |
| TanStack Query | v5      | Data fetching + caching        |
| Framer Motion  | latest  | Panel animations               |

---

## Project Structure

Scaffold exactly this folder structure:

```
src/
  components/
    charts/           # One file per chart type (Nivo wrappers)
    dashboard/        # Layout, grid, DashboardPanel container
    filters/          # Age range, state, date selectors
    ui/               # shadcn/ui components (auto-generated, don't touch)
  hooks/
    useCdcArtData.ts  # TanStack Query fetcher — CDC NASS API
    useFilters.ts     # Filter state synced to URL params
  lib/
    transforms.ts     # All raw data → Nivo-ready shape logic lives here
    hcgData.ts        # Static Betabase hCG data (baked-in JSON)
    miscarriageModel.ts # Probability curve math (see Data Sources below)
    constants.ts      # Color scales, chart theme, age brackets
  pages/
    index.tsx         # Dashboard entry point
  types/
    cdc.ts            # TypeScript types for CDC API response shapes
    charts.ts         # Shared chart prop types
```

**Rules:**

- Chart components are stateless — they receive fully shaped data as props
- All data fetching happens in `hooks/`
- All data transformation happens in `lib/transforms.ts`
- No fetch calls inside chart components, ever

---

## Data Sources

### 1. CDC NASS — Live API (Socrata/JSON)

**Base URL:** `https://data.cdc.gov/resource/9tjt-seye.json`

Free, no auth required. Register for a free Socrata app token and pass as header `X-App-Token` to avoid rate limiting.

Useful query params (SoQL):

```
?LocationAbbr=OR          # filter by state
?$where=year=2022         # filter by year
?$limit=500               # pagination
?$select=...              # select specific columns
```

Key columns returned:

- `locationabbr` — state
- `facilityname` — clinic name
- `breakout` — age group (e.g. "<35", "35-37", "38-40", "41-42", ">42")
- `data_value` — success rate percentage
- `subtopic` — type of rate (e.g. "Cumulative ART Success Rates")
- `question` — retrieval type

Use `useCdcArtData.ts` to fetch, filter, and cache this. Shape in `transforms.ts` before passing to charts.

### 2. Betabase hCG Data — Static JSON (baked into repo)

No public API exists. Store as static data in `src/lib/hcgData.ts`.

Data shape to implement:

```typescript
export type HcgDataPoint = {
  dpo: number; // days past ovulation
  median: number; // median hCG mIU/mL
  low: number; // 5th percentile
  high: number; // 95th percentile
  count: number; // number of reports
  type: "singleton" | "twins";
};
```

Populate with known Betabase reference values (DPO 10–28, singleton and twin series). These values are well-documented in IVF communities and published in the app's own tables.

### 3. Miscarriage Risk Model — Implemented in `miscarriageModel.ts`

No external API. Implement the probability model directly based on peer-reviewed literature (Tong et al. 2008, Avalos et al. 2012).

```typescript
// Signature to implement:
export function getMiscarriageRisk(params: {
  weeksGestation: number;
  maternalAge: number;
  priorMiscarriages: number;
  priorLiveBirths: number;
}): {
  cumulativeRisk: number; // risk from this point to 20 weeks
  remainingRiskReduction: number; // how much risk has already passed
  dailyRisk: number[]; // per-day breakdown for chart
};
```

Base risk curve: approximately 10% at 4 weeks, declining to ~1% by 12 weeks. Age and prior loss multipliers applied as independent factors.

---

## Dashboard Panels (implement in this order)

### Panel 1 — IVF Success Rates by Age

- **Chart:** `@nivo/bar` (grouped bar)
- **Data:** CDC NASS API, national aggregated
- **X-axis:** Age groups (<35, 35-37, 38-40, 41-42, >42)
- **Y-axis:** Live birth rate per transfer (%)
- **Filter:** Year selector (2019–2022), own eggs vs donor eggs toggle
- **File:** `src/components/charts/SuccessRatesByAge.tsx`

### Panel 2 — Clinic Explorer (Oregon default)

- **Chart:** `@nivo/bar` (horizontal) + data table via shadcn Table
- **Data:** CDC NASS API, filtered by state
- **Shows:** Top clinics by live birth rate, with cycle count
- **Filter:** State selector (default OR), min cycle count threshold
- **File:** `src/components/charts/ClinicExplorer.tsx`

### Panel 3 — hCG Curve Explorer

- **Chart:** `@nivo/line` with confidence band (area layer)
- **Data:** Static `hcgData.ts`
- **X-axis:** Days past ovulation (DPO 10–28)
- **Y-axis:** hCG level (mIU/mL), log scale option
- **Toggle:** Singleton / Twins / Both
- **Interactive:** "Plot my beta" — user enters their own value, renders as a dot on the chart
- **File:** `src/components/charts/HcgCurveExplorer.tsx`

### Panel 4 — Miscarriage Risk by Gestational Age

- **Chart:** `@nivo/line` (area variant)
- **Data:** `miscarriageModel.ts` — recalculates on input change
- **X-axis:** Gestational weeks (4–20)
- **Y-axis:** Cumulative miscarriage risk (%)
- **Inputs:** Age slider, prior miscarriage count, "mark my current week" pin
- **Framing:** Show risk _reduction_ as the positive story — "Your risk has dropped X% since week 4"
- **File:** `src/components/charts/MiscarriageRiskChart.tsx`

---

## Layout

```
┌─────────────────────────────────────────────┐
│  IVF Data Hub            [filters toolbar]  │
├────────────────────┬────────────────────────┤
│  Success by Age    │   Clinic Explorer       │
│  (Panel 1)         │   (Panel 2)             │
├────────────────────┴────────────────────────┤
│  hCG Curve Explorer  (Panel 3 — full width) │
├────────────────────┬────────────────────────┤
│  Miscarriage Risk  │   [future panel slot]   │
│  (Panel 4)         │                         │
└────────────────────┴────────────────────────┘
```

Dashboard is responsive: 2-column grid on desktop, single column on mobile. Use Tailwind grid classes.

---

## Animation

Use Framer Motion for layout-level animation only (not inside Nivo):

```typescript
// Each DashboardPanel wraps its children in:
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: index * 0.1 }}
>
```

Stagger panels by index so they cascade in on load. Do not fight Nivo's built-in chart animation.

---

## shadcn/ui Components to Install

```bash
npx shadcn-ui@latest add card
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add slider
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add table
npx shadcn-ui@latest add toggle
```

Use `Card` as the wrapper for every dashboard panel. Use `Tabs` for own eggs vs donor toggle on Panel 1.

---

## Color Palette

Define in `src/lib/constants.ts` and use consistently across all charts:

```typescript
export const CHART_COLORS = {
  primary: "#C05E3C", // burnt sienna — main series
  secondary: "#5B7FA6", // muted blue — comparison series
  muted: "#A8B4BE", // gray — background/range
  positive: "#5A8A6A", // muted green — good news framing
  range: "rgba(192, 94, 60, 0.15)", // primary at low opacity for bands
};

export const NIVO_THEME = {
  // pass to `theme` prop on all Nivo charts
  fontSize: 12,
  fontFamily: "DM Sans, sans-serif",
  textColor: "#4A4A4A",
  grid: { line: { stroke: "#E8E8E8" } },
  axis: { ticks: { line: { stroke: "#CCCCCC" } } },
};
```

---

## Implementation Phases

Work through these phases in order. Complete and verify each before moving to the next.

**Phase 1 — Scaffold**

- [ ] `npm create vite@latest ivf-data-hub -- --template react-ts`
- [ ] Install all dependencies from stack table
- [ ] Init Tailwind, shadcn/ui
- [ ] Create full folder structure
- [ ] Set up TanStack Query provider in `main.tsx`
- [ ] Create `constants.ts` with colors and Nivo theme

**Phase 2 — Data Layer**

- [ ] Create TypeScript types in `src/types/cdc.ts`
- [ ] Implement `useCdcArtData.ts` with TanStack Query
- [ ] Implement `transforms.ts` — shape CDC data per panel's needs
- [ ] Populate `hcgData.ts` with static Betabase values
- [ ] Implement `miscarriageModel.ts` probability function
- [ ] Write unit tests for `transforms.ts` and `miscarriageModel.ts`

**Phase 3 — Charts (one at a time)**

- [ ] Panel 1: SuccessRatesByAge
- [ ] Panel 2: ClinicExplorer
- [ ] Panel 3: HcgCurveExplorer
- [ ] Panel 4: MiscarriageRiskChart

**Phase 4 — Layout & Filters**

- [ ] DashboardPanel wrapper component with Framer Motion
- [ ] Dashboard grid layout
- [ ] Filter components wired to useFilters hook
- [ ] URL state sync for filters

**Phase 5 — Polish**

- [ ] Skeleton loaders for async panels (shadcn Skeleton)
- [ ] Error boundaries per panel
- [ ] Responsive breakpoints
- [ ] Page hero: title + one-sentence origin story
- [ ] README with data sources, architecture notes, and live link

---

## Deployment

Deploy to Vercel. Connect GitHub repo for automatic deploys on push to `main`.

```bash
npm install -g vercel
vercel --prod
```

Add `VITE_CDC_APP_TOKEN=your_token_here` as an environment variable in Vercel dashboard.
