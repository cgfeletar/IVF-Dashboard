import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { SuccessRatesByAge } from "@/components/charts/SuccessRatesByAge";
import { HcgWorkbench } from "@/components/charts/HcgWorkbench";
import { MiscarriageRiskChart } from "@/components/charts/MiscarriageRiskChart";
import { DpoTestAccuracy } from "@/components/charts/DpoTestAccuracy";
import { ConceptionTimingChart } from "@/components/charts/ConceptionTimingChart";
import { IvfAttritionSankey } from "@/components/charts/IvfAttritionSankey";
import { Heart, Baby, Syringe, type LucideIcon } from "lucide-react";

function SectionDivider({
  icon: Icon,
  label,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  accent: string;
}) {
  return (
    <div className="col-span-full flex items-center gap-3 pb-1">
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-md shadow-sm ${accent}`}
      >
        <Icon className="size-4 text-white" strokeWidth={2} />
      </div>
      <h2 className="text-base font-semibold tracking-tight">{label}</h2>
      <div className="h-px flex-1 bg-border/50" />
    </div>
  );
}

/** Subtle gradient class strings for hero cards */
const GRADIENT = {
  teal: "bg-gradient-to-br from-[hsl(170,24%,96%)] to-white",
  warm: "bg-gradient-to-br from-[hsl(30,25%,96%)] to-white",
  rose: "bg-gradient-to-br from-[hsl(11,35%,96%)] to-white",
} as const;

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm">
        <div className="h-[3px] w-full bg-gradient-to-r from-[hsl(170,24%,49%)] via-[hsl(90,20%,60%)] to-[hsl(11,35%,62%)]" />
        <div className="border-b border-border/60">
          <div className="mx-auto flex w-[95%] items-center py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(170,24%,49%)] to-[hsl(170,24%,38%)] shadow-sm">
                <Heart className="size-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  IVF & Fertility Dashboard
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
      <main className="mx-auto w-[95%] py-10">
        {/* ── IVF ── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-8">
            <SectionDivider
              icon={Syringe}
              label="IVF"
              accent="bg-gradient-to-br from-[hsl(170,24%,49%)] to-[hsl(170,24%,38%)]"
            />

            {/* Sankey / funnel — dominant hero card with gradient bg */}
            <DashboardPanel index={0} className="lg:col-span-5">
              <IvfAttritionSankey className={GRADIENT.teal} />
            </DashboardPanel>

            {/* Success rates — companion card */}
            <DashboardPanel index={1} className="lg:col-span-3">
              <SuccessRatesByAge />
            </DashboardPanel>
          </div>
        </section>

        {/* ── Trying to Conceive ── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-8">
            <SectionDivider
              icon={Heart}
              label="Trying to Conceive"
              accent="bg-gradient-to-br from-rose-400 to-rose-500"
            />

            {/* Conception timing bar chart */}
            <DashboardPanel index={2} className="lg:col-span-4">
              <ConceptionTimingChart />
            </DashboardPanel>

            {/* DPO test accuracy */}
            <DashboardPanel index={3} className="lg:col-span-4">
              <DpoTestAccuracy />
            </DashboardPanel>
          </div>
        </section>

        {/* ── Pregnancy ── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-8">
            <SectionDivider
              icon={Baby}
              label="Pregnancy"
              accent="bg-gradient-to-br from-[hsl(11,35%,55%)] to-[hsl(11,35%,45%)]"
            />

            {/* hCG Workbench — full width hero card with warm gradient */}
            <DashboardPanel index={4} className="lg:col-span-8">
              <HcgWorkbench className={GRADIENT.warm} />
            </DashboardPanel>

            {/* Miscarriage risk — full width with rose gradient */}
            <DashboardPanel index={5} className="lg:col-span-8">
              <MiscarriageRiskChart className={GRADIENT.rose} />
            </DashboardPanel>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 pb-8 pt-6">
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
