/**
 * QuickStats
 *
 * Vertical stack of headline fertility/IVF statistics.
 */

import { motion } from "framer-motion";

interface Stat {
  highlight: string;
  description: string;
}

const STATS: Stat[] = [
  {
    highlight: "1 in 36",
    description: "babies born in the US is conceived via IVF",
  },
  {
    highlight: "3 in 4",
    description: "couples conceive within the first 6 months of trying",
  },
  {
    highlight: "1 in 4",
    description: "known pregnancies ends in loss",
  },
];

export function QuickStats() {
  return (
    <div className="flex flex-col gap-3">
      {STATS.map((stat, i) => (
        <motion.div
          key={stat.highlight}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
          className="flex flex-col items-center gap-1 rounded-xl bg-card px-5 py-4 text-center ring-1 ring-foreground/[0.06] transition-shadow duration-200 hover:shadow-sm"
        >
          <span
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "#8F5248" }}
          >
            {stat.highlight}
          </span>
          <span className="text-sm text-muted-foreground">
            {stat.description}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
