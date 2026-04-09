/**
 * HcgCurveExplorer
 *
 * Panel 3 — hCG reference curves (Nivo line) with confidence band,
 * singleton/twins toggle, log-scale option, and "Plot my beta" input.
 */

import { useState, useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import type { CustomLayerProps } from "@nivo/line";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HCG_DATA } from "@/lib/hcgData";
import { transformHcgCurve } from "@/lib/transforms";
import type { HcgSeriesFilter } from "@/lib/transforms";
import { CHART_COLORS, NIVO_THEME } from "@/lib/constants";
import type { NivoLineSeries } from "@/types/charts";

// ---------------------------------------------------------------------------
// Confidence band custom layer
// ---------------------------------------------------------------------------

/**
 * Renders a shaded area between the Low and High series for each type
 * (singleton / twins) to visualise the 5th–95th percentile range.
 */
function ConfidenceBandLayer({ series, xScale, yScale }: CustomLayerProps) {
  const bands: React.ReactElement[] = [];

  const seriesById = new Map(series.map((s) => [s.id, s]));

  const pairs = [
    { low: "Singleton Low (5th)", high: "Singleton High (95th)", color: CHART_COLORS.primary },
    { low: "Twins Low (5th)", high: "Twins High (95th)", color: CHART_COLORS.secondary },
  ];

  for (const { low, high, color } of pairs) {
    const lowSeries = seriesById.get(low);
    const highSeries = seriesById.get(high);
    if (!lowSeries || !highSeries) continue;

    const lowPoints = lowSeries.data.filter(
      (d) => d.data.x != null && d.data.y != null
    );
    const highPoints = highSeries.data.filter(
      (d) => d.data.x != null && d.data.y != null
    );
    if (lowPoints.length === 0 || highPoints.length === 0) continue;

    // Build path: go forward along high, then backward along low
    const forwardPath = highPoints
      .map((d) => {
        const x = (xScale as (v: number) => number)(d.data.x as number);
        const y = (yScale as (v: number) => number)(d.data.y as number);
        return `${x},${y}`;
      })
      .join(" L ");

    const backwardPath = [...lowPoints]
      .reverse()
      .map((d) => {
        const x = (xScale as (v: number) => number)(d.data.x as number);
        const y = (yScale as (v: number) => number)(d.data.y as number);
        return `${x},${y}`;
      })
      .join(" L ");

    bands.push(
      <path
        key={low}
        d={`M ${forwardPath} L ${backwardPath} Z`}
        fill={color}
        fillOpacity={0.1}
      />
    );
  }

  return <g>{bands}</g>;
}

// ---------------------------------------------------------------------------
// Doubling time helper
// ---------------------------------------------------------------------------

