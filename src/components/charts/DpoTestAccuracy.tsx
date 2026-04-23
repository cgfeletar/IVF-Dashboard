/**
 * DpoTestAccuracy
 *
 * Diverging (butterfly) bar chart showing pregnancy test accuracy by DPO.
 * Bars extend right for % positive (green) and left for % false negative
 * (terracotta), making the crossover point around 10–11 DPO viscerally clear.
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
import { DPO_DATA } from "@/lib/dpoData";
import { transformDpoTestAccuracy } from "@/lib/transforms";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEYS = ["falseNegative", "positive"] as const;

const BAR_COLORS: Record<string, string> = {
  falseNegative: PALETTE.dustyRose,
  positive: PALETTE.teal,
};

/** DPO values that are interpolated estimates */
const INTERPOLATED_DPOS = new Set(
  DPO_DATA.filter((d) => d.interpolated).map((d) => `${d.dpo} DPO`),
);

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function DpoTooltip({ data }: BarTooltipProps<BarDatum>) {
  const dpoLabel = String(data.dpo);
  const positive = data.positive as number;
  const falseNeg = Math.abs(data.falseNegative as number);
  const isInterpolated = INTERPOLATED_DPOS.has(dpoLabel);

  // "1 in X" phrasing for false negative
  const oneInX = falseNeg > 0 ? Math.round(100 / falseNeg) : null;

  return (
    <div className="w-[320px] rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="font-medium">{dpoLabel}</p>
      <p className="mt-1">
        <span
          className="mr-1.5 inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: BAR_COLORS.positive }}
        />
        Positive: <span className="font-semibold">{positive}%</span>
      </p>
      <p>
        <span
          className="mr-1.5 inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: BAR_COLORS.falseNegative }}
        />
        False negative: <span className="font-semibold">{falseNeg}%</span>
      </p>
      {oneInX !== null && oneInX >= 2 && (
        <p className="mt-1.5 text-muted-foreground">
          1 in {oneInX} pregnant women would still get a false negative at this
          point.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DpoTestAccuracy() {
  const chartData = useMemo(
    () => transformDpoTestAccuracy(DPO_DATA).reverse(),
    [],
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="tracking-tight">
          Pregnancy Test Accuracy by DPO
        </CardTitle>
        <CardAction>
          <InfoTip>
            <p className="font-medium">Source</p>
            <p>Countdown to Pregnancy — crowd-sourced per-DPO pregnancy test accuracy data.</p>
          </InfoTip>
        </CardAction>
        <CardDescription>
          Likelihood of a true positive vs. false negative result
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        <div className="h-full">
          <ResponsiveBar
            data={chartData as unknown as BarDatum[]}
            keys={[...KEYS]}
            indexBy="dpo"
            layout="horizontal"
            valueScale={{ type: "linear", min: -100, max: 100 }}
            margin={{ top: 0, right: 24, bottom: 54, left: 56 }}
            padding={0.3}
            colors={(bar) => {
              const key = String(bar.id);
              const base = BAR_COLORS[key] ?? "#999";
              return base;
            }}
            theme={NIVO_THEME}
            enableGridX={true}
            enableGridY={false}
            axisBottom={{
              tickSize: 0,
              tickPadding: 8,
              tickValues: [-100, -75, -50, -25, 0, 25, 50, 75, 100],
              format: (v) => `${Math.abs(Number(v))}%`,
              legend:
                "← False Negative\u2003\u2003\u2003\u2003\u2003\u2003Positive →\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003",
              legendPosition: "middle",
              legendOffset: 42,
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) => {
                const label = String(v);
                return label;
              },
            }}
            enableLabel={true}
            label={(d) => {
              const val = d.value ?? 0;
              return `${Math.abs(val)}%`;
            }}
            labelSkipWidth={32}
            labelTextColor="#ffffff"
            layers={[
              "grid",
              "axes",
              "bars",
              "markers",
              "legends",
              "annotations",
            ]}
            tooltip={DpoTooltip}
            role="img"
            ariaLabel="Diverging bar chart showing pregnancy test accuracy by days past ovulation"
            barAriaLabel={(e) => {
              const val = Math.abs(Number(e.value));
              const type = e.id === "positive" ? "positive" : "false negative";
              return `${String(e.indexValue)}: ${val}% ${type}`;
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
