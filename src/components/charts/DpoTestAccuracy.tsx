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
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { CHART_COLORS, PALETTE, NIVO_THEME } from "@/lib/constants";
import { DPO_DATA } from "@/lib/dpoData";
import { transformDpoTestAccuracy } from "@/lib/transforms";
import type { DpoBarDatum } from "@/types/charts";

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
      <p className="font-medium">
        {dpoLabel}
        {isInterpolated && <span className="text-muted-foreground"> *</span>}
      </p>
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
      {isInterpolated && (
        <p className="mt-1 text-muted-foreground italic">
          * Interpolated estimate
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom annotation layer — "Most implantations complete"
// ---------------------------------------------------------------------------

function ImplantationAnnotationLayer({
  bars,
  yScale,
}: {
  bars: Array<{ data: { indexValue: string | number }; y: number; height: number }>;
  yScale: (value: string) => number;
}) {
  // Find the bars for 10 DPO and 11 DPO to position the annotation between them
  const bar10 = bars.find((b) => b.data.indexValue === "10 DPO");
  const bar11 = bars.find((b) => b.data.indexValue === "11 DPO");

  if (!bar10 || !bar11) return null;

  const midY = (bar10.y + bar10.height / 2 + bar11.y + bar11.height / 2) / 2;

  return (
    <g>
      <line
        x1={0}
        x2={0}
        y1={midY - 18}
        y2={midY + 18}
        stroke={CHART_COLORS.secondary}
        strokeWidth={1.5}
        strokeDasharray="4,3"
        opacity={0.6}
      />
      <text
        x={4}
        y={midY - 22}
        fill={CHART_COLORS.secondary}
        fontSize={10}
        fontFamily="DM Sans, sans-serif"
        fontWeight={500}
        opacity={0.8}
      >
        Most implantations complete
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DpoTestAccuracy() {
  const chartData = useMemo(() => transformDpoTestAccuracy(DPO_DATA), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tracking-tight">Pregnancy Test Accuracy by DPO</CardTitle>
        <CardDescription>
          Likelihood of a true positive vs. false negative result for pregnant
          women testing at each day past ovulation
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div style={{ height: 350 }}>
          <ResponsiveBar
            data={chartData as unknown as BarDatum[]}
            keys={[...KEYS]}
            indexBy="dpo"
            layout="horizontal"
            valueScale={{ type: "linear", min: -100, max: 100 }}
            margin={{ top: 24, right: 24, bottom: 40, left: 96 }}
            padding={0.3}
            colors={(bar) => {
              const key = String(bar.id);
              const dpo = String(bar.indexValue);
              const base = BAR_COLORS[key] ?? "#999";
              // Slightly desaturate interpolated data points
              if (INTERPOLATED_DPOS.has(dpo)) {
                return key === "positive"
                  ? "#8BB8B1" // lighter teal
                  : "#D4A89E"; // lighter dusty rose
              }
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
              legend: "← False negative          Positive →",
              legendPosition: "middle",
              legendOffset: 32,
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              format: (v) => {
                const label = String(v);
                return INTERPOLATED_DPOS.has(label) ? `${label} *` : label;
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
              (props) => (
                <ImplantationAnnotationLayer
                  bars={props.bars}
                  yScale={props.yScale as unknown as (v: string) => number}
                />
              ),
              "bars",
              "markers",
              "legends",
              "annotations",
            ]}
            legends={[
              {
                dataFrom: "keys",
                anchor: "top",
                direction: "row",
                translateY: -20,
                itemWidth: 120,
                itemHeight: 16,
                itemTextColor: "#666",
                symbolSize: 10,
                symbolShape: "circle",
                data: [
                  {
                    id: "positive",
                    label: "Positive",
                    color: BAR_COLORS.positive,
                  },
                  {
                    id: "falseNegative",
                    label: "False Negative",
                    color: BAR_COLORS.falseNegative,
                  },
                ],
              },
            ]}
            tooltip={DpoTooltip}
            role="img"
            ariaLabel="Diverging bar chart showing pregnancy test accuracy by days past ovulation"
            barAriaLabel={(e) => {
              const val = Math.abs(Number(e.value));
              const type =
                e.id === "positive" ? "positive" : "false negative";
              return `${String(e.indexValue)}: ${val}% ${type}`;
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
