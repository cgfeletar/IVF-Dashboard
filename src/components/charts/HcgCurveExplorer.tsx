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
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HCG_DATA } from "@/lib/hcgData";
import { transformHcgCurve, transformUserBeta } from "@/lib/transforms";
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
// Main component
// ---------------------------------------------------------------------------

export function HcgCurveExplorer() {
  const [filter, setFilter] = useState<HcgSeriesFilter>("singleton");
  const [logScale, setLogScale] = useState(false);
  const [dpoInput, setDpoInput] = useState("");
  const [hcgInput, setHcgInput] = useState("");
  const [userBeta, setUserBeta] = useState<{ dpo: number; value: number } | null>(null);

  const baseSeries = useMemo(() => transformHcgCurve(HCG_DATA, filter), [filter]);

  // Determine which series IDs are "median" lines vs low/high bands
  const medianIds = useMemo(
    () => baseSeries.filter((s) => s.id.includes("Median")).map((s) => s.id),
    [baseSeries]
  );

  const chartData = useMemo<NivoLineSeries[]>(() => {
    const series = [...baseSeries];
    if (userBeta) {
      series.push(transformUserBeta(userBeta.dpo, userBeta.value));
    }
    return series;
  }, [baseSeries, userBeta]);

  const handlePlotBeta = () => {
    const dpo = parseInt(dpoInput, 10);
    const hcg = parseFloat(hcgInput);
    if (!isNaN(dpo) && !isNaN(hcg) && dpo >= 10 && dpo <= 28 && hcg > 0) {
      setUserBeta({ dpo, value: hcg });
    }
  };

  const handleClearBeta = () => {
    setUserBeta(null);
    setDpoInput("");
    setHcgInput("");
  };

  // Build color function for series
  const getSeriesColor = (series: { id: string | number }) => {
    const id = String(series.id);
    if (id === "My Beta") return CHART_COLORS.positive;
    if (id.startsWith("Twins")) return CHART_COLORS.secondary;
    return CHART_COLORS.primary;
  };

  // Build color function: hide low/high lines (rendered as the band) by making them transparent
  const getSeriesColorWithHiding = (series: { id: string | number }) => {
    const id = String(series.id);
    if (id.includes("Low") || id.includes("High")) return "rgba(0,0,0,0)";
    return getSeriesColor(series);
  };

  // Custom layer to render the user's beta point (since enablePoints is off globally)
  const UserBetaPointLayer = ({ series, xScale, yScale }: CustomLayerProps) => {
    const betaSeries = series.find((s) => s.id === "My Beta");
    if (!betaSeries || betaSeries.data.length === 0) return null;
    const point = betaSeries.data[0];
    if (point.data.x == null || point.data.y == null) return null;
    const x = (xScale as (v: number) => number)(point.data.x as number);
    const y = (yScale as (v: number) => number)(point.data.y as number);
    return (
      <g>
        <circle cx={x} cy={y} r={6} fill={CHART_COLORS.positive} stroke="#ffffff" strokeWidth={2} />
      </g>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>hCG Curve Explorer</CardTitle>
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

            <Toggle
              pressed={logScale}
              onPressedChange={setLogScale}
              aria-label="Toggle log scale"
              size="sm"
              variant="outline"
            >
              Log
            </Toggle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Plot my beta */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="dpo-input" className="text-xs font-medium text-muted-foreground">
              DPO
            </label>
            <Input
              id="dpo-input"
              type="number"
              min={10}
              max={28}
              placeholder="14"
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
              placeholder="250"
              value={hcgInput}
              onChange={(e) => setHcgInput(e.target.value)}
              className="w-28"
            />
          </div>
          <Button size="sm" onClick={handlePlotBeta}>
            Plot my beta
          </Button>
          {userBeta && (
            <>
              <Badge variant="secondary">
                DPO {userBeta.dpo}: {userBeta.value.toLocaleString()} mIU/mL
              </Badge>
              <Button size="sm" variant="ghost" onClick={handleClearBeta}>
                Clear
              </Button>
            </>
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
            margin={{ top: 16, right: 24, bottom: 56, left: 64 }}
            xScale={{ type: "linear", min: 10, max: 28 }}
            yScale={
              logScale
                ? { type: "log", base: 10, min: "auto", max: "auto" }
                : { type: "linear", min: 0, max: "auto" }
            }
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
              UserBetaPointLayer,
              "mesh",
              "legends",
            ]}
            useMesh
            enableSlices={false}
            tooltip={({ point }) => {
              const isUserBeta = point.serieId === "My Beta";
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
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
                anchor: "top-left",
                direction: "column",
                translateX: 12,
                translateY: 0,
                itemWidth: 140,
                itemHeight: 20,
                itemTextColor: NIVO_THEME.textColor,
                symbolSize: 10,
                symbolShape: "circle",
                data: medianIds.map((id) => ({
                  id,
                  label: id,
                  color: id.startsWith("Twins")
                    ? CHART_COLORS.secondary
                    : CHART_COLORS.primary,
                })),
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}
