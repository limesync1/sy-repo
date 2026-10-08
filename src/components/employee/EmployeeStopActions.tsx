// Medarbejderens hurtige handlinger på en aftale under rutekørsel:
// redigér ydelser (kan også gælde kommende "forventede" besøg) og send en
// note til virksomhedspanelet. Optimeret til mobil/tablet med store trykflader.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Minus, Pencil, Plus, Send, Trash2, MessageSquarePlus, CheckCircle2 } from "lucide-react";
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

type Line = { key: string; item_id: string | null; service_id: string | null; name: string; quantity: number; unit?: string | null };

const QUICK_NOTES = ["Kunden var ikke hjemme", "Ekstra arbejde udført", "Adgang besværlig", "Kunden ønsker at blive ringet op"];

const errText = (e: unknown) => toDanishError(e, "Noget gik galt. Prøv igen om lidt.");
const OFFLINE = "Ingen internetforbindelse. Prøv igen, når du har dækning.";
const assertOnline = () => { if (typeof navigator !== "undefined" && navigator.onLine === false) throw new Error(OFFLINE); };
const draftKey = (stopId: string) => `employee-note-draft:${stopId}`;

export function EmployeeStopActions({ stopId, order, completed, noteOnly = false }: { stopId: string; order: any; completed: boolean; noteOnly?: boolean }) {
  const qc = useQueryClient();
  const isCompact = useIsBelowBreakpoint(1024);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [applyFuture, setApplyFuture] = useState(true);
  const [note, setNote] = useState(() => { try { return localStorage.getItem(draftKey(stopId)) || ""; } catch { return ""; } });
  const [initialLines, setInitialLines] = useState("");
  // Kladden overlever fejl, dårlig dækning og genindlæsning.
  useEffect(() => { try { note ? localStorage.setItem(draftKey(stopId), note) : localStorage.removeItem(draftKey(stopId)); } catch { /* privat tilstand */ } }, [note, stopId]);
  const businessId: string | undefined = order?.business_id;

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
    queryKey: ["employee-business-services", businessId],
    enabled: editOpen && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, unit, subcategory")
        .eq("business_id", businessId!)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const openEditor = () => {
    const items = ((order?.order_items || []) as any[]).filter((i) => i.id);
    if (!items.length) { toast.error("Aftalen har ingen ydelser at rette", { description: "Kontakt kontoret, eller skriv en note." }); return; }
    const next = items.map((i) => ({
      key: i.id, item_id: i.id, service_id: i.service_id, name: i.service_name || "Ydelse",
      quantity: Number(i.quantity) || 1, unit: i.services?.unit,
    }));
    setLines(next);
    setInitialLines(JSON.stringify(next.map((l) => [l.service_id, l.quantity])));
    setApplyFuture(true);
    setEditOpen(true);
  };

  const addable = useMemo(
    () => services.filter((s: any) => !lines.some((l) => l.service_id === s.id)),
    [services, lines],
  );

  const dirty = JSON.stringify(lines.map((l) => [l.service_id, l.quantity])) !== initialLines;
  const closeEditor = async () => {
    if (save.isPending) return;
    if (dirty && !(await askConfirm({ title: "Kassér ændringer?", description: "Dine ændringer af ydelserne er ikke gemt.", confirmLabel: "Kassér", cancelLabel: "Bliv her" }))) return;
    setEditOpen(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      assertOnline();
      if (!lines.length) throw new Error("Aftalen skal have mindst én ydelse.");
      const { data, error } = await supabase.rpc("employee_update_stop_services" as any, {
        _stop_id: stopId,
        _items: lines.map((l) => ({ item_id: l.item_id, service_id: l.service_id, quantity: l.quantity })),
        _apply_future: applyFuture,
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
      toast.success("Ydelserne er gemt", { description: [res?.summary, future].filter(Boolean).join(" · ") });
      setEditOpen(false);
      qc.invalidateQueries({ queryKey: ["order-for-stop"] });
      qc.invalidateQueries({ queryKey: ["employee-stop-notes", stopId] });
      qc.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e) => toast.error("Ydelserne blev ikke gemt", {
      description: errText(e), action: { label: "Prøv igen", onClick: () => save.mutate() },
    }),
  });

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

  const sheetSide = isCompact ? "bottom" : "right";
  const sheetClass = cn(
    "planner-overlay appointment-details-overlay flex flex-col gap-0 p-0",
    isCompact ? "max-h-[90dvh] !rounded-t-md" : "w-full sm:max-w-md",
  );

  return (
    <div className={noteOnly ? "contents" : "space-y-2"}>
      {noteOnly ? (
        <Button variant="outline" aria-label="Note til kontoret" title="Note til kontoret" className="h-11 shrink-0 gap-1.5 rounded-md px-3 text-xs" onClick={() => setNoteOpen(true)}>
          <MessageSquarePlus className="h-4 w-4" />Note
        </Button>
      ) : (<>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12 justify-center gap-2" onClick={openEditor} disabled={completed || !order}>
          <Pencil className="h-4 w-4" /> Ret ydelser
        </Button>
        <Button variant="outline" className="h-12 justify-center gap-2" onClick={() => setNoteOpen(true)}>
          <MessageSquarePlus className="h-4 w-4" /> Note til kontoret
        </Button>
      </div>
      {completed && <p className="text-[11px] text-muted-foreground">Fortryd udførsel for at rette ydelserne.</p>}

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

      {/* Rediger ydelser */}
      </>)}
      <Sheet open={editOpen} onOpenChange={(o) => { if (o) setEditOpen(true); else void closeEditor(); }}>
        <SheetContent side={sheetSide} className={sheetClass}>
          <SheetHeader className="border-b border-border p-4 text-left">
            <SheetTitle>Ret ydelser</SheetTitle>
            <SheetDescription>Tilpas antal, fjern eller tilføj ydelser på aftalen.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <ul className="space-y-2">
              {lines.map((l) => (
                <li key={l.key} className="flex items-center gap-2 rounded-md border border-border bg-card p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    {l.unit && <p className="text-[11px] text-muted-foreground">{l.unit}</p>}
                  </div>
                  <Button size="icon" variant="outline" className="h-11 w-11" aria-label="Færre" onClick={() => setQty(l.key, -1)} disabled={l.quantity <= 1}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-base font-semibold tabular-nums">{l.quantity}</span>
                  <Button size="icon" variant="outline" className="h-11 w-11" aria-label="Flere" onClick={() => setQty(l.key, 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-11 w-11 text-destructive" aria-label={`Fjern ${l.name}`}
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} disabled={lines.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tilføj ydelse</p>
              {servicesError ? (
                <div className="flex items-center gap-2 rounded-md border border-warning/40 p-2.5 text-sm">
                  <span className="flex-1 text-muted-foreground">Ydelserne kunne ikke hentes.</span>
                  <Button size="sm" variant="outline" className="h-10" onClick={() => refetchServices()}>Prøv igen</Button>
                </div>
              ) : loadingServices ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Henter ydelser…</p>
              ) : addable.length === 0 ? (
                <p className="text-sm text-muted-foreground">Alle ydelser er allerede på aftalen.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {addable.map((s: any) => (
                    <Button key={s.id} variant="secondary" className="h-11 gap-1.5"
                      onClick={() => setLines((ls) => [...ls, { key: `new-${s.id}`, item_id: null, service_id: s.id, name: s.name, quantity: 1, unit: s.unit }])}>
                      <Plus className="h-4 w-4" /> {s.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gælder for</legend>
              {[
                { v: true, t: "Dette og kommende besøg", d: "Forventede besøg på aftalen opdateres også." },
                { v: false, t: "Kun dette besøg", d: "Kommende besøg forbliver uændrede." },
              ].map((o) => (
                <button key={String(o.v)} type="button" onClick={() => setApplyFuture(o.v)}
                  className={cn("w-full rounded-md border p-3 text-left transition-colors",
                    applyFuture === o.v ? "border-primary bg-primary/5" : "border-border bg-card")}
                  aria-pressed={applyFuture === o.v}>
                  <p className="text-sm font-medium">{o.t}</p>
                  <p className="text-[12px] text-muted-foreground">{o.d}</p>
                </button>
              ))}
            </fieldset>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button variant="outline" className="h-12" onClick={() => void closeEditor()} disabled={save.isPending}>Annullér</Button>
            <Button className="h-12" onClick={() => save.mutate()} disabled={save.isPending || lines.length === 0 || !dirty}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gem ændringer"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Note til kontoret */}
      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent side={sheetSide} className={sheetClass}>
          <SheetHeader className="border-b border-border p-4 text-left">
            <SheetTitle>Note til kontoret</SheetTitle>
            <SheetDescription>Noten vises på aftalen i virksomhedspanelet.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
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
          <div className="grid grid-cols-2 gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
