// Kvalitetssikring (KS) på en opgave: medarbejderen eller virksomheden udfylder
// en tjekliste ud fra virksomhedens skabeloner, med målinger, bemærkninger og
// kundens underskrift. Udfyldte tjeklister kan ses og printes af virksomheden.
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Plus, Printer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Section } from "@/components/route-planner/SheetSection";
import { cn } from "@/lib/utils";
import { CHECK_VALUES, checklistHasDeviation, checklistProblems, type QualityAnswer, type QualityItem } from "@/lib/trade-modules";

type Props = { orderId: string; businessId: string; stopId?: string | null; canManage?: boolean; readOnly?: boolean; customerName?: string | null };
type Checklist = {
  id: string; template_name: string; items: QualityAnswer[]; notes: string | null; signer_name: string | null;
  signature: string | null; completed_by_name: string | null; completed_at: string | null; created_at: string;
};
type Template = { id: string; name: string; description: string | null; items: QualityItem[] };

export function QualitySection({ orderId, businessId, stopId, canManage, readOnly, customerName }: Props) {
  const [fill, setFill] = useState<Template | null>(null);
  const [view, setView] = useState<Checklist | null>(null);
  const [choose, setChoose] = useState(false);

  const { data: lists = [] } = useQuery({
    queryKey: ["quality-checklists", orderId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quality_checklists")
        .select("id, template_name, items, notes, signer_name, signature, completed_by_name, completed_at, created_at")
        .eq("order_id", orderId).order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Checklist[];
    },
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["quality-templates", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quality_templates")
        .select("id, name, description, items").eq("business_id", businessId).eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Template[];
    },
  });

  const start = () => (templates.length === 1 ? setFill(templates[0]) : setChoose(true));

  return (
    <Section icon={<ClipboardCheck className="h-3.5 w-3.5" />} title="Kvalitetssikring" hint={lists.length ? `${lists.length} tjekliste${lists.length === 1 ? "" : "r"}` : "Tjekliste og underskrift"}>
      {lists.length === 0 && <p className="text-sm text-muted-foreground">Ingen tjeklister udfyldt endnu.</p>}
      {lists.length > 0 && (
        <ul className="space-y-2">
          {lists.map((l) => {
            const dev = checklistHasDeviation(l.items);
            return (
              <li key={l.id}>
                <button type="button" onClick={() => setView(l)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {dev ? <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground break-words">{l.template_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {l.completed_at ? format(new Date(l.completed_at), "d. MMM yyyy 'kl.' HH:mm", { locale: da }) : "Ikke afsluttet"}
                      {l.completed_by_name ? ` · ${l.completed_by_name}` : ""}{dev ? " · Afvigelse" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!readOnly && (
        templates.length ? (
          <Button variant="outline" className="mt-3 h-11 w-full gap-2" onClick={start}><Plus className="h-4 w-4" /> Udfyld tjekliste</Button>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{canManage ? "Opret tjeklister under Indstillinger › Håndværk." : "Virksomheden har ikke oprettet tjeklister endnu."}</p>
        )
      )}

      <Dialog open={choose} onOpenChange={setChoose}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Vælg tjekliste</DialogTitle><DialogDescription>Hvilken tjekliste skal udfyldes?</DialogDescription></DialogHeader>
          <div className="space-y-2">
            {templates.map((t) => (
              <Button key={t.id} variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left" onClick={() => { setChoose(false); setFill(t); }}>
                <span><span className="block font-medium">{t.name}</span>{t.description && <span className="block text-xs text-muted-foreground">{t.description}</span>}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {fill && (
        <FillDialog template={fill} orderId={orderId} businessId={businessId} stopId={stopId ?? null}
          defaultSigner={customerName ?? ""} onClose={() => setFill(null)} />
      )}
      {view && <ViewDialog list={view} onClose={() => setView(null)} />}
    </Section>
  );
}

function FillDialog({ template, orderId, businessId, stopId, defaultSigner, onClose }: {
  template: Template; orderId: string; businessId: string; stopId: string | null; defaultSigner: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [items, setItems] = useState<QualityAnswer[]>(() => template.items.map((i) => ({ ...i, value: "" })));
  const [notes, setNotes] = useState("");
  const [signer, setSigner] = useState(defaultSigner);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const problems = checklistProblems(items);
  const set = (id: string, value: string) => setItems((p) => p.map((i) => (i.id === id ? { ...i, value } : i)));

  const save = async () => {
    if (problems.length) { toast.error(`Mangler: ${problems.slice(0, 3).join(", ")}`); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: emp } = await supabase.from("employees").select("name").eq("user_id", u.user?.id ?? "").eq("business_id", businessId).maybeSingle();
    const { data: prof } = emp ? { data: null } : await supabase.from("profiles").select("full_name").eq("id", u.user?.id ?? "").maybeSingle();
    const { error } = await supabase.from("quality_checklists").insert({
      business_id: businessId, order_id: orderId, stop_id: stopId, template_id: template.id, template_name: template.name,
      items: items as any, notes: notes.trim() || null, signer_name: signer.trim() || null, signature,
      completed_by: u.user?.id, completed_by_name: emp?.name ?? (prof as any)?.full_name ?? null, completed_at: new Date().toISOString(),
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message || "Kunne ikke gemme tjeklisten"); return; }
    qc.invalidateQueries({ queryKey: ["quality-checklists", orderId] });
    toast.success("Tjekliste gemt");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-4 text-left">
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>Punkter med * skal udfyldes.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {items.map((i) => (
            <div key={i.id} className="space-y-2">
              <Label className="text-sm font-medium leading-snug">{i.label}{i.unit ? ` (${i.unit})` : ""}{i.required ? " *" : ""}</Label>
              {i.type === "check" && (
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={i.label}>
                  {CHECK_VALUES.map((c) => (
                    <button key={c.value} type="button" role="radio" aria-checked={i.value === c.value} onClick={() => set(i.id, c.value)}
                      className={cn("min-h-11 rounded-md border px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        i.value === c.value
                          ? c.value === "nej" ? "border-destructive bg-destructive text-destructive-foreground" : "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:border-foreground/40")}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              {i.type === "number" && <Input value={i.value} onChange={(e) => set(i.id, e.target.value)} inputMode="decimal" className="h-11" />}
              {i.type === "text" && <Textarea value={i.value} onChange={(e) => set(i.id, e.target.value)} rows={2} />}
            </div>
          ))}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Bemærkninger til kunden</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
            <Label className="text-sm font-medium">Kundens underskrift (valgfri)</Label>
            <Input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Navn" className="h-11" aria-label="Navn på den der skriver under" />
            <SignaturePad onChange={setSignature} />
          </div>
        </div>
        <div className="flex gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="h-11 flex-1" onClick={onClose}>Annullér</Button>
          <Button className="h-11 flex-1" disabled={busy} onClick={save}>{busy ? "Gemmer…" : "Gem tjekliste"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SignaturePad({ onChange }: { onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = r.width * 2; c.height = r.height * 2;
    const ctx = c.getContext("2d")!; ctx.scale(2, 2); ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a";
  }, []);

  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const down = (e: React.PointerEvent) => { drawing.current = true; ref.current!.setPointerCapture(e.pointerId); const p = pos(e); const ctx = ref.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const p = pos(e); const ctx = ref.current!.getContext("2d")!; ctx.lineTo(p.x, p.y); ctx.stroke(); setEmpty(false); };
  const up = () => { if (!drawing.current) return; drawing.current = false; onChange(ref.current!.toDataURL("image/png")); };
  const clear = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setEmpty(true); onChange(null); };

  return (
    <div>
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        className="h-32 w-full touch-none rounded-md border border-dashed border-border bg-white" aria-label="Underskriftsfelt" />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{empty ? "Skriv med fingeren" : "Underskrevet"}</span>
        {!empty && <Button variant="ghost" className="h-11" onClick={clear}>Ryd</Button>}
      </div>
    </div>
  );
}

function ViewDialog({ list, onClose }: { list: Checklist; onClose: () => void }) {
  const label = (i: QualityAnswer) => i.type === "check" ? (CHECK_VALUES.find((c) => c.value === i.value)?.label ?? "–") : (i.value || "–") + (i.value && i.unit ? ` ${i.unit}` : "");
  const print = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    w.document.write(`<html><head><title>${esc(list.template_name)}</title><style>body{font-family:Verdana,sans-serif;padding:32px;color:#0f172a;line-height:1.5}td{padding:6px 8px;border-bottom:1px solid #e2e8f0}table{border-collapse:collapse;width:100%}</style></head><body>
      <h1 style="font-size:20px">${esc(list.template_name)}</h1>
      <p>${list.completed_at ? esc(format(new Date(list.completed_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: da })) : ""}${list.completed_by_name ? " · Udført af " + esc(list.completed_by_name) : ""}</p>
      <table>${list.items.map((i) => `<tr><td>${esc(i.label)}</td><td><b>${esc(label(i))}</b></td></tr>`).join("")}</table>
      ${list.notes ? `<p><b>Bemærkninger:</b> ${esc(list.notes)}</p>` : ""}
      ${list.signature ? `<p><b>Underskrift${list.signer_name ? " – " + esc(list.signer_name) : ""}:</b><br/><img src="${list.signature}" style="height:90px"/></p>` : ""}
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-4 text-left">
          <DialogTitle>{list.template_name}</DialogTitle>
          <DialogDescription>
            {list.completed_at ? format(new Date(list.completed_at), "d. MMMM yyyy 'kl.' HH:mm", { locale: da }) : "Ikke afsluttet"}
            {list.completed_by_name ? ` · ${list.completed_by_name}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <dl className="divide-y divide-border">
            {list.items.map((i) => (
              <div key={i.id} className="flex items-start justify-between gap-4 py-2">
                <dt className="text-sm text-foreground">{i.label}</dt>
                <dd className={cn("shrink-0 text-sm font-semibold", i.value === "nej" ? "text-destructive" : "text-foreground")}>{label(i)}</dd>
              </div>
            ))}
          </dl>
          {list.notes && <p className="mt-3 text-sm"><span className="font-semibold">Bemærkninger:</span> {list.notes}</p>}
          {list.signature && (
            <div className="mt-3">
              <p className="text-sm font-semibold">Underskrift{list.signer_name ? ` – ${list.signer_name}` : ""}</p>
              <img src={list.signature} alt="Kundens underskrift" className="mt-1 h-24 rounded border border-border bg-white" />
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <Button variant="outline" className="h-11 flex-1" onClick={onClose}>Luk</Button>
          <Button className="h-11 flex-1 gap-2" onClick={print}><Printer className="h-4 w-4" /> Print / PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
