import { lazy, Suspense, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Map as MapIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { MapRoute } from "./RouteMap";

const RouteMap = lazy(() => import("./RouteMap"));

type AnyRoute = { id: string; name?: string | null; color?: string | null; route_date: string; stops?: any[]; isVirtual?: boolean };

/** Bygger kortdata for én dag. Stop uden koordinater tælles som manglende. */
export const buildDayMapRoutes = (routes: AnyRoute[], date: string) => {
  let missing = 0;
  const mapRoutes: MapRoute[] = routes
    .filter((r) => r.route_date === date)
    .map((r) => {
      const stops = (r.stops ?? [])
        .map((s: any, i: number) => {
          const lat = Number(s.latitude ?? s.lat);
          const lng = Number(s.longitude ?? s.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) { missing += 1; return null; }
          return { id: String(s.id), lat, lng, index: i + 1, label: s.customer_name || s.address || `Stop ${i + 1}`, sublabel: r.name || "Rute", color: r.color || undefined };
        })
        .filter(Boolean) as MapRoute["stops"];
      return { color: r.color || "hsl(184 90% 42%)", stops };
    })
    .filter((r) => r.stops.length > 0);
  return { mapRoutes, missing };
};

export const MobileDayMapButton = ({ routes, date }: { routes: AnyRoute[]; date: string }) => {
  const [open, setOpen] = useState(false);
  const { mapRoutes, missing } = useMemo(() => (open ? buildDayMapRoutes(routes, date) : { mapRoutes: [], missing: 0 }), [open, routes, date]);
  const dayRoutes = routes.filter((r) => r.route_date === date).length;
  return (
    <>
      <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-md" aria-label="Vis dagen på kort" onClick={() => setOpen(true)}>
        <MapIcon className="h-4 w-4" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="planner-overlay flex h-[88dvh] max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-t-lg p-0 pb-[env(safe-area-inset-bottom)]">
          <div className="shrink-0 border-b px-4 py-3 pr-12">
            <SheetTitle className="text-base">Dagens ruter på kort</SheetTitle>
            <SheetDescription className="mt-1 text-sm capitalize">
              {format(parseISO(date), "EEEE d. MMMM", { locale: da })} · {dayRoutes} {dayRoutes === 1 ? "rute" : "ruter"}
            </SheetDescription>
            {missing > 0 && <p className="mt-1 text-sm text-muted-foreground">{missing === 1 ? "1 stop" : `${missing} stop`} mangler en adresse på kortet.</p>}
          </div>
          <div className="relative min-h-0 flex-1">
            {open && (mapRoutes.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">Der er ingen stop med adresse at vise denne dag.</div>
            ) : (
              <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
                <RouteMap routes={mapRoutes} height="100%" />
              </Suspense>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
