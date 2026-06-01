// Bottom-sheet til at tildele en uplanlagt aftale til en rute på mobil.
// Brugeren vælger en dato, ser eksisterende ruter den dag og tapper for at
// tildele — eller opretter en ny rute med aftalen på.
import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, Plus, Route as RouteIcon } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useAddStop,
  useCalendarData,
  useCreateRoute,
} from "@/hooks/useRoutes";
import { pickAvailableColor } from "@/components/route-planner/RouteEditSheet";
import { toast } from "sonner";

import {
  jobAddress,
  linkAgreementToRoute,
  serviceSummaryForJob,
} from "./mobile-helpers";

export function MobileAssignSheet({
  open,
  onOpenChange,
  job,
  businessId,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  businessId: string;
  initialDate: string;
}) {
  const [targetDate, setTargetDate] = useState<string>(initialDate);
  const [busyRouteId, setBusyRouteId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: calendarData, isLoading } = useCalendarData(businessId, targetDate, targetDate);
  const addStop = useAddStop();
  const createRoute = useCreateRoute();

  const stopCountByRoute = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of calendarData?.stops ?? []) m.set(s.route_id, (m.get(s.route_id) ?? 0) + 1);
    return m;
  }, [calendarData]);

  const routes = useMemo(() => {
    const list = (calendarData?.routes ?? [])
      .filter((r) => !(r as any).isVirtual && r.route_date === targetDate)
      .filter((r) => !(r as any).deleted_at && !(r as any).archived_at)
      // Skjul tomme ruter — disse er ikke reelle "eksisterende ruter"
      .filter((r) => (stopCountByRoute.get(r.id) ?? 0) > 0);
    // Dedupér på (navn + farve) for den valgte dag
    const byKey = new Map<string, typeof list[number]>();
    for (const r of list) {
      const key = `${(r.name || "").trim().toLowerCase()}|${(r.color || "").toLowerCase()}`;
      const existing = byKey.get(key);
      const stops = stopCountByRoute.get(r.id) ?? 0;
      if (!existing || stops > (stopCountByRoute.get(existing.id) ?? 0)) byKey.set(key, r);
    }
    return Array.from(byKey.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [calendarData, targetDate, stopCountByRoute]);

  const busy = !!busyRouteId || creating;

  const buildPayload = (routeId: string, sequence: number) => ({
    route_id: routeId,
    order_id: job.id,
    sequence,
    customer_name: job.customer_name,
    customer_phone: job.customer_phone,
    address: jobAddress(job),
    latitude: job.latitude,
    longitude: job.longitude,
    service_summary: serviceSummaryForJob(job),
    duration_minutes: Number(job.estimated_duration_minutes) || 30,
    time_window_start: job.preferred_time_start || null,
    time_window_end: job.preferred_time_end || null,
  });

  const assignToExisting = async (routeId: string) => {
    if (busy) return;
    setBusyRouteId(routeId);
    try {
      const sequence = stopCountByRoute.get(routeId) ?? 0;
      await addStop.mutateAsync(buildPayload(routeId, sequence));
      void linkAgreementToRoute(job.id, routeId);
      toast.success("Aftale tilføjet til ruten");
      onOpenChange(false);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("uniq_route_stops_route_order") || msg.includes("duplicate key")) {
        toast.info("Aftalen ligger allerede på denne rute");
        onOpenChange(false);
      } else {
        toast.error("Kunne ikke tilføje aftale", { description: err?.message });
      }
    } finally {
      setBusyRouteId(null);
    }
  };

  const createAndAssign = async () => {
    if (busy) return;
    setCreating(true);
    try {
      const usedColors = routes.map((r) => r.color);
      const created = await createRoute.mutateAsync({
        business_id: businessId,
        route_date: targetDate,
        name: null,
        color: pickAvailableColor(usedColors),
      });
      await addStop.mutateAsync(buildPayload(created.id, 0));
      void linkAgreementToRoute(job.id, created.id);
      toast.success("Ny rute oprettet med aftalen");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Kunne ikke oprette rute", { description: err?.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[88vh] flex-col gap-0 rounded-t-2xl p-0">
        <SheetHeader className="border-b border-border px-4 py-3 text-left">
          <SheetTitle className="text-base">Tildel til rute</SheetTitle>
          <div className="mt-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {job.customer_name || "Ukendt kunde"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{jobAddress(job)}</p>
          </div>
        </SheetHeader>

        {/* Datovælger */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setTargetDate(format(addDays(parseISO(targetDate), -1), "yyyy-MM-dd"))}
            aria-label="Forrige dag"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 flex-1 justify-center gap-2 capitalize tabular-nums">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {format(parseISO(targetDate), "EEEE d. MMM yyyy", { locale: da })}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="center" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={parseISO(targetDate)}
                onSelect={(d) => d && setTargetDate(format(d, "yyyy-MM-dd"))}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setTargetDate(format(addDays(parseISO(targetDate), 1), "yyyy-MM-dd"))}
            aria-label="Næste dag"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Rute-liste */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <Button onClick={createAndAssign} disabled={busy} className="mb-3 w-full gap-2" size="lg">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Opret ny rute og tildel
          </Button>

          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Henter ruter…</p>
          ) : routes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ingen ruter den dag — opret en ny ovenfor.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Eksisterende ruter
              </p>
              {routes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={busy}
                  onClick={() => assignToExisting(r.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99] disabled:opacity-60",
                  )}
                >
                  <span
                    className="h-9 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: r.color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {r.name || "Rute uden navn"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stopCountByRoute.get(r.id) ?? 0} stop
                    </p>
                  </div>
                  {busyRouteId === r.id ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <RouteIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}