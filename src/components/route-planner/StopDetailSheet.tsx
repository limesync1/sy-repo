import { useMemo, useState, useEffect } from "react";
import { useOrderForStop, useUpdateStop, useDeleteStop, useSetStopAssignees, useStopTimeEntries, type RouteStop } from "@/hooks/useRoutes";
import { useEmployees } from "@/hooks/useEmployees";
import { useMyBusiness } from "@/hooks/useDatabase";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
  MapPin, Phone, Mail, Clock, Trash2, Save,
  AlertCircle, Banknote, FileText, Repeat, PauseCircle,
  Timer, Hourglass, User, Package, CalendarClock, Users, Crown, X as XIcon,
  TimerReset,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { INTERVAL_LABELS } from "@/types/service";
import { Section, SheetFooterBar } from "./SheetSection";

type Props = {
  stop: RouteStop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeColor?: string;
  sequenceLabel?: number;
  /** Når true vises kun read-only view (bruges når man åbner en aftale fra aftalepoolen). */
  readOnly?: boolean;
};

export const StopDetailSheet = ({ stop, open, onOpenChange, routeColor, sequenceLabel, readOnly }: Props) => {
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

  const [durationHours, setDurationHours] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);

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
  }, [stop?.id]);

  const items = useMemo(() => (order as any)?.order_items || [], [order]);
  const totalAmount = Number((order as any)?.total_amount || 0);
  const subscriptions: any[] = (order as any)?.subscriptions || [];
  const business = (order as any)?.businesses;

  if (!stop) return null;

  const handleSave = async () => {
    const totalMin = Math.max(5, durationHours * 60 + durationMinutes);
    const [s, e] = timeSlot ? timeSlot.split("-") : [null, null];
    await updateStop.mutateAsync({
      id: stop.id,
      duration_minutes: totalMin,
      time_window_start: s || null,
      time_window_end: e || null,
      notes: notes || null,
    } as any);
    // Sync assignees hvis ændret
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
    toast.success("Ændringer gemt");
  };

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
        <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col">
          {/* Header — samme look som "Se detaljer" på kunder-siden:
              kompakt titel, lille beskrivelse og en række diskrete status-pills. */}
          <SheetHeader className="border-b border-border p-5 shrink-0 space-y-0">
            <SheetTitle className="text-left">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-foreground truncate flex items-center gap-2">
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
                    {!hasCoords && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1 text-[10px]">
                        <AlertCircle className="h-2.5 w-2.5" />Mangler GPS
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
                  title="Bestilte ydelser"
                  hint={`${items.length} ${items.length === 1 ? "ydelse" : "ydelser"}`}
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
                    <div className={`rounded-lg border px-3 py-2 text-sm space-y-1 ${pausedSub ? "bg-orange-50 border-orange-200" : "bg-secondary/40"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium">{pausedSub ? "På pause" : "Aktiv"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Interval</span>
                        <span className="font-medium">
                          {INTERVAL_LABELS[(activeSub || pausedSub)!.interval] || (activeSub || pausedSub)!.interval}
                        </span>
                      </div>
                      {(activeSub || pausedSub)!.next_service_date && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Næste besøg</span>
                          <span className="font-medium">
                            {format(parseISO((activeSub || pausedSub)!.next_service_date), "d. MMM yyyy", { locale: da })}
                          </span>
                        </div>
                      )}
                      {(activeSub || pausedSub)!.service_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Ydelse</span>
                          <span className="font-medium truncate ml-2">
                            {(activeSub || pausedSub)!.service_name}
                          </span>
                        </div>
                      )}
                      {Number((activeSub || pausedSub)!.total_price) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Pris pr. besøg</span>
                          <span className="font-medium tabular-nums">
                            {Math.round(Number((activeSub || pausedSub)!.total_price))} kr
                          </span>
                        </div>
                      )}
                    </div>
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
                  title="Planlægning"
                  hint="Tidsrum, varighed & note"
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
          <SheetFooterBar>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />Fjern
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={updateStop.isPending}
              >
                <Save className="h-4 w-4 mr-1.5" />
                Gem
              </Button>
            </div>
          </SheetFooterBar>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern stop fra ruten?</AlertDialogTitle>
            <AlertDialogDescription>
              Stoppet for <strong>{stop.customer_name}</strong> bliver fjernet fra denne rute og ryger
              tilbage i aftalepoolen, så du kan planlægge det igen senere.
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
        {/* Tidsrum */}
        <div className="space-y-2">
          <Label>Tidsrum</Label>
          <Popover open={slotOpen} onOpenChange={setSlotOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 bg-background",
                  "hover:bg-accent/10 hover:text-foreground hover:border-accent/40",
                  !selectedSlot && "text-muted-foreground",
                )}
              >
                <Clock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                {selectedSlot ? (
                  <span>
                    <span className="font-medium tabular-nums">{selectedSlot.short}</span>
                    <span className="text-muted-foreground ml-2">· {selectedSlot.label}</span>
                  </span>
                ) : (
                  <span>Vælg tidsrum</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-2" align="start">
              <div className="space-y-1">
                {TIME_SLOTS.map((s) => {
                  const active = s.value === timeSlot;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => { setTimeSlot(s.value); setSlotOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors",
                        active
                          ? "bg-accent/15 text-foreground"
                          : "hover:bg-accent/10",
                      )}
                    >
                      <span className="font-semibold tabular-nums w-12 text-foreground">{s.short}</span>
                      <span className="text-muted-foreground flex-1">{s.label}</span>
                    </button>
                  );
                })}
                {timeSlot && (
                  <>
                    <div className="border-t my-1" />
                    <button
                      type="button"
                      onClick={() => { setTimeSlot(""); setSlotOpen(false); }}
                      className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/10"
                    >
                      Ryd tidsrum
                    </button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
          <p className="text-[11px] text-muted-foreground">
            Hvornår på dagen besøget skal udføres.
          </p>
        </div>

        {/* Varighed */}
        <div className="space-y-2">
          <Label>Estimeret varighed</Label>
          <Popover open={durOpen} onOpenChange={setDurOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 bg-background",
                  "hover:bg-accent/10 hover:text-foreground hover:border-accent/40",
                  totalMin === 0 && "text-muted-foreground",
                )}
              >
                <Hourglass className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{durationLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3" align="start">
              {/* Presets */}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                Hurtigvalg
              </p>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {DURATION_PRESETS.map((p) => {
                  const active = p.hours === durationHours && p.minutes === durationMinutes;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setDurationHours(p.hours);
                        setDurationMinutes(p.minutes);
                      }}
                      className={cn(
                        "h-8 rounded-md text-xs font-medium border transition-colors",
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "bg-background hover:bg-accent/10 hover:border-accent/40",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {/* Brugerdefineret */}
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                Brugerdefineret
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={durationHours}
                    onChange={(e) => setDurationHours(Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
                    className="h-9 text-center tabular-nums"
                    aria-label="Timer"
                  />
                  <p className="text-[10px] text-center text-muted-foreground mt-1">timer</p>
                </div>
                <span className="text-muted-foreground pb-5">:</span>
                <div className="flex-1">
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                    className="h-9 text-center tabular-nums"
                    aria-label="Minutter"
                  />
                  <p className="text-[10px] text-center text-muted-foreground mt-1">min</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <p className="text-[11px] text-muted-foreground">
            Bruges til at beregne ankomsttider for resten af ruten.
          </p>
        </div>

        {/* Planlagt ankomst (read-only info-strip) */}
        {plannedArrival && (
          <div className="rounded-md bg-secondary/50 border px-3 py-2 text-xs flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Planlagt ankomst:</span>
            <strong className="text-foreground tabular-nums">
              {format(parseISO(plannedArrival), "HH:mm")}
            </strong>
            {distanceToNextKm != null && distanceToNextKm > 0 && (
              <span className="ml-auto text-muted-foreground tabular-nums">
                → næste: {distanceToNextKm.toFixed(1)} km
              </span>
            )}
          </div>
        )}

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
            return (
              <div
                key={id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border bg-card pl-1.5 pr-0.5 py-0.5 text-xs",
                  isLead && "border-foreground/40",
                )}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: emp.color || "hsl(var(--muted-foreground))" }}
                />
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
          .map((emp) => (
            <button
              key={emp.id}
              type="button"
              onClick={() => toggle(emp.id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed bg-background px-2 py-1 text-xs hover:border-foreground/40 hover:bg-accent/5 transition-colors"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: emp.color || "hsl(var(--muted-foreground))" }}
              />
              <span className="font-medium">+ {emp.name}</span>
            </button>
          ))}
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
