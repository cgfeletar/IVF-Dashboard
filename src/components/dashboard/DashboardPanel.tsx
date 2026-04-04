import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface DashboardPanelProps {
  children: ReactNode;
  index: number;
  className?: string;
}

export function DashboardPanel({ children, index, className }: DashboardPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={[
        "transition-shadow duration-200 hover:shadow-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </motion.div>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
}

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="lg:col-span-2 flex flex-col gap-0.5 pt-4 first:pt-0">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
