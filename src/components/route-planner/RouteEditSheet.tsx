// RouteEditSheet — rediger en rute: navn, farve, dato, medarbejdere.
// Bruges fra den nye måned/uge kalender.

import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, Trash2, Check, CalendarRange } from "lucide-react";
import { Palette, CalendarDays, Pencil, Gauge } from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useUpdateRoute, useDeleteRoute, useOptimizeRoute, useDirections,
  useRouteSeriesInfo, useMoveRouteSeries,
  type Route, type RouteStop,
} from "@/hooks/useRoutes";
import { DatePickerField } from "./DatePickerField";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "./SheetSection";
import { pickDuration } from "@/components/route/EtaBreakdown";
import { MoveRouteDateDialog, type MoveRouteScope } from "./MoveRouteDateDialog";
import { MoveStopsDialog } from "./MoveStopsDialog";

export type RouteEmployeeOption = { id: string; name: string };

type Props = {
  route: Route | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stopCount: number;
  /** Stops på ruten — bruges til at beregne live ETA for hele ruten. */
  stops?: RouteStop[];
};

/** Navngivne farver — bruges i picker, til tooltips og demo-data. */
export const ROUTE_COLORS = [
  { name: "Teal",     value: "#14b8a6" },
  { name: "Blå",      value: "#3b82f6" },
  { name: "Indigo",   value: "#6366f1" },
  { name: "Violet",   value: "#8b5cf6" },
  { name: "Pink",     value: "#ec4899" },
  { name: "Rød",      value: "#ef4444" },
  { name: "Orange",   value: "#f97316" },
  { name: "Amber",    value: "#f59e0b" },
  { name: "Emerald",  value: "#10b981" },
  { name: "Cyan",     value: "#06b6d4" },
  { name: "Slate",    value: "#64748b" },
  { name: "Fuchsia",  value: "#d946ef" },
  // Udvidet palet — mørkere/lyse varianter for flere ruter
  { name: "Lime",         value: "#84cc16" },
  { name: "Grøn",         value: "#22c55e" },
  { name: "Sky",          value: "#0ea5e9" },
  { name: "Rose",         value: "#f43f5e" },
  { name: "Mørk teal",    value: "#0f766e" },
  { name: "Mørk blå",     value: "#1d4ed8" },
  { name: "Mørk lilla",   value: "#7c3aed" },
  { name: "Mørk grøn",    value: "#15803d" },
  { name: "Mørk rød",     value: "#b91c1c" },
  { name: "Mørk orange",  value: "#c2410c" },
  { name: "Stone",        value: "#78716c" },
  { name: "Zinc",         value: "#52525b" },
] as const;

/** Bagudkompatibel farve-array (kun hex-værdier). */
export const ROUTE_COLOR_PALETTE = ROUTE_COLORS.map((c) => c.value);

/** Find første farve der ikke er i `usedColors` — eller en tilfældig hvis alle er brugt. */
export const pickAvailableColor = (usedColors: string[]): string => {
  const used = new Set(usedColors);
  const free = ROUTE_COLORS.find((c) => !used.has(c.value));
  if (free) return free.value;
  return ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)].value;
};

