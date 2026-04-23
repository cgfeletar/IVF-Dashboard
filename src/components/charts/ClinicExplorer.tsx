/**
 * ClinicExplorer
 * Classification: WRITE NEW (from analysis report)
 * Analyst ref: n/a — no existing candidate
 */

import { useState, useMemo, useCallback } from "react";
import { ResponsiveBar } from "@nivo/bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCdcArtData } from "@/hooks/useCdcArtData";
import { transformClinicExplorer } from "@/lib/transforms";
import { CHART_COLORS, NIVO_THEME, US_STATES } from "@/lib/constants";
import type { ClinicBarDatum } from "@/types/charts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOP_N = 10;
const DEFAULT_STATE = "OR";
const MIN_TRANSFERS_MAX = 200;

/** Truncate clinic name for the chart axis — long names break horizontal layout. */
function truncateClinicName(name: string, maxLength = 32): string {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength - 1)}…`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton(): React.ReactElement {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="space-y-3"
      aria-label="Loading clinic data"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="h-8 rounded-md skeleton-shimmer"
          style={{ width: `${65 + (i % 3) * 10}%` }}
        />
      ))}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps): React.ReactElement {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center gap-3 py-8 text-center"
    >
      <p className="text-sm text-destructive">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md border border-input px-4 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState({ state }: { state: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="text-sm text-muted-foreground">
        No clinics found for {state} with the current filters.
      </p>
      <p className="text-xs text-muted-foreground">
        Try lowering the minimum transfer threshold or selecting a different state.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart tooltip — typed to match Nivo's bar tooltip shape
// ---------------------------------------------------------------------------

interface BarTooltipDatum {
  id: string;
  value: number;
  indexValue: string;
  data: ClinicBarDatum;
}

function ChartTooltip({ datum }: { datum: BarTooltipDatum }): React.ReactElement {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{datum.data.clinic}</p>
      <p className="text-muted-foreground">
        Live birth rate:{" "}
        <span className="font-medium text-popover-foreground">
          {datum.value.toFixed(1)}%
        </span>
      </p>
      <p className="text-muted-foreground">
        Transfers:{" "}
        <span className="font-medium text-popover-foreground">
          {datum.data.numTransfers.toLocaleString()}
        </span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ClinicExplorerProps {
  initialState?: string;
}

export function ClinicExplorer({ initialState = DEFAULT_STATE }: ClinicExplorerProps = {}): React.ReactElement {
  const [selectedState, setSelectedState] = useState<string>(initialState);
  const [minTransfers, setMinTransfers] = useState<number>(0);

  const { data, isLoading, isError, error, refetch } = useCdcArtData({
    state: selectedState,
    limit: 1000,
  });

  const chartData = useMemo<ClinicBarDatum[]>(() => {
    if (!data) return [];
    return transformClinicExplorer(data, {
      state: selectedState,
      minTransfers,
      topN: TOP_N,
    });
  }, [data, selectedState, minTransfers]);

  // Chart data needs names truncated for display; table rows use full names.
  const chartDisplayData = useMemo(
    () =>
      chartData.map((d) => ({
        ...d,
        clinic: truncateClinicName(d.clinic),
      })),
    [chartData]
  );

  const handleStateChange = useCallback((value: string | null) => {
    if (value !== null) {
      setSelectedState(value);
    }
  }, []);

  const handleSliderChange = useCallback((value: number | readonly number[]) => {
    setMinTransfers(Array.isArray(value) ? value[0] ?? 0 : value);
  }, []);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const errorMessage =
    error instanceof Error
      ? `Failed to load clinic data: ${error.message}`
      : "Failed to load clinic data. Please try again.";

  const chartHeight = Math.max(240, TOP_N * 44);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tracking-tight">Clinic Explorer</CardTitle>
        <CardDescription>
          Top clinics by live birth rate per transfer. CDC NASS data.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="state-select"
              className="text-sm font-medium text-foreground"
            >
              State
            </label>
            <Select
              value={selectedState}
              onValueChange={handleStateChange}
            >
              <SelectTrigger id="state-select" size="default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(({ abbr, label }) => (
                  <SelectItem key={abbr} value={abbr}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-[200px] flex-1 items-center gap-3">
            <label
              htmlFor="min-transfers-slider"
              className="shrink-0 text-sm font-medium text-foreground"
            >
              Min transfers
            </label>
            <Slider
              id="min-transfers-slider"
              aria-label="Minimum transfer count"
              min={0}
              max={MIN_TRANSFERS_MAX}
              value={[minTransfers]}
              onValueChange={handleSliderChange}
              className="flex-1"
            />
            <Badge variant="outline" className="shrink-0 tabular-nums">
              {minTransfers}+
            </Badge>
          </div>
        </div>

        {/* Chart area */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState message={errorMessage} onRetry={handleRetry} />
        ) : chartData.length === 0 ? (
          <EmptyState state={selectedState} />
        ) : (
          <>
            {/* Horizontal bar chart */}
            <div
              style={{ height: chartHeight }}
              aria-label={`Horizontal bar chart showing top ${chartData.length} clinics in ${selectedState} by live birth rate`}
              role="img"
            >
              <ResponsiveBar
                data={chartDisplayData}
                keys={["livebirthRate"]}
                indexBy="clinic"
                layout="horizontal"
                margin={{ top: 8, right: 80, bottom: 40, left: 220 }}
                padding={0.3}
                valueScale={{ type: "linear" }}
                indexScale={{ type: "band", round: true }}
                colors={[CHART_COLORS.primary]}
                theme={NIVO_THEME}
                borderRadius={3}
                axisBottom={{
                  tickSize: 4,
                  tickPadding: 6,
                  format: (v) => `${v}%`,
                  legend: "Live birth rate (%)",
                  legendPosition: "middle",
                  legendOffset: 36,
                }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 10,
                }}
                label={(d) => `${Number(d.value).toFixed(1)}%`}
                labelSkipWidth={40}
                labelTextColor="#ffffff"
                tooltip={({ id, value, indexValue, data: barData }) => (
                  <ChartTooltip
                    datum={{
                      id: String(id),
                      value: Number(value),
                      indexValue: String(indexValue),
                      data: barData as ClinicBarDatum,
                    }}
                  />
                )}
                role="presentation"
                ariaLabel="Clinic live birth rates"
              />
            </div>

            {/* Data table */}
            <div className="mt-4">
              <Table aria-label="Clinic live birth rate data">
                <TableHeader>
                  <TableRow>
                    <TableHead>Clinic</TableHead>
                    <TableHead className="text-right">
                      Live birth rate
                    </TableHead>
                    <TableHead className="text-right">Transfers</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((row) => (
                    <TableRow key={row.clinic}>
                      <TableCell className="max-w-[280px] truncate font-medium">
                        {row.clinic}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.livebirthRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.numTransfers.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.state}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
