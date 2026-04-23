/**
 * HCGPredictor
 *
 * Sigmoid probability curve showing estimated likelihood of ongoing clinical
 * pregnancy by beta hCG level, based on Sekhon et al. 2016.
 *
 * Supports two modes:
 *  - Standalone: manages its own hCG input + day selector
 *  - Controlled (bare + props): receives hcg/day externally, no input controls
 *
 * Cite: Sekhon L et al. Fertil Steril. 2016;106(3 Suppl):e48.
 * RMA of New York. n=649 single euploid frozen blastocyst transfers, day 9.
 */

import { useState, useMemo } from "react";
import { ResponsiveLine } from "@nivo/line";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CHART_COLORS, PALETTE, NIVO_THEME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { NivoLineSeries } from "@/types/charts";

// ---------------------------------------------------------------------------
// Logistic model — Sekhon et al. 2016
// ---------------------------------------------------------------------------

function getClinicalPregProbability(hcg: number): number {
  const k = 0.045;
  const x0 = 26.5;
  const raw = 1 / (1 + Math.exp(-k * (hcg - x0)));
  return 0.05 + 0.9 * raw;
}

// ---------------------------------------------------------------------------
// Static curve data
// ---------------------------------------------------------------------------

const X_MAX = 400;

const CURVE_SERIES: NivoLineSeries[] = [
  {
    id: "Probability",
    data: Array.from({ length: X_MAX / 2 + 1 }, (_, i) => ({
      x: i * 2,
      y: getClinicalPregProbability(i * 2),
    })),
  },
];

const DAYS = [9, 10, 11, 12, 13, 14] as const;
type TestDay = (typeof DAYS)[number];

// ---------------------------------------------------------------------------
// Day normalization
// ---------------------------------------------------------------------------

function normalizeToDay9(hcg: number, day: TestDay): number {
  if (day === 9) return hcg;
  return hcg / Math.pow(2, (day - 9) / 2);
}

// ---------------------------------------------------------------------------
// Marker layer
// ---------------------------------------------------------------------------

