/**
 * ConceptionTimingChart
 *
 * Vertical bar chart showing the probability of conception per act of
 * intercourse by day relative to ovulation, based on Ovia Health (2019).
 * The fertile window spans Day −5 through Day 0; the bar for the peak
 * day (Day −1 / Ovulation) is visually highlighted.
 */

import { useMemo } from "react";
import { ResponsiveBar, type BarDatum, type BarTooltipProps } from "@nivo/bar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { CHART_COLORS, PALETTE, NIVO_THEME } from "@/lib/constants";
import { OVIA_CONCEPTION_DATA } from "@/lib/oviaConceptionData";
import { transformConceptionTiming } from "@/lib/transforms";
import type { ConceptionTimingBarDatum } from "@/types/charts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Labels for the peak fertile window bars — highlighted in teal */
const PEAK_LABELS = new Set(["-2", "-1", "Ovulation"]);

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function ConceptionTooltip({ data }: BarTooltipProps<BarDatum>) {
  const d = data as unknown as ConceptionTimingBarDatum;
  const isPeak = PEAK_LABELS.has(d.label);

  const dayLabel =
    d.day === 0
      ? "Ovulation day"
      : d.day > 0
        ? `${d.day} day${Math.abs(d.day) !== 1 ? "s" : ""} after ovulation`
        : `${Math.abs(d.day)} day${Math.abs(d.day) !== 1 ? "s" : ""} before ovulation`;

  return (
    <div className="w-[260px] rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="font-medium">{d.label}</p>
      <p className="mt-0.5 text-muted-foreground">{dayLabel}</p>
      <p className="mt-1.5">
        <span
          className="mr-1.5 inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: isPeak ? PALETTE.teal : PALETTE.oat }}
        />
        Conception probability:{" "}
        <span className="font-semibold">{d.probability}%</span>
      </p>
      {isPeak && (
        <p className="mt-1.5 text-muted-foreground">
          Peak fertile window — highest chance of conception.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ovulation marker layer
// ---------------------------------------------------------------------------

function OvulationMarkerLayer({
  bars,
}: {
  bars: Array<{
    data: { data: ConceptionTimingBarDatum };
    x: number;
    width: number;
    y: number;
  }>;
}) {
  const ovulationBar = bars.find((b) => b.data.data.day === 0);
  if (!ovulationBar) return null;

  const cx = ovulationBar.x + ovulationBar.width / 2;

  return (
    <g>
      <line
        x1={cx}
        x2={cx}
        y1={ovulationBar.y - 8}
        y2={ovulationBar.y - 28}
        stroke={CHART_COLORS.primary}
        strokeWidth={1.5}
        strokeDasharray="3,3"
        opacity={0.7}
      />
      <text
        x={cx}
        y={ovulationBar.y - 32}
        textAnchor="middle"
        fill={CHART_COLORS.primary}
        fontSize={10}
        fontFamily="DM Sans, sans-serif"
        fontWeight={500}
        opacity={0.85}
      >
        Ovulation
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ConceptionTimingChart() {
  const chartData = useMemo(
    () => transformConceptionTiming(OVIA_CONCEPTION_DATA),
    [],
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="tracking-tight">
          Conception Probability by Day of Intercourse
        </CardTitle>
        <CardAction>
          <InfoTip>
            <p className="font-medium">Source</p>
            <p>Ovia Health (2019) — large cohort analysis of conception probability by day of intercourse relative to ovulation.</p>
          </InfoTip>
        </CardAction>
        <CardDescription>
          Likelihood of conception per act of intercourse relative to ovulation
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0">
          <ResponsiveBar
            data={chartData as unknown as BarDatum[]}
            keys={["probability"]}
            indexBy="label"
            layout="vertical"
            valueScale={{ type: "linear", min: 0, max: 40 }}
            margin={{ top: 10, right: 16, bottom: 30, left: 50 }}
            padding={0.3}
            colors={(bar) => {
              const d = bar.data as unknown as ConceptionTimingBarDatum;
              return PEAK_LABELS.has(d.label) ? PALETTE.teal : PALETTE.oat;
            }}
            theme={NIVO_THEME}
            enableGridX={false}
            enableGridY={true}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              tickValues: [0, 10, 20, 30, 40],
              format: (v) => `${v}%`,
              legend: "Probability (%)",
              legendPosition: "middle",
              legendOffset: -42,
            }}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
            }}
            enableLabel={true}
            label={(d) => `${d.value}%`}
            labelSkipHeight={16}
            labelTextColor="#ffffff"
            layers={[
              "grid",
              "axes",
              "bars",
              (props) => (
                <OvulationMarkerLayer
                  bars={
                    props.bars as unknown as Array<{
                      data: { data: ConceptionTimingBarDatum };
                      x: number;
                      width: number;
                      y: number;
                    }>
                  }
                />
              ),
              "markers",
              "legends",
              "annotations",
            ]}
            tooltip={ConceptionTooltip}
            role="img"
            ariaLabel="Bar chart showing conception probability by day of intercourse relative to ovulation"
            barAriaLabel={(e) =>
              `${String(e.indexValue)}: ${String(e.value)}% conception probability`
            }
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
          Teal bars = peak fertile window (Day −2 - Ovulation)
        </div>
      </CardContent>
    </Card>
  );
}
