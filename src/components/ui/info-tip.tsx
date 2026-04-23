import { useState, useRef, useEffect, type ReactNode } from "react";
import { Info } from "lucide-react";

interface InfoTipProps {
  children: ReactNode;
}

export function InfoTip({ children }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex size-5 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        aria-label="Study information"
      >
        <Info className="size-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-50 w-72 rounded-lg bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          {children}
        </div>
      )}
    </div>
  );
}
