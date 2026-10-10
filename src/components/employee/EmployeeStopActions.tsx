// Medarbejderens handlinger på en aftale under rutekørsel:
// - Ret aftalen præcist (fast pris, timepris, prisberegner og interval) —
//   kun dette besøg eller også kommende besøg.
// - Opret en ny aftale hos kunden: lander i "Aftaler uden rute", eller som
//   ekstra stop på dagens rute når det er en engangsopgave i dag.
// - Send en note til kontoret.
// Prisen regnes altid endeligt på serveren. Optimeret til mobil/tablet.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Minus, Pencil, Plus, Send, Trash2, MessageSquarePlus, CheckCircle2, CalendarPlus, AlertTriangle, MoreHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

export function EmployeeStopActions({ stopId, order, completed, noteOnly = false, routeDate = null, compact = false }: {
  stopId: string; order: Order | any; completed: boolean; noteOnly?: boolean; routeDate?: string | null; compact?: boolean;
}) {
  const qc = useQueryClient();
  const isCompact = useIsBelowBreakpoint(1024);
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

  useEffect(() => { 
    try { 
      if (note) localStorage.setItem(draftKey(stopId), note); 
      else localStorage.removeItem(draftKey(stopId)); 
    } catch { /* privat tilstand */ } 
  }, [note, stopId]);

  const businessId: string | undefined = order?.business_id;
  const runDate = routeDate || todayStr();

  const { data: notes = [], isError: notesError } = useQuery({
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
    setEditOpen(true);
  };

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
  const openNew = () => { setNewServiceId(""); setNewPricing(null); setNewStart(runDate); setNewOpen(true); };
  const pickNewService = (id: string) => {
    setNewServiceId(id);
    const s = serviceById.get(id);
    setNewPricing(s ? defaultPricing(s) : null);
  };

  const createNew = useMutation({
    mutationFn: async (addToRoute: boolean) => {
      assertOnline();
      if (!newService || !newPricing) throw new Error("Vælg en service.");
      if (!newStart) throw new Error("Vælg en opstartsdato.");
      const { data, error } = await supabase.rpc("employee_create_order_from_stop" as any, {
        _stop_id: stopId,
        _item: { service_id: newService.id, ...toPricingPayload(newService, newPricing) },
        _start_date: newStart,
        _add_to_route: addToRoute,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (res) => {
      toast.success(res?.added_to_route ? "Opgaven er tilføjet til din rute" : "Aftalen er oprettet", {
        description: res?.added_to_route ? "Den ligger sidst på dagens rute."
          : res?.reason === "date_mismatch" ? "Datoen er ikke i dag, så den ligger i Aftaler uden rute til kontoret."
          : res?.reason === "recurring" ? "Faste aftaler placeres af kontoret, så den ligger i Aftaler uden rute."
          : res?.reason === "route_closed" ? "Ruten er afsluttet, så den ligger i Aftaler uden rute."
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
    const once = newPricing.interval === "engangskøb";
    const sameDay = newStart === runDate;
    if (once && sameDay) {
      const add = await askConfirm({
        title: "Skal opgaven på din rute i dag?",
        description: "Opgaven er en engangsopgave i dag. Du kan lægge den sidst på din rute med det samme, eller lade kontoret planlægge den.",
        confirmLabel: "Ja, på min rute", cancelLabel: "Nej, til kontoret",
      });
      createNew.mutate(add);
      return;
    }
    const reason = !once
      ? `Aftalen gentages (${ivLabel(newPricing.interval)}). For at den ikke lander på en forkert rute, placerer kontoret den på den rigtige rute.`
      : "Opstartsdatoen er ikke i dag, så opgaven kan ikke komme på dagens rute.";
    const ok = await askConfirm({
      title: "Aftalen gemmes til kontoret",
      description: `${reason} Den lægges i Aftaler uden rute i ruteplanlæggeren.`,
      confirmLabel: "Opret aftale", cancelLabel: "Tilbage",
    });
    if (ok) createNew.mutate(false);
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
    isCompact ? "h-[min(90dvh,52rem)] !inset-x-0 !bottom-0 !rounded-t-md !rounded-b-none !border-x-0 !border-b-0" : "w-full sm:max-w-md h-full",
  );

  const servicesProblem = servicesError ? (
    <div className="flex items-center gap-2 rounded-md border border-warning/40 p-2.5 text-sm">
      <span className="flex-1 text-muted-foreground">Services kunne ikke hentes.</span>
      <Button size="sm" variant="outline" className="h-10" onClick={() => void refetchServices()}>Prøv igen</Button>
    </div>
  ) : loadingServices ? (
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Henter services…</p>
  ) : null;

  return (
    <div className={compact || noteOnly ? "contents" : "space-y-2"}>
      {compact ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Flere aftalehandlinger" title="Flere aftalehandlinger"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[1200] min-w-52 bg-card text-foreground">
            {!noteOnly && <DropdownMenuItem className="min-h-11 gap-2" onSelect={openEditor} disabled={completed || !order}><Pencil className="h-4 w-4" />Ret aftale</DropdownMenuItem>}
            {!noteOnly && <DropdownMenuItem className="min-h-11 gap-2" onSelect={openNew} disabled={!order}><CalendarPlus className="h-4 w-4" />Ny aftale</DropdownMenuItem>}
            <DropdownMenuItem className="min-h-11 gap-2" onSelect={() => setNoteOpen(true)}><MessageSquarePlus className="h-4 w-4" />Note til kontoret</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : noteOnly ? (
        <Button variant="outline" aria-label="Note til kontoret" title="Note til kontoret" className="h-11 shrink-0 gap-1.5 rounded-md px-3 text-xs" onClick={() => setNoteOpen(true)}>
          <MessageSquarePlus className="h-4 w-4" />Note
        </Button>
      ) : (<>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <Button variant="outline" className="h-auto min-h-14 justify-start gap-3 whitespace-normal px-3 py-2 text-left" onClick={openEditor} disabled={completed || !order}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary"><Pencil className="h-4 w-4" /></span>
          <span><span className="block text-sm font-semibold">Ret aftale</span><span className="block text-[11px] font-normal text-muted-foreground">Services og interval</span></span>
        </Button>
        <Button variant="outline" className="h-auto min-h-14 justify-start gap-3 whitespace-normal px-3 py-2 text-left" onClick={openNew} disabled={!order}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary"><CalendarPlus className="h-4 w-4" /></span>
          <span><span className="block text-sm font-semibold">Ny aftale</span><span className="block text-[11px] font-normal text-muted-foreground">Hos samme kunde</span></span>
        </Button>
        <Button variant="outline" className="h-auto min-h-14 justify-start gap-3 whitespace-normal px-3 py-2 text-left" onClick={() => setNoteOpen(true)}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary"><MessageSquarePlus className="h-4 w-4" /></span>
          <span><span className="block text-sm font-semibold">Note</span><span className="block text-[11px] font-normal text-muted-foreground">Send til kontoret</span></span>
        </Button>
      </div>
      {completed && <p className="text-[11px] text-muted-foreground">Fortryd udførsel for at rette aftalen.</p>}

      {notesError && <p className="text-[11px] text-muted-foreground">Tidligere noter kunne ikke hentes lige nu.</p>}
      {notes.length > 0 && (
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
      )}
      </>)}

      {/* Ret aftale */}
      <Sheet open={editOpen} onOpenChange={(o) => { if (o) setEditOpen(true); else void closeEditor(); }}>
        <SheetContent side={sheetSide} className={sheetClass}>
          <SheetHeader className="planner-overlay-header shrink-0 space-y-0 border-b border-border px-4 py-3 pr-14 text-left sm:px-5 sm:pr-14">
            <SheetTitle className="sr-only">Ret aftale</SheetTitle><SheetDescription className="sr-only">Ret services og vælg hvilke besøg ændringen gælder.</SheetDescription>
            <AppointmentDetailsHeader 
              title="Ret aftale" 
              description="Ret services og vælg tydeligt, hvilke besøg ændringen gælder." 
            />
          </SheetHeader>
          <div className="planner-overlay-body min-h-0 flex-1 space-y-4 overflow-y-auto bg-secondary/20 p-4 overscroll-contain sm:space-y-5 sm:p-5">
            {servicesProblem}
            <ul className="space-y-2">
              {lines.map((l) => {
                const svc = l.service_id ? serviceById.get(l.service_id) : undefined;
                return (
                  <li key={l.key} className="space-y-3 rounded-md border border-border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-semibold">{l.name}</p>
                      <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10" aria-label={`Fjern ${l.name}`}
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
                    <button type="button" key={s.id} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary/60 active:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                      onClick={() => setLines((ls) => [...ls, { key: `new-${s.id}`, item_id: null, service_id: s.id, name: s.name, quantity: 1, unit: s.unit, pricing: defaultPricing(s) }])}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug text-foreground">{s.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{s.pricing_type === "timepris" ? "Timepris" : s.pricing_type === "prisberegner" ? "Prisberegner" : "Fast pris"}</span>
                      </span>
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

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
          </div>
          <SheetFooterBar className="px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            {editTotal > 0 && <p className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Ca. pris pr. besøg</span><span className="font-semibold tabular-nums">{formatPrice(editTotal)}</span></p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-12" onClick={() => void closeEditor()} disabled={save.isPending}>Annullér</Button>
              <Button className="h-12" onClick={() => void trySave()} disabled={save.isPending || lines.length === 0 || !dirty}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem ændringer"}
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
              description="Kunden genbruges. Vælg service, interval og hvor aftalen skal planlægges." 
            />
          </SheetHeader>
          <div className="planner-overlay-body min-h-0 flex-1 space-y-4 overflow-y-auto bg-secondary/20 p-4 overscroll-contain sm:space-y-5 sm:p-5">
            {servicesProblem}
            {!servicesError && !loadingServices && (
              services.length === 0 ? <p className="text-sm text-muted-foreground">Virksomheden har ingen aktive services.</p> : (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Service</p>
                   <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card shadow-sm">
                    {services.map((s) => (
                       <button key={s.id} type="button" className={cn("flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary/60", newServiceId === s.id && "bg-primary/5 text-foreground ring-1 ring-inset ring-primary/30")} onClick={() => pickNewService(s.id)} aria-pressed={newServiceId === s.id}>
                         <span className="min-w-0 flex-1"><span className="block text-sm font-medium leading-snug">{s.name}</span><span className="block text-[11px] text-muted-foreground">{s.pricing_type === "timepris" ? "Timepris" : s.pricing_type === "prisberegner" ? "Prisberegner" : "Fast pris"}</span></span>
                         {newServiceId === s.id ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /> : <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />}
                       </button>
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
            {newService && (
               <Section icon={<CalendarPlus className="h-4 w-4" />} title="Planlægning" tone="sky">
                 <Field 
                  label="Foreløbig opstartsdato" 
                  required 
                  hint={newPricing?.interval === "engangskøb" && newStart === runDate ? "Du vælger ved oprettelse, om den skal sidst på dagens rute eller til kontoret." : newPricing?.interval !== "engangskøb" ? `Første besøg er ${newStart}. Kontoret placerer den faste aftale på den rigtige rute.` : "En fremtidig aftale lægges i Aftaler uden rute, så kontoret kan vælge den rigtige rute."}
                 >
                   <DatePickerField value={newStart} minDate={todayStr()} onChange={setNewStart} className="h-11 text-base" />
                 </Field>
               </Section>
            )}
          </div>
          <SheetFooterBar className="grid grid-cols-2 gap-2 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            <Button variant="outline" className="h-12" onClick={() => setNewOpen(false)} disabled={createNew.isPending}>Annullér</Button>
            <Button className="h-12" onClick={() => void submitNew()} disabled={!newService || createNew.isPending}>
              {createNew.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opret aftale"}
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
              placeholder="Skriv kort, hvad kontoret skal vide…" autoFocus={!isCompact} className="shadow-sm focus:ring-1 focus:ring-primary/20" />
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
