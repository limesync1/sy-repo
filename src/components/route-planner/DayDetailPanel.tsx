// Dag-detaljepanel — viser én dag som en ordnet liste med stop.
// Tænkt som en hurtig "tjek dagen"-visning der åbnes fra kalenderen.
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { MapPin, CalendarDays } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PlannerDialogHeader from "./PlannerDialogHeader";
import EmptyState from "./EmptyState";
import { cn } from "@/lib/utils";
import { CARD_BASE, CARD_BORDER, CARD_HOVER, CARD_RAIL_WIDTH, CARD_CONTENT } from "./lib/card-styles";
import { IndustryIcon } from "@/components/IndustryIcon";
import { SheetFooterBar } from "./SheetSection";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="appointment-details-overlay planner-overlay flex w-[calc(100vw-1rem)] max-w-xl max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden rounded-md p-0">
        <PlannerDialogHeader icon="dayOverview" title="Dagens tidslinje" description={date ? format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da }) : "Dag"} />
        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 border-b px-4 py-2 text-xs text-muted-foreground">
          <span>{sorted.length} stop</span><span>{routes.length} ruter</span>
        </div>

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
                  <li key={s.id} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-foreground">{idx + 1}</span>
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
      <SheetFooterBar className="flex justify-end"><Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>Luk</Button></SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
}