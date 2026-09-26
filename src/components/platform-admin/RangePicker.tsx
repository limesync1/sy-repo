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
    <div className="grid w-full grid-cols-[auto_repeat(5,minmax(0,1fr))] items-center gap-0.5 rounded-[5px] border border-border bg-card p-0.5 shadow-sm md:inline-flex md:w-auto md:gap-1">
      <Calendar className="mx-1 h-3.5 w-3.5 text-muted-foreground md:ml-2" />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setPreset(o.value)}
          className={`min-w-0 rounded-[4px] px-1.5 py-1.5 text-[11px] font-medium transition-colors md:px-2.5 md:py-1 md:text-xs ${
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
