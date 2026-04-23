import { LayoutGroup } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { SuccessRatesByAge } from "@/components/charts/SuccessRatesByAge";
import { HcgWorkbench } from "@/components/charts/HcgWorkbench";
import { MiscarriageRiskChart } from "@/components/charts/MiscarriageRiskChart";
import { DpoTestAccuracy } from "@/components/charts/DpoTestAccuracy";
import { ConceptionTimingChart } from "@/components/charts/ConceptionTimingChart";

import { IvfAttritionSankey } from "@/components/charts/IvfAttritionSankey";
import { ClinicExplorer } from "@/components/charts/ClinicExplorer";
import { QuickStats } from "@/components/charts/QuickStats";

export default function DashboardPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="flex items-center justify-center px-5 py-4">
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight leading-tight">
            IVF & Fertility Dashboard
          </h1>
        </div>
      </div>

      <Tabs defaultValue="ttc" className="flex-1 min-h-0 px-3 pb-3">
        <TabsList className="mx-auto">
          <TabsTrigger value="ttc">Trying to Conceive</TabsTrigger>
          <TabsTrigger value="pregnancy">Pregnancy</TabsTrigger>
          <TabsTrigger value="ivf">IVF</TabsTrigger>
        </TabsList>

        {/* ── Trying to Conceive ── */}
        <TabsContent
          value="ttc"
          className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden"
        >
          <LayoutGroup id="ttc">
            <main className="grid h-full grid-cols-1 gap-3 md:grid-cols-2">
              <DashboardPanel index={0} className="min-h-[300px] md:min-h-0">
                <ConceptionTimingChart />
              </DashboardPanel>

              <DashboardPanel index={1} className="min-h-[400px] md:min-h-0">
                <DpoTestAccuracy />
              </DashboardPanel>
            </main>
          </LayoutGroup>
        </TabsContent>

        {/* ── Pregnancy ── */}
        <TabsContent
          value="pregnancy"
          className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden"
        >
          <LayoutGroup id="pregnancy">
            <main className="grid h-full grid-cols-1 gap-3 md:grid-cols-2">
              <DashboardPanel index={0} className="min-h-[500px] md:min-h-0">
                <HcgWorkbench />
              </DashboardPanel>

              <DashboardPanel index={1} className="min-h-[400px] md:min-h-0">
                <MiscarriageRiskChart />
              </DashboardPanel>
            </main>
          </LayoutGroup>
        </TabsContent>

        {/* ── IVF ── */}
        <TabsContent
          value="ivf"
          className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden"
        >
          <LayoutGroup id="ivf">
            <main className="grid h-full grid-cols-1 gap-3 md:grid-cols-2 md:grid-rows-2">
              <DashboardPanel
                index={0}
                className="min-h-[400px] md:min-h-0 md:row-span-2"
              >
                <IvfAttritionSankey />
              </DashboardPanel>

              <DashboardPanel index={1} className="min-h-[300px] md:min-h-0">
                <SuccessRatesByAge />
              </DashboardPanel>

              <DashboardPanel index={2} className="min-h-[400px] md:min-h-0">
                <ClinicExplorer />
              </DashboardPanel>
            </main>
          </LayoutGroup>
        </TabsContent>
      </Tabs>
    </div>
  );
}
