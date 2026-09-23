// RouteStopsPanel — slide-in panel der viser alle stops for den valgte rute.
// Brugeren kan: omrangere via drag, klikke for at åbne detail, fjerne stop fra ruten.
// Vises ved siden af RouteEditSheet.

import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useIsBelowBreakpoint, useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCycleLabel } from "@/lib/cycle-label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DndContext, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
  MouseSensor, TouchSensor, KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, MapPin, Trash2, Inbox, ExternalLink, Loader2,
  Crown, UserPlus, Check, PlayCircle, ListOrdered, Map as MapIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastRouteError } from "@/lib/route-errors";
import {
  useReorderStops, useDeleteStop, useSetStopAssignees,
  type RouteStop, type Route,
} from "@/hooks/useRoutes";
import { useQueryClient } from "@tanstack/react-query";
import { registerStopRestoreUndo } from "@/lib/stop-restore";
import { IntervalBadge } from "./IntervalBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmployeeAvatars, type EmpAvatar } from "./EmployeeAvatars";
import { CARD_BASE, CARD_BORDER, CARD_HOVER, CARD_RAIL_WIDTH, ICON_BTN_ACCENT, ICON_BTN_DESTRUCTIVE } from "./lib/card-styles";
import EmptyState from "./EmptyState";
import { IndustryIcon } from "@/components/IndustryIcon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const RouteMap = lazy(() => import("./RouteMap"));