/** Calculate hCG doubling time in hours between two beta readings. */
function formatDoublingTime(
  earlier: { dpo: number; value: number },
  later: { dpo: number; value: number },
): string {
  const hoursBetween = (later.dpo - earlier.dpo) * 24;
  if (hoursBetween <= 0 || later.value <= 0 || earlier.value <= 0) return "N/A";
  if (later.value <= earlier.value) return "Not rising";
  const doublingHours =
    (hoursBetween * Math.log(2)) / Math.log(later.value / earlier.value);
  return `${doublingHours.toFixed(1)} hours`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type PregnancyType = "natural" | "ivf";
type EmbryoDay = "day3" | "day5";

export function HcgCurveExplorer() {
  const [filter, setFilter] = useState<HcgSeriesFilter>("singleton");
  const [pregnancyType, setPregnancyType] = useState<PregnancyType>("natural");
  const [embryoDay, setEmbryoDay] = useState<EmbryoDay>("day5");
  const [dpoInput, setDpoInput] = useState("");
  const [hcgInput, setHcgInput] = useState("");
  const [userBetas, setUserBetas] = useState<Array<{ dpo: number; value: number; inputUnit: string; inputDay: number }>>([]);

  const dpoOffset = pregnancyType === "natural" ? 0 : embryoDay === "day3" ? 3 : 5;
  const inputUnit = pregnancyType === "natural" ? "DPO" : "DPT";
  // Valid input range in the user's chosen unit
  const inputMin = 10 - dpoOffset;
  const inputMax = 28 - dpoOffset;

  const baseSeries = useMemo(() => transformHcgCurve(HCG_DATA, filter), [filter]);

  // Determine which series IDs are "median" lines vs low/high bands
  const medianIds = useMemo(
    () => baseSeries.filter((s) => s.id.includes("Median")).map((s) => s.id),
    [baseSeries]
  );

  const hasBetas = userBetas.length > 0;
  const maxBetaDpo = hasBetas ? Math.max(...userBetas.map((b) => b.dpo)) : 28;
  const xMax = hasBetas ? Math.min(maxBetaDpo + 2, 28) : 28;

  // Compute a y-axis max that fits the visible data within the zoomed x range.
  const yMax = useMemo(() => {
    if (!hasBetas) return undefined;
    let max = Math.max(...userBetas.map((b) => b.value));
    for (const s of baseSeries) {
      for (const pt of s.data) {
        if ((pt.x as number) <= xMax && (pt.y as number) > max) {
          max = pt.y as number;
        }
      }
    }
    return Math.ceil(max * 1.1);
  }, [baseSeries, userBetas, hasBetas, xMax]);

  // Sort betas by DPO for the line series
  const sortedBetas = useMemo(
    () => [...userBetas].sort((a, b) => a.dpo - b.dpo),
    [userBetas],
  );

  const chartData = useMemo<NivoLineSeries[]>(() => {
    const series = [...baseSeries];
    if (hasBetas) {
      series.push({
        id: "My Beta",
        data: sortedBetas.map((b) => ({ x: b.dpo, y: b.value })),
      });
    }
    return series;
  }, [baseSeries, sortedBetas, hasBetas]);

  const handleAddBeta = () => {
    const inputDay = parseInt(dpoInput, 10);
    const hcg = parseFloat(hcgInput);
    const dpo = inputDay + dpoOffset;
    if (!isNaN(inputDay) && !isNaN(hcg) && inputDay >= inputMin && inputDay <= inputMax && hcg > 0 && userBetas.length < 4) {
      setUserBetas((prev) => [...prev, { dpo, value: hcg, inputUnit, inputDay }]);
      setDpoInput("");
      setHcgInput("");
    }
  };

  const handleRemoveBeta = (index: number) => {
    setUserBetas((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearBetas = () => {
    setUserBetas([]);
    setDpoInput("");
    setHcgInput("");
  };

  // Build color function for series
  const getSeriesColor = (series: { id: string | number }) => {
    const id = String(series.id);
    if (id === "My Beta") return CHART_COLORS.user;
    if (id.startsWith("Twins")) return CHART_COLORS.secondary;
    return CHART_COLORS.primary;
  };

  // Build color function: hide low/high lines (rendered as the band) by making them transparent
  const getSeriesColorWithHiding = (series: { id: string | number }) => {
    const id = String(series.id);
    if (id.includes("Low") || id.includes("High")) return "rgba(0,0,0,0)";
    return getSeriesColor(series);
  };

  // Custom layer to render the user's beta points (since enablePoints is off globally).
  // Memoised so Nivo sees a stable function reference across renders.
  const userBetaPointLayer = useMemo(() => {
    return function UserBetaPointLayer({ series, xScale, yScale }: CustomLayerProps) {
      const betaSeries = series.find((s) => s.id === "My Beta");
      if (!betaSeries || betaSeries.data.length === 0) return null;
      return (
        <g>
          {betaSeries.data.map((point, i) => {
            if (point.data.x == null || point.data.y == null) return null;
            const cx = (xScale as (v: number) => number)(point.data.x as number);
            const cy = (yScale as (v: number) => number)(point.data.y as number);
            return (
              <circle key={i} cx={cx} cy={cy} r={6} fill={CHART_COLORS.user} stroke="#ffffff" strokeWidth={2} />
            );
          })}
        </g>
      );
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="tracking-tight">hCG Curve Explorer</CardTitle>
            <CardDescription>
              Betabase reference ranges (5th–95th percentile) by days past
              ovulation
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={filter}
              onValueChange={(v: string) => setFilter(v as HcgSeriesFilter)}
            >
              <TabsList>
                <TabsTrigger value="singleton">Singleton</TabsTrigger>
                <TabsTrigger value="twins">Twins</TabsTrigger>
                <TabsTrigger value="both">Both</TabsTrigger>
              </TabsList>
            </Tabs>

          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pregnancy type selector */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            What type of pregnancy are you tracking?
          </p>
          <Tabs
            value={pregnancyType}
            onValueChange={(v) => {
              setPregnancyType(v as PregnancyType);
              setUserBetas([]);
              setDpoInput("");
            }}
          >
            <TabsList>
              <TabsTrigger value="natural">Natural</TabsTrigger>
              <TabsTrigger value="ivf">IVF transfer</TabsTrigger>
            </TabsList>
          </Tabs>

          {pregnancyType === "ivf" && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Embryo day at transfer</p>
              <Tabs
                value={embryoDay}
                onValueChange={(v) => {
                  setEmbryoDay(v as EmbryoDay);
                  setUserBetas([]);
                  setDpoInput("");
                }}
              >
                <TabsList>
                  <TabsTrigger value="day3">Day 3</TabsTrigger>
                  <TabsTrigger value="day5">Day 5 / 6 / 7</TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-muted-foreground">
                Enter days past transfer (DPT). Values are converted to DPO for
                plotting ({embryoDay === "day3" ? "DPO = DPT + 3" : "DPO = DPT + 5"}).
              </p>
            </div>
          )}
        </div>

        {/* Plot my betas — stacked rows */}
        <div className="space-y-2">
          {userBetas.map((beta, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-sm">
                <span className="font-medium text-foreground">
                  {beta.inputUnit} {beta.inputDay}
                  {beta.inputUnit === "DPT" && (
                    <span className="text-muted-foreground font-normal"> (DPO {beta.dpo})</span>
                  )}
                </span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-medium text-foreground">
                  {beta.value.toLocaleString()} mIU/mL
                </span>
              </span>
              {i > 0 && (
                <span className="text-sm font-medium text-primary">
                  Doubling time:{" "}
                  {formatDoublingTime(userBetas[i - 1], beta)}
                </span>
              )}
              <button
                onClick={() => handleRemoveBeta(i)}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label={`Remove beta ${beta.inputUnit} ${beta.inputDay}`}
              >
                ×
              </button>
            </div>
          ))}

          {userBetas.length < 4 && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="dpo-input" className="text-xs font-medium text-muted-foreground">
                  {inputUnit}
                </label>
                <Input
                  id="dpo-input"
                  type="number"
                  min={inputMin}
                  max={inputMax}
                  value={dpoInput}
                  onChange={(e) => setDpoInput(e.target.value)}
                  className="w-20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="hcg-input" className="text-xs font-medium text-muted-foreground">
                  hCG (mIU/mL)
                </label>
                <Input
                  id="hcg-input"
                  type="number"
                  min={1}
                  value={hcgInput}
                  onChange={(e) => setHcgInput(e.target.value)}
                  className="w-28"
                />
              </div>
              <Button size="sm" onClick={handleAddBeta}>
                {hasBetas ? "Add beta" : "Plot my beta"}
              </Button>
              {hasBetas && (
                <Button size="sm" variant="ghost" onClick={handleClearBetas}>
                  Clear all
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Chart */}
        <div
          style={{ height: 400 }}
          role="img"
          aria-label="Line chart showing hCG levels by days past ovulation with confidence bands"
        >
          <ResponsiveLine
            data={chartData}
            margin={{ top: 16, right: 24, bottom: 80, left: 64 }}
            xScale={{
              type: "linear",
              min: 10,
              max: xMax,
            }}
            yScale={{ type: "linear", min: 0, max: yMax ?? "auto" }}
            curve="monotoneX"
            colors={getSeriesColorWithHiding}
            lineWidth={2.5}
            enablePoints={false}
            pointSize={10}
            pointColor={CHART_COLORS.positive}
            pointBorderWidth={2}
            pointBorderColor="#ffffff"
            enableGridX={false}
            axisBottom={{
              tickSize: 4,
              tickPadding: 8,
              legend: "Days Past Ovulation (DPO)",
              legendOffset: 42,
              legendPosition: "middle",
            }}
            axisLeft={{
              tickSize: 4,
              tickPadding: 8,
              legend: "hCG (mIU/mL)",
              legendOffset: -56,
              legendPosition: "middle",
              format: (v) =>
                Number(v) >= 1000
                  ? `${(Number(v) / 1000).toFixed(0)}k`
                  : String(v),
            }}
            theme={NIVO_THEME}
            layers={[
              "grid",
              "markers",
              "axes",
              ConfidenceBandLayer,
              "lines",
              userBetaPointLayer,
              "mesh",
              "legends",
            ]}
            useMesh
            enableSlices={false}
            tooltip={({ point }) => {
              const isUserBeta = point.serieId === "My Beta";
              return (
                <div className="min-w-[200px] rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-popover-foreground">
                    {isUserBeta ? "My Beta" : String(point.serieId)}
                  </p>
                  <p className="text-muted-foreground">
                    DPO {String(point.data.x)} —{" "}
                    <span className="font-medium text-popover-foreground">
                      {Number(point.data.y).toLocaleString()} mIU/mL
                    </span>
                  </p>
                </div>
              );
            }}
            legends={[
              {
                anchor: "bottom-right",
                direction: "row",
                translateY: 70,
                itemWidth: 140,
                itemHeight: 20,
                itemTextColor: NIVO_THEME.textColor,
                symbolSize: 16,
                symbolShape: ({ x, y, size, fill }) => (
                  <rect
                    x={x}
                    y={y + size / 2 - 1.5}
                    width={size}
                    height={3}
                    rx={1.5}
                    fill={fill}
                  />
                ),
                data: [
                  ...medianIds.map((id) => ({
                    id,
                    label: id,
                    color: id.startsWith("Twins")
                      ? CHART_COLORS.secondary
                      : CHART_COLORS.primary,
                  })),
                  ...(hasBetas
                    ? [{ id: "My Beta", label: "My Beta", color: CHART_COLORS.user }]
                    : []),
                ],
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
