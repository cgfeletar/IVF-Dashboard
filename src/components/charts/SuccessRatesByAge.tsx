/**
 * SuccessRatesByAge
 *
 * Renders a grouped bar chart of IVF success rates by age bracket,
 * with the most recent 3 years shown side by side in different colors.
 */

import { useMemo } from "react";
import { ResponsiveBar } from "@nivo/bar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useCdcArtMultiYear } from "@/hooks/useCdcArtData";
import { transformSuccessRatesByAgeMultiYear } from "@/lib/transforms";
import { NIVO_THEME, YEARS, YEAR_COLORS } from "@/lib/constants";
import type { SuccessRateBarDatum } from "@/types/charts";

const YEAR_KEYS = YEARS.map(String);

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ChartSkeleton() {
  return (
    <div
      className="h-[350px] w-full rounded-md skeleton-shimmer"
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

function ErrorState({ onRetry }: ErrorStateProps) {
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

function EmptyState() {
  return (
    <div
      className="flex h-[350px] flex-col items-center justify-center gap-2 text-center"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">No data available.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SuccessRatesByAge() {
  const { data, isLoading, isError, refetch } = useCdcArtMultiYear(YEARS);

  const chartData: SuccessRateBarDatum[] = useMemo(() => {
    if (!data) return [];
    return transformSuccessRatesByAgeMultiYear(data);
  }, [data]);

  const hasData = useMemo(
    () =>
      chartData.some((datum) =>
        YEAR_KEYS.some(
          (key) => typeof datum[key] === "number" && datum[key] > 0,
        ),
      ),
    [chartData],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tracking-tight">
          IVF Success Rates by Age
        </CardTitle>
        <CardDescription>
          National averages for patients using their own eggs — CDC {YEARS[0]}–
          {YEARS[YEARS.length - 1]} data
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div
            aria-busy="true"
            aria-live="polite"
            aria-label="Loading chart data"
          >
            <ChartSkeleton />
          </div>
        )}

        {isError && <ErrorState onRetry={refetch} />}

        {!isLoading && !isError && !hasData && <EmptyState />}

        {!isLoading && !isError && hasData && (
          <div style={{ height: 350 }}>
            <ResponsiveBar
              data={chartData}
              keys={YEAR_KEYS}
              indexBy="ageGroup"
              groupMode="grouped"
              margin={{ top: 16, right: 16, bottom: 48, left: 52 }}
              padding={0.25}
              innerPadding={2}
              colors={(bar) =>
                YEAR_COLORS[bar.id as keyof typeof YEAR_COLORS] ?? "#999"
              }
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
                legend: "Success rate (%)",
                legendPosition: "middle",
                legendOffset: -44,
                format: (v) => `${v}%`,
              }}
              enableLabel={false}
              enableGridX={false}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "top-right",
                  direction: "row",
                  translateY: -16,
                  itemWidth: 60,
                  itemHeight: 16,
                  itemTextColor: "#666",
                  symbolSize: 10,
                  symbolShape: "circle",
                },
              ]}
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
              ariaLabel="Grouped bar chart showing IVF success rates by age group across years"
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
