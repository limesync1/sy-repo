import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { describeInvoiceInterval, type InvoiceIntervalValue } from "@/lib/invoice-interval";
import { InvoiceIntervalPicker } from "./InvoiceIntervalPicker";

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });

/** Aftaledetaljer: fakturainterval for netop denne aftale + status på samlet faktura. Vises kun med regnskabsprogram. */
export function OrderInvoiceInterval({ orderId, businessId }: { orderId: string; businessId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["order-invoice-interval", orderId],
    queryFn: async () => {
      const [{ data: integ }, { data: order }, { data: eff }] = await Promise.all([
        supabase.from("accounting_integrations").select("is_active").eq("business_id", businessId).maybeSingle(),
        supabase.from("orders").select("invoice_interval, invoice_interval_count, invoice_interval_unit, invoice_batch_id, invoice_external_id").eq("id", orderId).maybeSingle(),
        supabase.rpc("resolve_invoice_interval", { _order_id: orderId }),
      ]);
      let batch: any = null;
      if (order?.invoice_batch_id) {
        const { data: b } = await supabase.from("invoice_batches").select("period_end, status").eq("id", order.invoice_batch_id).maybeSingle();
        batch = b;
      }
      return { active: !!integ?.is_active, order, effective: (eff as any)?.[0] ?? null, batch };
    },
    staleTime: 30_000,
  });
  const [value, setValue] = useState<InvoiceIntervalValue>({ interval: null, count: null, unit: null });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data?.order) setValue({ interval: data.order.invoice_interval as any, count: data.order.invoice_interval_count, unit: data.order.invoice_interval_unit as any });
  }, [data?.order]);
  if (!data?.active) return null;

  const saved = data.order;
  const dirty = JSON.stringify(value) !== JSON.stringify({ interval: saved?.invoice_interval ?? null, count: saved?.invoice_interval_count ?? null, unit: saved?.invoice_interval_unit ?? null });
  const eff = data.effective;
  const effLabel = eff ? describeInvoiceInterval({ interval: eff.iv, count: eff.cnt, unit: eff.unit }) : "";
  const source = eff?.source === "order" ? "valgt på aftalen" : eff?.source === "customer" ? "fra kunden" : "virksomhedens standard";
  const status = saved?.invoice_external_id ? "Faktureret"
    : data.batch?.status === "open" ? `Samles på faktura efter ${fmtDate(data.batch.period_end)}`
    : data.batch ? "Samlet faktura bliver lavet" : null;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("orders").update({
      invoice_interval: value.interval as any, invoice_interval_count: value.count, invoice_interval_unit: value.unit,
    }).eq("id", orderId);
    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme fakturainterval", { description: error.message }); return; }
    toast.success("Fakturainterval gemt", { description: "Gælder næste udførte besøg på aftalen." });
    qc.invalidateQueries({ queryKey: ["order-invoice-interval", orderId] });
  };

  return (
    <details className="group rounded-xl border border-border text-xs">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 font-medium text-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>Fakturering: {effLabel}</span>
          <span className="truncate font-normal text-muted-foreground">({source}{status ? ` · ${status}` : ""})</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3">
        <InvoiceIntervalPicker value={value} onChange={setValue} inheritLabel="Brug kundens valg" inheritHint="Ellers virksomhedens standard" />
        <div className="flex justify-end">
          <Button className="h-11" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? "Gem for denne aftale" : "Gemt"}
          </Button>
        </div>
      </div>
    </details>
  );
}
