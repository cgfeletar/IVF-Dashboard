---
name: IVF Dashboard project conventions
description: Architecture, styling, data-fetching, testing, and component patterns for the IVF Dashboard codebase — used to brief implementation agents
type: project
---

## Architecture
- Single-page app: React 18 + Vite + TypeScript (strict mode, ES2023 target)
- All chart components are stateless — receive shaped data as props only; no fetch calls inside charts
- All data fetching lives in `src/hooks/`; all transforms in `src/lib/transforms.ts`
- Filters live in URL params via `src/hooks/useFilters.ts` (useSyncExternalStore + URLSearchParams)

## File / folder structure
- Chart components: `src/components/charts/ComponentName.tsx`
- Shared UI (shadcn): `src/components/ui/`
- Dashboard layout wrappers: `src/components/dashboard/`
- Hooks: `src/hooks/`
- Static data + transforms: `src/lib/`
- Types: `src/types/`
- Tests co-located under `src/lib/__tests__/` and `src/hooks/__tests__/`

## Naming conventions
- Props interfaces: `interface ComponentNameProps` (not `IComponentNameProps`)
- Props type alias also acceptable: `type ChartInputs = { ... }`
- Named exports only for chart components (no default exports on charts)
- `MiscarriageRiskChart` has both named + default export — named is the convention; default was added separately

## Path alias
- `@/*` maps to `./src/*` (tsconfig.app.json L27-29)

## Export style
- Chart components: named exports (`export function HcgCurveExplorer()`)
- shadcn ui components: named exports (`export { Button, buttonVariants }`)
- Page: default export (`export default function DashboardPage()`)

## Styling
- Tailwind v3 utility classes — no prefix, no CSS modules
- `cn()` from `@/lib/utils` (wraps clsx + tailwind-merge)
- Design tokens via CSS variables: `text-foreground`, `text-muted-foreground`, `bg-popover`, `border-border`, `text-primary`, etc.
- Hard-coded palette values from `@/lib/constants`:
  - teal: `#5E9E96` (primary / positive)
  - dusty rose: `#C4877A` (secondary)
  - oat: `#C4B49A` (muted / year 2020)
  - tealHover: `#3A6E67`, dustyRoseHover: `#8F5248`, oatHover: `#8F7D62`
  - CHART_COLORS.range: `rgba(94, 158, 150, 0.15)`
- Inline `style` props used only when Tailwind can't express it (e.g. `style={{ color: CHART_COLORS.positive }}`)
- Teal tint badge/banner pattern: `border-[#5E9E96]/20 bg-[#5E9E96]/8` (MiscarriageRiskChart L375)

## shadcn/ui component imports (all from @base-ui/react under the hood)
- `@/components/ui/card` → Card, CardHeader, CardTitle, CardDescription, CardContent
- `@/components/ui/button` → Button (variants: default, outline, secondary, ghost, destructive, link; sizes: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg)
- `@/components/ui/input` → Input
- `@/components/ui/tabs` → Tabs, TabsList, TabsTrigger, TabsContent
- `@/components/ui/badge` → Badge
- `@/components/ui/select` → Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- `@/components/ui/slider` → Slider

## Framer Motion
- Import: `import { motion } from "framer-motion"` (only in dashboard wrappers, not in chart components themselves)
- Used only in `DashboardPanel` and `KpiStrip` — chart components do NOT use motion directly
- Entrance animation pattern: `initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }}`
- Charts wrap themselves in `<DashboardPanel index={n}>` to get the animation; they don't import motion

## Nivo
- Chart library: `@nivo/line` (ResponsiveLine), `@nivo/bar` (ResponsiveBar)
- Shared theme: `NIVO_THEME` from `@/lib/constants` — `{ fontSize: 12, fontFamily: "DM Sans, sans-serif", textColor: "#4A4A4A", grid: ..., axis: ... }`
- Chart height set via inline style: `<div style={{ height: 350 }}>`
- Chart div always has `role="img"` and `aria-label`
- Custom layers: defined as named functions outside the component (for stable references), or memoised factory functions inside the component
- Tooltip markup pattern: `<div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">`

## Data fetching
- TanStack Query v5: `useQuery` / `useQueries` from `@tanstack/react-query`
- Query key convention: `["cdc-art", year, state, limit]` as const
- staleTime: `1000 * 60 * 10` (10 minutes)
- Static data (hCG, DPO) is imported directly — no hook needed

## State management
- Local component state: `useState` + `useCallback` + `useMemo`
- URL-based filter state: `useFilters()` from `@/hooks/useFilters`
- No external store (no Redux, Zustand, etc.)

## Error tracking
- No error tracking utility found in the codebase (no Sentry, Datadog, etc.)

## Testing
- Test runner: Vitest (`import { describe, it, expect } from "vitest"`)
- Test file location: `src/lib/__tests__/` and `src/hooks/__tests__/` (mirrored, not co-located)
- Test file naming: `componentName.test.ts`
- Pattern: fixture helper functions (`makeRecord`, `makeHcgPoint`) then `describe` / `it` blocks

## Dashboard registration — how charts get added to pages
- Charts are imported directly in `src/pages/index.tsx`
- Wrapped in `<DashboardPanel index={n} className="...">` for animation
- Laid out with CSS grid: `grid grid-cols-1 gap-6 pt-6 lg:grid-cols-2`
- Full-width span: `className="lg:col-span-2"` on DashboardPanel
- Tab values are integers (0, 1, 2), not strings
- Pregnancy tab is `<TabsContent value={1}>` in `src/pages/index.tsx` (L67–77)

**Why:** Established by project architecture — CLAUDE.md mandates stateless chart components, data in hooks, transforms in lib.
**How to apply:** Every new HCGPredictor component must follow these exact patterns. No deviations.
