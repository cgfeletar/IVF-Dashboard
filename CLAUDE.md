# IVF Data Hub

## Project context

Portfolio data viz dashboard. React 18, Vite, TypeScript, Nivo, Tailwind v3, shadcn/ui, TanStack Query v5, Framer Motion.

## Non-negotiables

- Chart components are stateless — shaped data as props only
- All data fetching in hooks/, all transforms in lib/transforms.ts
- No fetch calls inside chart components
- Filters live in URL params via useFilters.ts

## Agents

Agents are in .claude/agents/. Always run component-analyst before implementation on any new component.

## Current status

See PLAN.md for phases and checklist.
