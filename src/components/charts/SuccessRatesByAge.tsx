/**
 * SuccessRatesByAge
 * Classification: WRITE NEW (from analysis report)
 * Analyst ref: n/a — first chart component in the project
 *
 * Renders a grouped bar chart of IVF live birth rates by age bracket.
 * Owns local UI state for year and egg-source filter; all data fetching
 * and transformation is delegated to useCdcArtData and transformSuccessRatesByAge.
 */

import { useState, useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCdcArtData } from "@/hooks/useCdcArtData";
import { transformSuccessRatesByAge } from "@/lib/transforms";
import { CHART_COLORS, NIVO_THEME, YEARS } from "@/lib/constants";
import type { Year } from "@/lib/constants";
import type { SuccessRatesOptions } from "@/lib/transforms";
import type { SuccessRateBarDatum } from "@/types/charts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EggSource = SuccessRatesOptions["eggSource"];

// Series label order matches the visual stacking / grouping order.
const SERIES_OWN = "Own Eggs";
const SERIES_DONOR = "Donor Eggs";

// Nivo requires colors keyed by series label when using a color mapping.
const BAR_COLORS: Record<string, string> = {
  [SERIES_OWN]: CHART_COLORS.primary,
  [SERIES_DONOR]: CHART_COLORS.secondary,
};

// ---------------------------------------------------------------------------
// Skeleton — matches the chart area dimensions during loading
// ---------------------------------------------------------------------------

function ChartSkeleton(): JSX.Element {
  return (
    <div
      className="h-[350px] w-full animate-pulse rounded-md bg-muted"
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps): JSX.Element {
  return (
    <div
      className="flex h-[350px] flex-col items-center justify-center gap-3 text-center"
      role="alert"
      aria-live="assertive"
    >
      <p className="text-sm text-muted-foreground">
        Could not load success rate data. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState(): JSX.Element {
  return (
    <div
      className="flex h-[350px] flex-col items-center justify-center gap-2 text-center"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">
        No data available for the selected year and egg source.
      </p>
      <p className="text-xs text-muted-foreground">
        Try selecting a different year or toggling between own and donor eggs.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SuccessRatesByAgeProps {
  initialYear?: Year;
}

export function SuccessRatesByAge({ initialYear = "2022" }: SuccessRatesByAgeProps = {}): JSX.Element {
  const [year, setYear] = useState<Year>(initialYear);
  const [eggSource, setEggSource] = useState<EggSource>("own");

  const { data, isLoading, isError, refetch } = useCdcArtData({ year });

  const chartData: SuccessRateBarDatum[] = useMemo(() => {
    if (!data) return [];
    return transformSuccessRatesByAge(data, { eggSource });
  }, [data, eggSource]);

  // Derive the active series keys for Nivo's `keys` prop.
  const seriesKeys: string[] = useMemo(() => {
    if (eggSource === "own") return [SERIES_OWN];
    if (eggSource === "donor") return [SERIES_DONOR];
    return [SERIES_OWN, SERIES_DONOR];
  }, [eggSource]);

  // Check whether the transformed data has any non-zero values to render.
  const hasData = useMemo(
    () =>
      chartData.some((datum) =>
        seriesKeys.some((key) => typeof datum[key] === "number" && datum[key] > 0)
      ),
    [chartData, seriesKeys]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>IVF Success Rates by Age</CardTitle>
            <CardDescription>
              Live birth rate per transfer (%) — CDC national data
            </CardDescription>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Year selector */}
            <label className="sr-only" htmlFor="year-select">
              Year
            </label>
            <Select
              value={year}
              onValueChange={(v: string) => setYear(v as Year)}
            >
              <SelectTrigger id="year-select" size="sm" className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Egg source toggle */}
            <Tabs
              value={eggSource}
              onValueChange={(v: string) => setEggSource(v as EggSource)}
            >
              <TabsList>
                <TabsTrigger value="own">Own Eggs</TabsTrigger>
                <TabsTrigger value="donor">Donor Eggs</TabsTrigger>
                <TabsTrigger value="both">Both</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div aria-busy="true" aria-live="polite" aria-label="Loading chart data">
            <ChartSkeleton />
          </div>
        )}

        {isError && <ErrorState onRetry={() => void refetch()} />}

        {!isLoading && !isError && !hasData && <EmptyState />}

        {!isLoading && !isError && hasData && (
          <div style={{ height: 350 }}>
            <ResponsiveBar
              data={chartData}
              keys={seriesKeys}
              indexBy="ageGroup"
              groupMode={eggSource === "both" ? "grouped" : "stacked"}
              margin={{ top: 16, right: 16, bottom: 48, left: 52 }}
              padding={0.3}
              innerPadding={eggSource === "both" ? 3 : 0}
              colors={(bar) => BAR_COLORS[bar.id as string] ?? CHART_COLORS.muted}
              theme={NIVO_THEME}
              axisBottom={{
                tickSize: 0,
                tickPadding: 10,
                legend: "Age group",
                legendPosition: "middle",
                legendOffset: 38,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickValues: 5,
                legend: "Live birth rate (%)",
                legendPosition: "middle",
                legendOffset: -44,
                format: (v) => `${v}%`,
              }}
              enableLabel={false}
              enableGridX={false}
              tooltip={({ id, value, indexValue }) => (
                <div className="rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
                  <span className="font-medium">{indexValue}</span>
                  {" — "}
                  <span>{String(id)}</span>
                  {": "}
                  <span className="font-semibold">{value}%</span>
                </div>
              )}
              role="img"
              ariaLabel="Grouped bar chart showing IVF live birth rates by age group"
              barAriaLabel={(e) =>
                `${String(e.id)}, age group ${String(e.indexValue)}: ${String(e.value)}%`
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
