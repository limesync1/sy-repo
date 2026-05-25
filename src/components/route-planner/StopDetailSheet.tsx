import { useMemo, useState, useEffect, useRef } from "react";
import { useOrderForStop, useUpdateStop, useDeleteStop, useSetStopAssignees, useStopTimeEntries, type RouteStop } from "@/hooks/useRoutes";
import { useEmployees } from "@/hooks/useEmployees";
import { useMyBusiness } from "@/hooks/useDatabase";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MapPin, Phone, Mail, Clock, Trash2, Check, Loader2,
  AlertCircle, Banknote, FileText, Repeat, PauseCircle,
  Timer, Hourglass, User, Package, CalendarClock, Users, Crown, X as XIcon,
  TimerReset, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO, addDays, addWeeks, addMonths, addYears } from "date-fns";
import { da } from "date-fns/locale";
import { INTERVAL_LABELS } from "@/types/service";
import { intervalToCadence } from "@/lib/interval";
import { Section, SheetFooterBar } from "./SheetSection";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { useDayConflicts } from "@/hooks/useDayConflicts";
import { AlertTriangle } from "lucide-react";

type Props = {
  stop: RouteStop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeColor?: string;
  sequenceLabel?: number;
  /** Når true vises kun read-only view (bruges når man åbner en aftale fra aftalepoolen). */
  readOnly?: boolean;
  /** Effektiv dato for det viste stop — bruges til at beregne korrekt "Næste besøg" også for projicerede ruter. */
  effectiveDate?: string | null;
};

