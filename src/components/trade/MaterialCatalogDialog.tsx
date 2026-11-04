// Virksomhedens materialeliste: tilføj, ret og slet varer, og upload
// prisfiler fra grossister (Solar, Sanistål m.fl.) som CSV.
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["material-catalog", businessId, q],
    enabled: open,
    queryFn: async () => {
      let qb = supabase.from("material_catalog").select("id, supplier, sku, name, unit, cost_price, sale_price", { count: "exact" })
        .eq("business_id", businessId).eq("is_active", true);
      const t = q.trim().replace(/[%,()]/g, " ");
      if (t) qb = qb.or(`name.ilike.%${t}%,sku.ilike.%${t}%`);
      const { data, count, error } = await qb.order("name").limit(100);
      if (error) throw error;
      return { rows: (data ?? []) as Row[], count: count ?? 0 };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["material-catalog", businessId] });

  const add = async () => {
    const cost = parseDanishNumber(form.cost) ?? 0;
    const sale = parseDanishNumber(form.sale);
    if (!form.name.trim() || sale == null) { toast.error("Skriv navn og salgspris uden moms"); return; }
    const { error } = await supabase.from("material_catalog").insert({
      business_id: businessId, supplier: "Egen", name: form.name.trim(), sku: catalogKey(form.sku, form.name), unit: form.unit.trim() || "stk", cost_price: cost, sale_price: sale,
    });
    if (error) { toast.error(error.message.includes("material_catalog_sku_uq") ? "Materialet findes allerede på listen" : "Kunne ikke gemme"); return; }
    setForm({ name: "", sku: "", unit: "stk", cost: "", sale: "" });
    refresh(); toast.success("Materiale tilføjet");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("material_catalog").update({ is_active: false }).eq("id", id);
    if (error) { toast.error("Kunne ikke slette"); return; }
    refresh();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-4 text-left">
          <DialogTitle>Materialeliste</DialogTitle>
          <DialogDescription>Priser er uden moms. Medarbejderne vælger herfra, når de registrerer materialer på en opgave.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {wholesaler && (
            <section className="space-y-3 rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-sm font-semibold text-foreground">Upload prisfil fra grossist</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Hent jeres prisfil (CSV) med jeres egne aftalepriser hos grossisten. Filen skal have kolonner for varenummer, beskrivelse, enhed og nettopris.
                Har filen ingen salgspris, lægger vi jeres avance oveni. Varer med samme varenummer opdateres.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto]">
                <div>
                  <Label className="text-xs">Grossist</Label>
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{WHOLESALERS.filter((w) => w !== "Egen").map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Avance %</Label>
                  <Input value={markup} onChange={(e) => setMarkup(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="h-11" />
                </div>
                <div className="flex items-end">
                  <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
                  <Button className="h-11 w-full gap-2" disabled={busy} onClick={() => fileRef.current?.click()}>
                    <FileUp className="h-4 w-4" /> {busy ? "Indlæser…" : "Vælg fil"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Vil I have en direkte forbindelse til jeres grossist, så priserne opdateres automatisk? Kontakt kundeservice på kontakt@serviceydere.dk, så finder vi en løsning sammen.
              </p>
            </section>
          )}

          <section className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Tilføj materiale</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_5rem_1fr_1fr_auto]">
              <Input className="col-span-2 h-11 sm:col-span-1" placeholder="Navn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Navn" />
              <Input className="h-11" placeholder="Varenr." value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} aria-label="Varenummer" />
              <Input className="h-11" placeholder="Enhed" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} aria-label="Enhed" />
              <Input className="h-11" placeholder="Kostpris" inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} aria-label="Kostpris uden moms" />
              <Input className="h-11" placeholder="Salgspris" inputMode="decimal" value={form.sale} onChange={(e) => setForm({ ...form, sale: e.target.value })} aria-label="Salgspris uden moms" />
              <Button className="col-span-2 h-11 gap-1 sm:col-span-1" onClick={add}><Plus className="h-4 w-4" /> Tilføj</Button>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Varer {data ? `(${data.count.toLocaleString("da-DK")})` : ""}</p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg på navn eller varenummer" className="h-11 pl-9" aria-label="Søg i materialer" />
            </div>
            {isLoading ? <p className="text-sm text-muted-foreground">Henter…</p> : !data?.rows.length ? (
              <p className="text-sm text-muted-foreground">Ingen materialer endnu.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {data.rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground break-words">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{[r.supplier, displaySku(r.sku)].filter(Boolean).join(" · ")} · kostpris {formatKr(Number(r.cost_price))} pr. {r.unit}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatKr(Number(r.sale_price))}</span>
                    <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Slet ${r.name}`} onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
            {data && data.count > data.rows.length && <p className="text-xs text-muted-foreground">Viser de første 100 – søg for at finde flere.</p>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
