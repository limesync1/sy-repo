// Dag-detaljepanel — viser én dag som en lodret tidslinje med stop,
// huller mellem stop og estimeret køretid. Tænkt som en hurtig "tjek
// dagen"-visning der åbnes fra kalenderen.
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Clock, MapPin, ArrowRight, CalendarDays } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDurationMin } from "@/lib/duration-format";
import EmptyState from "./EmptyState";
import { cn } from "@/lib/utils";
import { CARD_BASE, CARD_BORDER, CARD_HOVER, CARD_RAIL_WIDTH } from "./lib/card-styles";
import { getSubcategoryIcon } from "@/lib/category-icons";
import { SheetHeaderBlock } from "./SheetSection";

export type DayStop = {
  id: string;
  routeName?: string | null;
  routeColor?: string | null;
  customerName: string;
  address?: string | null;
  startTime?: string | null; // "HH:mm"
  durationMin?: number | null;
  serviceSummary?: string | null;
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
        <SheetHeader className="px-4 sm:px-5 py-4 pr-12 border-b border-border/70 shrink-0 space-y-0 text-left">
          <SheetHeaderBlock
            icon={<CalendarDays className="h-4 w-4" />}
            title={<SheetTitle className="text-base capitalize">{date ? format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da }) : "Dag"}</SheetTitle>}
            description={sorted.length === 0 ? <span className="text-xs text-muted-foreground">Ingen aftaler denne dag.</span> : undefined}
          >
            {sorted.length > 0 && (
              <>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                  <MapPin className="h-3 w-3" />
                  {sorted.length} stop
                </span>
                {routes.length > 1 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
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
              </>
            )}
          </SheetHeaderBlock>
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
                    <div
                      className={cn(CARD_BASE, CARD_BORDER, CARD_HOVER, "p-2.5 pl-3.5")}
                    >
                      <span
                        aria-hidden
                        className={cn("absolute left-0 top-0 bottom-0", CARD_RAIL_WIDTH)}
                        style={{ background: s.routeColor ?? "hsl(var(--primary))" }}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {s.serviceSummary && (
                            <span
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-secondary border border-border/70 text-[11px] leading-none"
                              aria-hidden
                            >
                              {getSubcategoryIcon(s.serviceSummary)}
                            </span>
                          )}
                          <p className="text-sm font-bold truncate tracking-tight">{s.customerName}</p>
                        </div>
                        {s.startTime && (
                          <span className="text-[11px] font-semibold tabular-nums text-foreground/80 bg-secondary px-1.5 py-0.5 rounded-md border border-border/70 shrink-0">
                            {s.startTime}
                          </span>
                        )}
                      </div>
                      {s.serviceSummary && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate pl-[26px]">
                          {s.serviceSummary}
                        </p>
                      )}
                      {s.address && (
                        <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> {s.address}
                        </p>
                      )}
                      {s.routeName && (
                        <div className="mt-1.5 text-[10.5px] text-muted-foreground">
                          <span className="truncate font-medium">{s.routeName}</span>
                        </div>
                      )}
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