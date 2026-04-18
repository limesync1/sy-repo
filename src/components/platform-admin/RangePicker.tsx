import { useAdminFilters, RangePreset } from "./lib/AdminFiltersContext";
import { Calendar } from "lucide-react";

const OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "7 dage" },
  { value: "30d", label: "30 dage" },
  { value: "90d", label: "90 dage" },
  { value: "ytd", label: "ÅTD" },
  { value: "all", label: "Alt" },
];

const RangePicker = () => {
  const { preset, setPreset } = useAdminFilters();
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-0.5 shadow-sm">
      <Calendar className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setPreset(o.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            preset === o.value
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

export default RangePicker;
