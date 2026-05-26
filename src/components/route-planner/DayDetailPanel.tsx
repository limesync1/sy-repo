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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base">
            {date ? format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da }) : "Dag"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex-1 overflow-auto pr-1">
          {sorted.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-5 w-5" />}
              title="Ingen stop denne dag"
              description="Træk en aftale ind på dagen for at planlægge."
              compact
            />
          ) : (
            <ol className="relative ml-3 border-l border-border space-y-3 py-1">
              {sorted.map((s, idx) => {
                const prev = sorted[idx - 1];
                const gap = (s.startTime && prev?.startTime && prev?.durationMin != null)
                  ? diffMinutes(prev.startTime, s.startTime) - (prev.durationMin ?? 0)
                  : null;
                return (
                  <li key={s.id} className="pl-4 relative">
                    <span
                      className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-background"
                      style={{ backgroundColor: s.routeColor ?? "hsl(var(--primary))" }}
                    />
                    {gap != null && gap > 0 && (
                      <div className="mb-1 text-[11px] text-muted-foreground flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" /> {formatDurationMin(gap)} hul
                      </div>
                    )}
                    {gap != null && gap < 0 && (
                      <div className="mb-1 text-[11px] text-destructive font-medium">
                        Overlap med foregående stop ({formatDurationMin(Math.abs(gap))})
                      </div>
                    )}
                    <div className="rounded-md border border-border bg-card p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{s.customerName}</p>
                        {s.startTime && <span className="text-xs tabular-nums text-muted-foreground">{s.startTime}</span>}
                      </div>
                      {s.address && (
                        <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {s.address}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        {s.routeName && <span className="truncate">{s.routeName}</span>}
                        {s.durationMin != null && <span className="tabular-nums">{formatDurationMin(s.durationMin)}</span>}
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