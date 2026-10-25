// Medarbejderens handlinger på en aftale under rutekørsel:
// - Ret aftalen præcist (fast pris, timepris, prisberegner og interval) —
//   kun dette besøg eller også kommende besøg.
// - Opret en ny aftale hos kunden: lander i "Aftaler uden rute", eller som
//   ekstra stop på dagens rute når det er en engangsopgave i dag.
// - Send en note til kontoret.
// Prisen regnes altid endeligt på serveren. Optimeret til mobil/tablet.
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Minus, Pencil, Plus, Send, Trash2, MessageSquarePlus, CheckCircle2, CalendarPlus, AlertTriangle, ArrowLeft, Route as RouteIcon, Inbox } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toDanishError } from "@/lib/danish-errors";
import { askConfirm } from "@/components/ConfirmDialogHost";
import { formatPrice } from "@/lib/price-format";
import { INTERVAL_LABELS } from "@/types/service";
import {
  CompactPricingEditor, defaultPricing, estimateTotal, toPricingPayload,
  type PricedService, type PricingState,
} from "./CompactPricingEditor";
import { DatePickerField } from "@/components/route-planner/DatePickerField";
import { Field, Section, SheetFooterBar } from "@/components/route-planner/SheetSection";
import { AppointmentDetailsHeader } from "@/components/shared/AppointmentDetailsHeader";
import type { Order } from "@/hooks/useDatabase";

type Line = {
  key: string; item_id: string | null; service_id: string | null; name: string;
  quantity: number; unit?: string | null; pricing: PricingState | null; currentInterval?: string;
};

const QUICK_NOTES = ["Kunden var ikke hjemme", "Ekstra arbejde udført", "Adgang besværlig", "Kunden ønsker at blive ringet op"];

const errText = (e: unknown) => toDanishError(e, "Noget gik galt. Prøv igen om lidt.");
const OFFLINE = "Ingen internetforbindelse. Prøv igen, når du har dækning.";
const assertOnline = () => { if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error(OFFLINE); };
const draftKey = (stopId: string) => `employee-note-draft:${stopId}`;
const todayStr = () => format(new Date(), "yyyy-MM-dd");
const ivLabel = (iv?: string) => (!iv || iv === "engangskøb" ? "Engangsopgave" : INTERVAL_LABELS[iv] || iv);

/** Læser den eksisterende prisopsætning fra en ordrelinje. */
const pricingFromItem = (item: any): PricingState => {
  const d = item?.details || {};
  const qty = Number(item?.quantity) || 1;
  return {
    quantity: qty,
    unitPrice: Number(item?.unit_price) || 0,
    hours: qty,
    steps: Object.fromEntries(((d.stepDetails || []) as any[]).filter((s) => s.id).map((s) => [s.id, Number(s.value) || 0])),
    interval: d.interval || "engangskøb",
  };
};