function buildMarkerLayer(hcg: number | null, markerColor: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function UserMarkerLayer({ xScale, yScale }: any) {
    const xs = xScale as (v: number) => number;
    const ys = yScale as (v: number) => number;
    const bottom = ys(0);

    return (
      <g>
        {hcg != null &&
          hcg > 0 &&
          (() => {
            const clampedHcg = Math.min(hcg, X_MAX);
            const prob = getClinicalPregProbability(clampedHcg);
            const mx = xs(clampedHcg);
            const my = ys(prob);
            return (
              <g
                style={{
                  transform: `translateX(${mx}px)`,
                  transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <line
                  x1={0}
                  y1={bottom}
                  x2={0}
                  y2={my + 10}
                  stroke={markerColor}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  strokeOpacity={0.65}
                />
                <circle
                  cx={0}
                  cy={my}
                  r={8}
                  fill={markerColor}
                  stroke="#ffffff"
                  strokeWidth={2.5}
                />
              </g>
            );
          })()}
      </g>
    );
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getProbabilityColor(prob: number): string {
  if (prob >= 0.75) return CHART_COLORS.positive;
  if (prob >= 0.5) return PALETTE.oat;
  return CHART_COLORS.secondary;
}

interface StatCardProps {
  label: string;
  value: string;
  accent?: "teal" | "rose" | "neutral";
}

function StatCard({ label, value, accent = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn("mt-1 text-lg font-semibold tabular-nums", {
          "text-[#4A7870]": accent === "teal",
          "text-[#9B594B]": accent === "rose",
          "text-foreground": accent === "neutral",
        })}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HCGPredictorProps {
  bare?: boolean;
  /** Hide input controls (used in workbench mode) */
  hideControls?: boolean;
  /** Externally provided hCG value (overrides internal state) */
  externalHcg?: number | null;
  /** Externally provided day-of-draw (overrides internal state) */
  externalDay?: TestDay;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HCGPredictor({
  bare,
  hideControls,
  externalHcg,
  externalDay,
}: HCGPredictorProps = {}) {
  const [internalHcgInput, setInternalHcgInput] = useState("");
  const [internalDay, setInternalDay] = useState<TestDay>(9);

  // Resolve effective values — external props win when provided
  const internalParsedHcg = useMemo(() => {
    const v = parseFloat(internalHcgInput);
    return !isNaN(v) && v > 0 ? v : null;
  }, [internalHcgInput]);

  const parsedHcg =
    externalHcg !== undefined ? (externalHcg ?? null) : internalParsedHcg;

  const day = externalDay ?? internalDay;

  const normalizedHcg =
    parsedHcg != null ? normalizeToDay9(parsedHcg, day) : null;
  const probability =
    normalizedHcg != null ? getClinicalPregProbability(normalizedHcg) : null;
  const markerColor =
    probability != null
      ? getProbabilityColor(probability)
      : CHART_COLORS.primary;

  const markerLayer = useMemo(
    () => buildMarkerLayer(normalizedHcg, markerColor),
    [normalizedHcg, markerColor],
  );

  const statAccent = (): "teal" | "rose" | "neutral" => {
    if (probability == null) return "neutral";
    if (probability >= 0.75) return "teal";
    if (probability < 0.5) return "rose";
    return "neutral";
  };

  const isAdjusted = day !== 9;

  // ---------------------------------------------------------------------------
  // Chart + readout (shared between bare and standalone)
  // ---------------------------------------------------------------------------

  const chartAndReadout = (
    <>
      <div
        className="flex-1"
        role="img"
        aria-label="Sigmoid probability curve: estimated ongoing clinical pregnancy rate by beta hCG level"
      >
        <ResponsiveLine
          data={CURVE_SERIES}
          margin={{ top: 40, right: 24, bottom: 36, left: 52 }}
          xScale={{ type: "linear", min: 0, max: X_MAX }}
          yScale={{ type: "linear", min: 0, max: 1 }}
          curve="monotoneX"
          colors={[CHART_COLORS.primary]}
          lineWidth={2.5}
          enablePoints={false}
          enableGridX={false}
          enableArea
          areaOpacity={0.08}
          axisBottom={{
            tickSize: 4,
            tickPadding: 8,
            legend: "Beta hCG (mIU/mL)",
            legendOffset: 42,
            legendPosition: "middle",
          }}
          axisLeft={{
            tickSize: 4,
            tickPadding: 8,
            legend: "Probability Calculator",
            legendOffset: -44,
            legendPosition: "middle",
            tickValues: [0, 0.25, 0.5, 0.75, 1.0],
            format: (v) => `${Math.round(Number(v) * 100)}%`,
          }}
          theme={NIVO_THEME}
          layers={["grid", "axes", "areas", "lines", markerLayer]}
          isInteractive={false}
        />
      </div>

      {/* Probability readout */}
      {probability != null ? (
        <div className="flex items-baseline gap-2">
          <span
            className={cn("text-xl font-bold tabular-nums", {
              "text-[#4A7870]": statAccent() === "teal",
              "text-[#9B594B]": statAccent() === "rose",
              "text-foreground": statAccent() === "neutral",
            })}
          >
            {Math.round(probability * 100)}%
          </span>
          <span className="text-sm text-muted-foreground">
            est. ongoing pregnancy
          </span>
        </div>
      ) : (
        <p className="text-sm pt-2 text-center">
          Enter a beta value to see your estimated probability.
        </p>
      )}
    </>
  );

  // ---------------------------------------------------------------------------
  // Bare mode
  // ---------------------------------------------------------------------------

  if (bare) {
    return (
      <div className="flex h-full flex-col">
        {!hideControls && (
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="hcg-prob-input"
                className="text-xs font-medium text-muted-foreground"
              >
                Beta hCG (mIU/mL)
              </label>
              <Input
                id="hcg-prob-input"
                type="number"
                min={1}
                step="any"
                placeholder="e.g. 85"
                value={internalHcgInput}
                onChange={(e) => setInternalHcgInput(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Day of draw
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={internalDay === d ? "default" : "outline"}
                    className="w-9 px-0 font-medium"
                    onClick={() => setInternalDay(d)}
                    aria-pressed={internalDay === d}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {chartAndReadout}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Standalone mode
  // ---------------------------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tracking-tight">hCG Probability Curve</CardTitle>
        <CardDescription>
          Estimated likelihood of ongoing clinical pregnancy by beta hCG at day
          9 post-transfer — single euploid FET (Sekhon et al. 2016,{" "}
          <em>Fertil Steril</em>, n=649)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="hcg-prob-input"
              className="text-xs font-medium text-muted-foreground"
            >
              Beta hCG (mIU/mL)
            </label>
            <Input
              id="hcg-prob-input"
              type="number"
              min={1}
              step="any"
              placeholder="e.g. 85"
              value={internalHcgInput}
              onChange={(e) => setInternalHcgInput(e.target.value)}
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Day of draw (post-transfer)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={internalDay === d ? "default" : "outline"}
                  className="w-9 px-0 font-medium"
                  onClick={() => setInternalDay(d)}
                  aria-pressed={internalDay === d}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {chartAndReadout}

        {/* Stat row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={`Your beta (day ${day})`}
            value={
              parsedHcg != null ? `${parsedHcg.toLocaleString()} mIU/mL` : "—"
            }
          />
          {isAdjusted ? (
            <StatCard
              label="Day-9 equivalent"
              value={
                normalizedHcg != null
                  ? `${Math.round(normalizedHcg).toLocaleString()} mIU/mL`
                  : "—"
              }
              accent={normalizedHcg != null ? statAccent() : "neutral"}
            />
          ) : (
            <StatCard
              label="Your beta (day 9)"
              value={
                parsedHcg != null ? `${parsedHcg.toLocaleString()} mIU/mL` : "—"
              }
              accent={parsedHcg != null ? statAccent() : "neutral"}
            />
          )}
          <StatCard label="50% threshold" value="26.5 mIU/mL" />
          <StatCard label="90% threshold" value=">100 mIU/mL" />
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          Curve derived from the published logistic model in Sekhon L et al.,{" "}
          <em>Fertil Steril</em>. 2016;106(3 Suppl):e48 — not raw data points.
          Population: singleton euploid FET, day-9 beta. Individual outcomes
          vary.
        </p>
      </CardContent>
    </Card>
  );
}
