import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface DashboardPanelProps {
  children: ReactNode;
  index: number;
  className?: string;
}

export function DashboardPanel({
  children,
  index,
  className,
}: DashboardPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
      }}
      className={[
        "puzzle-panel overflow-hidden rounded-xl shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </motion.div>
  );
}
