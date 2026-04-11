import { useState, useCallback } from "react";
import { LayoutGroup } from "framer-motion";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { SuccessRatesByAge } from "@/components/charts/SuccessRatesByAge";
import { HcgWorkbench } from "@/components/charts/HcgWorkbench";
import { MiscarriageRiskChart } from "@/components/charts/MiscarriageRiskChart";
import { DpoTestAccuracy } from "@/components/charts/DpoTestAccuracy";
import { ConceptionTimingChart } from "@/components/charts/ConceptionTimingChart";
import { IvfAttritionSankey } from "@/components/charts/IvfAttritionSankey";
import { QuickStats } from "@/components/charts/QuickStats";
import { Heart } from "lucide-react";

/*
 * 3 × 3 puzzle grid with embedded header.
 *
 * Layout map (grid-template-areas):
 *   "sankey      header      conception"
 *   "dpo         quickstats  hcg"
 *   "miscarriage .           hcg"
 *
 * Clicking a panel expands it to ~75 % of the viewport by inflating its
 * column/row to 3fr while the others shrink to 1fr. A second click collapses
 * it back.
 */

type PanelId =
  | "sankey"
  | "success"
  | "conception"
  | "dpo"
  | "hcg"
  | "miscarriage";

export default function DashboardPage() {
  const [expandedId, setExpandedId] = useState<PanelId | null>(null);

  const toggle = useCallback(
    (id: PanelId) => setExpandedId((prev) => (prev === id ? null : id)),
    [],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-b from-background to-muted/30">
      <LayoutGroup>
        <main
          className="puzzle-grid flex-1 min-h-0 gap-3 p-3"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 2fr",
            gridTemplateRows: "1.2fr 1fr 0.8fr",
            gridTemplateAreas: `
              "sankey      header      conception"
              "dpo         quickstats  hcg"
              "miscarriage miscarriage hcg"
            `,
          }}
        >
          {/* Row 0 */}
          <DashboardPanel
            index={0}
            className="[grid-area:sankey]"
            isExpanded={expandedId === "sankey"}
            onClick={() => toggle("sankey")}
          >
            <IvfAttritionSankey />
          </DashboardPanel>

          <div className="flex flex-col gap-3 [grid-area:header]">
            {/* Inline header */}
            <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/[0.06]">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(170,24%,49%)] to-[hsl(170,24%,38%)] shadow-sm">
                <Heart className="size-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight leading-tight">
                  IVF & Fertility Dashboard
                </h1>
                <p className="text-xs text-muted-foreground leading-tight">
                  Click any panel to expand it.
                </p>
              </div>
            </div>
            <DashboardPanel
              index={1}
              className="flex-1 min-h-0"
              isExpanded={expandedId === "success"}
              onClick={() => toggle("success")}
            >
              <SuccessRatesByAge />
            </DashboardPanel>
          </div>

          <DashboardPanel
            index={2}
            className="[grid-area:conception]"
            isExpanded={expandedId === "conception"}
            onClick={() => toggle("conception")}
          >
            <ConceptionTimingChart />
          </DashboardPanel>

          {/* Row 1–2 */}
          <DashboardPanel
            index={3}
            className="[grid-area:dpo]"
            isExpanded={expandedId === "dpo"}
            onClick={() => toggle("dpo")}
          >
            <DpoTestAccuracy />
          </DashboardPanel>

          <div className="[grid-area:quickstats] flex items-start">
            <QuickStats />
          </div>

          <DashboardPanel
            index={4}
            className="[grid-area:hcg]"
            isExpanded={expandedId === "hcg"}
            onClick={() => toggle("hcg")}
          >
            <HcgWorkbench />
          </DashboardPanel>

          <DashboardPanel
            index={5}
            className="[grid-area:miscarriage]"
            isExpanded={expandedId === "miscarriage"}
            onClick={() => toggle("miscarriage")}
          >
            <MiscarriageRiskChart />
          </DashboardPanel>
        </main>
      </LayoutGroup>
    </div>
  );
}
