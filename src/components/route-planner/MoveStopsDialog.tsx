// MoveStopsDialog — flyt udvalgte stops fra én rute til en anden dato.
//
// Brug: Klik "Flyt aftaler" i RouteEditSheet → vælg stops (checkboxes) → vælg
// måldato → tryk Flyt. Stoppene flyttes til en (eksisterende eller ny) rute
// for samme medarbejder på måldatoen via SQL-funktionen
// `move_stops_to_date`.
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
import { cn } from "@/lib/utils";
import { ROUTE_COLORS, pickAvailableColor } from "./RouteEditSheet";
import { useDayConflicts } from "@/hooks/useDayConflicts";
import { AlertTriangle } from "lucide-react";
import { SheetHeaderBlock } from "./SheetSection";
import { getSubcategoryIcon } from "@/lib/category-icons";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

/**
 * Efter et flyt der har oprettet split-ruter (med auto-navn "X — DD/MM"),
 * omdøb dem efter den første flyttede aftales kunde + giv en tilfældig
 * ledig farve. Sørger for at "Flyt aftaler" ikke ender med kloner af
 * kildens navn.
 */
export const renameFreshSplitRoutes = async (movedStopIds: string[], targetDate: string) => {
  if (movedStopIds.length === 0) return;
  const { data } = await supabase
    .from("route_stops")
    .select("id, route_id, customer_name, service_summary, address, sequence, routes!inner(id, name, route_date, business_id, created_at)")
    .in("id", movedStopIds);
  if (!data || data.length === 0) return;
  const groups = new Map<string, {
    firstStopName: string;
    serviceSummary: string | null;
    address: string | null;
    routeName: string;
    routeCreatedAt: string;
    businessId: string;
    date: string;
  }>();
  for (const s of data as any[]) {
    const r = s.routes;
    if (!r || String(r.route_date).slice(0, 10) !== targetDate) continue;
    const existing = groups.get(s.route_id);
    if (!existing || (s.sequence ?? 999) < (existing as any).seq) {
      groups.set(s.route_id, {
        firstStopName: (s.customer_name || "Aftale").trim(),
        serviceSummary: s.service_summary ?? null,
        address: s.address ?? null,
        routeName: r.name || "",
        routeCreatedAt: r.created_at,
        businessId: r.business_id,
        date: String(r.route_date).slice(0, 10),
        ...({ seq: s.sequence ?? 999 } as any),
      });
    }
  }
  // Hent eksisterende farver i brug samme dag — så vi ikke vælger duplikater.
  const businessIds = Array.from(new Set(Array.from(groups.values()).map((g) => g.businessId)));
  const usedByBiz = new Map<string, string[]>();
  for (const bid of businessIds) {
    const { data: dayRoutes } = await supabase
      .from("routes")
      .select("color")
      .eq("business_id", bid)
      .eq("route_date", targetDate);
    usedByBiz.set(bid, (dayRoutes || []).map((r: any) => r.color).filter(Boolean));
  }
  for (const [routeId, info] of groups) {
    // Kun omdøb ruter der lige er oprettet af move-funktionen (indenfor 60 sek).
    // Ellers risikerer vi at overskrive ruter brugeren har navngivet selv.
    const createdMs = new Date(info.routeCreatedAt).getTime();
    if (!Number.isFinite(createdMs) || Date.now() - createdMs > 60_000) continue;
    const used = usedByBiz.get(info.businessId) || [];
    const color = pickAvailableColor(used);
    used.push(color);
    usedByBiz.set(info.businessId, used);

    // Hent et kort AI-genereret rutenavn baseret på aftalen. Falder tilbage
    // til kundenavnet hvis AI'en svigter eller er for langsom.
    let aiName = info.firstStopName;
    try {
      // Adskil by fra adresse hvis muligt (sidste komma-segment).
      let city: string | undefined;
      if (info.address) {
        const parts = info.address.split(",").map((p) => p.trim()).filter(Boolean);
        const last = parts[parts.length - 1] || "";
        city = last.replace(/^\d{3,4}\s*/, "").trim() || undefined;
      }
      const { data: gen, error: genErr } = await supabase.functions.invoke("generate-route-name", {
        body: {
          customerName: info.firstStopName,
          serviceSummary: info.serviceSummary,
          city,
          address: info.address,
        },
      });
      if (!genErr && gen?.name && typeof gen.name === "string") {
        aiName = gen.name.trim() || info.firstStopName;
      }
    } catch (e) {
      console.warn("[MoveStops] AI-rutenavn fejlede — bruger kundenavn", e);
    }

    await supabase.from("routes")
      .update({ name: aiName, color })
      .eq("id", routeId);
  }
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route | null;
  stops: RouteStop[];
  /** Forhåndsvalg af mode (date eller route). Default: "date" */
  defaultMode?: "date" | "route";
  /** Forvælg alle stops når dialogen åbnes (fx ved "flet rute") */
  preselectAll?: boolean;
};