const readableTokenOn = (color?: string | null) => {
  const hex = color?.trim().match(/^#?([0-9a-f]{6})$/i)?.[1];
  if (!hex) return "hsl(var(--background))";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.62 ? "hsl(var(--foreground))" : "hsl(var(--background))";
};
// Failsafe fallback så sekvens-chippen ALDRIG render­er usynligt selv hvis
// ruten mangler en gemt farve. Bruger forgrunden så "1/2/3" altid har
// kontrast mod kort-baggrunden.
const safeChipBg = (c?: string | null) =>
  c && /^#?[0-9a-f]{6}$/i.test(c.trim()) ? c : "hsl(var(--foreground))";

type Props = {
  route: Route | null;
  stops: RouteStop[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStop: (stop: RouteStop) => void;
  /** Aktive medarbejdere for virksomheden — bruges til inline assignee-picker. */
  employees: EmpAvatar[];
  /**
   * Kaldes når rutens sidste aftale blev fjernet, og den tomme rute derved
   * blev slettet på serveren. Forælderen bruger det til at lukke panelet —
   * ellers ville det blive hængende og vise en rute der ikke længere findes.
   */
  onRouteDeleted?: () => void;
  /**
   * Sand når panelet er åbnet via en projiceret rute-forekomst. Projicerede
   * ruter er view-only afledninger af en originalrute — at fjerne et stop
   * eller omrangere her ville mutere selve basisruten og dermed ALLE
   * fremtidige forekomster, hvilket næsten aldrig er hvad brugeren mener.
   * Når flag'et er sat:
   *  - Drag-handle + "Fjern stop" skjules/disables
   *  - Header viser en kort note der peger brugeren mod originalruten
   *  - Assignee-picker forbliver aktiv (medarbejder­tildeling lever på
   *    stop-niveau og er det normale brugsmønster på dagen)
   */
  isProjection?: boolean;
};

export const RouteStopsPanel = ({
  route, stops, open, onOpenChange, onSelectStop, employees, onRouteDeleted, isProjection = false,
}: Props) => {
  const reorder = useReorderStops();
  const deleteStop = useDeleteStop();
  const qc = useQueryClient();
  const setAssignees = useSetStopAssignees();
  const [confirmDelete, setConfirmDelete] = useState<RouteStop | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const { data: livePositions = [] } = useQuery({
    queryKey: ["route-live-positions", route?.id],
    enabled: open && !!route?.id,
    refetchInterval: open ? 20_000 : false,
    queryFn: async () => {
      const { data, error } = await supabase.from("route_live_positions").select("*").eq("route_id", route!.id).gt("expires_at", new Date().toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  // Lokal sorteret liste — opdateres når DB-data ændrer sig
  const [items, setItems] = useState<RouteStop[]>([]);
  useEffect(() => {
    setItems([...stops].sort((a, b) => a.sequence - b.sequence));
  }, [stops]);
  const mapStops = useMemo(() => items.filter((stop) => stop.latitude != null && stop.longitude != null).map((stop, index) => ({
    id: stop.id,
    lat: Number(stop.latitude),
    lng: Number(stop.longitude),
    label: stop.customer_name || "Stop",
    sublabel: stop.full_address || stop.address || undefined,
    index: index + 1,
  })), [items]);
  const mapLivePositions = livePositions.map((position) => ({
    employeeId: position.employee_id,
    lat: position.latitude,
    lng: position.longitude,
    label: employees.find((employee) => employee.id === position.employee_id)?.name || "Medarbejder",
    currentStopLabel: items.find((item) => item.id === position.current_stop_id)?.customer_name || undefined,
    recordedAt: position.recorded_at,
  }));

  // Dedikerede sensorer pr. inputtype: mus reagerer hurtigt (3px distance),
  // touch kræver kort hold (120ms / 8px tolerance) så tap stadig fungerer
  // som klik på Windows-pegefelter og Android. Keyboard for tilgængelighed.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (e: DragEndEvent) => {
    if (isProjection) {
      toast.info("Rækkefølgen redigeres på originalruten", {
        description: "Åbn originalruten for at ændre rækkefølgen — projicerede ruter er låste visninger.",
      });
      return;
    }
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((s) => s.id === active.id);
    const newIdx = items.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next); // optimistisk
    try {
      await reorder.mutateAsync(next.map((s, i) => ({ id: s.id, sequence: i })));
      toast.success("Rækkefølge opdateret");
    } catch (err: any) {
      // Revert hvis fejl
      setItems([...stops].sort((a, b) => a.sequence - b.sequence));
      toastRouteError(err, toast.error, { titleFallback: "Kunne ikke gemme rækkefølge" });
    }
  };

  const handleDelete = async (stop: RouteStop) => {
    if (isProjection) return; // safety — knappen er skjult i projection-mode
    try {
      const res = await deleteStop.mutateAsync(stop.id) as any;
      const message = res?.route_deleted
        ? "Aftale fjernet — den tomme rute blev slettet"
        : "Aftale fjernet fra ruten";
      registerStopRestoreUndo({
        stop,
        message,
        description: res?.recurring_unlinked
          ? "Fremtidige gentagelser vises ikke længere på denne rute."
          : undefined,
        routeDeleted: !!res?.route_deleted,
        qc,
      });
      // Hvis det var rutens sidste aftale, blev ruten slettet — luk panelet
      // så brugeren ikke står tilbage med en modal for en rute der er væk.
      if (res?.route_deleted) onRouteDeleted?.();
    } catch (err: any) {
      toastRouteError(err, toast.error, { titleFallback: "Kunne ikke fjerne stop" });
    }
    setConfirmDelete(null);
  };

  // På mobil/tablet (< lg) viser vi panelet som en bunden modal sheet med
  // overlay og close-knap — så brugeren altid kan lukke den. På desktop
  // pinner vi det ved siden af RouteEditSheet (non-modal, ingen overlay).
  const isMobile = useIsMobile();
  const isCompact = useIsBelowBreakpoint(1024);

  if (!route) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={isCompact}>
        <SheetContent
          side={isCompact ? "bottom" : "right"}
          className={cn(
            "planner-overlay flex flex-col p-0 shadow-xl",
            isCompact
              ? "h-[86dvh] max-h-[86dvh] rounded-t-md"
              : "w-full sm:max-w-sm lg:right-[28rem]",
          )}
          hideOverlay={!isCompact}
          hideCloseButton={!isCompact}
          // Vis ved siden af RouteEditSheet (som er sm:max-w-md ≈ 28rem bred)
          onOpenAutoFocus={(e) => e.preventDefault()}
          /* Non-modal sheet: forhindr Radix i at lukke når brugeren klikker
             på portal'ede børn (dropdowns, popovers, tooltips, datepicker
             osv.) — ellers virker menupunkter i sheet'en ikke. */
          onPointerDownOutside={(e) => {
            const t = e.target as Element | null;
            if (
              t?.closest(
                '[data-radix-popper-content-wrapper],[data-radix-portal],[role="menu"],[role="listbox"],[role="dialog"],[role="tooltip"],[data-sonner-toaster]',
              )
            ) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const t = e.target as Element | null;
            if (
              t?.closest(
                '[data-radix-popper-content-wrapper],[data-radix-portal],[role="menu"],[role="listbox"],[role="dialog"],[role="tooltip"],[data-sonner-toaster]',
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <SheetHeader
            className={cn(
              "planner-overlay-header relative px-5 pl-6 py-4 border-b shrink-0 text-left bg-card",
              isCompact && "pr-14",
            )}
          >
            {/* Venstre farve-rail binder panelet til ruten — ingen separat
                ikon-klods som konkurrerer med titlen. */}
            <span
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ background: route.color }}
            />
            <SheetTitle className="flex items-center gap-2 text-[17px] leading-tight">
              <span className="min-w-0 truncate font-semibold tracking-tight text-foreground">
                Stops på ruten
              </span>
              <span
                className="shrink-0 inline-flex h-[18px] min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular-nums bg-foreground/[0.08] text-foreground/80 ring-1 ring-inset ring-foreground/10"
                title={`${items.length} ${items.length === 1 ? "stop" : "stops"}`}
              >
                {items.length}
              </span>
            </SheetTitle>
            <SheetDescription className="text-[11.5px] leading-snug mt-1 text-muted-foreground/85 flex items-center gap-1.5">
              <ListOrdered className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">
                {isProjection
                  ? "Projiceret forekomst · rediger originalruten for at ændre rækkefølgen"
                  : "Træk for at omrangere · klik for detaljer"}
              </span>
            </SheetDescription>
          </SheetHeader>

          <div className="planner-overlay-body flex-1 overflow-y-auto p-4 bg-secondary/20">
            <div className="mb-3 space-y-2">
              <Button variant="outline" className="h-10 w-full gap-2 bg-card" onClick={() => setMapOpen((value) => !value)} disabled={!mapStops.length}>
                <MapIcon className="h-4 w-4" />{mapOpen ? "Skjul kort" : livePositions.length ? `Vis kort · ${livePositions.length} aktiv` : "Vis kort"}
              </Button>
              {mapOpen && mapStops.length > 0 && (
                <Suspense fallback={<div className="h-56 animate-pulse rounded-md bg-secondary" />}>
                  <RouteMap routes={[{ color: route.color, stops: mapStops }]} height="14rem" livePositions={mapLivePositions} onStopClick={(id) => {
                    const selected = items.find((item) => item.id === id);
                    if (selected) onSelectStop(selected);
                  }} />
                </Suspense>
              )}
            </div>
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  compact
                  icon={<Inbox className="h-5 w-5" />}
                  title="Ingen stops endnu"
                  description="Træk aftaler fra aftalepoolen ind på ruten."
                />
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <ol className="space-y-1.5">
                    {items.map((stop, idx) => (
                      <SortableStopRow
                        key={stop.id}
                        stop={stop}
                        index={idx + 1}
                        color={route.color}
                        employees={employees}
                        isProjection={isProjection}
                        onSetAssignees={(ids, lead) =>
                          setAssignees.mutate({ stop_id: stop.id, employee_ids: ids, lead_id: lead })
                        }
                        onSelect={() => onSelectStop(stop)}
                        onRemove={() => setConfirmDelete(stop)}
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {reorder.isPending && (
            <div className="border-t px-4 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />Gemmer rækkefølge…
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern stop fra ruten?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.customer_name}</strong> fjernes fra ruten
              {items.length <= 1
                ? ", og den tomme rute bliver slettet."
                : "."}
              {confirmDelete?.agreement_interval && confirmDelete.agreement_interval !== "engangskøb"
                ? " Fremtidige gentagelser fjernes også fra denne rute."
                : " Aftalen kan planlægges igen bagefter."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Fjern stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/* ─── Sortable row ─── */
type RowProps = {
  stop: RouteStop;
  index: number;
  color: string;
  employees: EmpAvatar[];
  isProjection?: boolean;
  onSetAssignees: (ids: string[], lead: string | null) => void;
  onSelect: () => void;
  onRemove: () => void;
};

const SortableStopRow = ({
  stop, index, color, employees, onSetAssignees, onSelect, onRemove, isProjection = false,
}: RowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: isProjection,
  });

  // Brug Translate i stedet for Transform — Transform inkluderer scale-justering
  // som dnd-kit beregner ud fra container-rect, og det forvrænger kortet under drag.
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const assigneeIds = stop.assignee_ids ?? (stop.assigned_employee_id ? [stop.assigned_employee_id] : []);
  const leadId = stop.lead_employee_id ?? stop.assigned_employee_id ?? null;
  const assigneeEmps = assigneeIds
    .map((id) => employees.find((e) => e.id === id))
    .filter(Boolean) as EmpAvatar[];

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        CARD_BASE,
        isDragging
          ? "z-20 border-dashed border-accent/60 bg-secondary/40 opacity-60 shadow-none ring-0"
          : cn(CARD_BORDER, CARD_HOVER),
      )}
    >
      {/* Tynd accent-stribe i venstre kant i rutens farve — binder kortet visuelt til kalender-pillen */}
      <span
        aria-hidden
        className={cn("absolute left-0 top-0 bottom-0 z-10", CARD_RAIL_WIDTH)}
        style={{ background: color }}
      />
      <div className="flex items-stretch min-h-[3rem] pl-1">
        {/* Drag handle — skjult på projicerede ruter (read-only) */}
        {!isProjection ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex shrink-0 items-center justify-center w-6 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground transition-colors sm:w-7"
            aria-label="Træk for at omrangere"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span
            className="flex shrink-0 items-center justify-center w-6 text-muted-foreground/25 sm:w-7"
            aria-hidden
            title="Projiceret rute — låst rækkefølge"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}

        {/* Sekvens-nummer — rund "chip" i rutens farve. Roundet og elevated i stedet for flad firkant. */}
        <div className="flex shrink-0 items-center pr-1.5">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-bold tabular-nums shadow-sm ring-1 ring-card sm:h-8 sm:w-8 sm:text-sm"
            style={{ background: safeChipBg(color), color: readableTokenOn(color) }}
            aria-label={`Stop ${index}`}
          >
            {index}
          </span>
        </div>

        {/* Content — clickable */}
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left pr-2 py-2 space-y-0.5"
        >
          {/* Header: branche-ikon + kundenavn (primær) + medarbejder-avatars + åbn-pil */}
          <div className="flex items-center gap-2">
            {/* Tintet branche-ikon-tile foran navnet — gør aftalens type
                synlig på et splitsekund. Bruger samme ikon-pakke som
                services og ordrer. */}
            {stop.service_summary && (
              <span
                aria-hidden
                title={stop.service_summary}
                className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md bg-secondary/70 ring-1 ring-border/60 p-1"
              >
                <IndustryIcon
                  name={stop.service_summary}
                  className="h-full w-full object-contain"
                  alt=""
                />
              </span>
            )}
            <p className="text-xs font-semibold truncate flex-1 text-foreground leading-tight sm:text-sm">
              {stop.customer_name || "Ukendt kunde"}
            </p>
            {assigneeEmps.length > 0 && (
              <EmployeeAvatars employees={assigneeEmps} size={18} max={2} />
            )}
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
          </div>

          {/* Ydelse — sekundær linje */}
          {stop.service_summary ? (
            <p className="text-[10px] text-muted-foreground truncate sm:text-[11px]">
              {stop.service_summary}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 truncate italic sm:text-[11px]">
              Ingen ydelser angivet
            </p>
          )}

          {/* Adresse — tertiær */}
          {stop.address && (
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 sm:text-[11px]">
              <MapPin className="h-3 w-3 shrink-0" />
              {stop.address}
            </p>
          )}

          {/* Konsistent badge-række — alle h-5, samme padding og tekststørrelse. */}
          <div className="hidden items-center gap-1.5 flex-wrap pt-0.5 sm:flex">
            <IntervalBadge interval={stop.agreement_interval} size="sm" />
            {(() => {
              const label = formatCycleLabel({
                completedCycles: stop.completed_cycles,
                interval: stop.agreement_interval,
                isCompleted: stop.status === "completed",
              });
              return label ? (
                <Badge
                  variant="outline"
                  className="h-5 text-[11px] px-2 gap-1 font-medium"
                  title="Hvilken kørsel af aftalen dette stop er"
                >
                  {label}
                </Badge>
              ) : null;
            })()}
            {stop.status === "completed" && (
              <Badge
                variant="outline"
                className="h-5 text-[11px] px-2 gap-1 border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:bg-emerald-500/10 font-medium"
              >
                <Check className="h-3 w-3" />
                Færdig
              </Badge>
            )}
            {stop.is_first_occurrence && stop.start_date && stop.status !== "completed" && (
              <Badge
                variant="outline"
                className="h-5 text-[11px] px-2 gap-1 border-primary/40 text-primary bg-primary/5 font-medium"
                title="Aftalen er ikke kørt endnu — dette er opstartsdatoen"
              >
                <PlayCircle className="h-3 w-3" />
                Opstart {(() => {
                  try { return format(parseISO(stop.start_date), "d. MMM", { locale: da }); }
                  catch { return stop.start_date; }
                })()}
              </Badge>
            )}
          </div>
        </button>

        {/* Right-side actions: assignee toggle + remove — fuld-højde divider */}
        <div className="flex shrink-0 items-stretch self-stretch border-l border-border/50 bg-secondary/20">
          <AssigneeToggle
            employees={employees}
            selectedIds={assigneeIds}
            leadId={leadId}
            onChange={onSetAssignees}
          />
          {!isProjection && (
            <button
              type="button"
              onClick={onRemove}
              className={cn(
                "flex w-9 rounded-none",
                ICON_BTN_DESTRUCTIVE,
                "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
              )}
              aria-label="Fjern stop"
              title="Fjern stop fra rute"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
};

/* ─── Inline assignee picker — popover med checkbox-liste + lead-knap. ─── */
const AssigneeToggle = ({
  employees, selectedIds, leadId, onChange,
}: {
  employees: EmpAvatar[];
  selectedIds: string[];
  leadId: string | null;
  onChange: (ids: string[], lead: string | null) => void;
}) => {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((x) => x !== id);
      const nextLead = leadId === id ? next[0] ?? null : leadId;
      onChange(next, nextLead);
    } else {
      const next = [...selectedIds, id];
      const nextLead = leadId ?? next[0];
      onChange(next, nextLead);
    }
  };
  const setLead = (id: string) => {
    if (!selectedIds.includes(id)) onChange([...selectedIds, id], id);
    else onChange(selectedIds, id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-9 rounded-none",
            ICON_BTN_ACCENT,
            selectedIds.length > 0 && "text-accent",
          )}
          aria-label="Tildel medarbejdere"
          title="Tildel/fjern medarbejdere"
          onClick={(e) => e.stopPropagation()}
        >
          <UserPlus className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1 font-semibold">
          Tildel medarbejdere
        </p>
        {employees.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2 py-3 text-center">
            Ingen aktive medarbejdere.
          </p>
        ) : (
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {employees.map((e) => {
              const selected = selectedIds.includes(e.id);
              const isLead = leadId === e.id;
              return (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    selected ? "bg-accent/10" : "hover:bg-secondary",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        selected ? "border-foreground bg-foreground text-background" : "border-border",
                      )}
                    >
                      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {e.avatar_url ? (
                      <img
                        src={e.avatar_url}
                        alt={e.name}
                        className="h-5 w-5 rounded-full object-cover"
                        width={20}
                        height={20}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span
                        className="h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold"
                        style={{ background: e.color || "hsl(220 13% 46%)", color: readableTokenOn(e.color) }}
                      >
                        {e.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-xs flex-1">{e.name}</span>
                  </button>
                  {selected && (
                    <button
                      type="button"
                      onClick={() => setLead(e.id)}
                      className={cn(
                        "shrink-0 h-6 w-6 inline-flex items-center justify-center rounded transition-colors",
                        isLead
                          ? "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10"
                          : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-300 dark:hover:bg-amber-500/10",
                      )}
                      title={isLead ? "Lead-medarbejder" : "Sæt som lead"}
                      aria-label="Sæt som lead"
                    >
                      <Crown className="h-3.5 w-3.5" fill={isLead ? "currentColor" : "none"} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {selectedIds.length > 1 && (
          <p className="text-[10px] text-muted-foreground mt-2 px-1 italic">
            Provision deles ligeligt ({Math.round(100 / selectedIds.length)}% pr. medarbejder).
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};
