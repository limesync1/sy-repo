// Virksomhedens materialeliste: tilføj, ret og slet varer, og upload
// prisfiler fra grossister (Solar, Sanistål m.fl.) som CSV.
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Package, Pencil, Plus, Search, Trash2, Truck, X } from "lucide-react";
import { TradeIcon } from "@/components/trade/TradeIcon";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "@/components/route-planner/SheetSection";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WHOLESALERS, catalogKey, displaySku, formatKr, parseDanishNumber, parsePriceFile } from "@/lib/trade-modules";

type Row = { id: string; supplier: string; sku: string; name: string; unit: string; cost_price: number; sale_price: number };

export function MaterialCatalogDialog({ open, onOpenChange, businessId, wholesaler }: {
  open: boolean; onOpenChange: (o: boolean) => void; businessId: string; wholesaler: boolean;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", sku: "", unit: "stk", cost: "", sale: "" });
  const [supplier, setSupplier] = useState<string>("Solar");
  const [markup, setMarkup] = useState("25");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("alle");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["material-catalog", businessId, q, filter],
    enabled: open,
    queryFn: async () => {
      let qb = supabase.from("material_catalog").select("id, supplier, sku, name, unit, cost_price, sale_price", { count: "exact" })
        .eq("business_id", businessId).eq("is_active", true);
      const t = q.trim().replace(/[%,()]/g, " ");
      if (filter !== "alle") qb = qb.eq("supplier", filter);
      if (t) qb = qb.or(`name.ilike.%${t}%,sku.ilike.%${t}%`);
      const { data, count, error } = await qb.order("name").limit(100);
      if (error) throw error;
      return { rows: (data ?? []) as Row[], count: count ?? 0 };
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["material-catalog", businessId] }); qc.invalidateQueries({ queryKey: ["trade-counts", businessId] }); };

  const resetForm = () => { setForm({ name: "", sku: "", unit: "stk", cost: "", sale: "" }); setEditId(null); };
  const startEdit = (r: Row) => {
    setEditId(r.id);
    setForm({ name: r.name, sku: displaySku(r.sku), unit: r.unit, cost: String(r.cost_price).replace(".", ","), sale: String(r.sale_price).replace(".", ",") });
  };
  const cost = parseDanishNumber(form.cost) ?? 0;
  const sale = parseDanishNumber(form.sale);
  const margin = sale && sale > 0 && cost > 0 ? Math.round(((sale - cost) / cost) * 100) : null;
  const applyMarkup = () => {
    if (cost > 0) setForm((f) => ({ ...f, sale: (cost * (1 + (Number(markup) || 0) / 100)).toFixed(2).replace(".", ",") }));
  };

  const add = async () => {
    if (!form.name.trim() || sale == null) { toast.error("Skriv navn og salgspris uden moms"); return; }
    setBusy(true);
    const payload = { name: form.name.trim(), unit: form.unit.trim() || "stk", cost_price: cost, sale_price: sale };
    const { error } = editId
      ? await supabase.from("material_catalog").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editId)
      : await supabase.from("material_catalog").insert({ ...payload, business_id: businessId, supplier: "Egen", sku: catalogKey(form.sku, form.name) });
    setBusy(false);
    if (error) { toast.error(error.message.includes("material_catalog_sku_uq") ? "Materialet findes allerede på listen" : "Kunne ikke gemme"); return; }
    toast.success(editId ? "Materiale opdateret" : "Materiale tilføjet");
    resetForm(); refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("material_catalog").update({ is_active: false }).eq("id", id);
    if (error) { toast.error("Kunne ikke slette"); return; }
    if (editId === id) resetForm();
    refresh(); toast.success("Materiale fjernet");
  };

  const importFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) { toast.error("Filen er for stor (maks. 15 MB)"); return; }
    const text = await file.text();
    const res = parsePriceFile(text, Number(markup) || 0);
    if (res.error) { toast.error(res.error); return; }
    if (!res.rows.length) { toast.error("Ingen varer fundet i filen"); return; }
    setBusy(true);
    const now = new Date().toISOString();
    // Dubletter i samme fil: sidste linje vinder.
    const byKey = new Map(res.rows.map((r) => [catalogKey(r.sku, r.name), r]));
    const all = [...byKey.entries()].map(([sku, r]) => ({ ...r, sku, business_id: businessId, supplier, is_active: true, updated_at: now }));
    try {
      for (let i = 0; i < all.length; i += 500) {
        const { error } = await supabase.from("material_catalog").upsert(all.slice(i, i + 500), { onConflict: "business_id,supplier,sku" });
        if (error) throw error;
      }
      toast.success(`${res.rows.length} varer indlæst fra ${supplier}${res.skipped ? ` · ${res.skipped} linjer sprunget over` : ""}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke indlæse prisfilen");
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="modal-large planner-overlay flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-md p-0 sm:max-h-[92vh]" onOpenAutoFocus={(e) => { if (window.matchMedia("(pointer: coarse)").matches) e.preventDefault(); }}>
        <DialogHeader className="planner-overlay-header shrink-0 space-y-0 border-b px-4 py-3.5 pr-12 sm:py-4 text-left sm:px-5">
          <SheetHeaderBlock
            icon={<TradeIcon name="materialList" className="h-14 w-14" />}
            iconClassName="h-14 w-14 rounded-none !bg-transparent ring-0"
            title={<DialogTitle className="text-base">Materialeliste</DialogTitle>}
            description={<DialogDescription className="text-xs leading-snug">Alle priser er uden moms. Medarbejderne vælger herfra på opgaven.</DialogDescription>}
          />
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-secondary/20 p-3 sm:p-4">
          <Section icon={editId ? <Pencil /> : <Plus />} tone="primary" title={editId ? "Ret materiale" : "Tilføj materiale"}
            hint={editId ? <button type="button" onClick={resetForm} className="inline-flex min-h-8 items-center gap-1 text-[11px] font-medium text-foreground underline-offset-2 hover:underline"><X className="h-3 w-3" /> Annullér</button> : undefined}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <div className="col-span-2 sm:col-span-4"><Field label="Navn" required><Input className="h-11" placeholder="Fx PEX-rør 16 mm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field></div>
              <div className="sm:col-span-1"><Field label="Varenr." optional><Input className="h-11" disabled={!!editId} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field></div>
              <div className="sm:col-span-1"><Field label="Enhed"><Input className="h-11" placeholder="stk" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field></div>
              <div className="sm:col-span-3"><Field label="Kostpris (kr.)" optional><Input className="h-11" inputMode="decimal" placeholder="0,00" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} onBlur={() => !form.sale && applyMarkup()} /></Field></div>
              <div className="sm:col-span-3"><Field label="Salgspris (kr.)" required hint={margin != null ? `Avance ${margin} %` : undefined}><Input className="h-11" inputMode="decimal" placeholder="0,00" value={form.sale} onChange={(e) => setForm({ ...form, sale: e.target.value })} /></Field></div>
            </div>
            <p className="text-xs text-muted-foreground">Tip: skriv kostprisen først, så foreslår vi salgsprisen med jeres avance på {markup || 0} %.</p>
          </Section>

          {wholesaler && (
            <Section icon={<Truck />} tone="sky" title="Prisfil fra grossist" hint="CSV, maks. 15 MB">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Hent prisfilen med jeres aftalepriser hos grossisten. Den skal have varenummer, beskrivelse, enhed og nettopris. Mangler der salgspris, lægger vi jeres avance oveni. Varer med samme varenummer bliver opdateret.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                <Field label="Grossist">
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{WHOLESALERS.filter((w) => w !== "Egen").map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Avance %"><Input value={markup} onChange={(e) => setMarkup(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="h-11" /></Field>
                <div>
                  <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
                  <Button className="h-11 w-full gap-2" disabled={busy} onClick={() => fileRef.current?.click()}>
                    <FileUp className="h-4 w-4" /> {busy ? "Indlæser…" : "Vælg prisfil"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Vil I have en direkte forbindelse til grossisten? Skriv til kontakt@serviceydere.dk, så finder vi en løsning sammen.</p>
            </Section>
          )}

          <Section icon={<Package />} title="Varer" hint={data ? `${data.count.toLocaleString("da-DK")} i alt` : undefined}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg på navn eller varenummer" className="h-11 pl-9" aria-label="Søg i materialer" />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-11 sm:w-44" aria-label="Vis leverandør"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle leverandører</SelectItem>
                  {WHOLESALERS.map((w) => <SelectItem key={w} value={w}>{w === "Egen" ? "Egne varer" : w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isLoading ? <p className="py-6 text-center text-sm text-muted-foreground">Henter materialer …</p> : !data?.rows.length ? (
              <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
                <Package className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="mt-2 text-sm font-medium text-foreground">{q || filter !== "alle" ? "Ingen varer matcher" : "Ingen materialer endnu"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{q || filter !== "alle" ? "Prøv en anden søgning." : "Tilføj jeres første materiale ovenfor."}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
                {data.rows.map((r) => {
                  const c = Number(r.cost_price), sp = Number(r.sale_price);
                  const m = c > 0 ? Math.round(((sp - c) / c) * 100) : null;
                  return (
                    <li key={r.id} className={`flex items-center gap-2 px-3 py-2 ${editId === r.id ? "bg-secondary/60" : ""}`}>
                      <button type="button" onClick={() => startEdit(r)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-medium text-foreground">{r.name}</span>
                          <span className="block text-xs text-muted-foreground">{[r.supplier === "Egen" ? "Egen vare" : r.supplier, displaySku(r.sku)].filter(Boolean).join(" · ")}{c > 0 ? ` · kostpris ${formatKr(c)}` : ""}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold tabular-nums text-foreground">{formatKr(sp)}</span>
                          <span className="block text-[11px] text-muted-foreground">pr. {r.unit}{m != null ? ` · ${m} %` : ""}</span>
                        </span>
                      </button>
                      <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Slet ${r.name}`} onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {data && data.count > data.rows.length && <p className="text-xs text-muted-foreground">Viser de første 100 – søg for at finde flere.</p>}
          </Section>
        </div>
        <SheetFooterBar>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)}>Luk</Button>
            <Button className="h-11 gap-2" disabled={busy} onClick={add}>
              {editId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{busy ? "Gemmer…" : editId ? "Gem ændringer" : "Tilføj materiale"}
            </Button>
          </div>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
}
