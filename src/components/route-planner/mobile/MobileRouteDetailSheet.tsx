// Bottom-sheet med detaljer for én rute på mobil: stop-liste i rækkefølge,
// optimér-knap og tap på et stop åbner stop-detaljer med handlinger
// (ring, kort, markér udført, fjern).
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  RotateCcw,
  Sparkles,
  Trash2,
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
import { cn } from "@/lib/utils";
import {
  useDeleteStop,
  useOptimizeRoute,
  useUpdateStopStatus,
  type Route,
  type RouteStop,
} from "@/hooks/useRoutes";
import { toast } from "sonner";

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

  const optimize = useOptimizeRoute();
  const updateStatus = useUpdateStopStatus();
  const deleteStop = useDeleteStop();

  const doneCount = stops.filter((s) => s.status === "completed").length;

  const empName = (id: string | null | undefined) =>
    employees.find((e) => e.id === id)?.name || null;

  const handleOptimize = async () => {
    try {
      const res = await optimize.mutateAsync(route.id);
      toast.success("Rute optimeret", {
        description: res?.total_km != null ? `${Math.round(res.total_km)} km i alt` : undefined,
      });
    } catch (err: any) {
      toast.error("Kunne ikke optimere", { description: err?.message });
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex max-h-[90vh] flex-col gap-0 rounded-t-2xl p-0">
          <SheetHeader className="border-b border-border px-4 py-3 text-left">
            <div className="flex items-center gap-2.5">
              <span
                className="h-8 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: route.color }}
                aria-hidden
              />
              <div className="min-w-0">
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

          {stops.length > 1 && (
            <div className="border-b border-border px-4 py-2.5">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleOptimize}
                disabled={optimize.isPending}
              >
                {optimize.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Optimér rækkefølge
              </Button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {stops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Ingen stop på ruten</p>
                <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
                  Tildel aftaler til denne rute fra fanen "Uden rute".
                </p>
              </div>
            ) : (
              <ol className="space-y-2">
                {stops.map((stop, idx) => {
                  const completed = stop.status === "completed";
                  return (
                    <li key={stop.id}>
                      <button
                        type="button"
                        onClick={() => setActiveStop(stop)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
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
                              "truncate text-sm font-medium",
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
        <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-0 rounded-t-2xl p-0">
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
                {empName(activeStop.assigned_employee_id) && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Medarbejder
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">
                      {empName(activeStop.assigned_employee_id)}
                    </p>
                  </div>
                )}

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
    </>
  );
}