// RouteStopsPanel — slide-in panel der viser alle stops for den valgte rute.
// Brugeren kan: omrangere via drag, klikke for at åbne detail, fjerne stop fra ruten.
// Vises ved siden af RouteEditSheet.

import { useRetainedValue } from "@/hooks/useRetainedValue";
import { useCallback, useEffect, useRef, useState } from "react";
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
  GripVertical, MapPin, Trash2, Inbox, Loader2, Undo2,
  Crown, UserPlus, Check, PlayCircle, ListOrdered, Radio, ArrowUp, ArrowDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { toastRouteError } from "@/lib/route-errors";
import {
  useReorderStops, useDeleteStop, useSetStopAssignees, useUndoCompletedRouteStop, useUpdateStopStatus,
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
import { CARD_BASE, CARD_BORDER, CARD_HOVER, CARD_RAIL_WIDTH, CARD_CONTENT, CARD_ACTIONS, ICON_BTN_ACCENT, ICON_BTN_DESTRUCTIVE } from "./lib/card-styles";
import EmptyState from "./EmptyState";
import { IndustryIcon } from "@/components/IndustryIcon";
import { useRouteLivePositions, type RouteLivePosition } from "@/hooks/useRouteLivePositions";
import StopCustomerEditDialog from "./StopCustomerEditDialog";
import StopAppointmentEditDialog from "./StopAppointmentEditDialog";

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
  route: routeProp, stops, open, onOpenChange, onSelectStop, employees, onRouteDeleted, isProjection = false,
}: Props) => {
  const route = useRetainedValue(routeProp);
  const reorder = useReorderStops();
  const deleteStop = useDeleteStop();
  const qc = useQueryClient();
  const setAssignees = useSetStopAssignees();
  const undoCompleted = useUndoCompletedRouteStop();
  const updateStopStatus = useUpdateStopStatus();
  const [confirmDelete, setConfirmDelete] = useState<RouteStop | null>(null);
  const [confirmUndo, setConfirmUndo] = useState<RouteStop | null>(null);
  const [editCustomerOrderId, setEditCustomerOrderId] = useState<string | null>(null);
  const closeCustomerEdit = useCallback(() => setEditCustomerOrderId(null), []);
  const [editAppointment, setEditAppointment] = useState<{ stopId: string; orderId: string; completed: boolean; routeDate?: string | null } | null>(null);
  const closeAppointmentEdit = useCallback(() => setEditAppointment(null), []);
  const { data: livePositions = [] } = useRouteLivePositions(!isProjection ? route?.id : null);
  const firstSeenAtStopRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (!route?.id) {
      firstSeenAtStopRef.current.clear();
      return;
    }
    livePositions.forEach((position) => {
      if (!position.current_stop_id) return;
      const key = `${position.current_stop_id}:${position.employee_id}`;
      if (!firstSeenAtStopRef.current.has(key)) {
        firstSeenAtStopRef.current.set(key, position.recorded_at);
      }
    });
  }, [livePositions, route?.id]);

  // Lokal sorteret liste — opdateres når DB-data ændrer sig
  const [items, setItems] = useState<RouteStop[]>([]);
  useEffect(() => {
    setItems([...stops].sort((a, b) => a.sequence - b.sequence));
  }, [stops]);

  // Dedikerede sensorer pr. inputtype: mus reagerer hurtigt (3px distance),
  // touch kræver kort hold (120ms / 8px tolerance) så tap stadig fungerer
  // som klik på Windows-pegefelter og Android. Keyboard for tilgængelighed.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 10 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = async (e: DragEndEvent) => {
    if (reorder.isPending) return;
    if (isProjection) {
      toast.info("Rækkefølgen redigeres på den faste rute", {
        description: "Åbn den faste rute for at ændre rækkefølgen — forventede ruter er låste visninger.",
      });
      return;
    }
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((s) => s.id === active.id);
    const newIdx = items.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    await saveOrder(arrayMove(items, oldIdx, newIdx));
  };

  const saveOrder = async (next: RouteStop[]) => {
    setItems(next); // optimistisk
    try {
      if (!navigator.onLine) throw new Error("Ingen internetforbindelse. Prøv igen, når du har dækning.");
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
            "planner-overlay flex flex-col p-0 shadow-xl data-[state=open]:duration-[420ms] data-[state=closed]:duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:![--tw-enter-translate-x:2.5rem] data-[state=closed]:![--tw-exit-translate-x:2.5rem] data-[state=open]:![--tw-enter-translate-y:3rem] data-[state=closed]:![--tw-exit-translate-y:3rem]",
            isCompact
              ? "h-[calc(100dvh-0.75rem)] max-h-[calc(100dvh-0.75rem)] rounded-t-md sm:h-[90dvh] sm:max-h-[90dvh]"
              : "w-full sm:max-w-sm lg:right-[28rem] [@media(min-width:1100px)_and_(max-width:1499px)]:!max-w-[20rem] [@media(min-width:1100px)_and_(max-width:1499px)]:!right-[24rem]",
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
                '[data-radix-popper-content-wrapper],[data-radix-portal],[role="menu"],[role="listbox"],[role="dialog"],[role="tooltip"],[data-sonner-toaster],[data-route-pill]',
              )
            ) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            const t = e.target as Element | null;
            if (
              t?.closest(
                '[data-radix-popper-content-wrapper],[data-radix-portal],[role="menu"],[role="listbox"],[role="dialog"],[role="tooltip"],[data-sonner-toaster],[data-route-pill]',
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <SheetHeader
            className={cn(
              "planner-overlay-header relative px-4 py-3 border-b shrink-0 text-left bg-card",
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
            <SheetTitle className="flex items-center gap-2 text-base leading-tight">
              <span className="min-w-0 truncate font-semibold tracking-tight text-foreground">
                {route.name?.trim() || (route.route_date ? `Rute ${format(parseISO(route.route_date), "d. MMM", { locale: da })}` : "Stop på ruten")}
              </span>
              <span
                className="shrink-0 inline-flex h-[18px] min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular-nums bg-foreground/[0.08] text-foreground/80 ring-1 ring-inset ring-foreground/10"
                title={`${items.length} ${items.length === 1 ? "stop" : "stops"}`}
              >
                {items.length}
              </span>
            </SheetTitle>
            <SheetDescription className="text-[13px] leading-snug mt-0.5 text-muted-foreground flex items-center gap-1.5">
              <ListOrdered className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="min-w-0 break-words">
                {isProjection
                  ? "Forventet besøg · ret den faste rute for at ændre rækkefølgen"
                   : items.length < 2
                    ? (isCompact ? "Stop på ruten · tryk på navnet for detaljer" : "Stop på ruten · klik for detaljer")
                    : isCompact ? "Brug pilene til at flytte · tryk på navnet for detaljer" : "Træk for at omrangere · klik for detaljer"}
              </span>
            </SheetDescription>
          </SheetHeader>

          <div className="planner-overlay-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 bg-secondary/20">
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  compact
                  icon={<Inbox className="h-5 w-5" />}
                   title="Ingen stop endnu"
                   description={isCompact ? "Vælg en aftale og tryk på Vælg rute." : "Træk aftaler fra aftalepoolen ind på ruten."}
                />
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <ol className="space-y-2">
                    {items.map((stop, idx) => (
                      <SortableStopRow
                        key={stop.id}
                        stop={stop}
                        index={idx + 1}
                        color={route.color}
                        employees={employees}
                        livePositions={livePositions.filter((position) => position.current_stop_id === stop.id)}
                        firstSeenAtStop={firstSeenAtStopRef.current}
                        isProjection={isProjection}
                        compact={isCompact}
                        reorderPending={reorder.isPending}
                        canMoveUp={idx > 0}
                        canMoveDown={idx < items.length - 1}
                        onMove={(direction) => { if (!reorder.isPending && !isProjection) void saveOrder(arrayMove(items, idx, idx + direction)); }}
                        onSetAssignees={(ids, lead) =>
                          setAssignees.mutate({ stop_id: stop.id, employee_ids: ids, lead_id: lead })
                        }
                        onSelect={() => onSelectStop(stop)}
                        onEditCustomer={stop.order_id ? () => setEditCustomerOrderId(stop.order_id as string) : undefined}
                        onEditAppointment={stop.order_id && !isProjection && !String(stop.id).startsWith("virtual-stop:")
                          ? () => setEditAppointment({ stopId: stop.id, orderId: stop.order_id as string, completed: stop.status === "completed", routeDate: (routeProp as any)?.route_date ? String((routeProp as any).route_date).slice(0, 10) : null })
                          : undefined}
                        onRemove={() => setConfirmDelete(stop)}
                        onUndoCompleted={() => setConfirmUndo(stop)}
                        undoPending={undoCompleted.isPending && undoCompleted.variables === stop.id}
                        onMarkCompleted={() => updateStopStatus.mutate({ id: stop.id, status: "completed" })}
                        markCompletedPending={updateStopStatus.isPending && updateStopStatus.variables?.id === stop.id}
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

      <StopCustomerEditDialog orderId={editCustomerOrderId} onClose={closeCustomerEdit} />
      <StopAppointmentEditDialog target={editAppointment} onClose={closeAppointmentEdit} />

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

      <AlertDialog open={!!confirmUndo} onOpenChange={(o) => !o && setConfirmUndo(null)}>
        <AlertDialogContent className="planner-overlay">
          <AlertDialogHeader>
            <AlertDialogTitle>Fortryd udførsel?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmUndo?.customer_name}</strong> bliver sat tilbage til ikke udført.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmUndo) undoCompleted.mutate(confirmUndo.id);
                setConfirmUndo(null);
              }}
            >
              Fortryd udførsel
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
  livePositions: RouteLivePosition[];
  firstSeenAtStop: Map<string, string>;
  isProjection?: boolean;
  onSetAssignees: (ids: string[], lead: string | null) => void;
  onSelect: () => void;
  onEditCustomer?: () => void;
  onEditAppointment?: () => void;
  onRemove: () => void;
  onUndoCompleted: () => void;
  undoPending: boolean;
  onMarkCompleted: () => void;
  markCompletedPending: boolean;
  compact: boolean;
  reorderPending: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
};

const SortableStopRow = ({
  stop, index, color, employees, livePositions, firstSeenAtStop, onSetAssignees, onSelect, onEditCustomer, onEditAppointment, onRemove, onUndoCompleted, undoPending, onMarkCompleted, markCompletedPending, isProjection = false, compact, reorderPending, canMoveUp, canMoveDown, onMove,
}: RowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    disabled: isProjection || compact || reorderPending,
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
  const hasLivePresence = livePositions.length > 0;

  return (
    <li
      ref={setNodeRef}
      data-appointment-card=""
      style={style}
      className={cn(
        CARD_BASE,
        isDragging
          ? "z-20 border-dashed border-accent/60 bg-secondary/40 opacity-60 shadow-none ring-0"
          : cn(CARD_BORDER, CARD_HOVER, hasLivePresence && "border-success/45 bg-success/[0.035] ring-1 ring-success/15"),
      )}
    >
      {/* Tynd accent-stribe i venstre kant i rutens farve — binder kortet visuelt til kalender-pillen */}
      <span
        aria-hidden
        className={cn("absolute left-0 top-0 bottom-0 z-10", CARD_RAIL_WIDTH)}
        style={{ background: color }}
      />
      <div className={cn("flex items-stretch min-h-[3rem] pl-1", compact && "flex-wrap")}>
        {/* Drag handle — skjult på projicerede ruter (read-only) */}
        {!isProjection && !compact ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex shrink-0 items-center justify-center touch-none w-7 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground transition-colors sm:w-7"
            aria-label="Træk for at omrangere"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : (
          <span
            className={cn("flex shrink-0 items-center justify-center w-6 text-muted-foreground/25 sm:w-7", compact && !isProjection && "hidden")}
            aria-hidden
            title="Forventet besøg — låst rækkefølge"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}

        {/* Sekvens-nummer — rund "chip" i rutens farve. Roundet og elevated i stedet for flad firkant. */}
        <div className="flex shrink-0 items-start pt-3 pl-1 pr-1">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold tabular-nums shadow-sm ring-1 ring-card"
            style={{ background: safeChipBg(color), color: readableTokenOn(color) }}
            aria-label={`Stop ${index}`}
          >
            {index}
          </span>
        </div>

        {/* Content */}
        <div
          className={cn(CARD_CONTENT, "min-w-0 flex-1 text-left pl-1.5")}
        >
          {/* Header: branche-ikon + kundenavn (primær) + medarbejder-avatars + åbn-pil */}
          <div className="flex items-center gap-2">
            {/* Titlen er et rent tekst-link uden hover-boks — kun understregning
                og pil-feedback, så kortet ikke får en forvirrende ramme om titlen. */}
            <button
              type="button"
              onClick={onEditCustomer ?? onSelect}
              title={onEditCustomer ? "Redigér kundens oplysninger" : undefined}
              className="group/title flex min-h-11 min-w-0 flex-1 items-center justify-start gap-2 rounded-sm px-0 py-1 text-left text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
               {stop.service_summary && <IndustryIcon name={stop.service_summary} className="h-5 w-5 shrink-0 object-contain" alt="" />}
              <span className="min-w-0 break-words decoration-muted-foreground/50 underline-offset-4 group-hover/title:underline">{stop.customer_name || "Ukendt kunde"}</span>
            </button>
            {assigneeEmps.length > 0 && (
              <EmployeeAvatars employees={assigneeEmps} size={22} max={3} leadId={leadId} />
            )}
          </div>

          {/* Ydelse — sekundær linje */}
          {onEditAppointment ? (
            <button
              type="button"
              onClick={onEditAppointment}
              title="Redigér aftalen — services, pris og interval"
              className="group/appt -mx-1 flex min-h-11 w-[calc(100%+0.5rem)] items-center gap-1.5 rounded-md px-1 text-left text-xs leading-4 text-muted-foreground hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <span className={cn("min-w-0 flex-1 break-words", !stop.service_summary && "italic text-muted-foreground/70")}>
                {stop.service_summary || "Ingen ydelser angivet"}
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground">
                <Pencil className="h-3 w-3" /> Redigér aftale
              </span>
            </button>
          ) : stop.service_summary ? (
            <p className="break-words text-xs leading-4 text-muted-foreground">
              {stop.service_summary}
            </p>
          ) : (
            <p className="text-xs leading-4 text-muted-foreground/60 italic">
              Ingen ydelser angivet
            </p>
          )}

          {/* Adresse — tertiær */}
          {stop.address && (
            <p className="text-xs leading-4 text-muted-foreground flex items-start gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="min-w-0 break-words">{stop.address}</span>
            </p>
          )}

          {/* Konsistent badge-række — alle h-5, samme padding og tekststørrelse. */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <IntervalBadge interval={stop.agreement_interval} size="sm" />
            {(() => {
              const cycleNo = (stop as any).cycle_number as number | undefined;
              const label = typeof cycleNo === "number" && stop.agreement_interval !== "engangskøb"
                ? `${cycleNo}. kørsel`
                : formatCycleLabel({
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
              <Badge variant="outline" className="h-5 gap-1 px-2 text-[11px] font-medium border-success/35 bg-success/10 text-success">
                <Check className="h-3 w-3" /> Udført
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
        </div>

        {/* Live-status ligger uden for det klikbare stopindhold, så triggeren
            er gyldig på både mus, tastatur og touch. */}
        {hasLivePresence && (
          <LiveStopPresence stopId={stop.id} positions={livePositions} employees={employees} firstSeenAtStop={firstSeenAtStop} />
        )}

        {/* Right-side actions: assignee toggle + remove — fuld-højde divider */}
        <div className={cn(compact ? CARD_ACTIONS : "flex flex-col items-center justify-center gap-1 px-1.5", "shrink-0", compact && "basis-full justify-end")}>
          {!isProjection && (
            <Button variant="ghost" size={compact ? "sm" : "icon"} className={cn("h-11 shrink-0", compact ? "mr-auto gap-1.5 px-3 text-sm font-semibold" : "w-11 lg:h-8 lg:w-8", stop.status !== "completed" && "text-success hover:bg-success/10 hover:text-success")}
              disabled={stop.status === "completed" ? undoPending : markCompletedPending}
              onClick={(event) => { event.stopPropagation(); if (stop.status === "completed") onUndoCompleted(); else onMarkCompleted(); }}
              aria-label={stop.status === "completed" ? "Fortryd udførsel" : "Markér som udført"}
              title={stop.status === "completed" ? "Fortryd udførsel" : "Markér som udført"}>
              {(stop.status === "completed" ? undoPending : markCompletedPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : stop.status === "completed" ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {compact && <span>{stop.status === "completed" ? "Fortryd" : "Udført"}</span>}
            </Button>
          )}
          {compact && !isProjection && (canMoveUp || canMoveDown) && <>
            <Button variant="outline" size="icon" className="h-11 w-11" disabled={reorderPending || !canMoveUp} onClick={() => onMove(-1)} aria-label={`Flyt stop ${index} op`} title="Flyt op"><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-11 w-11" disabled={reorderPending || !canMoveDown} onClick={() => onMove(1)} aria-label={`Flyt stop ${index} ned`} title="Flyt ned"><ArrowDown className="h-4 w-4" /></Button>
          </>}
          <AssigneeToggle
            employees={employees}
            selectedIds={assigneeIds}
            leadId={leadId}
            onChange={onSetAssignees}
          />
          {!isProjection && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={onRemove}
              className={cn(
                "flex h-11 w-11 lg:h-8 lg:w-8 rounded-md p-0",
                ICON_BTN_DESTRUCTIVE,
              )}
              aria-label="Fjern stop"
              title="Fjern stop fra rute"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
};

const LiveStopPresence = ({
  stopId,
  positions,
  employees,
  firstSeenAtStop,
}: {
  stopId: string;
  positions: RouteLivePosition[];
  employees: EmpAvatar[];
  firstSeenAtStop: Map<string, string>;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="group/live flex w-9 shrink-0 items-center justify-center border-l border-success/20 bg-success/[0.07] text-success transition-colors hover:bg-success/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success"
        aria-label={`${positions.length} ${positions.length === 1 ? "medarbejder er" : "medarbejdere er"} ved aftalen`}
        title="Se hvem der er ved aftalen"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden>
          <span className="absolute h-4 w-4 animate-ping rounded-full bg-success/25 motion-reduce:animate-none" />
          <span className="relative h-2.5 w-2.5 rounded-full border-2 border-card bg-success shadow-sm" />
        </span>
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-64 p-2.5" align="end" sideOffset={6} onClick={(event) => event.stopPropagation()}>
      <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-success/10 text-success">
          <Radio className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">Ved denne aftale nu</p>
          <p className="text-[11px] text-muted-foreground">Live-position fra aktiv rutekørsel</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {positions.map((position) => {
          const employee = employees.find((item) => item.id === position.employee_id);
          const name = employee?.name || "Medarbejder";
          let arrivalLabel = "Netop registreret";
          try {
            const firstSeen = firstSeenAtStop.get(`${stopId}:${position.employee_id}`) || position.recorded_at;
            arrivalLabel = `Ankom cirka kl. ${format(parseISO(firstSeen), "HH.mm", { locale: da })}`;
          } catch {
            // Behold en robust fallback hvis en ældre position mangler gyldigt tidspunkt.
          }
          return (
            <div key={position.employee_id} className="flex items-center gap-2 rounded-md bg-secondary/45 px-2 py-1.5">
              {employee?.avatar_url ? (
                <img src={employee.avatar_url} alt={name} className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1 ring-border"
                  style={{ background: employee?.color || "hsl(var(--muted))", color: readableTokenOn(employee?.color) }}
                >
                  {name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{name}</p>
                <p className="text-[11px] text-muted-foreground">{arrivalLabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </PopoverContent>
  </Popover>
);

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
        <Button variant="ghost"
          type="button"
          className={cn(
            "flex h-11 w-11 p-0 rounded-md lg:h-8 lg:w-8",
            ICON_BTN_ACCENT,
            selectedIds.length > 0 && "text-accent",
          )}
          aria-label="Tildel medarbejdere"
          title="Tildel/fjern medarbejdere"
          onClick={(e) => e.stopPropagation()}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm p-3 sm:w-72" align="end" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1 font-semibold">
          Tildel medarbejdere
        </p>
        {employees.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2 py-3 text-center">
            Ingen aktive medarbejdere.
          </p>
        ) : (
          <div className="space-y-1 max-h-[50dvh] overflow-y-auto overscroll-contain">
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
                  <Button variant="ghost"
                    type="button"
                    onClick={() => toggle(e.id)}
                    aria-pressed={selected}
                    className="h-11 p-0 justify-start flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded border flex items-center justify-center shrink-0",
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
                        className="h-5 w-5 rounded-full inline-flex items-center justify-center text-[11px] font-bold"
                        style={{ background: e.color || "hsl(220 13% 46%)", color: readableTokenOn(e.color) }}
                      >
                        {e.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-xs flex-1">{e.name}</span>
                  </Button>
                  {selected && (
                    <Button variant="ghost"
                      type="button"
                      onClick={() => setLead(e.id)}
                      className={cn(
                        "shrink-0 h-11 w-11 p-0 inline-flex items-center justify-center rounded transition-colors",
                        isLead
                          ? "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10"
                          : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-300 dark:hover:bg-amber-500/10",
                      )}
                      title={isLead ? "Lead-medarbejder" : "Sæt som lead"}
                      aria-label="Sæt som lead"
                    >
                      <Crown className="h-3.5 w-3.5" fill={isLead ? "currentColor" : "none"} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {selectedIds.length > 1 && (
          <p className="text-[11px] text-muted-foreground mt-2 px-1 italic">
            Provision deles ligeligt ({Math.round(100 / selectedIds.length)}% pr. medarbejder).
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};
