import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SuccessRatesByAge } from "@/components/charts/SuccessRatesByAge";
import { ClinicExplorer } from "@/components/charts/ClinicExplorer";
import { HcgCurveExplorer } from "@/components/charts/HcgCurveExplorer";
import { MiscarriageRiskChart } from "@/components/charts/MiscarriageRiskChart";
import { DpoTestAccuracy } from "@/components/charts/DpoTestAccuracy";
import { ConceptionTimingChart } from "@/components/charts/ConceptionTimingChart";
import { HCGPredictor } from "@/components/charts/HCGPredictor";
import { IvfAttritionSankey } from "@/components/charts/IvfAttritionSankey";
import { Heart, Baby, Syringe } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm">
        {/* Gradient accent bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[hsl(170,24%,49%)] via-[hsl(90,20%,60%)] to-[hsl(11,35%,62%)]" />
        <div className="border-b border-border/60">
          <div className="mx-auto flex max-w-7xl items-center px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(170,24%,49%)] to-[hsl(170,24%,38%)] shadow-sm">
                <Heart className="size-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  TTC & Pregnancy Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Data that helps you understand your journey.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard content */}
      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <Tabs defaultValue={0}>
          <TabsList
            variant="line"
            className="w-full border-b border-border/60 gap-0 h-auto p-0"
          >
            <TabsTrigger
              value={0}
              className="flex-none px-5 py-3 text-base text-muted-foreground/70 data-active:text-primary data-active:font-bold after:h-[2.5px] after:bg-primary after:bottom-[-1px] [&_svg:not([class*='size-'])]:size-5"
            >
              <Heart /> Trying to Conceive
            </TabsTrigger>
            <TabsTrigger
              value={1}
              className="flex-none px-5 py-3 text-base text-muted-foreground/70 data-active:text-primary data-active:font-bold after:h-[2.5px] after:bg-primary after:bottom-[-1px] [&_svg:not([class*='size-'])]:size-5"
            >
              <Baby /> Pregnancy
            </TabsTrigger>
            <TabsTrigger
              value={2}
              className="flex-none px-5 py-3 text-base text-muted-foreground/70 data-active:text-primary data-active:font-bold after:h-[2.5px] after:bg-primary after:bottom-[-1px] [&_svg:not([class*='size-'])]:size-5"
            >
              <Syringe /> IVF
            </TabsTrigger>
          </TabsList>

          {/* — Trying to Conceive — */}
          <TabsContent value={0}>
            <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-2">
              <DashboardPanel index={0} className="col-span-1">
                <ConceptionTimingChart />
              </DashboardPanel>
              <DashboardPanel index={1} className="col-span-1">
                <DpoTestAccuracy />
              </DashboardPanel>
            </div>
          </TabsContent>

          {/* — Pregnancy — */}
          <TabsContent value={1}>
            <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-2">
              <DashboardPanel index={0} className="lg:col-span-2">
                <HcgCurveExplorer />
              </DashboardPanel>

              <DashboardPanel index={2} className="lg:col-span-2">
                <HCGPredictor />
              </DashboardPanel>

              <DashboardPanel index={1} className="lg:col-span-2">
                <MiscarriageRiskChart />
              </DashboardPanel>
            </div>
          </TabsContent>

          {/* — IVF — */}
          <TabsContent value={2}>
            <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-2">
              <DashboardPanel index={0} className="lg:col-span-2">
                <IvfAttritionSankey />
              </DashboardPanel>

              <DashboardPanel index={1}>
                <SuccessRatesByAge />
              </DashboardPanel>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="border-t border-border/40 pt-6 pb-8">
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
            Data sourced from CDC National ART Surveillance System,
            Betabase.info, Tong et al. 2008, Magnus et al. 2019, and Ovia Health
            2019.
            <br />
            This dashboard is informational only and does not constitute medical
            advice.
          </p>
        </footer>
      </main>
    </div>
  );
}
