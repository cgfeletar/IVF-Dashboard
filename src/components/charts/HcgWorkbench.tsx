/**
 * HcgWorkbench
 *
 * Unified hCG tool: shared beta input controls at top, then the Curve
 * Explorer and Probability Calculator side-by-side. One entry point for
 * the user's betas feeds both charts simultaneously.
 */

import { useState, useMemo } from "react";
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
import { HcgCurveExplorer, formatDoublingTime } from "./HcgCurveExplorer";
import type { UserBeta } from "./HcgCurveExplorer";
import { HCGPredictor } from "./HCGPredictor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PregnancyType = "natural" | "ivf";
type EmbryoDay = "day3" | "day5";
type TestDay = 9 | 10 | 11 | 12 | 13 | 14;

interface HcgWorkbenchProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HcgWorkbench({ className }: HcgWorkbenchProps) {
  // Shared state
  const [pregnancyType, setPregnancyType] = useState<PregnancyType>("natural");
  const [embryoDay, setEmbryoDay] = useState<EmbryoDay>("day5");
  const [userBetas, setUserBetas] = useState<UserBeta[]>([]);
  const [dpoInput, setDpoInput] = useState("");
  const [hcgInput, setHcgInput] = useState("");

  const dpoOffset = pregnancyType === "natural" ? 0 : embryoDay === "day3" ? 3 : 5;
  const inputUnit = pregnancyType === "natural" ? "DPO" : "DPT";
  const inputMin = 10 - dpoOffset;
  const inputMax = 28 - dpoOffset;

  // --- Handlers ---

  const handleAddBeta = () => {
    const inputDay = parseInt(dpoInput, 10);
    const hcg = parseFloat(hcgInput);
    const dpo = inputDay + dpoOffset;
    if (
      !isNaN(inputDay) &&
      !isNaN(hcg) &&
      inputDay >= inputMin &&
      inputDay <= inputMax &&
      hcg > 0 &&
      userBetas.length < 4
    ) {
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

  const handlePregnancyTypeChange = (v: string) => {
    setPregnancyType(v as PregnancyType);
    setUserBetas([]);
    setDpoInput("");
  };

  const handleEmbryoDayChange = (v: string) => {
    setEmbryoDay(v as EmbryoDay);
    setUserBetas([]);
    setDpoInput("");
  };

  // --- Derived values for HCGPredictor ---
  // Use the most recent beta for the probability calculator.
  // Map DPT to TestDay for the predictor's day-normalization.
  const latestBeta = userBetas.length > 0 ? userBetas[userBetas.length - 1] : null;

  const predictorDay = useMemo((): TestDay | undefined => {
    if (!latestBeta) return undefined;
    // For IVF: inputDay is DPT which maps directly to the predictor's "day of draw"
    if (pregnancyType === "ivf") {
      const clamped = Math.max(9, Math.min(14, latestBeta.inputDay)) as TestDay;
      return clamped;
    }
    // For natural: DPO doesn't map perfectly to "day post-transfer".
    // Use day 9 as default (no normalization) since the model is IVF-specific.
    return 9;
  }, [latestBeta, pregnancyType]);

  const hasBetas = userBetas.length > 0;

  return (
    <Card className={[className, "h-full"].filter(Boolean).join(" ")}>
      <CardHeader>
        <CardTitle className="tracking-tight">hCG Workbench</CardTitle>
        <CardDescription>
          Enter your beta hCG readings once — see them plotted on reference
          curves and get an estimated pregnancy probability simultaneously
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 space-y-6 overflow-y-auto">
        {/* ── Shared input controls ── */}
        <div className="space-y-4 rounded-lg border border-border/40 bg-muted/20 p-4">
          {/* Pregnancy type */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Pregnancy type</p>
              <Tabs value={pregnancyType} onValueChange={handlePregnancyTypeChange}>
                <TabsList>
                  <TabsTrigger value="natural">Natural</TabsTrigger>
                  <TabsTrigger value="ivf">IVF transfer</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {pregnancyType === "ivf" && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Embryo day</p>
                <Tabs value={embryoDay} onValueChange={handleEmbryoDayChange}>
                  <TabsList>
                    <TabsTrigger value="day3">Day 3</TabsTrigger>
                    <TabsTrigger value="day5">Day 5/6/7</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>

          {pregnancyType === "ivf" && (
            <p className="text-xs text-muted-foreground">
              Enter days past transfer (DPT). Converted to DPO for the reference
              curves ({embryoDay === "day3" ? "DPO = DPT + 3" : "DPO = DPT + 5"}).
            </p>
          )}

          {/* Entered betas — horizontal pills */}
          {userBetas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {userBetas.map((beta, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-full bg-primary/10 py-1.5 pl-3 pr-2 text-sm"
                >
                  <span className="font-semibold text-primary tabular-nums">
                    {beta.inputUnit} {beta.inputDay}
                  </span>
                  <span className="text-primary/60">·</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {beta.value.toLocaleString()} mIU/mL
                  </span>
                  {i > 0 && (
                    <>
                      <span className="text-primary/60">·</span>
                      <span className="text-xs font-medium text-primary">
                        {formatDoublingTime(userBetas[i - 1], beta)}
                      </span>
                    </>
                  )}
                  <button
                    onClick={() => handleRemoveBeta(i)}
                    className="ml-0.5 flex size-5 items-center justify-center rounded-full text-primary/50 transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label={`Remove beta ${beta.inputUnit} ${beta.inputDay}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New beta input */}
          {userBetas.length < 4 && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="wb-dpo-input" className="text-xs font-medium text-muted-foreground">
                  {inputUnit}
                </label>
                <Input
                  id="wb-dpo-input"
                  type="number"
                  min={inputMin}
                  max={inputMax}
                  value={dpoInput}
                  onChange={(e) => setDpoInput(e.target.value)}
                  className="w-20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="wb-hcg-input" className="text-xs font-medium text-muted-foreground">
                  hCG (mIU/mL)
                </label>
                <Input
                  id="wb-hcg-input"
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

        {/* ── Side-by-side charts ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Reference curves */}
          <HcgCurveExplorer bare hideControls externalBetas={userBetas} />

          {/* Right: Probability calculator */}
          <HCGPredictor
            bare
            hideControls
            externalHcg={latestBeta?.value}
            externalDay={predictorDay}
          />
        </div>

        {/* ── Quick reference bar ── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Quick ref
          </span>
          <span className="text-xs text-muted-foreground">
            50% threshold:{" "}
            <span className="font-semibold text-foreground">26.5 mIU/mL</span>
          </span>
          <span className="text-xs text-muted-foreground">
            90% threshold:{" "}
            <span className="font-semibold text-foreground">&gt;100 mIU/mL</span>
          </span>
          <span className="text-xs text-muted-foreground">
            Typical doubling:{" "}
            <span className="font-semibold text-foreground">48–72 hours</span>
          </span>
          {pregnancyType === "natural" && (
            <span className="text-[11px] italic text-muted-foreground/70">
              Probability model is based on IVF (euploid FET) data — use as a rough guide for natural pregnancies
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
