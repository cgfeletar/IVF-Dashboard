/**
 * ConceptionWaffle
 *
 * Pictogram / waffle chart showing conception probability per day relative
 * to ovulation. Each grid shows 100 figures — filled proportionally to the
 * probability — making the odds visceral and immediately readable.
 *
 * Data: Ovia Health (2019).
 */

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { OVIA_CONCEPTION_DATA } from "@/lib/oviaConceptionData";
import { PALETTE } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Person icon path (simplified standing figure)
// ---------------------------------------------------------------------------

const PERSON_PATH =
  "M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM9 10a3 3 0 0 0-3 3v1a1 1 0 0 0 1 1h1v6a1 1 0 0 0 1 1h2v-8h2v8h2a1 1 0 0 0 1-1v-6h1a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3H9Z";

// ---------------------------------------------------------------------------
// Day labels
// ---------------------------------------------------------------------------

const PEAK_DAYS = new Set([-2, -1, 0]);

function dayLabel(day: number): string {
  if (day === 0) return "Ovulation";
  if (day > 0) return `O+${day}`;
  return `O${day}`;
}

function dayDescription(day: number): string {
  if (day === 0) return "Ovulation day";
  if (day > 0) return `${day} day${day !== 1 ? "s" : ""} after ovulation`;
  const abs = Math.abs(day);
  return `${abs} day${abs !== 1 ? "s" : ""} before ovulation`;
}

// ---------------------------------------------------------------------------
// Waffle grid component
// ---------------------------------------------------------------------------

const GRID_COLS = 10;
const GRID_ROWS = 10;
const CELL_SIZE = 24;
const CELL_GAP = 3;
const ICON_SCALE = 0.7;

interface WaffleGridProps {
  probability: number; // 0–100
  fillColor: string;
  emptyColor: string;
}

function WaffleGrid({ probability, fillColor, emptyColor }: WaffleGridProps) {
  const totalWidth = GRID_COLS * (CELL_SIZE + CELL_GAP) - CELL_GAP;
  const totalHeight = GRID_ROWS * (CELL_SIZE + CELL_GAP) - CELL_GAP;

  const cells = useMemo(() => {
    const items: Array<{ row: number; col: number; filled: boolean }> = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const index = row * GRID_COLS + col;
        items.push({ row, col, filled: index < probability });
      }
    }
    return items;
  }, [probability]);

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="w-full"
      style={{ maxWidth: totalWidth }}
      role="img"
      aria-label={`${probability} out of 100 figures highlighted`}
    >
      {cells.map(({ row, col, filled }) => {
        const x = col * (CELL_SIZE + CELL_GAP);
        const y = row * (CELL_SIZE + CELL_GAP);
        return (
          <g
            key={`${row}-${col}`}
            transform={`translate(${x}, ${y}) scale(${ICON_SCALE})`}
            opacity={filled ? 1 : 0.2}
          >
            <path d={PERSON_PATH} fill={filled ? fillColor : emptyColor} />
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ConceptionWaffleProps {
  className?: string;
}

export function ConceptionWaffle({ className }: ConceptionWaffleProps) {
  const [selectedDay, setSelectedDay] = useState(0); // default to ovulation day

  const selectedData = useMemo(
    () => OVIA_CONCEPTION_DATA.find((d) => d.dayRelativeToOvulation === selectedDay),
    [selectedDay],
  );

  const probability = selectedData?.conceptionProbability ?? 0;
  const isPeak = PEAK_DAYS.has(selectedDay);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="tracking-tight">
          Conception Probability by Cycle Day
        </CardTitle>
        <CardDescription>
          Out of 100 couples trying, how many would conceive from a single act
          of intercourse on each day — Ovia Health (2019)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Day selector */}
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Day selector">
          {OVIA_CONCEPTION_DATA.map((d) => {
            const day = d.dayRelativeToOvulation;
            const active = day === selectedDay;
            const peak = PEAK_DAYS.has(day);
            return (
              <button
                key={day}
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedDay(day)}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  active
                    ? peak
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-foreground text-background shadow-sm"
                    : peak
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {dayLabel(day)}
              </button>
            );
          })}
        </div>

        {/* Description + readout */}
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums" style={{ color: isPeak ? PALETTE.teal : PALETTE.oat }}>
            {probability}%
          </span>
          <span className="text-sm text-muted-foreground">
            chance of conception — {dayDescription(selectedDay)}
            {isPeak && (
              <span className="ml-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Peak window
              </span>
            )}
          </span>
        </div>

        {/* Waffle grid */}
        <div className="flex justify-center">
          <div className="w-full max-w-[280px]">
            <WaffleGrid
              probability={probability}
              fillColor={isPeak ? PALETTE.teal : PALETTE.oat}
              emptyColor="#D1D5DB"
            />
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Each figure = 1 out of 100 couples.{" "}
          <span style={{ color: isPeak ? PALETTE.teal : PALETTE.oat }}>Filled</span> = would conceive.
        </p>
      </CardContent>
    </Card>
  );
}