/** Noter medarbejderen har sendt til kontoret om dette stop. */
export function useStopOfficeNotes(stopId: string) {
  return useQuery({
    queryKey: ["employee-stop-notes", stopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_appointment_notes")
        .select("id, body, kind, created_at")
        .eq("stop_id", stopId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Viser tidligere noter sendt til kontoret. Brugt af detaljervisningen, hvor
 * selve handlingerne ligger øverst i modalen og notat-historikken nederst.
 */
export function EmployeeStopNotesList({ stopId }: { stopId: string }) {
  const { data: notes = [], isError: notesError } = useStopOfficeNotes(stopId);
  if (notesError) {
    return <p className="text-[11px] text-muted-foreground">Tidligere noter kunne ikke hentes lige nu.</p>;
  }
  if (notes.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {notes.map((n: any) => (
        <li key={n.id} className="rounded-md border border-border bg-secondary/30 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" /> Sendt {format(new Date(n.created_at), "d. MMM HH:mm", { locale: da })}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{n.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function EmployeeStopActions({ stopId, order, completed, noteOnly = false, hideNoteAction = false, hideNotesList = false, routeDate = null, compact = false, editOnly = false, onEditClosed }: {
  stopId: string; order: Order | any; completed: boolean; noteOnly?: boolean; hideNoteAction?: boolean; hideNotesList?: boolean; routeDate?: string | null; compact?: boolean;
  /** Viser kun «Ret aftale»-vinduet og åbner det straks (bruges fra ruteplanlæggeren). */
  editOnly?: boolean; onEditClosed?: () => void;
}) {
  const qc = useQueryClient();
  const isCompact = useIsBelowBreakpoint(1024);
  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelAppointment = useMutation({
    mutationFn: async (creditMode: 'now' | 'office') => {
      assertOnline();
      const { data, error } = await supabase.functions.invoke('accounting-action', { body: { order_id: order.id, action: 'cancel_appointment', params: { stop_id: stopId, credit_mode: creditMode } } });
      if (error) { const detail = await error.context?.json?.().catch(() => null); throw new Error(detail?.error || error.message); }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => { setCancelOpen(false); toast.success('Aftalen er annulleret', { description: data?.note }); ['routes','orders','order-for-stop','employee-stop-notes','invoice-caps'].forEach(key => qc.invalidateQueries({ queryKey: [key] })); },
    onError: (error) => toast.error('Aftalen blev ikke annulleret', { description: errText(error) }),
  });
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [applyFuture, setApplyFuture] = useState(true);
  const [note, setNote] = useState(() => { try { return localStorage.getItem(draftKey(stopId)) || ""; } catch { return ""; } });
  const [initialLines, setInitialLines] = useState("");
  
  // Ny aftale
  const [newServiceId, setNewServiceId] = useState<string>("");
  const [newPricing, setNewPricing] = useState<PricingState | null>(null);
  const [newStart, setNewStart] = useState(todayStr());
  const [targetRouteId, setTargetRouteId] = useState<string | null>(null);
  const [editStep, setEditStep] = useState<1 | 2>(1);
  const [newStep, setNewStep] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => { 
    try { 
      if (note) localStorage.setItem(draftKey(stopId), note); 
      else localStorage.removeItem(draftKey(stopId)); 
    } catch { /* privat tilstand */ } 
  }, [note, stopId]);

  const businessId: string | undefined = order?.business_id;
  const runDate = routeDate || todayStr();

  const { data: notes = [], isError: notesError } = useStopOfficeNotes(stopId);

  const { data: services = [], isLoading: loadingServices, isError: servicesError, refetch: refetchServices } = useQuery({
    queryKey: ["employee-business-services-priced", businessId],
    enabled: (editOpen || newOpen) && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, unit, pricing_type, base_price, interval_options, calculator_steps(id, label, unit, price_per_unit, min_value, max_value, default_value, sort_order)")
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as PricedService[];
    },
  });
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const { data: placementRoutes = [], isLoading: loadingPlacementRoutes } = useQuery({
    queryKey: ["employee-route-placement-options", stopId, newStart],
    enabled: newOpen && !!newStart && newPricing?.interval === "engangskøb",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("employee_route_placement_options", { _stop_id: stopId, _start_date: newStart });
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; route_date: string; is_same_series: boolean }>;
    },
  });

  useEffect(() => {
    if (!newOpen) return;
    const preferred = placementRoutes.find((route) => route.is_same_series) || placementRoutes[0];
    setTargetRouteId((current) => current && placementRoutes.some((route) => route.id === current) ? current : preferred?.id ?? null);
  }, [newOpen, placementRoutes]);

  const snapshot = (ls: Line[]) => JSON.stringify(ls.map((l) => [l.service_id, l.quantity, l.pricing]));

  const openEditor = () => {
    const items = ((order?.order_items || []) as any[]).filter((i) => i.id);
    if (!items.length) { 
      toast.error("Aftalen har ingen services at rette", { description: "Kontakt kontoret, eller skriv en note." }); 
      return; 
    }
    const next: Line[] = items.map((i) => ({
      key: i.id, item_id: i.id, service_id: i.service_id, name: i.service_name || "Service",
      quantity: Number(i.quantity) || 1, unit: i.services?.unit,
      pricing: i.service_id ? pricingFromItem(i) : null, currentInterval: i.details?.interval,
    }));
    setLines(next);
    setInitialLines(snapshot(next));
    setApplyFuture(true);
    setEditStep(1);
    setEditOpen(true);
  };

  const autoOpened = useRef(false);
  useEffect(() => {
    if (!editOnly || autoOpened.current || !order) return;
    autoOpened.current = true;
    if (completed) { toast.error("Fortryd udførsel for at rette aftalen."); onEditClosed?.(); return; }
    openEditor();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOnly, order, completed]);
  // Luk først når vinduet faktisk har været åbent — ellers lukkede effekten
  // vinduet i samme render som det blev bedt om at åbne.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!editOnly) return;
    if (editOpen) { wasOpen.current = true; return; }
    if (wasOpen.current) onEditClosed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOnly, editOpen]);

  const addable = useMemo(() => services.filter((s) => !lines.some((l) => l.service_id === s.id)), [services, lines]);
  const dirty = snapshot(lines) !== initialLines;
  const intervalChanged = lines.some((l) => l.item_id && l.pricing && l.currentInterval && l.pricing.interval !== l.currentInterval);

  const closeEditor = async () => {
    if (save.isPending) return;
    if (dirty && !(await askConfirm({ 
      title: "Kassér ændringer?", 
      description: "Dine ændringer af aftalen er ikke gemt.", 
      confirmLabel: "Kassér", 
      cancelLabel: "Bliv her" 
    }))) return;
    setEditOpen(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      assertOnline();
      if (!lines.length) throw new Error("Aftalen skal have mindst én service.");
      const items = lines.map((l) => {
        const svc = l.service_id ? serviceById.get(l.service_id) : undefined;
        if (svc && l.pricing) return { item_id: l.item_id, service_id: l.service_id, ...toPricingPayload(svc, l.pricing) };
        return { item_id: l.item_id, service_id: l.service_id, quantity: l.quantity };
      });
      const { data, error } = await supabase.rpc("employee_update_stop_services" as any, {
        _stop_id: stopId, _items: items, _apply_future: applyFuture,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (res) => {
      const n = Number(res?.future_orders) || 0;
      const future = !applyFuture ? "Kun dette besøg er ændret."
        : res?.agreement_updated ? "Den faste aftale og kommende besøg er opdateret."
        : n > 0 ? `${n} kommende besøg er også opdateret.`
        : "Der var ingen kommende besøg at opdatere.";
      toast.success("Aftalen er gemt", { description: [res?.summary, future, res?.interval_changed ? "Kontoret har fået besked om det nye interval." : ""].filter(Boolean).join(" · ") });
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["order-for-stop"] });
      qc.invalidateQueries({ queryKey: ["employee-stop-notes", stopId] });
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["route-calendar"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => toast.error("Aftalen blev ikke gemt", {
      description: errText(e), action: { label: "Prøv igen", onClick: () => save.mutate() },
    }),
  });

  const trySave = async () => {
    if (intervalChanged && applyFuture) {
      const ok = await askConfirm({
        title: "Intervallet er ændret",
        description: "Kommende besøg kan komme til at ligge på en forkert rute. Ændringen gemmes, og kontoret får besked, så de kan flytte aftalen til den rigtige rute i ruteplanlæggeren.",
        confirmLabel: "Gem og giv kontoret besked", cancelLabel: "Tilbage",
      });
      if (!ok) return;
    }
    save.mutate();
  };

  // ── Ny aftale ───────────────────────────────────────────────
  const newService = newServiceId ? serviceById.get(newServiceId) : undefined;
  const openNew = () => { setNewServiceId(""); setNewPricing(null); setNewStart(runDate); setTargetRouteId(null); setNewStep(1); setNewOpen(true); };
  const pickNewService = (id: string) => {
    setNewServiceId(id);
    const s = serviceById.get(id);
    setNewPricing(s ? defaultPricing(s) : null);
  };

  const createNew = useMutation({
    mutationFn: async (routeId: string | null) => {
      assertOnline();
      if (!newService || !newPricing) throw new Error("Vælg en service.");
      if (!newStart) throw new Error("Vælg en opstartsdato.");
      const { data, error } = await supabase.rpc("employee_create_order_from_stop_v2", {
        _stop_id: stopId,
        _item: { service_id: newService.id, ...toPricingPayload(newService, newPricing) },
        _start_date: newStart,
        _target_route_id: routeId,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (res) => {
      const selectedRoute = placementRoutes.find((route) => route.id === res?.target_route_id);
      toast.success(res?.added_to_route ? "Opgaven er tilføjet til ruten" : "Aftalen er oprettet", {
        description: res?.added_to_route ? `Den ligger sidst på ${selectedRoute?.name || "den valgte rute"}.`
          : res?.reason === "recurring" ? "Den faste aftale ligger i Aftaler uden rute, så kontoret kan placere serien."
          : "Den ligger i Aftaler uden rute, så kontoret kan planlægge den.",
      });
      setNewOpen(false);
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["employee-stop-notes", stopId] });
    },
    onError: (e) => toast.error("Aftalen blev ikke oprettet", { description: errText(e) }),
  });

  const submitNew = async () => {
    if (!newService || !newPricing) { toast.error("Vælg en service først"); return; }
    const recurring = newPricing.interval !== "engangskøb";
    const selectedRoute = placementRoutes.find((route) => route.id === targetRouteId);
    const reason = recurring
      ? `Første besøg er ${newStart}, og aftalen gentages (${ivLabel(newPricing.interval)}). Kontoret placerer serien på de rigtige ruter.`
      : selectedRoute
        ? `Besøget oprettes ${newStart} og lægges sidst på ${selectedRoute.name}.`
        : `Besøget oprettes ${newStart} i Aftaler uden rute, så kontoret kan planlægge det.`;
    const ok = await askConfirm({
      title: "Opret aftalen?",
      description: reason,
      confirmLabel: "Opret aftale", cancelLabel: "Tilbage",
    });
    if (ok) createNew.mutate(recurring ? null : targetRouteId);
  };

  const sendNote = useMutation({
    mutationFn: async () => {
      assertOnline();
      const body = note.trim();
      if (!body) throw new Error("Skriv en note, før du sender.");
      if (body.length > 2000) throw new Error("Noten må højst være 2000 tegn.");
      const { error } = await supabase.rpc("add_employee_stop_note" as any, { _stop_id: stopId, _body: body });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Noten er sendt til kontoret");
      setNote("");
      setNoteOpen(false);
      qc.invalidateQueries({ queryKey: ["employee-stop-notes", stopId] });
    },
    onError: (e) => toast.error("Noten blev ikke sendt", {
      description: `${errText(e)} Din tekst er gemt.`, action: { label: "Prøv igen", onClick: () => sendNote.mutate() },
    }),
  });

  const setQty = (key: string, delta: number) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.round((l.quantity + delta) * 100) / 100) } : l)));

  const editTotal = lines.reduce((t, l) => {
    const svc = l.service_id ? serviceById.get(l.service_id) : undefined;
    return t + (svc && l.pricing ? estimateTotal(svc, l.pricing) : 0);
  }, 0);

  const sheetSide = isCompact ? "bottom" : "right";
  const sheetClass = cn(
    "planner-overlay appointment-details-overlay flex flex-col gap-0 p-0 overflow-hidden shadow-premium",
    isCompact ? "h-[min(92dvh,52rem)] !inset-x-0 !bottom-0 !rounded-t-md !rounded-b-none !border-x-0 !border-b-0" : "h-full w-full sm:max-w-md",
  );

  const servicesProblem = servicesError ? (
    <div className="flex items-center gap-2 rounded-md border border-warning/40 p-2.5 text-sm">
      <span className="flex-1 text-muted-foreground">Services kunne ikke hentes.</span>
      <Button size="sm" variant="outline" className="h-10" onClick={() => void refetchServices()}>Prøv igen</Button>
    </div>
  ) : loadingServices ? (
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Henter services…</p>
  ) : null;

  const StepIndicator = forwardRef<HTMLOListElement, { current: number; total: number }>(({ current, total }, ref) => (
    <ol ref={ref} className="grid grid-cols-4 gap-1" aria-label={`Trin ${current} af ${total}`}>
      {Array.from({ length: total }, (_, index) => index + 1).map((step) => (
        <li key={step} className={cn("h-1.5 rounded-full", step <= current ? "bg-primary" : "bg-border")} aria-current={step === current ? "step" : undefined} />
      ))}
    </ol>
  ));
  StepIndicator.displayName = "StepIndicator";

  return (
    <div className={compact || noteOnly ? "contents" : "space-y-2"}>
      {editOnly ? null : compact ? (
        <>
          {!noteOnly && <Button variant="appointmentEdit" aria-label="Ret aftale" title="Ret aftale" className="route-dock-tile" onClick={openEditor} disabled={completed || !order}><Pencil className="h-5 w-5 shrink-0" /><span className="route-dock-tile-label"><span className="route-dock-tile-long">Ret aftale</span><span className="route-dock-tile-short">Ret</span></span></Button>}
          {!noteOnly && <Button variant="appointmentCreate" aria-label="Ny aftale" title="Ny aftale" className="route-dock-tile" onClick={openNew} disabled={!order}><CalendarPlus className="h-5 w-5 shrink-0" /><span className="route-dock-tile-label"><span className="route-dock-tile-long">Ny aftale</span><span className="route-dock-tile-short">Ny</span></span></Button>}
          {!hideNoteAction && <Button variant="appointmentNote" aria-label="Note til kontoret" title="Note til kontoret" className="route-dock-tile" onClick={() => setNoteOpen(true)}><MessageSquarePlus className="h-5 w-5 shrink-0" /><span className="route-dock-tile-label">Note</span></Button>}
        </>
      ) : noteOnly && !hideNoteAction ? (
        <Button variant="appointmentNote" aria-label="Note til kontoret" title="Note til kontoret" className="h-11 shrink-0 gap-1.5 rounded-md px-3 text-xs" onClick={() => setNoteOpen(true)}>
          <MessageSquarePlus className="h-4 w-4" />Note til kontoret
        </Button>
      ) : (<>
      <div className={cn("grid gap-2", hideNoteAction ? "grid-cols-2" : "grid-cols-3")}>
        <Button variant="appointmentEdit" className="employee-action-tile" onClick={openEditor} disabled={completed || !order}>
          <Pencil className="h-5 w-5 shrink-0" /><span className="employee-action-tile-title">Ret aftale</span><span className="employee-action-tile-hint">Services og interval</span>
        </Button>
        <Button variant="appointmentCreate" className="employee-action-tile" onClick={openNew} disabled={!order}>
          <CalendarPlus className="h-5 w-5 shrink-0" /><span className="employee-action-tile-title">Ny aftale</span><span className="employee-action-tile-hint">Hos samme kunde</span>
        </Button>
        {!hideNoteAction && <Button variant="appointmentNote" aria-label="Note til kontoret" className="employee-action-tile" onClick={() => setNoteOpen(true)}>
          <MessageSquarePlus className="h-5 w-5 shrink-0" /><span className="employee-action-tile-title">Note</span><span className="employee-action-tile-hint">Til kontoret</span>
        </Button>}
      </div>
      {completed && <p className="text-[11px] text-muted-foreground">Fortryd udførsel for at rette aftalen.</p>}

      {!hideNotesList && <EmployeeStopNotesList stopId={stopId} />}
      </>)}

      {!noteOnly && !compact && !editOnly && order?.status !== 'cancelled' && <Button variant="outline" className="h-11 w-full text-destructive" onClick={() => setCancelOpen(true)} disabled={!order || cancelAppointment.isPending}><Trash2 className="h-4 w-4" />Annullér aftale</Button>}
      <Sheet open={cancelOpen} onOpenChange={open => { if (!cancelAppointment.isPending) setCancelOpen(open); }}>
        <SheetContent side={sheetSide} className={sheetClass}>
          <SheetHeader className="border-b border-border p-5 pr-14"><SheetTitle>Annullér aftale</SheetTitle><SheetDescription>Skal kreditnotaen oprettes nu, eller skal kontoret håndtere den? Kun dette besøg annulleres.</SheetDescription></SheetHeader>
          <div className="space-y-3 p-5">
            <Button variant="destructive" className="h-auto min-h-12 w-full whitespace-normal" disabled={cancelAppointment.isPending} onClick={() => cancelAppointment.mutate('now')}>Annullér og opret kreditnota</Button>
            <Button variant="outline" className="h-auto min-h-12 w-full whitespace-normal" disabled={cancelAppointment.isPending} onClick={() => cancelAppointment.mutate('office')}>Annullér — kontoret håndterer kreditnota</Button>
            {cancelAppointment.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
          </div>
        </SheetContent>
      </Sheet>
      {/* Ret aftale */}
      <Sheet open={editOpen} onOpenChange={(o) => { if (o) setEditOpen(true); else void closeEditor(); }}>
        <SheetContent side={sheetSide} className={sheetClass}>
          <SheetHeader className="planner-overlay-header shrink-0 space-y-0 border-b border-border px-4 py-3 pr-14 text-left sm:px-5 sm:pr-14">
            <SheetTitle className="sr-only">Ret aftale</SheetTitle><SheetDescription className="sr-only">Ret services og vælg hvilke besøg ændringen gælder.</SheetDescription>
            <AppointmentDetailsHeader 
              title="Ret aftale" 
              description={`Trin ${editStep} af 2 · ${editStep === 1 ? "Services og pris" : "Omfang og bekræftelse"}`} 
            />
            <div className="mt-3"><StepIndicator current={editStep} total={2} /></div>
          </SheetHeader>
          <div className="planner-overlay-body min-h-0 flex-1 space-y-4 overflow-y-auto bg-secondary/20 p-4 overscroll-contain sm:space-y-5 sm:p-5">
            {editStep === 1 && <>{servicesProblem}
            <ul className="space-y-2">
              {lines.map((l) => {
                const svc = l.service_id ? serviceById.get(l.service_id) : undefined;
                return (
                  <li key={l.key} className="space-y-3 rounded-md border border-border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-semibold">{l.name}</p>
                      <Button size="icon" variant="ghost" className="h-11 w-11 shrink-0 text-destructive hover:bg-destructive/10" aria-label={`Fjern ${l.name}`}
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} disabled={lines.length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {svc && l.pricing ? (
                      <CompactPricingEditor service={svc} value={l.pricing} currentInterval={l.currentInterval}
                        onChange={(p) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, pricing: p, quantity: p.quantity } : x)))} />
                    ) : (
                      <div className="flex items-center gap-2">
                        {!loadingServices && <p className="flex-1 text-[11px] text-muted-foreground">Servicen er ikke længere aktiv — kun antal kan ændres.</p>}
                        <Button size="icon" variant="outline" className="h-11 w-11" aria-label="Færre" onClick={() => setQty(l.key, -1)} disabled={l.quantity <= 1}><Minus className="h-4 w-4" /></Button>
                        <span className="w-8 text-center text-base font-semibold tabular-nums">{l.quantity}</span>
                        <Button size="icon" variant="outline" className="h-11 w-11" aria-label="Flere" onClick={() => setQty(l.key, 1)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {!servicesError && !loadingServices && addable.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Tilføj service</p>
                <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card shadow-sm">
                  {addable.map((s) => (
                    <Button type="button" variant="ghost" key={s.id} className="flex h-auto min-h-12 w-full items-center justify-start gap-3 rounded-none px-3 py-2 text-left"
                      onClick={() => setLines((ls) => [...ls, { key: `new-${s.id}`, item_id: null, service_id: s.id, name: s.name, quantity: 1, unit: s.unit, pricing: defaultPricing(s) }])}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug text-foreground">{s.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{s.pricing_type === "timepris" ? "Timepris" : s.pricing_type === "prisberegner" ? "Prisberegner" : "Fast pris"}</span>
                      </span>
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            </>}
            {editStep === 2 && <>
            {intervalChanged && (
              <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-[12px] text-warning-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Du har ændret intervallet. Kontoret får besked, så kommende besøg kommer på den rigtige rute.
              </p>
            )}

            <Section icon={<CheckCircle2 className="h-4 w-4" />} title="Gælder for" tone="accent">
            <fieldset className="space-y-2">
              {[
                { v: true, t: "Dette og kommende besøg", d: "Forventede besøg på aftalen opdateres også." },
                { v: false, t: "Kun dette besøg", d: "Kommende besøg forbliver uændrede." },
              ].map((o) => (
                <Button key={String(o.v)} variant="outline" type="button" onClick={() => setApplyFuture(o.v)}
                  className={cn("block h-auto w-full whitespace-normal rounded-md border p-3 text-left transition-colors",
                    applyFuture === o.v ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/20" : "border-border bg-card")}
                  aria-pressed={applyFuture === o.v}>
                  <p className="text-sm font-semibold">{o.t}</p>
                  <p className="text-[12px] text-muted-foreground">{o.d}</p>
                </Button>
              ))}
            </fieldset>
            </Section>
            <Section icon={<CheckCircle2 className="h-4 w-4" />} title="Kontrollér før du gemmer" tone="muted">
              <div className="space-y-2 text-sm">
                <p className="flex justify-between gap-3"><span className="text-muted-foreground">Services</span><strong>{lines.length}</strong></p>
                {editTotal > 0 && <p className="flex justify-between gap-3"><span className="text-muted-foreground">Ca. pris pr. besøg</span><strong>{formatPrice(editTotal)}</strong></p>}
                <p className="rounded-md bg-secondary/60 p-2.5 text-xs leading-5 text-muted-foreground">{applyFuture ? "Dette besøg og kommende besøg bliver opdateret. Ruteplaceringen ændres ikke lydløst." : "Kun dette besøg bliver opdateret. Kommende besøg og serien forbliver uændrede."}</p>
              </div>
            </Section>
            </>}
          </div>
          <SheetFooterBar className="px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-12" onClick={() => editStep === 1 ? void closeEditor() : setEditStep(1)} disabled={save.isPending}>{editStep === 1 ? "Annullér" : <><ArrowLeft className="h-4 w-4" />Tilbage</>}</Button>
              <Button className="h-12" onClick={() => editStep === 1 ? setEditStep(2) : void trySave()} disabled={save.isPending || lines.length === 0 || !dirty}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editStep === 1 ? "Fortsæt" : "Gem ændringer"}
              </Button>
            </div>
          </SheetFooterBar>
        </SheetContent>
      </Sheet>

      {/* Ny aftale hos kunden */}
      <Sheet open={newOpen} onOpenChange={(o) => { if (!createNew.isPending) setNewOpen(o); }}>
        <SheetContent side={sheetSide} className={sheetClass}>
          <SheetHeader className="planner-overlay-header shrink-0 space-y-0 border-b border-border px-4 py-3 pr-14 text-left sm:px-5 sm:pr-14">
            <SheetTitle className="sr-only">Ny aftale</SheetTitle><SheetDescription className="sr-only">Opret en aftale hos samme kunde.</SheetDescription>
            <AppointmentDetailsHeader 
              title={`Ny aftale hos ${order?.customer_name || "kunden"}`} 
              description={`Trin ${newStep} af 4 · ${["Service og pris", "Dato og gentagelse", "Placering på rute", "Kontrollér og opret"][newStep - 1]}`} 
            />
            <div className="mt-3"><StepIndicator current={newStep} total={4} /></div>
          </SheetHeader>
          <div className="planner-overlay-body min-h-0 flex-1 space-y-4 overflow-y-auto bg-secondary/20 p-4 overscroll-contain sm:space-y-5 sm:p-5">
            {newStep === 1 && <>{servicesProblem}
            {!servicesError && !loadingServices && (
              services.length === 0 ? <p className="text-sm text-muted-foreground">Virksomheden har ingen aktive services.</p> : (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Service</p>
                   <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card shadow-sm">
                    {services.map((s) => (
                       <Button key={s.id} type="button" variant="ghost" className={cn("flex h-auto min-h-12 w-full items-center justify-start gap-3 rounded-none px-3 py-2 text-left", newServiceId === s.id && "bg-primary/5 text-foreground ring-1 ring-inset ring-primary/30")} onClick={() => pickNewService(s.id)} aria-pressed={newServiceId === s.id}>
                         <span className="min-w-0 flex-1"><span className="block text-sm font-medium leading-snug">{s.name}</span><span className="block text-[11px] text-muted-foreground">{s.pricing_type === "timepris" ? "Timepris" : s.pricing_type === "prisberegner" ? "Prisberegner" : "Fast pris"}</span></span>
                         {newServiceId === s.id ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />}
                       </Button>
                    ))}
                  </div>
                </div>
              )
            )}
            {newService && newPricing && (
              <div className="rounded-md border border-border bg-card p-3 shadow-sm">
                <CompactPricingEditor service={newService} value={newPricing} onChange={setNewPricing} />
              </div>
            )}
            </>}
            {newStep === 2 && newService && (
               <Section icon={<CalendarPlus className="h-4 w-4" />} title="Planlægning" tone="sky">
                 <Field 
                  label="Foreløbig opstartsdato" 
                  required 
                  hint={newPricing?.interval !== "engangskøb" ? `Første besøg er ${newStart}. Kontoret placerer den faste aftale på de rigtige ruter.` : "Efter datoen vælger du præcist, hvor engangsopgaven skal placeres."}
                 >
                   <DatePickerField value={newStart} minDate={todayStr()} onChange={setNewStart} className="h-11 text-base" />
                 </Field>
               </Section>
            )}
            {newStep === 3 && newService && newPricing?.interval === "engangskøb" && (
              <Section icon={<RouteIcon className="h-4 w-4" />} title="Placering på rute" tone="accent" hint={targetRouteId ? "Lægges sidst på ruten" : "Kontoret planlægger"}>
                {loadingPlacementRoutes ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Finder ruter på datoen…</p>
                ) : (
                  <fieldset className="space-y-2">
                    {placementRoutes.map((route) => (
                      <Button key={route.id} type="button" variant="outline" aria-pressed={targetRouteId === route.id} onClick={() => setTargetRouteId(route.id)}
                        className={cn("h-auto min-h-14 w-full justify-start gap-3 whitespace-normal p-3 text-left", targetRouteId === route.id && "border-primary bg-primary/5 ring-1 ring-primary/20")}>
                        <RouteIcon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0"><span className="block text-sm font-semibold">{route.is_same_series ? "Næste forekomst af samme rute" : route.name}</span><span className="block text-xs font-normal text-muted-foreground">{route.name} · {format(new Date(`${route.route_date}T12:00:00`), "d. MMMM", { locale: da })}</span></span>
                      </Button>
                    ))}
                    <Button type="button" variant="outline" aria-pressed={targetRouteId === null} onClick={() => setTargetRouteId(null)}
                      className={cn("h-auto min-h-14 w-full justify-start gap-3 whitespace-normal p-3 text-left", targetRouteId === null && "border-primary bg-primary/5 ring-1 ring-primary/20")}>
                      <Inbox className="h-4 w-4 shrink-0" />
                      <span><span className="block text-sm font-semibold">Aftaler uden rute</span><span className="block text-xs font-normal text-muted-foreground">Kontoret vælger ruten senere.</span></span>
                    </Button>
                    {placementRoutes.length === 0 && <p className="text-xs text-muted-foreground">Der er ingen tilgængelig rute på datoen. Aftalen kan stadig oprettes uden rute.</p>}
                  </fieldset>
                )}
              </Section>
            )}
            {newStep === 3 && newService && newPricing?.interval !== "engangskøb" && (
              <Section icon={<Inbox className="h-4 w-4" />} title="Placering" tone="muted">
                <p className="text-sm text-muted-foreground">Faste aftaler oprettes i Aftaler uden rute. Kontoret placerer første besøg og de næste forekomster samlet.</p>
              </Section>
            )}
            {newStep === 4 && newService && newPricing && (
              <Section icon={<CheckCircle2 className="h-4 w-4" />} title="Aftalen oprettes sådan" tone="accent">
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between gap-3"><span className="text-muted-foreground">Service</span><strong className="text-right">{newService.name}</strong></p>
                  <p className="flex justify-between gap-3"><span className="text-muted-foreground">Første dato</span><strong>{format(new Date(`${newStart}T12:00:00`), "d. MMMM yyyy", { locale: da })}</strong></p>
                  <p className="flex justify-between gap-3"><span className="text-muted-foreground">Gentagelse</span><strong>{ivLabel(newPricing.interval)}</strong></p>
                  <p className="rounded-md bg-secondary/60 p-2.5 text-xs leading-5 text-muted-foreground">{newPricing.interval !== "engangskøb" ? "Aftalen lægges i Aftaler uden rute, så kontoret kan placere hele serien korrekt." : targetRouteId ? `Besøget lægges sidst på ${placementRoutes.find((route) => route.id === targetRouteId)?.name || "den valgte rute"}.` : "Besøget lægges i Aftaler uden rute til senere planlægning."}</p>
                </div>
              </Section>
            )}
          </div>
          <SheetFooterBar className="grid grid-cols-2 gap-2 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            <Button variant="outline" className="h-12" onClick={() => newStep === 1 ? setNewOpen(false) : setNewStep((newStep - 1) as 1 | 2 | 3)} disabled={createNew.isPending}>{newStep === 1 ? "Annullér" : <><ArrowLeft className="h-4 w-4" />Tilbage</>}</Button>
            <Button className="h-12" onClick={() => newStep === 4 ? void submitNew() : setNewStep((newStep + 1) as 2 | 3 | 4)} disabled={!newService || !newPricing || createNew.isPending}>
              {createNew.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : newStep === 4 ? "Opret aftale" : "Fortsæt"}
            </Button>
          </SheetFooterBar>
        </SheetContent>
      </Sheet>

      {/* Note til kontoret */}
      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent side={sheetSide} className={sheetClass}>
          <SheetHeader className="planner-overlay-header shrink-0 space-y-0 border-b border-border px-4 py-3 pr-14 text-left sm:px-5 sm:pr-14">
            <SheetTitle className="sr-only">Note til kontoret</SheetTitle><SheetDescription className="sr-only">Send en intern note om besøget.</SheetDescription>
            <AppointmentDetailsHeader 
              title="Note til kontoret" 
              description="Noten gemmes på aftalen og bliver synlig for kontoret." 
            />
          </SheetHeader>
          <div className="planner-overlay-body min-h-0 flex-1 space-y-3 overflow-y-auto bg-secondary/20 p-4 overscroll-contain sm:space-y-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              {QUICK_NOTES.map((q) => (
                <Button key={q} variant="secondary" size="sm" className="h-10 text-xs shadow-sm hover:shadow-none"
                  onClick={() => setNote((n) => (n.trim() ? `${n.trim()}\n${q}` : q))}>{q}</Button>
              ))}
            </div>
            {note.length > 1800 && <p className="text-[11px] text-muted-foreground">{2000 - note.length} tegn tilbage</p>}
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={6} maxLength={2000}
              placeholder="Skriv kort, hvad kontoret skal vide…" aria-label="Note til kontoret" autoFocus={!isCompact} className="shadow-sm focus:ring-1 focus:ring-primary/20" />
          </div>
          <SheetFooterBar className="grid grid-cols-2 gap-2 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            <Button variant="outline" className="h-12" onClick={() => setNoteOpen(false)}>Annullér</Button>
            <Button className="h-12 gap-2" onClick={() => void sendNote.mutate()} disabled={!note.trim() || sendNote.isPending}>
              {sendNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send</>}
            </Button>
          </SheetFooterBar>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default EmployeeStopActions;
