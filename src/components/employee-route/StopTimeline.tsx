import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatClockTime } from "./route-run-clock";

type TimelineStop = { id: string; customer_name: string | null; status: string; completed_at?: string | null };

export function StopTimeline({ stops, currentIndex, arrived }: { stops: TimelineStop[]; currentIndex: number; arrived: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const completed = stops.filter((stop) => stop.status === "completed").length;
  const selectedIndex = stops.findIndex((stop) => stop.id === selectedId);
  const selected = stops[selectedIndex];
  const completedTime = selected?.completed_at ? new Date(selected.completed_at).getTime() : null;

  return (
    <div>
      <div className="route-timeline relative flex items-center justify-between gap-1 overflow-x-auto px-3 py-1" aria-label={`${completed} af ${stops.length} stop udført`}>
        <span className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-border" aria-hidden="true" />
        {stops.map((stop, index) => {
          const done = stop.status === "completed";
          const current = index === currentIndex;
          return (
            <Button key={stop.id} variant="ghost" size="icon" type="button" className="relative h-11 w-11 shrink-0" onClick={() => setSelectedId((id) => id === stop.id ? null : stop.id)} aria-pressed={selectedId === stop.id} aria-current={current ? "step" : undefined} aria-label={`Stop ${index + 1}: ${stop.customer_name || "Stop"}${done ? ", udført" : current ? ", aktuelt" : ", kommende"}`}>
              {current && <span className={cn("absolute inset-3 rounded-full border-2", arrived ? "border-success/50" : "border-accent/50")} data-arrived={arrived ? "true" : undefined} aria-hidden="true" />}
              <span className={cn("relative flex items-center justify-center rounded-full", done ? "h-3.5 w-3.5 bg-success text-success-foreground" : current ? cn("h-3.5 w-3.5", arrived ? "bg-success" : "bg-accent") : "h-2.5 w-2.5 bg-muted-foreground/40")} aria-hidden="true">
                {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
            </Button>
          );
        })}
      </div>
      <div className="flex h-9 min-w-0 items-center border-y border-border bg-secondary/30 px-3.5" aria-live="polite">
        {selected ? <p className="truncate text-left text-xs font-medium text-foreground" title={selected.customer_name || undefined}>
          {selectedIndex + 1}. {selected.customer_name || "Stop"} · {selected.status === "completed" ? `udført${completedTime != null && Number.isFinite(completedTime) ? ` ${formatClockTime(completedTime)}` : ""}` : selectedIndex === currentIndex ? arrived ? "ankommet" : "aktuelt stop" : "kommende"}
        </p> : <p className="text-xs text-muted-foreground">{completed} af {stops.length} stop udført</p>}
      </div>
    </div>
  );
}