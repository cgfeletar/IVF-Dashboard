/**
 * MiscarriageRiskChart
 * Classification: WRITE NEW (from analysis report)
 * Analyst ref: n/a — no candidate component existed
 *
 * Renders gestational miscarriage risk as a declining area chart (weeks 4–20)
 * with personalised inputs (age, prior losses, prior live births) and an
 * optional "current week" marker that reframes the data as risk already survived.
 */

import React, { useState, useMemo, useCallback } from "react";
import { ResponsiveLine } from "@nivo/line";
import type { LineCustomSvgLayerProps, LineSeries } from "@nivo/line";

import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import {
  getMiscarriageRisk,
  getMiscarriageRiskCurve,
} from "@/lib/miscarriageModel";
import { transformMiscarriageRiskCurve } from "@/lib/transforms";
import { CHART_COLORS, NIVO_THEME } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChartInputs {
  maternalAge: number;
  priorMiscarriages: number;
  priorLiveBirths: number;
  currentWeek: number | null;
}

// Nivo infers the series shape — use the shared NivoLineSeries type to keep
// this file's series compatible with the chart's expected input.
type RiskSeries = LineSeries & {
  id: string;
  data: ReadonlyArray<{ x: number; y: number | null }>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKS_START = 4;
const WEEKS_END = 20;
const AGE_MIN = 20;
const AGE_MAX = 50;
const DEFAULT_AGE = 30;
const DEFAULT_PRIOR_MISCARRIAGES = 0;
const DEFAULT_PRIOR_LIVE_BIRTHS = 0;

const PRIOR_MISCARRIAGE_OPTIONS = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3+" },
] as const;

const PRIOR_LIVE_BIRTH_OPTIONS = [
  { value: "0", label: "0" },
  { value: "1", label: "1+" },
] as const;

const WEEK_OPTIONS = Array.from(
  { length: WEEKS_END - WEEKS_START + 1 },
  (_, i) => ({
    value: String(WEEKS_START + i),
    label: `Week ${WEEKS_START + i}`,
  }),
);

// ---------------------------------------------------------------------------
// Custom layer: current-week vertical marker
// ---------------------------------------------------------------------------

interface CurrentWeekLayerProps extends LineCustomSvgLayerProps<RiskSeries> {
  currentWeek: number;
  riskAtCurrentWeek: number;
}

