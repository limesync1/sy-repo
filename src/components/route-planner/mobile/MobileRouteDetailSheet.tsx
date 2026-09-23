// Bottom-sheet med detaljer for én rute på mobil: stop-liste i rækkefølge,
// optimér-knap, manuel om-sortering, rute-indstillinger (omdøb, farve,
// slet) og tap på et stop åbner stop-detaljer med handlinger
// (ring, kort, medarbejder, markér udført, fjern).
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  Map as MapIcon,
  Navigation,
  Phone,
  ShoppingBag,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  useDeleteRoute,
  useDeleteStop,
  useOptimizeRoute,
  useReorderStops,
  useSetStopAssignees,
  useUpdateRouteSeriesAppearance,
  useUpdateStopStatus,
  type Route,
  type RouteStop,
} from "@/hooks/useRoutes";
import { ROUTE_COLORS } from "@/components/route-planner/RouteEditSheet";
import { openCreateOrderDialog } from "@/components/route-planner/CreateOrderDialogHost";
import { toast } from "sonner";

// Kortet er tungt (Leaflet) — hent det først når brugeren folder det ud.
const RouteMap = lazy(() => import("@/components/route-planner/RouteMap"));

const mapsUrl = (stop: RouteStop) => {
  if (stop.latitude != null && stop.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`;
  }
  const q = encodeURIComponent(stop.address || "");
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
};

export function MobileRouteDetailSheet({
  open,
  onOpenChange,
  route,
  businessId,
  employees,
  stops,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route;
  businessId: string;
  employees: any[];
  stops: RouteStop[];
}) {
  const [activeStop, setActiveStop] = useState<RouteStop | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<RouteStop | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDeleteRoute, setConfirmDeleteRoute] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null);


  const optimize = useOptimizeRoute();
  const updateStatus = useUpdateStopStatus();
  const deleteStop = useDeleteStop();
  const reorderStops = useReorderStops();
  const setAssignees = useSetStopAssignees();
  // Navn/farve skrives gennem serien, så projicerede og søsterruter følger med.
  const updateAppearance = useUpdateRouteSeriesAppearance();
  const deleteRoute = useDeleteRoute();

  const doneCount = stops.filter((s) => s.status === "completed").length;

  const activeEmployees = (employees || []).filter((e) => e.is_active !== false);
  const empName = (id: string | null | undefined) =>
    employees.find((e) => e.id === id)?.name || null;

  // Hold den synlige version af aktivt stop i sync med opdateret cache-data,
  // så medarbejder/status slår igennem efter mutationer uden at lukke sheet'en.
  useEffect(() => {
    if (!activeStop) return;
    const fresh = stops.find((s) => s.id === activeStop.id);
    if (fresh && fresh !== activeStop) setActiveStop(fresh);
  }, [stops]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop med koordinater tegnes på kortet i den aktuelle (optimerede) rækkefølge.
  const mapStops = useMemo(
    () =>
      stops
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s, i) => ({
          id: s.id,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          label: s.customer_name || "Stop",
          sublabel: s.full_address || s.address || undefined,
          index: i + 1,
          distanceToNextKm: (s as any).distance_to_next_km ?? null,
          travelTimeToNextMin: (s as any).travel_time_to_next_min ?? null,
        })),
    [stops],
  );

  const handleOptimize = async () => {
    try {
      const res = await optimize.mutateAsync(route.id);
      const parts: string[] = [];
      if (res?.total_km != null) parts.push(`${Math.round(res.total_km)} km`);
      const mins = (res as any)?.total_duration_min ?? (res as any)?.total_minutes;
      if (mins != null) parts.push(`${Math.round(mins)} min`);
      const summary = parts.length > 0 ? parts.join(" · ") : null;
      setOptimizeResult(summary);
      // Vis resultatet med det samme på kortet, så rækkefølgen kan ses.
      if (mapStops.length > 1) setMapOpen(true);
      toast.success("Rute optimeret", { description: summary ?? undefined });
    } catch (err: any) {
      toast.error("Kunne ikke optimere", { description: err?.message });
    }
  };

  const moveStop = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stops.length || reorderStops.isPending) return;
    const reordered = [...stops];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    setReorderingId(item.id);
    try {
      await reorderStops.mutateAsync(reordered.map((s, i) => ({ id: s.id, sequence: i })));
    } catch (err: any) {
      toast.error("Kunne ikke ændre rækkefølge", { description: err?.message });
    } finally {
      setReorderingId(null);
    }
  };

  const assignEmployee = async (stop: RouteStop, employeeId: string | null) => {
    const current = stop.assigned_employee_id ?? null;
    const next = current === employeeId ? null : employeeId;
    try {
      await setAssignees.mutateAsync({
        stop_id: stop.id,
        employee_ids: next ? [next] : [],
        lead_id: next,
      });
      setActiveStop((prev) =>
        prev?.id === stop.id ? ({ ...prev, assigned_employee_id: next } as RouteStop) : prev,
      );
    } catch (err: any) {
      toast.error("Kunne ikke tildele medarbejder", { description: err?.message });
    }
  };

  const toggleComplete = async (stop: RouteStop) => {
    const next = stop.status === "completed" ? "pending" : "completed";
    try {
      await updateStatus.mutateAsync({ id: stop.id, status: next });
      toast.success(next === "completed" ? "Markeret som udført" : "Markering fjernet");
      setActiveStop((prev) => (prev?.id === stop.id ? { ...prev, status: next } : prev));
    } catch {
      /* hook viser fejl-toast */
    }
  };

  const removeStop = async (stop: RouteStop) => {
    try {
      await deleteStop.mutateAsync(stop.id);
      toast.success("Aftale fjernet fra ruten");
      setConfirmRemove(null);
      setActiveStop(null);
    } catch (err: any) {
      toast.error("Kunne ikke fjerne aftale", { description: err?.message });
    }
  };

  const handleDeleteRoute = async () => {
    try {
      await deleteRoute.mutateAsync(route.id);
      toast.success("Rute slettet");
      setConfirmDeleteRoute(false);
      setSettingsOpen(false);
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Kunne ikke slette rute", { description: err?.message });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex max-h-[90vh] flex-col gap-0 rounded-t-lg p-0">
          <SheetHeader className="border-b border-border px-4 py-3 pr-14 text-left">
            <div className="flex items-center gap-2.5">
              <span
                className="h-8 w-1 shrink-0 rounded-sm"
                style={{ backgroundColor: route.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-base">
                  {route.name || "Rute uden navn"}
                </SheetTitle>
                <p className="text-xs text-muted-foreground capitalize">
                  {format(parseISO(route.route_date), "EEEE d. MMM yyyy", { locale: da })}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {stops.length} stop
              </span>
              {doneCount > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">{doneCount} udført</span>
              )}
              {route.total_distance_km != null && route.total_distance_km > 0 && (
                <span className="tabular-nums">{Math.round(route.total_distance_km)} km</span>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-2 border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
               <Button className="h-9 flex-1 gap-2 rounded-md text-xs" onClick={() => openCreateOrderDialog()}>
                 <ShoppingBag className="h-4 w-4" />
                 Opret bestilling
              </Button>
              <Button
                variant="outline"
                size="icon"
                 className="h-9 w-9 shrink-0 rounded-md"
                onClick={() => setSettingsOpen(true)}
                aria-label="Rute-indstillinger"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                 className="h-9 flex-1 gap-2 rounded-md text-xs"
                onClick={handleOptimize}
                disabled={optimize.isPending || stops.length < 2}
              >
                {optimize.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Optimér
              </Button>
              <Button
                variant={mapOpen ? "secondary" : "outline"}
                 className="h-9 flex-1 gap-2 rounded-md text-xs"
                onClick={() => setMapOpen((v) => !v)}
                disabled={mapStops.length === 0}
              >
                <MapIcon className="h-4 w-4" />
                {mapOpen ? "Skjul kort" : "Vis kort"}
              </Button>
            </div>
            {optimizeResult && (
              <p className="text-[11px] text-muted-foreground">
                Optimeret rækkefølge · {optimizeResult}
              </p>
            )}
            {mapStops.length === 0 && stops.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Ingen af stoppene har koordinater endnu, så kortet er tomt.
              </p>
            )}
          </div>

          {mapOpen && mapStops.length > 0 && (
            <div className="border-b border-border bg-secondary/30 p-3">
              <Suspense
                fallback={
                  <div className="flex h-56 items-center justify-center rounded-lg bg-secondary">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <RouteMap
                  routes={[{ color: route.color || "#0ea5e9", stops: mapStops }]}
                  height="14rem"
                  selectedStopId={activeStop?.id ?? null}
                  onStopClick={(id) => {
                    const s = stops.find((st) => st.id === id);
                    if (s) setActiveStop(s);
                  }}
                />
              </Suspense>
            </div>
          )}


           <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {stops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary/50">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Ingen stop på ruten</p>
                <p className="mt-1 max-w-[17rem] text-xs text-muted-foreground">
                   Opret først en bestilling, og tildel derefter aftalen fra "Uden rute".
                </p>
                 <Button className="mt-3 h-9 gap-2 rounded-md text-xs" onClick={() => openCreateOrderDialog()}>
                   <ShoppingBag className="h-4 w-4" />
                   Opret bestilling
                </Button>
              </div>
            ) : (
              <ol className="space-y-1.5">
                {stops.map((stop, idx) => {
                  const completed = stop.status === "completed";
                  return (
                    <li key={stop.id}>
                      <div className="flex items-center gap-1.5 rounded-md border border-border bg-card p-1.5 pl-2">
                        <button
                          type="button"
                          onClick={() => setActiveStop(stop)}
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-[11px] font-semibold",
                              completed
                                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                                : "bg-secondary text-foreground",
                            )}
                          >
                            {completed ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "truncate text-xs font-semibold",
                                completed ? "text-muted-foreground line-through" : "text-foreground",
                              )}
                            >
                              {stop.customer_name || "Ukendt kunde"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {stop.full_address || stop.address || "Ingen adresse"}
                            </p>
                            {empName(stop.assigned_employee_id) && (
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {empName(stop.assigned_employee_id)}
                              </p>
                            )}
                          </div>
                        </button>
                        {stops.length > 1 && (
                          <div className="flex shrink-0 flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                               className="h-10 w-10 rounded-md"
                              disabled={idx === 0 || reorderStops.isPending}
                              onClick={() => moveStop(idx, -1)}
                              aria-label="Flyt op"
                            >
                              {reorderingId === stop.id && reorderStops.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ArrowUp className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                               className="h-10 w-10 rounded-md"
                              disabled={idx === stops.length - 1 || reorderStops.isPending}
                              onClick={() => moveStop(idx, 1)}
                              aria-label="Flyt ned"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
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

      {/* Stop-detaljer */}
      <Sheet open={!!activeStop} onOpenChange={(o) => !o && setActiveStop(null)}>
        <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-0 rounded-t-lg p-0">
          {activeStop && (
            <>
              <SheetHeader className="border-b border-border px-4 py-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <SheetTitle className="truncate text-base">
                    {activeStop.customer_name || "Ukendt kunde"}
                  </SheetTitle>
                  {activeStop.status === "completed" && (
                    <Badge className="shrink-0 gap-1 bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Udført
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Adresse
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">
                    {activeStop.full_address || activeStop.address || "Ingen adresse"}
                  </p>
                </div>
                {activeStop.service_summary && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Ydelse
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">{activeStop.service_summary}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Medarbejder
                  </p>
                  {activeEmployees.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Ingen medarbejdere oprettet.</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {activeEmployees.map((e) => {
                        const selected = activeStop.assigned_employee_id === e.id;
                        return (
                          <button
                            key={e.id}
                            type="button"
                            disabled={setAssignees.isPending}
                            onClick={() => assignEmployee(activeStop, e.id)}
                            className={cn(
                              "inline-flex min-h-10 items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-45",
                              selected
                                ? "border-accent bg-accent/10 text-foreground"
                                : "border-border bg-card text-muted-foreground hover:bg-secondary/50",
                            )}
                          >
                            {selected ? <Check className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {e.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {activeStop.customer_phone && (
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={`tel:${activeStop.customer_phone}`}>
                        <Phone className="h-4 w-4" />
                        Ring
                      </a>
                    </Button>
                  )}
                  {(activeStop.address || activeStop.latitude != null) && (
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={mapsUrl(activeStop)} target="_blank" rel="noopener noreferrer">
                        <Navigation className="h-4 w-4" />
                        Kort
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t border-border p-4">
                <Button
                  className="w-full gap-2"
                  variant={activeStop.status === "completed" ? "outline" : "default"}
                  onClick={() => toggleComplete(activeStop)}
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : activeStop.status === "completed" ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {activeStop.status === "completed" ? "Fortryd udført" : "Markér som udført"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmRemove(activeStop)}
                >
                  <Trash2 className="h-4 w-4" />
                  Fjern fra rute
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern aftale fra ruten?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove?.customer_name || "Aftalen"} fjernes fra ruten og lægges tilbage i
              "Uden rute". Dette kan ikke fortrydes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRemove && removeStop(confirmRemove)}
            >
              Fjern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rute-indstillinger: omdøb, farve, slet */}
      <RouteSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        route={route}
        onSave={async (name, color) => {
          try {
            await updateAppearance.mutateAsync({ route, name: name || null, color });
            toast.success("Rute opdateret");
            setSettingsOpen(false);
          } catch (err: any) {
            toast.error("Kunne ikke gemme", { description: err?.message });
          }
        }}
        saving={updateAppearance.isPending}
        onRequestDelete={() => setConfirmDeleteRoute(true)}
      />

      <AlertDialog open={confirmDeleteRoute} onOpenChange={(o) => !o && setConfirmDeleteRoute(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet hele ruten?</AlertDialogTitle>
            <AlertDialogDescription>
              {route.name || "Ruten"} slettes. Aftaler med historik arkiveres, og tomme ruter
              fjernes helt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteRoute}
            >
              Slet rute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}

/* ──────────────── Rute-indstillinger (omdøb / farve / slet) ──────────────── */
function RouteSettingsSheet({
  open,
  onOpenChange,
  route,
  onSave,
  saving,
  onRequestDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route;
  onSave: (name: string, color: string) => void;
  saving: boolean;
  onRequestDelete: () => void;
}) {
  const [name, setName] = useState(route.name || "");
  const [color, setColor] = useState(route.color);

  useEffect(() => {
    if (open) {
      setName(route.name || "");
      setColor(route.color);
    }
  }, [open, route.name, route.color]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-0 rounded-t-lg p-0">
        <SheetHeader className="border-b border-border px-4 py-3 text-left">
          <SheetTitle className="text-base">Rute-indstillinger</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <div className="space-y-1.5">
            <Label htmlFor="mobile-route-name" className="text-xs uppercase tracking-wide text-muted-foreground">
              Navn
            </Label>
            <Input
              id="mobile-route-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rute uden navn"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Farve</Label>
            <div className="grid grid-cols-8 gap-2">
              {ROUTE_COLORS.map((c) => {
                const selected = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    aria-label={c.name}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-md transition-[box-shadow,transform] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                      selected && "ring-2 ring-offset-2 ring-offset-background ring-foreground",
                    )}
                    style={{ backgroundColor: c.value }}
                  >
                    {selected && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="space-y-2 border-t border-border p-4">
          <Button className="w-full gap-2" onClick={() => onSave(name.trim(), color)} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Gem ændringer
          </Button>
          <Button
            variant="ghost"
            className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onRequestDelete}
          >
            <Trash2 className="h-4 w-4" />
            Slet rute
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}