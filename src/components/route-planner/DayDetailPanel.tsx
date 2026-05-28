// Dag-detaljepanel — viser én dag som en lodret tidslinje med stop,
// huller mellem stop og estimeret køretid. Tænkt som en hurtig "tjek
// dagen"-visning der åbnes fra kalenderen.
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Clock, MapPin, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDurationMin } from "@/lib/duration-format";
import EmptyState from "./EmptyState";

export type DayStop = {
  id: string;
  routeName?: string | null;
  routeColor?: string | null;
  customerName: string;
  address?: string | null;
  startTime?: string | null; // "HH:mm"
  durationMin?: number | null;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: string | null;
  stops: DayStop[];
};

function diffMinutes(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
}

export default function DayDetailPanel({ open, onOpenChange, date, stops }: Props) {
  const sorted = useMemo(
    () => [...stops].sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")),
    [stops],
  );
  const totalMinutes = useMemo(
    () => sorted.reduce((sum, s) => sum + (s.durationMin ?? 0), 0),
    [sorted],
  );
  const routes = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sorted) {
      const key = s.routeName ?? "";
      if (!map.has(key)) map.set(key, s.routeColor ?? "");
    }
    return Array.from(map.entries());
  }, [sorted]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col bg-background p-0">
        <SheetHeader className="space-y-2 px-5 pt-5 pb-4 border-b border-border/70 bg-card">
          <SheetTitle className="text-base capitalize tracking-tight font-bold">
            {date ? format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da }) : "Dag"}
          </SheetTitle>
          {sorted.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border/70 shadow-sm font-semibold">
                <MapPin className="h-3 w-3" />
                {sorted.length} {sorted.length === 1 ? "stop" : "stop"}
              </span>
              {totalMinutes > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border/70 shadow-sm tabular-nums font-semibold">
                  <Clock className="h-3 w-3" />
                  {formatDurationMin(totalMinutes)}
                </span>
              )}
              {routes.length > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border/70 shadow-sm font-semibold">
                  {routes.slice(0, 4).map(([name, color]) => (
                    <span
                      key={name}
                      className="h-2 w-2 rounded-full ring-1 ring-background"
                      style={{ background: color || "hsl(var(--primary))" }}
                    />
                  ))}
                  {routes.length} ruter
                </span>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-auto px-5 py-4 bg-secondary/[0.16]">
          {sorted.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-5 w-5" />}
              title="Ingen stop denne dag"
              description="Træk en aftale ind på dagen for at planlægge."
              compact
            />
          ) : (
            <ol className="relative ml-3 border-l-2 border-border/70 space-y-3 py-1">
              {sorted.map((s, idx) => {
                const prev = sorted[idx - 1];
                const gap = (s.startTime && prev?.startTime && prev?.durationMin != null)
                  ? diffMinutes(prev.startTime, s.startTime) - (prev.durationMin ?? 0)
                  : null;
                return (
                  <li key={s.id} className="pl-4 relative">
                    <span
                      className="absolute -left-[8px] top-2 h-3.5 w-3.5 rounded-full border-2 border-background shadow-[0_2px_4px_-1px_hsl(var(--foreground)/0.2)]"
                      style={{ backgroundColor: s.routeColor ?? "hsl(var(--primary))" }}
                    />
                    {gap != null && gap > 0 && (
                      <div className="mb-1.5 text-[10.5px] text-muted-foreground/80 flex items-center gap-1 italic">
                        <ArrowRight className="h-3 w-3" /> {formatDurationMin(gap)} ledig tid
                      </div>
                    )}
                    {gap != null && gap < 0 && (
                      <div className="mb-1.5 inline-flex items-center gap-1 text-[10.5px] text-destructive font-semibold bg-destructive/10 px-2 py-0.5 rounded-full">
                        ⚠ Overlap ({formatDurationMin(Math.abs(gap))})
                      </div>
                    )}
                    <div
                      className="rounded-md border border-border/70 bg-card p-2.5 border-l-[3px] shadow-[0_1px_2px_hsl(var(--foreground)/0.05)] hover:border-foreground/25 hover:shadow-[0_6px_14px_-6px_hsl(var(--foreground)/0.18)] hover:-translate-y-px transition-all duration-150"
                      style={{ borderLeftColor: s.routeColor ?? "hsl(var(--primary))" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold truncate tracking-tight">{s.customerName}</p>
                        {s.startTime && (
                          <span className="text-[11px] font-semibold tabular-nums text-foreground/80 bg-secondary px-1.5 py-0.5 rounded-md border border-border/70">
                            {s.startTime}
                          </span>
                        )}
                      </div>
                      {s.address && (
                        <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {s.address}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
                        {s.routeName && <span className="truncate font-medium">{s.routeName}</span>}
                        {s.durationMin != null && (
                          <span className="tabular-nums font-semibold">{formatDurationMin(s.durationMin)}</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}