export const RouteEditSheet = ({
  route, open, onOpenChange, stopCount, stops = [],
}: Props) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(ROUTE_COLOR_PALETTE[0]);
  const [date, setDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Pending date-flytning — hvis ruten er del af en serie spørger vi
  // brugeren om kun denne ene eller alle fremtidige skal flyttes.
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [moveStopsOpen, setMoveStopsOpen] = useState(false);
  const initialSyncDone = useRef(false);

  const updateRoute = useUpdateRoute();
  const deleteRoute = useDeleteRoute();
  const optimize = useOptimizeRoute();
  const moveRouteSeries = useMoveRouteSeries();
  const { data: seriesInfo } = useRouteSeriesInfo(route?.id ?? null, route?.route_date ?? null);

  useEffect(() => {
    if (!route) return;
    setName(route.name || "");
    setColor(route.color || ROUTE_COLOR_PALETTE[0]);
    setDate(route.route_date);
    initialSyncDone.current = false;
  }, [route?.id]);

  // Beregn afgangstid automatisk ud fra rutens dato + planlagte starttid.
  // Hvis ingen starttid er sat, bruges 08:00 som standard. Hvis dato er i dag
  // og tiden allerede er passeret, bruger vi "nu" så ETA afspejler virkelige
  // trafikforhold lige nu.
  const departAt = useMemo<string | null>(() => {
    if (!route?.route_date) return null;
    const time = route.planned_start_time?.slice(0, 5) || "08:00";
    const planned = parseISO(`${route.route_date}T${time}:00`);
    if (Number.isNaN(planned.getTime())) return null;
    if (planned.getTime() < Date.now()) return null; // i fortiden → brug "nu"
    return planned.toISOString();
  }, [route?.route_date, route?.planned_start_time]);

  // Beregn waypoints for hele ruten — start (hvis sat) + alle stop i rækkefølge.
  const waypoints = useMemo(() => {
    if (!route || stops.length < 2) return null;
    const sorted = [...stops]
      .filter((s) => s.latitude != null && s.longitude != null)
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({ lat: Number(s.latitude), lng: Number(s.longitude) }));
    if (route.start_latitude != null && route.start_longitude != null) {
      sorted.unshift({ lat: Number(route.start_latitude), lng: Number(route.start_longitude) });
    }
    return sorted.length >= 2 ? sorted : null;
  }, [route, stops]);

  const { data: routeDirections } = useDirections(waypoints, {
    departAt: departAt || undefined,
    businessId: route?.business_id,
  });

  const dirty =
    (route?.name || "") !== name ||
    route?.color !== color;

  const pendingPayload = useMemo(() => ({
    id: route?.id ?? "",
    name: name.trim() || null,
    color,
  }), [route?.id, name, color]);

  useEffect(() => {
    if (!route || !open || !dirty) return;
    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      updateRoute.mutate(pendingPayload);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [route, open, dirty, pendingPayload, updateRoute]);

  if (!route) return null;

  const handleDelete = async () => {
    try {
      await deleteRoute.mutateAsync(route.id);
      toast.success("Rute slettet");
      onOpenChange(false);
    } catch { /* */ }
    setConfirmDelete(false);
  };

  // Hvis brugeren ændrer datoen i picker → åbn scope-dialog i stedet for at autosave.
  const handleDateChange = (next: string) => {
    if (!route || !next || next === route.route_date) {
      setDate(next);
      return;
    }
    setPendingDate(next);
  };

  const handleConfirmMoveDate = async (
    scope: MoveRouteScope,
    moveLinkedSubscriptions: boolean,
  ) => {
    if (!route || !pendingDate) return;
    try {
      await moveRouteSeries.mutateAsync({
        routeId: route.id,
        newDate: pendingDate,
        scope,
        moveLinkedSubscriptions,
      });
      setDate(pendingDate);
      toast.success(
        scope === "future" ? "Ruteserien flyttet" : "Rute flyttet til ny dato",
      );
      setPendingDate(null);
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke flytte rute");
    }
  };

  const handleOptimize = async () => {
    try {
      const result = await optimize.mutateAsync(route.id);
      toast.success(
        `${result.total_km.toFixed(1)} km · ${Math.floor(result.total_minutes / 60)}t ${result.total_minutes % 60}m`,
        { description: result.summary || result.reasoning },
      );
    } catch { /* */ }
  };

  /**
   * Skriv rejsetid på almindeligt dansk:
   *  - <60 min  → "34 min"
   *  - =60 min  → "1 time"
   *  - >60 min  → "1 time og 12 min" / "2 timer og 5 min"
   */
  const formatTravelTime = (s: number): string => {
    const m = Math.max(0, Math.round(s / 60));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    const hourLabel = h === 1 ? "1 time" : `${h} timer`;
    if (r === 0) return hourLabel;
    return `${hourLabel} og ${r} min`;
  };

  // Brug altid den korrigerede ETA (med DK trafik-buffer) — ingen toggle længere.
  const displayDuration = routeDirections ? pickDuration(routeDirections, false) : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent
          className="w-full sm:max-w-md flex flex-col p-0 shadow-xl"
          hideOverlay
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="px-5 py-4 border-b shrink-0 space-y-0">
            <SheetHeaderBlock
              icon={<Pencil className="h-4 w-4" />}
              accent={color}
              title={<SheetTitle className="text-base">Rediger rute</SheetTitle>}
              description={
                <SheetDescription className="text-xs">
                  {date ? format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da }) : ""}
                  {stopCount > 0 && <> · {stopCount} stop</>}
                </SheetDescription>
              }
            />
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-secondary/20">
            {/* Navn */}
            <Section icon={<Pencil className="h-3.5 w-3.5" />} title="Navn">
              <Input
                id="route-edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="fx Nord, Aarhus C, Mandag-team..."
                className="h-9"
              />
            </Section>

            {/* Farve */}
            <Section
              icon={<Palette className="h-3.5 w-3.5" />}
              title="Farve"
              hint={ROUTE_COLORS.find((c) => c.value === color)?.name || "Brugerdefineret"}
            >
              <div className="grid grid-cols-12 gap-1.5">
                {ROUTE_COLORS.map((c) => {
                  const selected = color === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.name}
                      className={cn(
                        "relative aspect-square rounded-md transition-all hover:scale-110 ring-offset-1 ring-offset-background flex items-center justify-center",
                        selected ? "ring-2 ring-foreground shadow-md" : "hover:ring-1 hover:ring-foreground/30",
                      )}
                      style={{ background: c.value }}
                      aria-label={`Vælg farve ${c.name}`}
                    >
                      {selected && <Check className="h-2.5 w-2.5 text-white drop-shadow" strokeWidth={4} />}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Dato */}
            <Section
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              title="Dato"
              hint={(seriesInfo?.recurringAppointmentCount ?? 0) >= 1 ? "Del af fast rute" : "Træk i kalenderen for hurtigt skift"}
            >
              <DatePickerField value={date} onChange={handleDateChange} />
            </Section>

            {/* Rejsetid — kort og enkel: "Estimeret rejsetid: 34 min" */}
            {waypoints && (
              <Section icon={<Gauge className="h-3.5 w-3.5" />} title="Rejsetid">
                <div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Estimeret rejsetid: </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {displayDuration != null ? formatTravelTime(displayDuration) : "—"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Beregnet ud fra rutens planlagte start og forventede trafikforhold.
                  </p>
                </div>
              </Section>
            )}
          </div>

          {/* Footer actions */}
          <SheetFooterBar className="space-y-2">
            {stopCount >= 2 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleOptimize}
                disabled={optimize.isPending}
              >
                {optimize.isPending
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Sparkles className="h-4 w-4 mr-2" />}
                Optimér rækkefølge
              </Button>
            )}
            {stopCount >= 1 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMoveStopsOpen(true)}
              >
                <CalendarRange className="h-4 w-4 mr-2" />
                Flyt aftaler
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (stopCount > 0) {
                  // Ruter med aftaler kan ikke slettes direkte — flyt aftalerne
                  // først, så ingen aftaler bliver væk og medarbejder-tilknytninger
                  // bevares.
                  toast.info("Flyt aftalerne først", {
                    description: "Vælg en ny dato for aftalerne — ruten slettes automatisk når den er tom.",
                  });
                  setMoveStopsOpen(true);
                } else {
                  setConfirmDelete(true);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {stopCount > 0 ? "Slet (flyt aftaler først)" : "Slet rute"}
            </Button>
          </SheetFooterBar>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet rute?</AlertDialogTitle>
            <AlertDialogDescription>
              Ruten er tom og slettes permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slet rute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MoveRouteDateDialog
        open={!!pendingDate}
        onOpenChange={(o) => { if (!o) setPendingDate(null); }}
        routeName={route.name || "Rute"}
        fromDate={route.route_date}
        toDate={pendingDate || ""}
        recurringAppointmentCount={seriesInfo?.recurringAppointmentCount ?? 0}
        linkedSubscriptionCount={seriesInfo?.linkedSubscriptionCount ?? 0}
        loading={moveRouteSeries.isPending}
        onConfirm={handleConfirmMoveDate}
      />

      <MoveStopsDialog
        open={moveStopsOpen}
        onOpenChange={setMoveStopsOpen}
        route={route}
        stops={stops}
      />
    </>
  );
};