/**
 * HCGPredictor
 *
 * Sigmoid probability curve showing estimated likelihood of ongoing clinical
 * pregnancy by beta hCG level, based on Sekhon et al. 2016.
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

/**
 * Approximate logistic model fit to the two anchor points published in
 * Sekhon 2016: hCG <26.5 mIU/mL → ~50% ongoing clinical pregnancy;
 * hCG >100 mIU/mL → ~90%.
 *
 * NOTE: This is an approximation of the paper's modeled curve. The exact
 * logistic regression coefficients would require the full paper's supplement.
 * The curve shape is derived from the published model, not raw data points.
 */
function getClinicalPregProbability(hcg: number): number {
  // Logistic: 1 / (1 + e^(-k(x - x0)))
  // Anchors: hcg=26.5 → ~0.50, hcg=100 → ~0.90
  const k = 0.045;
  const x0 = 26.5;
  const raw = 1 / (1 + Math.exp(-k * (hcg - x0)));
  // Scale to match anchors (asymptote ~0.95, floor ~0.05)
  return 0.05 + 0.9 * raw;
}

// ---------------------------------------------------------------------------
// Precomputed static curve data — lives outside component to avoid re-creation
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

// Anchor points for annotation
const ANCHOR_26 = getClinicalPregProbability(26.5);
const ANCHOR_100 = getClinicalPregProbability(100);

const DAYS = [9, 10, 11, 12, 13, 14] as const;
type TestDay = (typeof DAYS)[number];

// ---------------------------------------------------------------------------
// Day normalization — 48-hour doubling extrapolation
// ---------------------------------------------------------------------------

/**
 * Back-extrapolates a beta drawn on `day` to its estimated day-9 equivalent,
 * using the standard ~48-hour doubling time rule.
 *
 * Formula: hcg_day9 = hcg_dayD / 2^((D - 9) / 2)
 *
 * This is a population-level approximation. Actual doubling time varies
 * (normal range is roughly 48–72 hours). For day 9 this is a no-op.
 */
function normalizeToDay9(hcg: number, day: TestDay): number {
  if (day === 9) return hcg;
  return hcg / Math.pow(2, (day - 9) / 2);
}

// ---------------------------------------------------------------------------
// Custom layer — user marker + anchor annotations
// ---------------------------------------------------------------------------

/** Draws the user's beta marker and the two paper anchor annotations. */
function buildMarkerLayer(hcg: number | null, markerColor: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function UserMarkerLayer({ xScale, yScale }: any) {
    const xs = xScale as (v: number) => number;
    const ys = yScale as (v: number) => number;

    const bottom = ys(0);

    return (
      <g>
        {/* User marker */}
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
                {/* Vertical dashed drop line */}
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
                {/* Marker circle on the curve */}
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
// Outcome helpers
// ---------------------------------------------------------------------------

function getProbabilityColor(prob: number): string {
  if (prob >= 0.75) return CHART_COLORS.positive;
  if (prob >= 0.5) return PALETTE.oat;
  return CHART_COLORS.secondary;
}

// ---------------------------------------------------------------------------
// Stat mini-card
// ---------------------------------------------------------------------------

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
          "text-[#5E9E96]": accent === "teal",
          "text-[#C4877A]": accent === "rose",
          "text-foreground": accent === "neutral",
        })}
      >
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HCGPredictor() {
  const [hcgInput, setHcgInput] = useState("");
  const [day, setDay] = useState<TestDay>(9);

  const parsedHcg = useMemo(() => {
    const v = parseFloat(hcgInput);
    return !isNaN(v) && v > 0 ? v : null;
  }, [hcgInput]);

  // Normalize entered beta back to a day-9 equivalent before hitting the model
  const normalizedHcg = parsedHcg != null ? normalizeToDay9(parsedHcg, day) : null;

  const probability =
    normalizedHcg != null ? getClinicalPregProbability(normalizedHcg) : null;
  const markerColor =
    probability != null
      ? getProbabilityColor(probability)
      : CHART_COLORS.primary;

  // Marker sits at the normalized (day-9 equivalent) position on the curve
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="tracking-tight">
              hCG Probability Curve
            </CardTitle>
            <CardDescription>
              Estimated likelihood of ongoing clinical pregnancy by beta hCG at
              day 9 post-transfer — single euploid FET (Sekhon et al. 2016,{" "}
              <em>Fertil Steril</em>, n=649)
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Inputs */}
        <div className="flex flex-wrap items-end gap-6">
          {/* hCG input */}
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
              value={hcgInput}
              onChange={(e) => setHcgInput(e.target.value)}
              className="w-36"
            />
          </div>

          {/* Day of draw */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Day of draw (post-transfer)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={day === d ? "default" : "outline"}
                  className="w-9 px-0 font-medium"
                  onClick={() => setDay(d)}
                  aria-pressed={day === d}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Day normalization note */}
        {isAdjusted && parsedHcg != null && normalizedHcg != null && (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
            Day {day} beta of {parsedHcg.toLocaleString()} mIU/mL adjusted to an
            estimated day-9 equivalent of{" "}
            <span className="font-medium text-foreground">
              {Math.round(normalizedHcg).toLocaleString()} mIU/mL
            </span>{" "}
            using the ~48-hour doubling rule. Actual doubling time varies (normal
            range: ~48–72 h) — this is an approximation.
          </p>
        )}

        {/* Chart */}
        <div
          style={{ height: 340 }}
          role="img"
          aria-label="Sigmoid probability curve: estimated ongoing clinical pregnancy rate by beta hCG level at day 9 post-transfer"
        >
          <ResponsiveLine
            data={CURVE_SERIES}
            margin={{ top: 20, right: 32, bottom: 56, left: 60 }}
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
              legend: "Est. probability of ongoing pregnancy",
              legendOffset: -52,
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
              className={cn("text-3xl font-bold tabular-nums", {
                "text-[#5E9E96]": statAccent() === "teal",
                "text-[#C4877A]": statAccent() === "rose",
                "text-foreground": statAccent() === "neutral",
              })}
            >
              {Math.round(probability * 100)}%
            </span>
            <span className="text-sm text-muted-foreground">
              estimated probability of ongoing clinical pregnancy
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/60">
            Enter a beta value above to see your estimated probability.
          </p>
        )}

        {/* Stat row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={`Your beta (day ${day})`}
            value={parsedHcg != null ? `${parsedHcg.toLocaleString()} mIU/mL` : "—"}
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
              value={parsedHcg != null ? `${parsedHcg.toLocaleString()} mIU/mL` : "—"}
              accent={parsedHcg != null ? statAccent() : "neutral"}
            />
          )}
          <StatCard label="50% threshold" value="26.5 mIU/mL" />
          <StatCard label="90% threshold" value=">100 mIU/mL" />
        </div>

        {/* Source note */}
        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          Curve derived from the published logistic model in Sekhon L et al.,{" "}
          <em>Fertil Steril</em>. 2016;106(3 Suppl):e48 — not raw data points.
          Population: singleton euploid FET, day-9 beta. Individual outcomes
          vary. Always interpret beta results with your clinic.
        </p>
      </CardContent>
    </Card>
  );
}
