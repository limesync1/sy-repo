// Materialer brugt på en opgave. Medarbejdere vælger fra virksomhedens
// materialeliste (prisen sættes af serveren); ejeren kan også tilføje frie linjer.
// Linjerne kommer med på fakturaen til e-conomic/Dinero.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/route-planner/SheetSection";
import { formatKr, parseDanishNumber } from "@/lib/trade-modules";

type Props = { orderId: string; businessId: string; stopId?: string | null; canManage?: boolean; readOnly?: boolean };

type MatRow = { id: string; name: string; unit: string; quantity: number; unit_price: number; added_by: string | null; added_by_name: string | null };
type CatRow = { id: string; name: string; unit: string; sale_price: number; sku: string; supplier: string };

export function MaterialsSection({ orderId, businessId, stopId, canManage, readOnly }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [qty, setQty] = useState("1");
  const [free, setFree] = useState({ name: "", unit: "stk", price: "" });
  const [busy, setBusy] = useState(false);

  const key = ["order-materials", orderId, stopId ?? null];
  const { data: rows = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let qb = supabase.from("order_materials").select("id, name, unit, quantity, unit_price, added_by, added_by_name").eq("order_id", orderId);
      if (!canManage && stopId) qb = qb.eq("stop_id", stopId);
      const { data, error } = await qb.order("created_at");
      if (error) throw error;
      return (data ?? []) as MatRow[];
    },
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ["material-catalog-search", businessId, q],
    enabled: adding && q.trim().length >= 2,
    queryFn: async () => {
      const term = q.trim().replace(/[%,()]/g, " ");
      const { data, error } = await supabase.from("material_catalog")
        .select("id, name, unit, sale_price, sku, supplier").eq("business_id", businessId).eq("is_active", true)
        .or(`name.ilike.%${term}%,sku.ilike.%${term}%`).order("name").limit(12);
      if (error) throw error;
      return (data ?? []) as CatRow[];
    },
  });

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.quantity) * Number(r.unit_price), 0), [rows]);

  const insert = async (payload: Record<string, unknown>) => {
    const quantity = parseDanishNumber(qty);
    if (!quantity || quantity <= 0) { toast.error("Skriv et antal større end 0"); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: emp } = await supabase.from("employees").select("name").eq("user_id", u.user?.id ?? "").eq("business_id", businessId).maybeSingle();
    const { error } = await supabase.from("order_materials").insert({
      business_id: businessId, order_id: orderId, stop_id: stopId ?? null, quantity,
      added_by: u.user?.id, added_by_name: emp?.name ?? null, name: "", ...payload,
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message || "Kunne ikke tilføje materialet"); return; }
    setQ(""); setQty("1"); setFree({ name: "", unit: "stk", price: "" });
    qc.invalidateQueries({ queryKey: ["order-materials", orderId] });
    toast.success("Materiale tilføjet");
  };

  const addFree = () => {
    const price = parseDanishNumber(free.price);
    if (!free.name.trim() || price == null || price < 0) { toast.error("Skriv navn og pris uden moms"); return; }
    void insert({ name: free.name.trim(), unit: free.unit.trim() || "stk", unit_price: price });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("order_materials").delete().eq("id", id);
    if (error) { toast.error("Kunne ikke fjerne materialet"); return; }
    qc.invalidateQueries({ queryKey: ["order-materials", orderId] });
  };

  return (
    <Section icon={<Package className="h-3.5 w-3.5" />} title="Materialer" hint={rows.length ? `I alt ${formatKr(total)} uden moms` : "Kommer med på fakturaen"}>
      {rows.length === 0 && !adding && <p className="text-sm text-muted-foreground">Ingen materialer registreret endnu.</p>}
      {rows.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {rows.map((r) => {
            const mine = canManage || !!r.added_by;
            return (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground break-words">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(r.quantity).toLocaleString("da-DK")} {r.unit} × {formatKr(Number(r.unit_price))}
                    {r.added_by_name ? ` · ${r.added_by_name}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatKr(Number(r.quantity) * Number(r.unit_price))}</span>
                {!readOnly && mine && (
                  <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Fjern ${r.name}`} onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && !adding && (
        <Button variant="outline" className="mt-3 h-11 w-full gap-2" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Tilføj materiale
        </Button>
      )}

      {!readOnly && adding && (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-card p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg i materialelisten (navn eller varenr.)" className="h-11 pl-9" aria-label="Søg materiale" />
            </div>
            <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className="h-11 w-20" aria-label="Antal" />
          </div>
          {q.trim().length >= 2 && (
            catalog.length ? (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {catalog.map((c) => (
                  <li key={c.id}>
                    <button type="button" disabled={busy} onClick={() => insert({ catalog_id: c.id })}
                      className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-foreground break-words">{c.name}</span>
                        <span className="block text-xs text-muted-foreground">{[c.supplier, c.sku].filter(Boolean).join(" · ")} · pr. {c.unit}</span>
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums">{formatKr(Number(c.sale_price))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Ingen materialer fundet{canManage ? " – tilføj en fri linje nedenfor." : "."}</p>
          )}
          {canManage && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground">Fri linje (ikke på listen)</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_7rem]">
                <Input value={free.name} onChange={(e) => setFree({ ...free, name: e.target.value })} placeholder="Navn" className="h-11" aria-label="Navn" />
                <Input value={free.unit} onChange={(e) => setFree({ ...free, unit: e.target.value })} placeholder="Enhed" className="h-11" aria-label="Enhed" />
                <Input value={free.price} onChange={(e) => setFree({ ...free, price: e.target.value })} placeholder="Pris u. moms" inputMode="decimal" className="h-11" aria-label="Pris uden moms" />
              </div>
              <Button className="h-11 w-full" disabled={busy} onClick={addFree}>Tilføj fri linje</Button>
            </div>
          )}
          <Button variant="ghost" className="h-11 w-full" onClick={() => { setAdding(false); setQ(""); }}>Luk</Button>
        </div>
      )}
    </Section>
  );
}
