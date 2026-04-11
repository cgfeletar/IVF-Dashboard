import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface DashboardPanelProps {
  children: ReactNode;
  index: number;
  className?: string;
  isExpanded?: boolean;
  onClick?: () => void;
}

export function DashboardPanel({
  children,
  index,
  className,
  isExpanded,
  onClick,
}: DashboardPanelProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        layout: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
      }}
      onClick={onClick}
      className={[
        "puzzle-panel cursor-pointer overflow-hidden rounded-xl transition-shadow duration-300",
        isExpanded
          ? "shadow-lg ring-2 ring-primary/20"
          : "shadow-sm hover:shadow-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </motion.div>
  );
}