function CurrentWeekMarkerLayer({
  xScale,
  yScale,
  innerHeight,
  currentWeek,
  riskAtCurrentWeek,
}: CurrentWeekLayerProps): React.ReactElement | null {
  const x = xScale(currentWeek as Parameters<typeof xScale>[0]);
  const y = yScale(riskAtCurrentWeek as Parameters<typeof yScale>[0]);

  if (x === undefined || y === undefined) return null;

  return (
    <g>
      {/* Vertical dashed guide line */}
      <line
        x1={x}
        x2={x}
        y1={0}
        y2={innerHeight}
        stroke={CHART_COLORS.positive}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.7}
      />
      {/* Point at the risk value */}
      <circle
        cx={x}
        cy={y}
        r={6}
        fill={CHART_COLORS.positive}
        stroke="#ffffff"
        strokeWidth={2}
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MiscarriageRiskChart({
  className,
}: { className?: string } = {}): React.ReactElement {
  const [inputs, setInputs] = useState<ChartInputs>({
    maternalAge: DEFAULT_AGE,
    priorMiscarriages: DEFAULT_PRIOR_MISCARRIAGES,
    priorLiveBirths: DEFAULT_PRIOR_LIVE_BIRTHS,
    currentWeek: null,
  });

  // Stable setters — avoids recreating the handlers on every render.
  const setAge = useCallback((value: number | readonly number[]) => {
    const v = Array.isArray(value) ? value[0] ?? DEFAULT_AGE : value;
    setInputs((prev) => ({ ...prev, maternalAge: v }));
  }, []);

  const setPriorMiscarriages = useCallback((value: string | null) => {
    setInputs((prev) => ({ ...prev, priorMiscarriages: Number(value) }));
  }, []);

  const setPriorLiveBirths = useCallback((value: string | null) => {
    setInputs((prev) => ({ ...prev, priorLiveBirths: Number(value) }));
  }, []);

  const setCurrentWeek = useCallback((value: string | null) => {
    setInputs((prev) => ({
      ...prev,
      currentWeek: value === "none" ? null : Number(value),
    }));
  }, []);

  // Recompute the full curve only when inputs that affect it change.
  const chartSeries = useMemo<readonly RiskSeries[]>(() => {
    const weeklyRisks = getMiscarriageRiskCurve({
      maternalAge: inputs.maternalAge,
      priorMiscarriages: inputs.priorMiscarriages,
      priorLiveBirths: inputs.priorLiveBirths,
    });
    return transformMiscarriageRiskCurve(weeklyRisks) as RiskSeries[];
  }, [inputs.maternalAge, inputs.priorMiscarriages, inputs.priorLiveBirths]);

  // Current-week metrics — separate memo so the chart series isn't re-shaped on week change.
  const currentWeekMetrics = useMemo(() => {
    if (inputs.currentWeek === null) return null;

    const result = getMiscarriageRisk({
      weeksGestation: inputs.currentWeek,
      maternalAge: inputs.maternalAge,
      priorMiscarriages: inputs.priorMiscarriages,
      priorLiveBirths: inputs.priorLiveBirths,
    });

    return {
      cumulativeRisk: result.cumulativeRisk,
      riskReductionPct: Math.round(result.remainingRiskReduction * 100),
      currentRiskPct: parseFloat((result.cumulativeRisk * 100).toFixed(1)),
      // The y-value at the current week on the plotted curve (0–100 %).
      riskAtCurrentWeek: parseFloat((result.cumulativeRisk * 100).toFixed(2)),
    };
  }, [
    inputs.currentWeek,
    inputs.maternalAge,
    inputs.priorMiscarriages,
    inputs.priorLiveBirths,
  ]);

  // Custom layer factory — memoised to keep the layer reference stable across
  // renders where only unrelated props change. Re-creates only when the marker
  // position or metrics change.
  const currentWeekLayer = useMemo(() => {
    if (inputs.currentWeek === null || currentWeekMetrics === null) return null;

    const week = inputs.currentWeek;
    const riskAtCurrentWeek = currentWeekMetrics.riskAtCurrentWeek;

    return function CurrentWeekLayer(
      props: LineCustomSvgLayerProps<RiskSeries>,
    ): React.ReactElement | null {
      return (
        <CurrentWeekMarkerLayer
          {...props}
          currentWeek={week}
          riskAtCurrentWeek={riskAtCurrentWeek}
        />
      );
    };
  }, [inputs.currentWeek, currentWeekMetrics]);

  const layers = useMemo(
    () =>
      currentWeekLayer
        ? ([
            "grid",
            "markers",
            "axes",
            "areas",
            "lines",
            "points",
            "mesh",
            currentWeekLayer,
            "legends",
          ] as const)
        : ([
            "grid",
            "markers",
            "axes",
            "areas",
            "lines",
            "points",
            "mesh",
            "legends",
          ] as const),
    [currentWeekLayer],
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="tracking-tight">
          Miscarriage Risk by Gestational Age
        </CardTitle>
        <InfoTip>
          <p className="font-medium">Sources</p>
          <p className="mt-1">Tong et al., <em>Obstet Gynecol</em> 2008;111(3):710-4.</p>
          <p className="mt-1">Avalos et al., <em>Birth Defects Res A</em> 2012;94(6):417-23.</p>
          <p className="mt-1">Magnus et al., <em>BMJ</em> 2019;364:l869 — role of maternal age and pregnancy history.</p>
        </InfoTip>
      </CardHeader>

      {/* Filters */}
      <div className="grid grid-cols-4 items-end gap-3 px-4 pb-2">
        {/* Maternal age slider */}
        <fieldset className="flex flex-col gap-1">
          <legend className="text-xs font-medium text-foreground mb-2">
            Maternal age:{" "}
            <span className="font-semibold">{inputs.maternalAge}</span>
          </legend>
          <Slider
            min={AGE_MIN}
            max={AGE_MAX}
            step={1}
            value={[inputs.maternalAge]}
            onValueChange={setAge}
            aria-label="Maternal age"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{AGE_MIN}</span>
            <span>{AGE_MAX}</span>
          </div>
        </fieldset>

        {/* Prior miscarriages */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="prior-miscarriages"
            className="text-xs font-medium text-foreground"
          >
            Prior miscarriages
          </label>
          <Select
            value={String(inputs.priorMiscarriages)}
            onValueChange={setPriorMiscarriages}
          >
            <SelectTrigger
              id="prior-miscarriages"
              className="w-full"
              size="sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIOR_MISCARRIAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prior live births */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="prior-live-births"
            className="text-xs font-medium text-foreground"
          >
            Prior live births
          </label>
          <Select
            value={String(inputs.priorLiveBirths)}
            onValueChange={setPriorLiveBirths}
          >
            <SelectTrigger
              id="prior-live-births"
              className="w-full"
              size="sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIOR_LIVE_BIRTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current week pin */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="current-week"
            className="text-xs font-medium text-foreground"
          >
            Current week
          </label>
          <Select
            value={
              inputs.currentWeek !== null
                ? String(inputs.currentWeek)
                : "none"
            }
            onValueChange={setCurrentWeek}
          >
            <SelectTrigger id="current-week" className="w-full" size="sm">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {WEEK_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Positive-framing message */}
      {currentWeekMetrics !== null && inputs.currentWeek !== null && (
        <div
          className={cn(
            "mx-4 mb-2 flex flex-wrap items-center justify-center gap-2 rounded-lg px-3 py-1 text-sm",
            "border border-[#4A7870]/20 bg-[#4A7870]/8",
          )}
          role="status"
          aria-live="polite"
        >
          <span
            className="font-semibold"
            style={{ color: CHART_COLORS.positive }}
          >
            Your risk has dropped {currentWeekMetrics.riskReductionPct}%
            since week 4
          </span>
          <Badge
            variant="outline"
            className="border-[#4A7870]/40 text-[#4A7870] rounded-lg"
          >
            {currentWeekMetrics.currentRiskPct}% remaining risk
          </Badge>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 min-h-0 px-4 pb-4">
        <div
          className="h-full"
          role="img"
          aria-label="Miscarriage risk area chart showing declining risk from gestational week 4 to 20"
        >
          <ResponsiveLine
              data={chartSeries}
              margin={{ top: 16, right: 24, bottom: 48, left: 52 }}
              xScale={{ type: "linear", min: WEEKS_START, max: WEEKS_END }}
              yScale={{ type: "linear", min: 0, max: "auto" }}
              curve="monotoneX"
              enableArea
              areaOpacity={1}
              areaBaselineValue={0}
              defs={[
                {
                  id: "risk-area-fill",
                  type: "linearGradient",
                  colors: [
                    { offset: 0, color: CHART_COLORS.range, opacity: 1 },
                    { offset: 100, color: CHART_COLORS.range, opacity: 0.4 },
                  ],
                  gradientTransform: "rotate(90)",
                },
              ]}
              fill={[{ match: "*", id: "risk-area-fill" }]}
              colors={[CHART_COLORS.primary]}
              lineWidth={2.5}
              enablePoints={false}
              enableGridX={false}
              axisBottom={{
                tickSize: 4,
                tickPadding: 8,
                legend: "Gestational week",
                legendOffset: 38,
                legendPosition: "middle",
                tickValues: [4, 6, 8, 10, 12, 14, 16, 18, 20],
              }}
              axisLeft={{
                tickSize: 4,
                tickPadding: 8,
                tickValues: 5,
                legend: "Cumulative risk (%)",
                legendOffset: -44,
                legendPosition: "middle",
                format: (v) => `${v}%`,
              }}
              theme={NIVO_THEME}
              layers={layers}
              animate
              motionConfig="gentle"
              useMesh
              enableSlices={false}
              tooltip={({ point }) => (
                <div
                  className="min-w-[160px] rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md"
                  style={{ color: NIVO_THEME.textColor }}
                >
                  <div className="font-semibold">Week {point.data.x}</div>
                  <div>Risk: {String(point.data.y)}%</div>
                </div>
              )}
            />
          </div>
        </div>
    </Card>
  );
}

export default MiscarriageRiskChart;
