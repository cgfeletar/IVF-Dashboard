import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode, MouseEvent } from "react";
import { createPortal } from "react-dom";

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
  const handleBackdropClick = (e: MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <>
      <motion.div
        layout
        layoutId={`panel-${index}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: index * 0.08,
          layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
        }}
        onClick={(e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target.closest("button, input, select, textarea, label, [role='switch'], [role='tab'], [role='slider'], a")) return;
          onClick?.();
        }}
        style={
          isExpanded
            ? {
                position: "fixed",
                inset: "5vh 5vw",
                zIndex: 50,
                width: "auto",
                height: "auto",
              }
            : undefined
        }
        className={[
          "puzzle-panel cursor-pointer overflow-hidden rounded-xl transition-shadow duration-300",
          isExpanded
            ? "shadow-2xl ring-2 ring-primary/30"
            : "shadow-sm hover:shadow-md",
          isExpanded ? undefined : className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </motion.div>

      {isExpanded &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleBackdropClick}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
