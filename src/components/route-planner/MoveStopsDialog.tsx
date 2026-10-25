import { todayInDenmark } from "@/lib/route-planner/selectable-routes";
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

import { useRetainedValue } from "@/hooks/useRetainedValue";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, CalendarDays, Route as RouteIcon, Check, Repeat } from "lucide-react";
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
import { SheetHeaderBlock, Section, SheetFooterBar } from "./SheetSection";
import { IndustryIcon } from "@/components/IndustryIcon";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";

const todayStr = () => todayInDenmark();

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

/** Flyt aftalens opstartsdato (ordre, abonnement og ny aftalemodel). */
const shiftOrderStartDate = async (orderId: string, newDate: string) => {
  try {
    await supabase.from("orders").update({ preferred_date: newDate, next_service_date: newDate }).eq("id", orderId);
  } catch (err) { console.warn("[MoveStops] orders.preferred_date", err); }
  try {
    await supabase.from("subscriptions").update({ next_service_date: newDate })
      .eq("order_id", orderId).eq("status", "active");
  } catch (err) { console.warn("[MoveStops] subscriptions.next_service_date", err); }
  try {
    const { data: subs } = await supabase.from("subscriptions").select("id").eq("order_id", orderId);
    const subIds = (subs || []).map((s: any) => s.id);
    if (subIds.length > 0) {
      await supabase.from("agreements").update({ start_date: newDate }).in("legacy_subscription_id", subIds);
    }
  } catch (err) { console.warn("[MoveStops] agreements.start_date", err); }
};

type Scope = "single" | "future";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route | null;
  stops: RouteStop[];
  /** Forhåndsvalg af mode (date eller route). Default: "date" */
  defaultMode?: "date" | "route";
  /** Forvælg alle stops når dialogen åbnes (fx ved "flet rute") */
  preselectAll?: boolean;
  /** Kaldes når kilderuten blev tom og derfor slettet — så forælderen kan lukke sig. */
  onSourceRouteDeleted?: () => void;
  /** Kaldes efter et vellykket flyt (fx for at lukke rute-vinduet). */
  onMoved?: () => void;
};

const fmtDay = (iso: string) => format(parseISO(iso), "EEEE d. MMM", { locale: da });

