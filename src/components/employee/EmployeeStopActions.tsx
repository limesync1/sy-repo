// Medarbejderens handlinger på en aftale under rutekørsel:
// - Ret aftalen præcist (fast pris, timepris, prisberegner og interval) —
//   kun dette besøg eller også kommende besøg.
// - Opret en ny aftale hos kunden: lander i "Aftaler uden rute", eller som
//   ekstra stop på dagens rute når det er en engangsopgave i dag.
// - Send en note til kontoret.
// Prisen regnes altid endeligt på serveren. Optimeret til mobil/tablet.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Minus, Pencil, Plus, Send, Trash2, MessageSquarePlus, CheckCircle2, CalendarPlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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

export function EmployeeStopActions({ stopId, order, completed, noteOnly = false, routeDate = null }: {
  stopId: string; order: any; completed: boolean; noteOnly?: boolean; routeDate?: string | null;
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

  useEffect(() => { try { note ? localStorage.setItem(draftKey(stopId), note) : localStorage.removeItem(draftKey(stopId)); } catch { /* privat tilstand */ } }, [note, stopId]);
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
    if (!items.length) { toast.error("Aftalen har ingen services at rette", { description: "Kontakt kontoret, eller skriv en note." }); return; }
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
    if (dirty && !(await askConfirm({ title: "Kassér ændringer?", description: "Dine ændringer af aftalen er ikke gemt.", confirmLabel: "Kassér", cancelLabel: "Bliv her" }))) return;
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
    "planner-overlay appointment-details-overlay flex flex-col gap-0 p-0",
    isCompact ? "max-h-[92dvh] !rounded-t-md" : "w-full sm:max-w-md",
  );

  const servicesProblem = servicesError ? (
    <div className="flex items-center gap-2 rounded-md border border-warning/40 p-2.5 text-sm">
      <span className="flex-1 text-muted-foreground">Services kunne ikke hentes.</span>
      <Button size="sm" variant="outline" className="h-10" onClick={() => refetchServices()}>Prøv igen</Button>
    </div>
  ) : loadingServices ? (
    <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Henter services…</p>
  ) : null;

  return (
    <div className={noteOnly ? "contents" : "space-y-2"}>
      {noteOnly ? (
        <Button variant="outline" aria-label="Note til kontoret" title="Note til kontoret" className="h-11 shrink-0 gap-1.5 rounded-md px-3 text-xs" onClick={() => setNoteOpen(true)}>
          <MessageSquarePlus className="h-4 w-4" />Note
        </Button>
      ) : (<>
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <Button variant="outline" className="h-12 justify-center gap-2" onClick={openEditor} disabled={completed || !order}>
          <Pencil className="h-4 w-4" /> Ret aftale
        </Button>
        <Button variant="outline" className="h-12 justify-center gap-2" onClick={openNew} disabled={!order}>
          <CalendarPlus className="h-4 w-4" /> Ny aftale
        </Button>
        <Button variant="outline" className="h-12 justify-center gap-2 min-[400px]:col-span-2" onClick={() => setNoteOpen(true)}>
          <MessageSquarePlus className="h-4 w-4" /> Note til kontoret
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
          <SheetHeader className="shrink-0 border-b border-border p-4 pr-12 text-left">
            <SheetTitle>Ret aftale</SheetTitle>
            <SheetDescription>Tilpas pris, antal, timer, beregnertrin og interval.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
            {servicesProblem}
            <ul className="space-y-2">
              {lines.map((l) => {
                const svc = l.service_id ? serviceById.get(l.service_id) : undefined;
                return (
                  <li key={l.key} className="space-y-3 rounded-md border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-semibold">{l.name}</p>
                      <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-destructive" aria-label={`Fjern ${l.name}`}
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tilføj service</p>
                <div className="flex flex-wrap gap-2">
                  {addable.map((s) => (
                    <Button key={s.id} variant="secondary" className="h-auto min-h-11 max-w-full gap-1.5 whitespace-normal py-2 text-left"
                      onClick={() => setLines((ls) => [...ls, { key: `new-${s.id}`, item_id: null, service_id: s.id, name: s.name, quantity: 1, unit: s.unit, pricing: defaultPricing(s) }])}>
                      <Plus className="h-4 w-4" /> {s.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {intervalChanged && (
              <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-[12px]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Du har ændret intervallet. Kontoret får besked, så kommende besøg kommer på den rigtige rute.
              </p>
            )}

            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gælder for</legend>
              {[
                { v: true, t: "Dette og kommende besøg", d: "Forventede besøg på aftalen opdateres også." },
                { v: false, t: "Kun dette besøg", d: "Kommende besøg forbliver uændrede." },
              ].map((o) => (
                <Button key={String(o.v)} variant="outline" type="button" onClick={() => setApplyFuture(o.v)}
                  className={cn("block h-auto w-full whitespace-normal rounded-md border p-3 text-left transition-colors",
                    applyFuture === o.v ? "border-primary bg-primary/5" : "border-border bg-card")}
                  aria-pressed={applyFuture === o.v}>
                  <p className="text-sm font-medium">{o.t}</p>
                  <p className="text-[12px] text-muted-foreground">{o.d}</p>
                </Button>
              ))}
            </fieldset>
          </div>
          <div className="shrink-0 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {editTotal > 0 && <p className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Ca. pris pr. besøg</span><span className="font-semibold tabular-nums">{formatPrice(editTotal)}</span></p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-12" onClick={() => void closeEditor()} disabled={save.isPending}>Annullér</Button>
              <Button className="h-12" onClick={() => void trySave()} disabled={save.isPending || lines.length === 0 || !dirty}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem ændringer"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Ny aftale hos kunden */}
      <Sheet open={newOpen} onOpenChange={(o) => { if (!createNew.isPending) setNewOpen(o); }}>
        <SheetContent side={sheetSide} className={sheetClass}>
          <SheetHeader className="shrink-0 border-b border-border p-4 pr-12 text-left">
            <SheetTitle>Ny aftale hos {order?.customer_name || "kunden"}</SheetTitle>
            <SheetDescription>Kundens navn og adresse udfyldes automatisk.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
            {servicesProblem}
            {!servicesError && !loadingServices && (
              services.length === 0 ? <p className="text-sm text-muted-foreground">Virksomheden har ingen aktive services.</p> : (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Service</p>
                  <div className="flex flex-wrap gap-2">
                    {services.map((s) => (
                      <Button key={s.id} variant={newServiceId === s.id ? "default" : "outline"} className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-left" onClick={() => pickNewService(s.id)} aria-pressed={newServiceId === s.id}>
                        {s.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            )}
            {newService && newPricing && (
              <div className="rounded-md border border-border bg-card p-3">
                <CompactPricingEditor service={newService} value={newPricing} onChange={setNewPricing} />
              </div>
            )}
            {newService && (
              <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opstartsdato
                <Input type="date" value={newStart} min={todayStr()} onChange={(e) => setNewStart(e.target.value)} className="h-11 normal-case" />
              </label>
            )}
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button variant="outline" className="h-12" onClick={() => setNewOpen(false)} disabled={createNew.isPending}>Annullér</Button>
            <Button className="h-12" onClick={() => void submitNew()} disabled={!newService || createNew.isPending}>
              {createNew.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opret aftale"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Note til kontoret */}
      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent side={sheetSide} className={sheetClass}>
          <SheetHeader className="shrink-0 border-b border-border p-4 pr-12 text-left">
            <SheetTitle>Note til kontoret</SheetTitle>
            <SheetDescription>Noten vises på aftalen i virksomhedspanelet.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_NOTES.map((q) => (
                <Button key={q} variant="secondary" size="sm" className="h-10"
                  onClick={() => setNote((n) => (n.trim() ? `${n.trim()}\n${q}` : q))}>{q}</Button>
              ))}
            </div>
            {note.length > 1800 && <p className="text-[11px] text-muted-foreground">{2000 - note.length} tegn tilbage</p>}
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} maxLength={2000}
              placeholder="Skriv kort, hvad kontoret skal vide…" autoFocus={!isCompact} />
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button variant="outline" className="h-12" onClick={() => setNoteOpen(false)}>Annullér</Button>
            <Button className="h-12 gap-2" onClick={() => sendNote.mutate()} disabled={!note.trim() || sendNote.isPending}>
              {sendNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Send</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default EmployeeStopActions;