export const StopDetailSheet = ({ stop, open, onOpenChange, routeColor, sequenceLabel, readOnly, effectiveDate }: Props) => {
  const isCompact = useIsBelowBreakpoint(1024);
  const { data: order, isLoading } = useOrderForStop(stop?.order_id);
  const updateStop = useUpdateStop();
  const deleteStop = useDeleteStop();
  const setAssignees = useSetStopAssignees();
  const { data: myBusiness } = useMyBusiness();
  const { data: allEmployees = [] } = useEmployees(myBusiness?.id);
  const { data: timeEntries = [] } = useStopTimeEntries(stop?.id ? [stop.id] : []);
  const activeEmployees = useMemo(
    () => (allEmployees as any[]).filter((e) => e.is_active),
    [allEmployees],
  );

  // Konfliktdetektion: tjek om de valgte medarbejdere allerede har andre
  // stops på samme dato. Vises som diskret advarsel ved siden af pickeren
  // — afgør ikke gemning, kun information.
  const stopDate = effectiveDate || (stop as any)?.route_date || null;
  const { conflicts: dayConflicts } = useDayConflicts(myBusiness?.id, stopDate || undefined);
  const assigneeConflicts = useMemo<string[]>(() => {
    if (!assigneeIds.length || !dayConflicts?.length) return [];
    const msgs: string[] = [];
    for (const c of dayConflicts) {
      if (!assigneeIds.includes(c.employee_id)) continue;
      const others = c.stops.filter((s) => s.id !== stop?.id);
      if (others.length === 0) continue;
      const emp = activeEmployees.find((e: any) => e.id === c.employee_id);
      const empName = emp?.name || "Medarbejderen";
      const labels = others.slice(0, 2).map((s) => s.label || "aftale").join(", ");
      msgs.push(`${empName} har allerede ${others.length} aftale${others.length === 1 ? "" : "r"} (${labels})${c.overlapsTime ? " — tidsoverlap" : ""}.`);
    }
    return msgs;
  }, [assigneeIds, dayConflicts, activeEmployees, stop?.id]);

  const [durationHours, setDurationHours] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  // Autosave: track om der aktivt gemmes, og om alt er gemt for at vise diskret status.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const initializedForStopId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!stop) return;
    const totalMin = stop.duration_minutes || 30;
    setDurationHours(Math.floor(totalMin / 60));
    setDurationMinutes(totalMin % 60);
    const s = stop.time_window_start?.slice(0, 5) || "";
    const e = stop.time_window_end?.slice(0, 5) || "";
    setTimeSlot(s && e ? `${s}-${e}` : "");
    setNotes(stop.notes || "");
    setAssigneeIds(stop.assignee_ids ?? (stop.assigned_employee_id ? [stop.assigned_employee_id] : []));
    setLeadId(stop.lead_employee_id ?? stop.assigned_employee_id ?? null);
    // Markér at vi netop har hydreret state fra dette stop — næste effekt-run
    // skal IKKE udløse autosave (det ville gemme ufærdige værdier).
    initializedForStopId.current = stop.id;
    setSaveState("idle");
  }, [stop?.id]);

  const items = useMemo(() => (order as any)?.order_items || [], [order]);
  const totalAmount = Number((order as any)?.total_amount || 0);
  const subscriptions: any[] = (order as any)?.subscriptions || [];
  const business = (order as any)?.businesses;

  // Autosave: debounce ændringer i varighed/tidsvindue/note/tildelte
  // medarbejdere og skriv dem til DB efter 700 ms uden ny aktivitet.
  useEffect(() => {
    if (!stop || readOnly) return;
    // Spring første run efter hydrering over — vi vil ikke gemme det vi
    // lige har læst fra serveren.
    if (initializedForStopId.current === stop.id) {
      initializedForStopId.current = null;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const totalMin = Math.max(5, durationHours * 60 + durationMinutes);
        const [s, e] = timeSlot ? timeSlot.split("-") : [null, null];
        await updateStop.mutateAsync({
          id: stop.id,
          duration_minutes: totalMin,
          time_window_start: s || null,
          time_window_end: e || null,
          notes: notes || null,
        } as any);
        const currentIds = (stop.assignee_ids ?? []).slice().sort().join(",");
        const newIds = assigneeIds.slice().sort().join(",");
        const currentLead = stop.lead_employee_id ?? null;
        if (currentIds !== newIds || currentLead !== leadId) {
          await setAssignees.mutateAsync({
            stop_id: stop.id,
            employee_ids: assigneeIds,
            lead_id: leadId,
          });
        }
        setSaveState("saved");
      } catch (err: any) {
        setSaveState("idle");
        toast.error(err?.message || "Kunne ikke gemme automatisk");
      }
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationHours, durationMinutes, timeSlot, notes, assigneeIds, leadId]);

  if (!stop) return null;

  const handleDeleteConfirmed = () => {
    deleteStop.mutate(stop.id, {
      onSuccess: () => toast.success("Stop fjernet fra ruten"),
    });
    setConfirmDelete(false);
    onOpenChange(false);
  };

  const statusBadge = () => {
    switch (stop.status) {
      case "completed": return <span><Badge className="bg-green-600">Færdig</Badge></span>;
      case "in_progress": return <span><Badge className="bg-blue-600">I gang</Badge></span>;
      case "skipped": return <span><Badge variant="outline" className="text-orange-600 border-orange-300">Sprunget over</Badge></span>;
      default: return <span><Badge variant="secondary">Afventer</Badge></span>;
    }
  };

  const customerEmail = (order as any)?.customer_email;
  const orderNotes = (order as any)?.notes as string | null;
  const hasCoords = stop.latitude != null && stop.longitude != null;

  // Saml fuld adresse — stop.address indeholder ofte kun gaden,
  // så vi tilføjer postnr/by fra ordren hvis det mangler.
  const orderZip = (order as any)?.zip_code as string | null;
  const orderCity = (order as any)?.city as string | null;
  const orderAddress = (order as any)?.address as string | null;
  const fullAddress = (() => {
    const street = stop.address || orderAddress || "";
    const cityLine = [orderZip, orderCity].filter(Boolean).join(" ");
    if (!street && !cityLine) return null;
    if (street && cityLine && !street.includes(cityLine)) return `${street}, ${cityLine}`;
    return street || cityLine;
  })();

  // Detect any active subscription (recurring) and any paused state
  const activeSub = subscriptions.find((s) => s.status === "active");
  const pausedSub = subscriptions.find((s) => s.status === "paused");
  const recurringInterval = activeSub?.interval || pausedSub?.interval || (
    items.find((i: any) => i.details?.interval && i.details.interval !== "engangskøb")?.details?.interval
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isCompact ? "bottom" : "right"}
          className={cn(
            "w-full p-0 flex flex-col",
            isCompact ? "h-[88vh] max-h-[88vh] rounded-t-xl" : "sm:max-w-2xl",
          )}
        >
          {/* Header — samme look som "Se detaljer" på kunder-siden:
              kompakt titel, lille beskrivelse og en række diskrete status-pills. */}
          <SheetHeader className="border-b border-border p-4 pr-14 shrink-0 space-y-0 text-left">
            <SheetTitle className="text-left">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-foreground truncate flex items-center gap-2 sm:text-lg">
                    {routeColor && (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: routeColor }}
                        aria-hidden
                      />
                    )}
                    {stop.customer_name || "Stop"}
                  </h3>
                  <SheetDescription className="text-xs text-muted-foreground font-normal mt-0.5">
                    {typeof sequenceLabel === "number" ? <>Stop #{sequenceLabel} · </> : null}
                    {business?.name ? <>Bestilling hos <strong className="font-semibold">{business.name}</strong></> : "Detaljer for dette stop"}
                  </SheetDescription>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {statusBadge()}
                    {pausedSub && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1 text-[10px]">
                        <PauseCircle className="h-2.5 w-2.5" />Abonnement på pause
                      </Badge>
                    )}
                    {recurringInterval && recurringInterval !== "engangskøb" && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Repeat className="h-2.5 w-2.5" />
                        {INTERVAL_LABELS[recurringInterval] || recurringInterval}
                      </Badge>
                    )}
                    {(stop as any).occurrence_date && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <CalendarClock className="h-2.5 w-2.5" />
                        Forekomst {format(parseISO((stop as any).occurrence_date), "d. MMM yyyy", { locale: da })}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Completion banner — when the stop is already done, show
                  who completed it and when, so the owner has a quick recap. */}
              {stop.status === "completed" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                        Aftalen er udført
                      </p>
                      {stop.completed_at && (
                        <p className="text-[12px] text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
                          Færdiggjort {format(parseISO(stop.completed_at), "d. MMM yyyy 'kl.' HH:mm", { locale: da })}
                        </p>
                      )}
                      {(() => {
                        const ids = stop.assignee_ids ?? (stop.assigned_employee_id ? [stop.assigned_employee_id] : []);
                        if (!ids.length) return null;
                        const names = ids
                          .map((id) => (activeEmployees as any[]).find((e) => e.id === id)?.name)
                          .filter(Boolean);
                        if (!names.length) return null;
                        return (
                          <p className="text-[12px] text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
                            Udført af {names.join(", ")}
                          </p>
                        );
                      })()}
                      {(() => {
                        const completed = (timeEntries || []).filter((e: any) => e.duration_minutes != null && e.duration_minutes > 0);
                        if (!completed.length) return null;
                        const teamMin = Math.max(...completed.map((e: any) => e.duration_minutes));
                        return (
                          <p className="text-[12px] text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
                            Faktisk tid brugt: <span className="font-semibold">{fmtMinutes(teamMin)}</span>
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Medarbejdere på aftalen (pr-stop tildeling) — vises øverst for hurtig tildeling */}
              {!readOnly && (
                <Section
                  icon={<Users className="h-3.5 w-3.5" />}
                  title="Medarbejdere"
                  hint={
                    assigneeIds.length === 0
                      ? "Ingen tildelt"
                      : assigneeIds.length === 1
                        ? "1 medarbejder"
                        : `${assigneeIds.length} medarbejdere · ligedeling ${Math.round(100 / assigneeIds.length)}%`
                  }
                >
                  <AssigneePicker
                    employees={activeEmployees}
                    assigneeIds={assigneeIds}
                    leadId={leadId}
                    onChange={(ids, lead) => {
                      setAssigneeIds(ids);
                      setLeadId(lead);
                    }}
                  />
                  {assigneeConflicts.length > 0 && (
                    <div className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-200 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Mulige konflikter
                      </div>
                      <ul className="space-y-0.5 text-amber-900/90 dark:text-amber-200/90">
                        {assigneeConflicts.map((w, i) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  )}
                </Section>
              )}

              {/* Customer */}
              <Section icon={<User className="h-3.5 w-3.5" />} title="Kunde">
                <div className="space-y-1.5 text-sm">
                  {fullAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span>{fullAddress}</span>
                    </div>
                  )}
                  {stop.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${stop.customer_phone}`} className="hover:underline">{stop.customer_phone}</a>
                    </div>
                  )}
                  {customerEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${customerEmail}`} className="hover:underline truncate">{customerEmail}</a>
                    </div>
                  )}
                </div>
              </Section>

              {/* Order items */}
              {items.length > 0 && (
                <Section
                  icon={<Package className="h-3.5 w-3.5" />}
                  title="Bestilte services"
                  hint={`${items.length} ${items.length === 1 ? "service" : "services"}`}
                >
                    <div className="rounded-lg border divide-y">
                      {items.map((item: any, i: number) => {
                        const d = item.details || {};
                        // Backend gemmer både 'stepDetails' (cart) og 'steps' (gamle/seedede ordrer)
                        const stepDetails: any[] = Array.isArray(d.stepDetails)
                          ? d.stepDetails
                          : Array.isArray(d.steps)
                            ? d.steps
                            : [];
                        const hours: number | null = typeof d.hours === "number" ? d.hours : null;
                        const customNote: string | null = typeof d.note === "string" && d.note.trim() ? d.note : null;
                        const itemInterval = d.interval && d.interval !== "engangskøb" ? d.interval : null;
                        const itemDescription = typeof d.description === "string" ? d.description : null;
                        const svc = item.services || {};
                        const serviceDescription = svc.description || null;
                        const category = [svc.service_category, svc.subcategory].filter(Boolean).join(" · ");
                        const effectiveInterval = itemInterval || recurringInterval || null;
                        return (
                          <div key={i} className="px-3 py-2.5">
                            <div className="flex items-start gap-3">
                              {svc.image_url && (
                                <img
                                  src={svc.image_url}
                                  alt={item.service_name}
                                  className="h-12 w-12 rounded-md object-cover border shrink-0"
                                  loading="lazy"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{item.service_name}</p>
                                    {category && (
                                      <p className="text-[11px] text-muted-foreground mt-0.5">{category}</p>
                                    )}
                                  </div>
                                  <span className="text-sm font-semibold shrink-0">{Math.round(Number(item.total_price))} kr</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {effectiveInterval && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1">
                                      <Repeat className="h-2.5 w-2.5" />
                                      {INTERVAL_LABELS[effectiveInterval] || effectiveInterval}
                                    </Badge>
                                  )}
                                  {hours !== null ? (
                                    <span className="text-[11px] text-muted-foreground">
                                      {hours} {hours === 1 ? "time" : "timer"} × {Math.round(Number(item.unit_price))} kr
                                    </span>
                                  ) : item.quantity > 1 && (
                                    <span className="text-[11px] text-muted-foreground">{item.quantity} × {Math.round(Number(item.unit_price))} kr</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Service description from catalog */}
                            {serviceDescription && (
                              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{serviceDescription}</p>
                            )}

                            {/* Calculator step breakdown */}
                            {stepDetails.length > 0 && (
                              <div className="mt-2 rounded-md bg-secondary/40 divide-y divide-border/50">
                                {stepDetails.map((sd: any, si: number) => (
                                  <div key={si} className="flex justify-between px-2.5 py-1 text-[11px]">
                                    <span className="text-muted-foreground">
                                      {sd.label}: <span className="text-foreground/80">{sd.value}{sd.unit ? ` ${sd.unit}` : ""}</span>
                                    </span>
                                    {typeof sd.subtotal === "number" ? (
                                      <span className="font-medium text-foreground">{sd.subtotal} kr</span>
                                    ) : typeof sd.price_per_unit === "number" && typeof sd.value === "number" ? (
                                      <span className="font-medium text-foreground">
                                        {Math.round(sd.value * sd.price_per_unit)} kr
                                      </span>
                                    ) : (
                                      <span />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Hourly breakdown when no calc steps */}
                            {stepDetails.length === 0 && hours !== null && (
                              <div className="mt-2 rounded-md bg-secondary/40 px-2.5 py-1 text-[11px] flex justify-between">
                                <span className="text-muted-foreground">
                                  Timer: <span className="text-foreground/80">{hours} {hours === 1 ? "time" : "timer"}</span>
                                </span>
                                <span className="font-medium text-foreground">{Math.round(Number(item.total_price))} kr</span>
                              </div>
                            )}

                            {/* Customer note on this specific line */}
                            {customNote && (
                              <p className="text-[11px] mt-2 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-amber-900">
                                <span className="font-semibold">Note:</span> {customNote}
                              </p>
                            )}

                            {/* Free-text description from cart line */}
                            {itemDescription && stepDetails.length === 0 && (
                              <p className="text-[11px] text-muted-foreground mt-1.5 italic">{itemDescription}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5" />Total
                      </span>
                      <span className="text-base font-bold">{Math.round(totalAmount)} kr</span>
                    </div>
                </Section>
              )}

              {/* Subscription details (if recurring) */}
              {(activeSub || pausedSub) && (
                <Section
                  icon={<Repeat className="h-3.5 w-3.5" />}
                  title="Abonnement"
                  hint={pausedSub ? "På pause" : "Aktiv"}
                >
                    <dl className={cn(
                      "grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm",
                      pausedSub && "text-amber-900 dark:text-amber-100",
                    )}>
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground self-center">Status</dt>
                      <dd className="text-right font-medium">{pausedSub ? "På pause" : "Aktiv"}</dd>
                      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground self-center">Interval</dt>
                      <dd className="text-right font-medium">
                        {INTERVAL_LABELS[(activeSub || pausedSub)!.interval] || (activeSub || pausedSub)!.interval}
                      </dd>
                      {(activeSub || pausedSub)!.next_service_date && (
                        <>
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground self-center">Næste besøg</dt>
                          <dd className="text-right font-medium">
                            {(() => {
                              const sub = (activeSub || pausedSub)!;
                              const cadence = intervalToCadence(sub.interval);
                              const baseStr = effectiveDate
                                || (stop as any)?.occurrence_date
                                || sub.next_service_date;
                              try {
                                if (cadence && baseStr) {
                                  const base = parseISO(String(baseStr).slice(0, 10));
                                  const next =
                                    cadence.unit === "day"   ? addDays(base, cadence.n) :
                                    cadence.unit === "week"  ? addWeeks(base, cadence.n) :
                                    cadence.unit === "month" ? addMonths(base, cadence.n) :
                                                               addYears(base, cadence.n);
                                  return format(next, "d. MMM yyyy", { locale: da });
                                }
                                return format(parseISO(sub.next_service_date), "d. MMM yyyy", { locale: da });
                              } catch {
                                return sub.next_service_date;
                              }
                            })()}
                          </dd>
                        </>
                      )}
                      {(activeSub || pausedSub)!.service_name && (
                        <>
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground self-center">Service</dt>
                          <dd className="text-right font-medium truncate">
                            {(activeSub || pausedSub)!.service_name}
                          </dd>
                        </>
                      )}
                      {Number((activeSub || pausedSub)!.total_price) > 0 && (
                        <>
                          <dt className="text-[11px] uppercase tracking-wider text-muted-foreground self-center">Pris pr. besøg</dt>
                          <dd className="text-right font-medium tabular-nums">
                            {Math.round(Number((activeSub || pausedSub)!.total_price))} kr
                          </dd>
                        </>
                      )}
                    </dl>
                </Section>
              )}

              {/* Customer's notes from order */}
              {orderNotes && (
                <Section icon={<FileText className="h-3.5 w-3.5" />} title="Note fra kunden">
                  <p className="text-sm bg-secondary/40 rounded-md px-3 py-2 whitespace-pre-wrap">
                    {orderNotes}
                  </p>
                </Section>
              )}

              {/* Planning */}
              {!readOnly && (
                <TimeSpentSection
                  entries={timeEntries}
                  employees={activeEmployees}
                />
              )}

              {/* Planning */}
              {!readOnly && (
                <Section
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                  title="Intern note"
                  hint="Synlig for medarbejderen"
                >
                  <PlanningSection
                    timeSlot={timeSlot}
                    setTimeSlot={setTimeSlot}
                    durationHours={durationHours}
                    setDurationHours={setDurationHours}
                    durationMinutes={durationMinutes}
                    setDurationMinutes={setDurationMinutes}
                    notes={notes}
                    setNotes={setNotes}
                    plannedArrival={stop.planned_arrival}
                    distanceToNextKm={stop.distance_to_next_km}
                  />
                </Section>
              )}

              {isLoading && <p className="text-xs text-muted-foreground italic">Indlæser ordredetaljer...</p>}
          </div>

          {/* Footer actions */}
          {!readOnly && (
            <SheetFooterBar className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
                {saveState === "saving" ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Gemmer ændringer…</span>
                  </>
                ) : saveState === "saved" ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span>Alle ændringer er gemt</span>
                  </>
                ) : (
                  <span className="italic">Ændringer gemmes automatisk</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md hover:bg-destructive/5"
                title="Fjern stop fra rute"
              >
                <Trash2 className="h-3 w-3" />
                Fjern fra rute
              </button>
            </SheetFooterBar>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern stop fra ruten?</AlertDialogTitle>
            <AlertDialogDescription>
              Stoppet for <strong>{stop.customer_name}</strong> bliver fjernet fra denne rute,
              og aftalen ryger tilbage til aftaler uden rute, så du kan planlægge den igen senere.
              Hvis det er rutens sidste stop, bliver ruten slettet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
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

/* ────────────────────────────────────────────
   PlanningSection — matcher RouteEditSheet/DatePickerField design:
   popover-knapper med ikon, label-mønster, kort hint-tekst.
   ──────────────────────────────────────────── */

const TIME_SLOTS: { value: string; short: string; label: string }[] = [
  { value: "06:00-08:00", short: "06–08", label: "Tidlig morgen" },
  { value: "08:00-12:00", short: "08–12", label: "Formiddag" },
  { value: "12:00-16:00", short: "12–16", label: "Eftermiddag" },
  { value: "16:00-20:00", short: "16–20", label: "Aften" },
  { value: "08:00-16:00", short: "08–16", label: "Hele dagen" },
];

const DURATION_PRESETS: { hours: number; minutes: number; label: string }[] = [
  { hours: 0, minutes: 15, label: "15 min" },
  { hours: 0, minutes: 30, label: "30 min" },
  { hours: 0, minutes: 45, label: "45 min" },
  { hours: 1, minutes: 0, label: "1 time" },
  { hours: 1, minutes: 30, label: "1½ time" },
  { hours: 2, minutes: 0, label: "2 timer" },
  { hours: 3, minutes: 0, label: "3 timer" },
  { hours: 4, minutes: 0, label: "4 timer" },
];

/* ────────────────────────────────────────────
   TimeSpentSection — viser faktisk brugt tid pr. medarbejder
   på dette stop. Bruges af virksomhedsejeren.
   ──────────────────────────────────────────── */
const fmtMinutes = (mins: number | null | undefined) => {
  if (mins == null || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
};

const TimeSpentSection = ({
  entries, employees,
}: {
  entries: any[];
  employees: any[];
}) => {
  if (!entries || entries.length === 0) {
    return (
      <Section
        icon={<TimerReset className="h-3.5 w-3.5" />}
        title="Faktisk tid brugt"
        tone="muted"
        hint="Endnu ingen registrering"
      >
        <p className="text-xs text-muted-foreground italic">
          Når medarbejdere har checket ind/ud på dette stop vises deres tider her.
          Hver medarbejder lærer sit eget tempo — næste aftale hos samme kunde får et personligt estimat.
        </p>
      </Section>
    );
  }

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const completed = entries.filter((e) => e.duration_minutes != null && e.duration_minutes > 0);
  const inProgress = entries.filter((e) => e.duration_minutes == null);
  const teamMin = completed.length > 0 ? Math.max(...completed.map((e) => e.duration_minutes)) : null;

  return (
    <Section
      icon={<TimerReset className="h-3.5 w-3.5" />}
      title="Faktisk tid brugt"
      tone="emerald"
      hint={teamMin != null ? `Team: ${fmtMinutes(teamMin)}` : `${inProgress.length} i gang`}
    >
      <div className="rounded-lg border divide-y bg-background">
        {entries.map((e) => {
          const emp = empMap.get(e.employee_id);
          const inProg = e.duration_minutes == null;
          return (
            <div key={e.id} className="flex items-center gap-2.5 px-3 py-2">
              {emp?.avatar_url ? (
                <img
                  src={emp.avatar_url}
                  alt={emp.name}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-border"
                 loading="lazy" decoding="async"/>
              ) : (
                <span
                  className="h-7 w-7 rounded-full ring-1 ring-border inline-flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{ background: emp?.color || "hsl(var(--muted))" }}
                >
                  {(emp?.name || "?").trim().split(/\s+/).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{emp?.name || "Ukendt medarbejder"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(parseISO(e.started_at), "HH:mm", { locale: da })}
                  {e.ended_at ? ` – ${format(parseISO(e.ended_at), "HH:mm", { locale: da })}` : " · i gang"}
                  {e.is_team_fallback && " · team-fallback"}
                </p>
              </div>
              <span className={cn("text-sm font-semibold tabular-nums", inProg ? "text-blue-600" : "text-foreground")}>
                {inProg ? "—" : fmtMinutes(e.duration_minutes)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Hver medarbejder lærer sit eget tempo — næste gang denne kunde booker servicen, får dén tildelte medarbejder
        et personligt estimat baseret på sin egen historik.
      </p>
    </Section>
  );
};

type PlanningProps = {
  timeSlot: string;
  setTimeSlot: (v: string) => void;
  durationHours: number;
  setDurationHours: (n: number) => void;
  durationMinutes: number;
  setDurationMinutes: (n: number) => void;
  notes: string;
  setNotes: (v: string) => void;
  plannedArrival: string | null | undefined;
  distanceToNextKm: number | null | undefined;
};

const PlanningSection = ({
  timeSlot, setTimeSlot,
  durationHours, setDurationHours,
  durationMinutes, setDurationMinutes,
  notes, setNotes,
  plannedArrival, distanceToNextKm,
}: PlanningProps) => {
  const [slotOpen, setSlotOpen] = useState(false);
  const [durOpen, setDurOpen] = useState(false);

  const selectedSlot = TIME_SLOTS.find((s) => s.value === timeSlot);
  const totalMin = durationHours * 60 + durationMinutes;
  const durationLabel = totalMin === 0
    ? "Vælg varighed"
    : durationHours === 0
      ? `${durationMinutes} min`
      : durationMinutes === 0
        ? `${durationHours} ${durationHours === 1 ? "time" : "timer"}`
        : `${durationHours} t ${durationMinutes} min`;

  return (
    <div className="space-y-4">
        {/* Note */}
        <div className="space-y-2">
          <Label>Intern note</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Fx 'Brug bagindgangen', 'Hund i haven'..."
            className="resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            Synlig for medarbejderen i medarbejder-appen.
          </p>
        </div>
    </div>
  );
};

/* ────────────────────────────────────────────
   AssigneePicker — vælg én eller flere medarbejdere på aftalen.
   • Klik på chip = tilføj/fjern.
   • Crown-ikon = sæt som lead (primær).
   • Provision fordeles automatisk ligeligt ved completion (50/50, 33/33/33...).
   ──────────────────────────────────────────── */

type EmployeeOption = {
  id: string;
  name: string;
  color?: string | null;
  avatar_url?: string | null;
};

const AssigneePicker = ({
  employees,
  assigneeIds,
  leadId,
  onChange,
}: {
  employees: EmployeeOption[];
  assigneeIds: string[];
  leadId: string | null;
  onChange: (ids: string[], lead: string | null) => void;
}) => {
  const toggle = (id: string) => {
    if (assigneeIds.includes(id)) {
      const next = assigneeIds.filter((x) => x !== id);
      const nextLead = leadId === id ? (next[0] ?? null) : leadId;
      onChange(next, nextLead);
    } else {
      const next = [...assigneeIds, id];
      const nextLead = leadId ?? next[0];
      onChange(next, nextLead);
    }
  };

  const setAsLead = (id: string) => {
    if (!assigneeIds.includes(id)) return;
    onChange(assigneeIds, id);
  };

  if (employees.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Ingen aktive medarbejdere. Opret medarbejdere under Admin → Medarbejdere.
      </p>
    );
  }

  const sharePct = assigneeIds.length > 0 ? Math.round(100 / assigneeIds.length) : 0;

  return (
    <div className="space-y-2.5">
      {/* Valgte medarbejdere som chips med lead-toggle */}
      {assigneeIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {assigneeIds.map((id) => {
            const emp = employees.find((e) => e.id === id);
            if (!emp) return null;
            const isLead = id === leadId;
            const initials = (emp.name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
            return (
              <div
                key={id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border bg-card pl-0.5 pr-1 py-0.5 text-xs",
                  isLead && "border-foreground/50 ring-1 ring-foreground/10",
                )}
              >
                {emp.avatar_url ? (
                  <img
                    src={emp.avatar_url}
                    alt={emp.name}
                    className="h-6 w-6 rounded-full object-cover shrink-0 ring-1 ring-border"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span
                    className="h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white shrink-0 ring-1 ring-border"
                    style={{ background: emp.color || "hsl(220 13% 46%)" }}
                  >
                    {initials || "?"}
                  </span>
                )}
                <span className="font-medium truncate max-w-[120px]">{emp.name}</span>
                <button
                  type="button"
                  onClick={() => setAsLead(id)}
                  className={cn(
                    "h-5 w-5 inline-flex items-center justify-center rounded transition-colors",
                    isLead
                      ? "text-amber-500"
                      : "text-muted-foreground/40 hover:text-amber-500 hover:bg-secondary",
                  )}
                  title={isLead ? "Lead (primær)" : "Sæt som lead"}
                  aria-label={isLead ? "Lead" : "Sæt som lead"}
                >
                  <Crown className="h-3 w-3" fill={isLead ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Fjern ${emp.name}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tilføj-knapper for medarbejdere der ikke er valgt */}
      <div className="flex flex-wrap gap-1.5">
        {employees
          .filter((e) => !assigneeIds.includes(e.id))
          .map((emp) => {
            const initials = (emp.name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => toggle(emp.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed bg-background pl-0.5 pr-2 py-0.5 text-xs hover:border-foreground/40 hover:bg-accent/5 transition-colors"
              >
                {emp.avatar_url ? (
                  <img
                    src={emp.avatar_url}
                    alt={emp.name}
                    className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span
                    className="h-6 w-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-border"
                    style={{ background: emp.color || "hsl(220 13% 46%)" }}
                  >
                    {initials || "?"}
                  </span>
                )}
                <span className="font-medium">+ {emp.name}</span>
              </button>
            );
          })}
      </div>

      {/* Info om provisionsdeling */}
      {assigneeIds.length > 1 && (
        <p className="text-[11px] text-muted-foreground bg-secondary/40 rounded-md px-2.5 py-1.5">
          Provision fordeles ligeligt: <strong className="text-foreground">{sharePct}%</strong> til hver
          medarbejder ved færdigmelding.
        </p>
      )}
      {assigneeIds.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">
          Ingen medarbejdere tildelt — aftalen vil ikke vises i nogen medarbejder-app.
        </p>
      )}
    </div>
  );
};
