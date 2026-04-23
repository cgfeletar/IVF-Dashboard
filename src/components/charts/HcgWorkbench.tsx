/**
 * HcgWorkbench
 *
 * Unified hCG tool: shared beta input controls at top, then the Curve
 * Explorer and Probability Calculator side-by-side. One entry point for
 * the user's betas feeds both charts simultaneously.
 */

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HcgCurveExplorer, formatDoublingTime } from "./HcgCurveExplorer";
import type { UserBeta } from "./HcgCurveExplorer";
import { HCGPredictor } from "./HCGPredictor";
import type { HcgSeriesFilter } from "@/lib/transforms";

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
  const [curveFilter, setCurveFilter] = useState<HcgSeriesFilter>("singleton");
  const [userBetas, setUserBetas] = useState<UserBeta[]>([]);
  const [dpoInput, setDpoInput] = useState("");
  const [hcgInput, setHcgInput] = useState("");

  const dpoOffset =
    pregnancyType === "natural" ? 0 : embryoDay === "day3" ? 3 : 5;
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
      setUserBetas((prev) => [
        ...prev,
        { dpo, value: hcg, inputUnit, inputDay },
      ]);
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
  const latestBeta =
    userBetas.length > 0 ? userBetas[userBetas.length - 1] : null;

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
        <CardTitle className="tracking-tight pb-3">hCG Workbench</CardTitle>
        <CardAction>
          <InfoTip>
            <p className="font-medium">Sources</p>
            <p className="mt-1"><strong>Reference curves:</strong> Betabase community data (DPO 10–28, singleton &amp; twin, 5th/50th/95th percentiles).</p>
            <p className="mt-1"><strong>Probability model:</strong> Sekhon et al., <em>Fertil Steril</em> 2016;106(3 Suppl):e48. RMA of New York, n=649 single euploid frozen blastocyst transfers, day 9.</p>
          </InfoTip>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col gap-2">
        {/* ── Shared input controls ── */}
        <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-2">
          {/* Pregnancy type + curve filter */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Pregnancy type
              </p>
              <Tabs
                value={pregnancyType}
                onValueChange={handlePregnancyTypeChange}
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

            {pregnancyType === "ivf" && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Embryo day
                </p>
                <Tabs value={embryoDay} onValueChange={handleEmbryoDayChange}>
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

            <div className="ml-auto space-y-0">
              <p className="text-xs font-medium text-muted-foreground">
                Reference curves
              </p>
              <Tabs
                value={curveFilter}
                onValueChange={(v: string) =>
                  setCurveFilter(v as HcgSeriesFilter)
                }
              >
                <TabsList>
                  <TabsTrigger value="singleton" className="text-xs">
                    Singleton
                  </TabsTrigger>
                  <TabsTrigger value="twins" className="text-xs">
                    Twins
                  </TabsTrigger>
                  <TabsTrigger value="both" className="text-xs">
                    Both
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {pregnancyType === "ivf" && (
            <p className="text-xs text-muted-foreground">
              Enter days past transfer (DPT). Converted to DPO for the reference
              curves ({embryoDay === "day3" ? "DPO = DPT + 3" : "DPO = DPT + 5"}
              ).
            </p>
          )}

          {/* Entered betas — horizontal pills */}
          {userBetas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {userBetas.map((beta, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1.5 text-xs"
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
                <label
                  htmlFor="wb-dpo-input"
                  className="text-xs font-medium text-muted-foreground"
                >
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
                <label
                  htmlFor="wb-hcg-input"
                  className="text-xs font-medium text-muted-foreground"
                >
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

        {/* ── Stacked charts — flex to fill remaining space ── */}
        <div className="flex flex-1 min-h-0 flex-col gap-2">
          <div className="flex-1 min-h-0">
            <HcgCurveExplorer
              bare
              hideControls
              externalBetas={userBetas}
              externalFilter={curveFilter}
            />
          </div>

          <div className="flex-1 min-h-0">
            <HCGPredictor
              bare
              hideControls
              externalHcg={latestBeta?.value}
              externalDay={predictorDay}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