export const MoveStopsDialog = ({ open, onOpenChange, route: routeProp, stops, defaultMode, preselectAll, onSourceRouteDeleted, onMoved }: Props) => {
  const route = useRetainedValue(routeProp);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"date" | "route">("date");
  const [targetDate, setTargetDate] = useState<string>("");
  const [targetRouteId, setTargetRouteId] = useState<string>("");
  const [scope, setScope] = useState<Scope>("single");
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(preselectAll ? new Set(stops.map((s) => s.id)) : new Set());
      setMode(defaultMode || "date");
      setTargetDate(route?.route_date || "");
      setTargetRouteId("");
      setScope("single");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, route?.route_date, defaultMode, preselectAll]);

  // Hvilke ordrer på ruten er faste (gentagende) aftaler?
  const orderIds = useMemo(
    () => Array.from(new Set(stops.map((s) => s.order_id).filter(Boolean) as string[])),
    [stops],
  );
  const { data: recurringOrderIds = new Set<string>() } = useQuery({
    queryKey: ["move-stops-recurring", orderIds.join(",")],
    enabled: open && orderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("order_id, interval, status")
        .in("order_id", orderIds)
        .eq("status", "active")
        .neq("interval", "engangskøb");
      return new Set((data || []).map((r: any) => r.order_id as string));
    },
  });
  const selectedHasRecurring = useMemo(
    () => stops.some((s) => selected.has(s.id) && s.order_id && recurringOrderIds.has(s.order_id)),
    [stops, selected, recurringOrderIds],
  );

  // Hent andre ruter for samme business som mulige mål
  const { data: otherRoutes = [] } = useQuery({
    queryKey: ["move-stops-routes", route?.business_id, route?.id],
    enabled: open && !!route?.business_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, route_date, name, color, deleted_at, archived_at, route_stops(status)")
        .eq("business_id", route!.business_id)
        .neq("id", route!.id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .gte("route_date", todayStr())
        .order("route_date", { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map((r: any) => ({
        id: r.id as string,
        route_date: r.route_date as string,
        name: (r.name as string | null) ?? null,
        color: r.color as string,
        stop_count: ((r.route_stops || []) as { status: string | null }[]).filter((st) => st.status !== "completed" && st.status !== "cancelled").length,
      }));
      const withStops = mapped.filter((r) => r.stop_count > 0);
      const byKey = new Map<string, typeof withStops[number]>();
      for (const r of withStops) {
        const key = `${r.route_date}|${(r.name || "").trim().toLowerCase()}|${(r.color || "").toLowerCase()}`;
        const existing = byKey.get(key);
        if (!existing || r.stop_count > existing.stop_count) byKey.set(key, r);
      }
      return Array.from(byKey.values());
    },
  });

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

  const destDate = mode === "date"
    ? targetDate
    : (otherRoutes.find((r) => r.id === targetRouteId)?.route_date ?? "");

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
    const movedIds = Array.from(selected);
    try {
      let movedCount = 0;
      let missingEmployee = 0;
      let successLabel = "";
      if (mode === "date") {
        const { data, error } = await supabase.rpc("move_stops_to_date", {
          _stop_ids: movedIds,
          _target_date: targetDate,
        });
        if (error) {
          console.error("[MoveStops] move_stops_to_date fejlede", error);
          toast.error("Aftalerne kunne ikke flyttes", { description: "Prøv igen om lidt." });
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        movedCount = Number(row?.moved_count ?? 0);
        missingEmployee = Number(row?.missing_employee_count ?? 0);
        successLabel = fmtDay(targetDate);
        if (movedCount > 0) {
          try { await renameFreshSplitRoutes(movedIds, targetDate); } catch (e) { console.warn("renameFreshSplitRoutes", e); }
        }
      } else {
        const { data, error } = await supabase.rpc("move_stops_to_route", {
          _stop_ids: movedIds,
          _target_route_id: targetRouteId,
        });
        if (error) {
          console.error("[MoveStops] move_stops_to_route fejlede", error);
          toast.error("Aftalerne kunne ikke flyttes", { description: "Prøv igen om lidt." });
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        movedCount = Number(row?.moved_count ?? 0);
        const target = otherRoutes.find((r) => r.id === targetRouteId);
        successLabel = target ? `${target.name || "rute"} (${fmtDay(target.route_date)})` : "valgt rute";
      }

      if (movedCount === 0) {
        if (missingEmployee > 0) {
          toast.error(
            `${missingEmployee} aftale${missingEmployee === 1 ? "" : "r"} mangler en medarbejder`,
            { description: "Tilknyt en medarbejder til ruten eller aftalen, og prøv igen." },
          );
        } else {
          toast.error("Ingen aftaler blev flyttet", { description: "De valgte aftaler ligger måske allerede på den dato." });
        }
        return;
      }

      // Opstartsdato: engangsaftaler følger altid med. Faste aftaler kun når
      // brugeren har valgt "denne og fremtidige" — så rytmen forskydes.
      if (destDate) {
        const movedOrderIds = Array.from(new Set(
          stops.filter((s) => selected.has(s.id) && s.order_id).map((s) => s.order_id as string),
        ));
        for (const oid of movedOrderIds) {
          const recurring = recurringOrderIds.has(oid);
          if (!recurring || scope === "future") await shiftOrderStartDate(oid, destDate);
        }
      }

      toast.success(`${movedCount} aftale${movedCount === 1 ? "" : "r"} flyttet til ${successLabel}`, {
        description: selectedHasRecurring
          ? scope === "future" ? "Fremtidige besøg følger den nye dato." : "Kun dette besøg er flyttet — resten af serien er uændret."
          : "Opstartsdatoen er opdateret.",
      });
      if (missingEmployee > 0) {
        toast.error(
          `${missingEmployee} aftale${missingEmployee === 1 ? "" : "r"} mangler en medarbejder`,
          { description: "Tilknyt en medarbejder til ruten eller aftalen, og prøv igen." },
        );
      }

      // Tom kilderute slettes automatisk.
      const { count } = await supabase
        .from("route_stops")
        .select("id", { count: "exact", head: true })
        .eq("route_id", route.id);
      let deleted = false;
      if ((count ?? 0) === 0) {
        const { error: delErr } = await supabase.from("routes").delete().eq("id", route.id);
        if (delErr) {
          console.error("[MoveStops] kunne ikke auto-slette tom kilderute", delErr);
        } else {
          deleted = true;
        }
      }

      invalidateRouteSyncQueries(qc);
      qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["agreements"] });
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      onOpenChange(false);
      if (deleted) {
        toast.success("Ruten var tom og er slettet");
        onSourceRouteDeleted?.();
      }
      onMoved?.();
      void qc.refetchQueries({ queryKey: ["route-calendar"] });
    } finally {
      setMoving(false);
    }
  };

  if (!route) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="planner-overlay flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-md p-0 sm:max-h-[92vh]">
        <DialogHeader className="planner-overlay-header shrink-0 space-y-0 border-b px-4 py-3 pr-12 text-left sm:px-5">
          <SheetHeaderBlock
            icon={<BrandedIllustration name="calendarWeek" className="h-8 w-8" />}
            iconClassName="h-11 w-11 rounded-md bg-card border border-border"
            title={<DialogTitle className="text-base">Flyt aftaler</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vælg aftaler, ny dato eller rute, og om kun dette besøg eller også de kommende skal flyttes.
              </DialogDescription>
            }
          />
        </DialogHeader>

        <div className="planner-overlay-body min-h-0 flex-1 space-y-3 overflow-y-auto bg-secondary/20 px-3 py-4 sm:px-5">
          <Section
            icon={<Check />}
            title="Aftaler"
            hint={
              <button
                type="button"
                onClick={toggleAll}
                className="rounded px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {allSelected ? "Fravælg alle" : `Vælg alle (${selected.size}/${stops.length})`}
              </button>
            }
          >
            <div className="-m-3 max-h-[240px] divide-y overflow-y-auto">
              {stops.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">Ingen aftaler på ruten.</div>
              )}
              {stops.map((s) => {
                const isSelected = selected.has(s.id);
                const recurring = !!s.order_id && recurringOrderIds.has(s.order_id);
                return (
                  <label
                    key={s.id}
                    className={cn(
                      "flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-secondary/50",
                      isSelected && "bg-secondary/60",
                    )}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggle(s.id)} />
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary ring-1 ring-border" aria-hidden>
                      <IndustryIcon name={s.service_summary} className="h-5 w-5 object-contain" alt="" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{s.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.service_summary || "Ingen ydelser angivet"}
                        {s.address ? ` · ${s.address}` : ""}
                      </p>
                    </div>
                    {recurring && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Repeat className="h-3 w-3" /> Fast
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </Section>

          <Section icon={<CalendarDays />} title="Flyt til">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1 rounded-md bg-secondary/60 p-1">
                {([
                  { v: "date", label: "Ny dato", Icon: CalendarDays },
                  { v: "route", label: "Eksisterende rute", Icon: RouteIcon },
                ] as const).map(({ v, label, Icon }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMode(v)}
                    className={cn(
                      "flex min-h-9 items-center justify-center gap-1.5 rounded px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      mode === v ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>

              {mode === "date" ? (
                <>
                  <DatePickerField value={targetDate} onChange={setTargetDate} minDate={todayStr()} />
                  {targetDate && route.route_date && targetDate !== route.route_date && (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="capitalize">{fmtDay(route.route_date)}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium capitalize text-foreground">{fmtDay(targetDate)}</span>
                    </p>
                  )}
                  {conflictWarnings.length > 0 && (
                    <div className="rounded-md border border-amber-500/40 bg-amber-50 p-2.5 text-xs dark:bg-amber-950/30">
                      <div className="mb-1 flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" /> Mulige konflikter
                      </div>
                      <ul className="space-y-0.5 text-amber-800 dark:text-amber-200">
                        {conflictWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="max-h-[220px] divide-y overflow-y-auto rounded-md border bg-background">
                  {otherRoutes.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">Der er ingen andre ruter at flytte til.</div>
                  )}
                  {otherRoutes.map((r) => {
                    const isSelected = targetRouteId === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setTargetRouteId(r.id)}
                        className={cn(
                          "flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          isSelected ? "bg-secondary/70" : "hover:bg-secondary/40",
                        )}
                      >
                        <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.name || "Rute uden navn"}</p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {fmtDay(r.route_date)} · {r.stop_count} {r.stop_count === 1 ? "stop" : "stops"}
                          </p>
                        </div>
                        <span className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          isSelected ? "border-foreground bg-foreground text-background" : "border-border bg-background",
                        )}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>

          {selectedHasRecurring && (
            <Section icon={<Repeat />} title="Faste aftaler">
              <div className="grid gap-2">
                {([
                  { v: "single", title: "Kun dette besøg", desc: "De næste besøg bliver på de gamle datoer." },
                  { v: "future", title: "Dette og alle næste besøg", desc: "Opstartsdatoen flyttes, så hele rytmen følger den nye dato." },
                ] as const).map(({ v, title, desc }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setScope(v)}
                    className={cn(
                      "flex items-start gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      scope === v ? "border-foreground bg-background" : "border-border bg-background hover:bg-secondary/40",
                    )}
                  >
                    <span className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      scope === v ? "border-foreground" : "border-border",
                    )}>
                      {scope === v && <span className="h-2 w-2 rounded-full bg-foreground" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{title}</span>
                      <span className="block text-xs text-muted-foreground">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>

        <SheetFooterBar>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={moving}>Annullér</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleConfirm} disabled={!canConfirm || moving}>
              {moving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Flyt {selected.size > 0 ? `${selected.size} ` : ""}aftale{selected.size === 1 ? "" : "r"}
            </Button>
          </div>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
};