export const MoveStopsDialog = ({ open, onOpenChange, route, stops, defaultMode, preselectAll }: Props) => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"date" | "route">("date");
  const [targetDate, setTargetDate] = useState<string>("");
  const [targetRouteId, setTargetRouteId] = useState<string>("");
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(preselectAll ? new Set(stops.map((s) => s.id)) : new Set());
      setMode(defaultMode || "date");
      setTargetDate(route?.route_date || "");
      setTargetRouteId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, route?.route_date, defaultMode, preselectAll]);

  // Hent andre ruter for samme business som mulige mål
  const { data: otherRoutes = [] } = useQuery({
    queryKey: ["move-stops-routes", route?.business_id, route?.id],
    enabled: open && !!route?.business_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, route_date, name, color, deleted_at, archived_at, route_stops(count)")
        .eq("business_id", route!.business_id)
        .neq("id", route!.id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .order("route_date", { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map((r: any) => ({
        id: r.id as string,
        route_date: r.route_date as string,
        name: (r.name as string | null) ?? null,
        color: r.color as string,
        stop_count: Number(r.route_stops?.[0]?.count ?? 0),
      }));
      // Skjul tomme ruter — disse er reelt ikke "eksisterende ruter"
      // brugeren kan flytte til; vælg "Ny dato" eller opret en ny rute.
      const withStops = mapped.filter((r) => r.stop_count > 0);
      // Dedupér på (dato + navn + farve) — viser kun den rute med flest stops
      // hvis flere ruter ved et uheld er identiske.
      const byKey = new Map<string, typeof withStops[number]>();
      for (const r of withStops) {
        const key = `${r.route_date}|${(r.name || "").trim().toLowerCase()}|${(r.color || "").toLowerCase()}`;
        const existing = byKey.get(key);
        if (!existing || r.stop_count > existing.stop_count) byKey.set(key, r);
      }
      return Array.from(byKey.values());
    },
  });

  // Konfliktdetektion for valgt måldato (kun i "date"-mode).
  const { conflicts: targetDateConflicts } = useDayConflicts(
    route?.business_id,
    mode === "date" ? targetDate : undefined,
  );
  const conflictWarnings = useMemo<string[]>(() => {
    if (mode !== "date" || !targetDateConflicts?.length) return [];
    return targetDateConflicts.slice(0, 3).map((c) => {
      const times = c.stops.map((s) => s.label || "aftale").join(", ");
      return `Medarbejder har allerede ${c.stops.length} aftale${c.stops.length === 1 ? "" : "r"} (${times})${c.overlapsTime ? " — tidsoverlap" : ""}.`;
    });
  }, [mode, targetDateConflicts]);

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
      if (targetDate < todayStr()) return false;
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
        if (targetDate < todayStr()) {
          toast.error("Kan ikke flytte aftaler bagud i tiden", {
            description: "Vælg en dato fra i dag eller frem.",
          });
          return;
        }
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
        if (movedCount > 0) {
          try { await renameFreshSplitRoutes(Array.from(selected), targetDate); } catch (e) { console.warn("renameFreshSplitRoutes", e); }
        }

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
        // Tjek om kilderuten nu er tom — slet automatisk uden at spørge.
        // Tomme ruter er ikke tilladt og bringer ingen værdi at beholde.
        const { count } = await supabase
          .from("route_stops")
          .select("id", { count: "exact", head: true })
          .eq("route_id", route.id);
        onOpenChange(false);
        if ((count ?? 0) === 0) {
          const { error: delErr } = await supabase.from("routes").delete().eq("id", route.id);
          if (delErr) {
            console.error("[MoveStops] kunne ikke auto-slette tom kilderute", delErr);
            toast.error("Kunne ikke slette tom rute", { description: delErr.message });
          } else {
            toast.success("Tom rute slettet automatisk");
            invalidateRouteSyncQueries(qc);
          }
        }
      }
    } finally {
      setMoving(false);
    }
  };

  if (!route) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-0 text-left -mx-6 -mt-6 mb-2 px-5 py-4 pr-12 border-b">
          <SheetHeaderBlock
            icon={<CalendarDays className="h-4 w-4" />}
            title={<DialogTitle className="text-base">Flyt aftaler</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vælg hvilke aftaler der skal flyttes — enten til en ny dato eller direkte til en eksisterende rute. Kun de markerede flyttes.
              </DialogDescription>
            }
          />
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
              const icon = getSubcategoryIcon(s.service_summary);
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
                  <span
                    className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-base leading-none ring-1 ring-border"
                    aria-hidden
                  >
                    {icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{s.customer_name}</p>
                    </div>
                    <p className={`text-xs truncate ${s.service_summary ? "text-muted-foreground" : "text-muted-foreground/70 italic"}`}>
                      {s.service_summary || "Ingen ydelser angivet"}
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
                <DatePickerField value={targetDate} onChange={setTargetDate} minDate={todayStr()} />
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
                {conflictWarnings.length > 0 && (
                  <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Mulige konflikter
                    </div>
                    <ul className="space-y-0.5 text-amber-800 dark:text-amber-200">
                      {conflictWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                    </ul>
                  </div>
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

        <DialogFooter className="-mx-6 -mb-6 mt-2 border-t bg-card px-5 py-4">
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
    </>
  );
};