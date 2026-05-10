// MoveStopsDialog — flyt udvalgte stops fra én rute til en anden dato.
//
// Brug: Klik "Flyt aftaler" i RouteEditSheet → vælg stops (checkboxes) → vælg
// måldato → tryk Flyt. Stoppene flyttes til en (eksisterende eller ny) rute
// for samme medarbejder på måldatoen via SQL-funktionen
// `find_or_create_route_for_employee`.
//
// Bemærk: Denne dialog flytter kun de konkrete stop-instanser ("kun denne
// gang"). For at flytte hele den faste serie til en anden ugedag skal man
// bruge dato-vælgeren i RouteEditSheet, der bruger MoveRouteDateDialog.

import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, CalendarDays, Route as RouteIcon, Check, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import { DatePickerField } from "./DatePickerField";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import type { Route, RouteStop } from "@/hooks/useRoutes";
import { invalidateRouteSyncQueries } from "@/hooks/useRoutes";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route | null;
  stops: RouteStop[];
};

export const MoveStopsDialog = ({ open, onOpenChange, route, stops }: Props) => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"date" | "route">("date");
  const [targetDate, setTargetDate] = useState<string>("");
  const [targetRouteId, setTargetRouteId] = useState<string>("");
  const [moving, setMoving] = useState(false);
  const [emptyRouteConfirm, setEmptyRouteConfirm] = useState<{ id: string; date: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setMode("date");
      setTargetDate(route?.route_date || "");
      setTargetRouteId("");
    }
  }, [open, route?.route_date]);

  // Hent andre ruter for samme business som mulige mål
  const { data: otherRoutes = [] } = useQuery({
    queryKey: ["move-stops-routes", route?.business_id, route?.id],
    enabled: open && !!route?.business_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, route_date, name, color, route_stops(count)")
        .eq("business_id", route!.business_id)
        .neq("id", route!.id)
        .order("route_date", { ascending: true });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id as string,
        route_date: r.route_date as string,
        name: (r.name as string | null) ?? null,
        color: r.color as string,
        stop_count: Number(r.route_stops?.[0]?.count ?? 0),
      }));
    },
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = stops.length > 0 && stops.every((s) => selected.has(s.id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(stops.map((s) => s.id)));
  };

  const canConfirm = useMemo(() => {
    if (!route) return false;
    if (selected.size === 0) return false;
    if (mode === "date") {
      if (!targetDate) return false;
      if (targetDate === route.route_date) return false;
      return true;
    }
    return !!targetRouteId;
  }, [route, targetDate, targetRouteId, selected, mode]);

  const handleConfirm = async () => {
    if (!route || !canConfirm) return;
    setMoving(true);
    try {
      let movedCount = 0;
      let missingEmployee = 0;
      let successLabel = "";
      if (mode === "date") {
        const { data, error } = await supabase.rpc("move_stops_to_date", {
          _stop_ids: Array.from(selected),
          _target_date: targetDate,
        });
        if (error) {
          console.error("[MoveStops] move_stops_to_date fejlede", error);
          toast.error("Aftaler kunne ikke flyttes", {
            description: error.message || "Prøv igen om lidt.",
          });
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        movedCount = Number(row?.moved_count ?? 0);
        missingEmployee = Number(row?.missing_employee_count ?? 0);
        successLabel = format(parseISO(targetDate), "EEEE d. MMM", { locale: da });
      } else {
        const { data, error } = await supabase.rpc("move_stops_to_route", {
          _stop_ids: Array.from(selected),
          _target_route_id: targetRouteId,
        });
        if (error) {
          console.error("[MoveStops] move_stops_to_route fejlede", error);
          toast.error("Aftaler kunne ikke flyttes", {
            description: error.message || "Prøv igen om lidt.",
          });
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        movedCount = Number(row?.moved_count ?? 0);
        const target = otherRoutes.find((r) => r.id === targetRouteId);
        successLabel = target
          ? `${target.name || "rute"} (${format(parseISO(target.route_date), "EEEE d. MMM", { locale: da })})`
          : "valgt rute";
      }
      if (movedCount > 0) {
        toast.success(
          `${movedCount} aftale${movedCount === 1 ? "" : "r"} flyttet til ${successLabel}`,
        );
      }
      if (missingEmployee > 0) {
        toast.error(
          `${missingEmployee} aftale${missingEmployee === 1 ? "" : "r"} mangler en medarbejder`,
          { description: "Tilknyt en medarbejder til ruten eller aftalen, og prøv igen." },
        );
      }
      invalidateRouteSyncQueries(qc);
      await qc.refetchQueries({ queryKey: ["route-calendar"] });
      if (movedCount > 0) {
        // Tjek om kilderuten nu er tom — så tilbyd at slette den
        const { count } = await supabase
          .from("route_stops")
          .select("id", { count: "exact", head: true })
          .eq("route_id", route.id);
        onOpenChange(false);
        if ((count ?? 0) === 0) {
          setEmptyRouteConfirm({ id: route.id, date: route.route_date });
        }
      }
    } finally {
      setMoving(false);
    }
  };

  const handleDeleteEmptyRoute = async () => {
    if (!emptyRouteConfirm) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("routes").delete().eq("id", emptyRouteConfirm.id);
      if (error) {
        toast.error("Kunne ikke slette rute", { description: error.message });
        return;
      }
      toast.success("Tom rute slettet");
      invalidateRouteSyncQueries(qc);
      setEmptyRouteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  if (!route) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" />
            Flyt aftaler
          </DialogTitle>
          <DialogDescription>
            Vælg hvilke aftaler der skal flyttes — enten til en ny dato eller
            direkte til en eksisterende rute. Kun de markerede flyttes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={toggleAll}
              className="text-accent hover:underline font-medium"
            >
              {allSelected ? "Fravælg alle" : "Vælg alle"}
            </button>
            <span className="text-muted-foreground">
              {selected.size} af {stops.length} valgt
            </span>
          </div>

          <div className="max-h-[260px] overflow-y-auto rounded-md border divide-y">
            {stops.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Ingen aftaler på ruten.
              </div>
            )}
            {stops.map((s) => {
              const isSelected = selected.has(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 cursor-pointer hover:bg-secondary/50 transition-colors",
                    isSelected && "bg-accent/5",
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(s.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.service_summary || "Aftale"}
                    </p>
                    {s.address && (
                      <p className="text-[11px] text-muted-foreground truncate">{s.address}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <div>
            <div className="flex gap-1 mb-2 rounded-md bg-secondary/50 p-0.5">
              <button
                type="button"
                onClick={() => setMode("date")}
                className={cn(
                  "flex-1 text-xs font-medium py-1.5 rounded transition-colors flex items-center justify-center gap-1.5",
                  mode === "date" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Ny dato
              </button>
              <button
                type="button"
                onClick={() => setMode("route")}
                className={cn(
                  "flex-1 text-xs font-medium py-1.5 rounded transition-colors flex items-center justify-center gap-1.5",
                  mode === "route" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <RouteIcon className="h-3.5 w-3.5" /> Eksisterende rute
              </button>
            </div>
            {mode === "date" ? (
              <>
                <DatePickerField value={targetDate} onChange={setTargetDate} />
                {targetDate && route.route_date && targetDate !== route.route_date && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                    <span className="capitalize">
                      {format(parseISO(route.route_date), "EEEE d. MMM", { locale: da })}
                    </span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="capitalize text-foreground font-medium">
                      {format(parseISO(targetDate), "EEEE d. MMM", { locale: da })}
                    </span>
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="max-h-[220px] overflow-y-auto rounded-md border divide-y bg-background">
                  {otherRoutes.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Der er ingen andre ruter at flytte til.
                    </div>
                  )}
                  {otherRoutes.map((r) => {
                    const isSelected = targetRouteId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setTargetRouteId(r.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 text-left transition-colors",
                          isSelected ? "bg-accent/10" : "hover:bg-secondary/50",
                        )}
                      >
                        <span
                          className="h-9 w-1.5 rounded-full shrink-0"
                          style={{ background: r.color }}
                          aria-hidden
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {r.name || "Rute uden navn"}
                            </p>
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                              {r.stop_count} {r.stop_count === 1 ? "stop" : "stops"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(parseISO(r.route_date), "EEEE d. MMM yyyy", { locale: da })}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-accent border-accent text-accent-foreground"
                              : "border-border bg-background",
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {targetRouteId && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Aftalerne tilføjes til slutningen af den valgte rute.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={moving}>
            Annullér
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || moving}>
            {moving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Flyt {selected.size > 0 ? `${selected.size} ` : ""}aftale{selected.size === 1 ? "" : "r"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!emptyRouteConfirm} onOpenChange={(o) => !o && setEmptyRouteConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Slet tom rute?</AlertDialogTitle>
          <AlertDialogDescription>
            Ruten {emptyRouteConfirm ? format(parseISO(emptyRouteConfirm.date), "EEEE d. MMM", { locale: da }) : ""} har ikke længere nogen aftaler. Vil du slette den?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Behold rute</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteEmptyRoute} disabled={deleting}>
            {deleting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Slet rute
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};