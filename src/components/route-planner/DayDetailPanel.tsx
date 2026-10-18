// Dag-detaljepanel — viser én dag som en ordnet liste med stop.
// Tænkt som en hurtig "tjek dagen"-visning der åbnes fra kalenderen.
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { MapPin, CalendarDays } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import EmptyState from "./EmptyState";
import { cn } from "@/lib/utils";
import { CARD_BASE, CARD_BORDER, CARD_HOVER, CARD_RAIL_WIDTH, CARD_CONTENT } from "./lib/card-styles";
import { IndustryIcon } from "@/components/IndustryIcon";
import { SheetHeaderBlock } from "./SheetSection";

export type DayStop = {
  id: string;
  routeName?: string | null;
  routeColor?: string | null;
  customerName: string;
  address?: string | null;
  serviceSummary?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  date: string | null;
  stops: DayStop[];
};

export default function DayDetailPanel({ open, onOpenChange, date, stops }: Props) {
  const sorted = useMemo(() => [...stops], [stops]);
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
      <SheetContent side="right" className="planner-overlay w-full sm:max-w-lg flex flex-col bg-background p-0">
        <SheetHeader className="planner-overlay-header px-4 sm:px-5 py-3 pr-12 border-b border-border/70 shrink-0 space-y-0 text-left">
          <SheetHeaderBlock
            icon={<CalendarDays className="h-4 w-4" />}
            title={<SheetTitle className="text-base first-letter:uppercase">{date ? format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da }) : "Dag"}</SheetTitle>}
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

        <div className="planner-overlay-body min-h-0 flex-1 overflow-auto overscroll-contain p-3 bg-secondary/[0.16]">
          {sorted.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="Ingen stop denne dag"
              description="Træk en aftale ind på dagen for at planlægge."
              compact
            />
          ) : (
            <ol className="space-y-2">
              {sorted.map((s, idx) => {
                return (
                  <li key={s.id} className="relative">
                    <div
                      data-appointment-card=""
                      className={cn(CARD_BASE, CARD_BORDER, CARD_CONTENT)}
                    >
                      <span
                        aria-hidden
                        className={cn("absolute left-0 top-0 bottom-0", CARD_RAIL_WIDTH)}
                        style={{ background: s.routeColor ?? "hsl(var(--primary))" }}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {s.serviceSummary && (
                            <IndustryIcon name={s.serviceSummary} className="h-5 w-5 shrink-0 object-contain" alt="" />
                          )}
                          <p className="min-w-0 break-words text-sm font-semibold leading-5">{s.customerName}</p>
                        </div>
                      </div>
                      {s.serviceSummary && (
                        <p className="mt-0.5 break-words text-xs leading-4 text-muted-foreground">
                          {s.serviceSummary}
                        </p>
                      )}
                      {s.address && (
                        <p className="mt-1 text-xs leading-4 text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 shrink-0" /> <span className="min-w-0 break-words">{s.address}</span>
                        </p>
                      )}
                      {s.routeName && (
                        <div className="min-w-0 border-t border-border/60 pt-1 text-xs leading-4 text-muted-foreground">
                          <span className="break-words font-medium">{s.routeName}</span>
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