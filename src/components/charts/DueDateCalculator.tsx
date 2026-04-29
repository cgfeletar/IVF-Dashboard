/**
 * DueDateCalculator
 *
 * Estimates the expected delivery date (EDD) for either a natural pregnancy
 * (Naegele's rule from LMP) or an IVF transfer (offset from transfer date by
 * the embryo's day at transfer).
 *
 * Formulas:
 *   Natural:        EDD = LMP + 280 days
 *   IVF day-3 ET:   EDD = transfer + 263 days
 *   IVF day-5 ET:   EDD = transfer + 261 days
 *   IVF day-6 ET:   EDD = transfer + 260 days
 *   IVF day-7 ET:   EDD = transfer + 259 days
 *
 * Derivation: full-term gestation = fertilization + 266 days. Subtract the
 * embryo's age at transfer (3/5/6/7 days) to get the offset from transfer date.
 */

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Mode = "ivf" | "natural";
type EmbryoDay = "day3" | "day5";

// Days from transfer to EDD = 266 (fertilization → EDD) − embryo age at transfer.
// Day 5/6/7 blasts are grouped under "day5" using the day-5 baseline (+261),
// matching the HcgWorkbench convention.
const IVF_OFFSET: Record<EmbryoDay, number> = {
  day3: 263,
  day5: 261,
};

const NATURAL_OFFSET = 280;

function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatLong(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function diffInDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function DueDateCalculator() {
  const [mode, setMode] = useState<Mode>("ivf");
  const [embryoDay, setEmbryoDay] = useState<EmbryoDay>("day5");
  const [dateInput, setDateInput] = useState("");

  const result = useMemo(() => {
    const start = parseLocalDate(dateInput);
    if (!start) return null;
    const offset = mode === "ivf" ? IVF_OFFSET[embryoDay] : NATURAL_OFFSET;
    const edd = addDays(start, offset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntil = diffInDays(edd, today);
    const gestationalAgeDays = NATURAL_OFFSET - daysUntil;
    return { edd, daysUntil, gestationalAgeDays };
  }, [dateInput, mode, embryoDay]);

  const dateLabel =
    mode === "ivf" ? "Transfer date" : "Last menstrual period (LMP)";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="tracking-tight">Due Date Calculator</CardTitle>
        <CardDescription>
          Estimate your expected delivery date from an IVF transfer or the first
          day of your last menstrual period.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Conception type + embryo day, side-by-side */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Conception type
            </p>
            <Tabs
              value={mode}
              onValueChange={(v: string) => setMode(v as Mode)}
            >
              <TabsList>
                <TabsTrigger value="natural" className="text-xs">
                  Natural
                </TabsTrigger>
                <TabsTrigger value="ivf" className="text-xs">
                  IVF transfer
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {mode === "ivf" && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Embryo day
              </p>
              <Tabs
                value={embryoDay}
                onValueChange={(v: string) => setEmbryoDay(v as EmbryoDay)}
              >
                <TabsList>
                  <TabsTrigger value="day3" className="text-xs">
                    Day 3
                  </TabsTrigger>
                  <TabsTrigger value="day5" className="text-xs">
                    Day 5/6/7
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>

        {/* Date input */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="due-date-input"
            className="text-xs font-medium text-muted-foreground"
          >
            {dateLabel}
          </label>
          <Input
            id="due-date-input"
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-48"
          />
        </div>

        {/* Result readout */}
        <div
          className={cn(
            "rounded-lg border border-border/60 bg-muted/30 px-4 py-4",
            !result && "text-muted-foreground",
          )}
        >
          {result ? (
            <>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Estimated due date
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-[#4A7870]">
                {formatLong(result.edd)}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {result.daysUntil > 0
                  ? `${result.daysUntil} day${result.daysUntil === 1 ? "" : "s"} away`
                  : result.daysUntil === 0
                    ? "Today"
                    : `${Math.abs(result.daysUntil)} day${Math.abs(result.daysUntil) === 1 ? "" : "s"} ago`}
                {result.gestationalAgeDays >= 0 &&
                  result.gestationalAgeDays <= NATURAL_OFFSET &&
                  ` · currently ${Math.floor(result.gestationalAgeDays / 7)}w ${result.gestationalAgeDays % 7}d`}
              </p>
            </>
          ) : (
            <p className="text-sm">
              Enter a {mode === "ivf" ? "transfer" : "LMP"} date to see your
              estimated due date.
            </p>
          )}
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground/70">
          Based on Naegele's rule (LMP + 280 days) and standard IVF dating
          (fertilization + 266 days, adjusted for embryo age at transfer).
          Estimates only — confirm with your clinician.
        </p>
      </CardContent>
    </Card>
  );
}
