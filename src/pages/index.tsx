import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { FilterToolbar } from "@/components/filters/FilterToolbar";
import { SuccessRatesByAge } from "@/components/charts/SuccessRatesByAge";
import { ClinicExplorer } from "@/components/charts/ClinicExplorer";
import { HcgCurveExplorer } from "@/components/charts/HcgCurveExplorer";
import { MiscarriageRiskChart } from "@/components/charts/MiscarriageRiskChart";
import { useFilters } from "@/hooks/useFilters";

export default function DashboardPage() {
  const { filters } = useFilters();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">IVF Data Hub</h1>
            <p className="text-sm text-muted-foreground">
              Data that helps you understand your journey.
            </p>
          </div>
          <FilterToolbar />
        </div>
      </header>

      {/* Dashboard grid */}
      <main className="mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Row 1: Success by Age + Clinic Explorer */}
          <DashboardPanel index={0}>
            <SuccessRatesByAge initialYear={filters.year as "2019" | "2020" | "2021" | "2022"} />
          </DashboardPanel>

          <DashboardPanel index={1}>
            <ClinicExplorer initialState={filters.state} />
          </DashboardPanel>

          {/* Row 2: hCG Curve Explorer — full width */}
          <DashboardPanel index={2} className="lg:col-span-2">
            <HcgCurveExplorer />
          </DashboardPanel>

          {/* Row 3: Miscarriage Risk + future panel slot */}
          <DashboardPanel index={3}>
            <MiscarriageRiskChart />
          </DashboardPanel>
        </div>
      </main>
    </div>
  );
}
