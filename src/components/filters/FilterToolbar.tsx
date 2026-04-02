import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/hooks/useFilters";
import { YEARS, US_STATES } from "@/lib/constants";

export function FilterToolbar() {
  const { filters, setFilter } = useFilters();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="global-year" className="text-sm font-medium text-foreground">
          Year
        </label>
        <Select value={filters.year} onValueChange={(v) => setFilter("year", v)}>
          <SelectTrigger id="global-year" className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="global-state" className="text-sm font-medium text-foreground">
          State
        </label>
        <Select value={filters.state} onValueChange={(v) => setFilter("state", v)}>
          <SelectTrigger id="global-state" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map(({ abbr, label }) => (
              <SelectItem key={abbr} value={abbr}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
