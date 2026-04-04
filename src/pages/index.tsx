import { DashboardPanel, SectionHeader } from "@/components/dashboard/DashboardPanel";
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { SuccessRatesByAge } from "@/components/charts/SuccessRatesByAge";
import { ClinicExplorer } from "@/components/charts/ClinicExplorer";
import { HcgCurveExplorer } from "@/components/charts/HcgCurveExplorer";
import { MiscarriageRiskChart } from "@/components/charts/MiscarriageRiskChart";
import { DpoTestAccuracy } from "@/components/charts/DpoTestAccuracy";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-end justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              IVF Data Hub
            </h1>
            <p className="text-xs text-muted-foreground">
              Data that helps you understand your journey.
            </p>
          </div>
          <span className="hidden text-[11px] font-medium text-muted-foreground/60 sm:block">
            CDC &middot; Betabase &middot; Evidence-based
          </span>
        </div>
      </header>

      {/* Dashboard content */}
      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* KPI summary strip */}
        <KpiStrip />

        {/* Chart grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* — National Data ——————————————————————————— */}
          <SectionHeader
            title="National Outcomes"
            description="CDC ART surveillance data across age groups and clinics"
          />

          <DashboardPanel index={0}>
            <SuccessRatesByAge />
          </DashboardPanel>

          <DashboardPanel index={1}>
            <ClinicExplorer />
          </DashboardPanel>

          {/* — Pregnancy Tracking ————————————————————— */}
          <SectionHeader
            title="Pregnancy Tracking"
            description="Reference curves and personalised risk models"
          />

          <DashboardPanel index={2} className="lg:col-span-2">
            <HcgCurveExplorer />
          </DashboardPanel>

          <DashboardPanel index={3}>
            <MiscarriageRiskChart />
          </DashboardPanel>

          {/* — Testing ———————————————————————————————— */}
          <SectionHeader
            title="Testing"
            description="When to test and what the results mean"
          />

          <DashboardPanel index={4} className="lg:col-span-2">
            <DpoTestAccuracy />
          </DashboardPanel>
        </div>

        {/* Footer */}
        <footer className="border-t border-border/40 pt-6 pb-8">
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
            Data sourced from CDC National ART Surveillance System, Betabase.info, Tong et al. 2008, and Magnus et al. 2019.
            <br />
            This dashboard is informational only and does not constitute medical advice.
          </p>
        </footer>
      </main>
    </div>
  );
}
