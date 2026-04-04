/**
 * KpiStrip
 *
 * Horizontal row of key metrics shown at the top of the dashboard.
 * Provides at-a-glance context before users dive into charts.
 */

import { motion } from "framer-motion";
import { YEARS } from "@/lib/constants";

interface KpiCardProps {
  label: string;
  value: string;
  detail?: string;
  index: number;
}

function KpiCard({ label, value, detail, index }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="flex flex-col gap-1 rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/[0.06] transition-shadow duration-200 hover:shadow-sm"
    >
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </span>
      {detail && (
        <span className="text-xs text-muted-foreground">{detail}</span>
      )}
    </motion.div>
  );
}

const KPI_DATA: Omit<KpiCardProps, "index">[] = [
  {
    label: "Data Sources",
    value: "4",
    detail: "CDC, Betabase, Tong et al., Magnus et al.",
  },
  {
    label: "CDC Data Years",
    value: YEARS.join("–"),
    detail: "National ART Surveillance System",
  },
  {
    label: "Age Brackets",
    value: "4",
    detail: "<35, 35–37, 38–40, >40",
  },
  {
    label: "Interactive Tools",
    value: "5",
    detail: "hCG curves, risk calc, test timing & more",
  },
];

export function KpiStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {KPI_DATA.map((kpi, i) => (
        <KpiCard key={kpi.label} {...kpi} index={i} />
      ))}
    </div>
  );
}
