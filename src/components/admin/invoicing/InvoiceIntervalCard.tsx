import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/price-format";
import { describeInvoiceInterval, type InvoiceIntervalValue } from "@/lib/invoice-interval";
import { InvoiceIntervalPicker } from "./InvoiceIntervalPicker";

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("da-DK", { day: "numeric", month: "short" });

/** Regnskab: virksomhedens standard-fakturainterval + kommende samlede fakturaer. */
export function InvoiceIntervalCard({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const [value, setValue] = useState<InvoiceIntervalValue>({ interval: "per_visit", count: null, unit: null });
  const [saved, setSaved] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);

  const { data: integ } = useQuery({
    queryKey: ["invoice-interval-default", businessId],
    queryFn: async () => {
      const { data } = await supabase.from("accounting_integrations")
        .select("invoice_interval, invoice_interval_count, invoice_interval_unit").eq("business_id", businessId).maybeSingle();
      return data;
    },
  });
  useEffect(() => {
    if (!integ) return;
    const v = { interval: (integ.invoice_interval ?? "per_visit") as any, count: integ.invoice_interval_count, unit: integ.invoice_interval_unit as any };
    setValue(v); setSaved(JSON.stringify(v));
  }, [integ]);

  const { data: batches = [] } = useQuery({
    queryKey: ["invoice-batches", businessId],
    queryFn: async () => {
      const { data } = await supabase.from("invoice_batches")
        .select("id, customer_name, customer_email, period_start, period_end, status, invoice_interval, interval_count, interval_unit, invoice_batch_items(amount)")
        .eq("business_id", businessId).in("status", ["open", "queued", "processing"])
        .order("period_end", { ascending: true }).limit(50);
      return (data ?? []) as any[];
    },
  });

  const dirty = JSON.stringify(value) !== saved;
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("accounting_integrations")
      .update({ invoice_interval: value.interval ?? "per_visit", invoice_interval_count: value.count, invoice_interval_unit: value.unit })
      .eq("business_id", businessId);
    setSaving(false);
    if (error) { toast.error("Kunne ikke gemme fakturainterval", { description: error.message }); return; }
    setSaved(JSON.stringify(value));
    toast.success("Fakturainterval gemt", { description: "Gælder nye udførte besøg. Kunder og aftaler med eget valg beholder det." });
    qc.invalidateQueries({ queryKey: ["invoice-interval-default", businessId] });
  };

  const invoiceNow = async (id: string) => {
    setClosing(id);
    const { error } = await supabase.rpc("close_due_invoice_batches", { _batch_id: id });
    setClosing(null);
    if (error) { toast.error("Kunne ikke fakturere nu", { description: error.message }); return; }
    toast.success("Den samlede faktura bliver lavet nu", { description: "Den lander som kladde i jeres regnskabsprogram." });
    qc.invalidateQueries({ queryKey: ["invoice-batches", businessId] });
  };

  return (
    <section className="service-panel-card space-y-4 rounded-[5px] border border-border bg-card p-4 shadow-sm sm:p-5">
      <header className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent"><Receipt className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">Fakturainterval</h3>
          <p className="text-sm text-muted-foreground">Hvor ofte udførte besøg samles på én faktura pr. kunde. Kan ændres for den enkelte kunde og aftale.</p>
        </div>
      </header>
      <InvoiceIntervalPicker value={value} onChange={setValue} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Fakturaen lander som kladde i regnskabsprogrammet, så I kan kontrollere den.</p>
        <Button className="h-11" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? "Gem fakturainterval" : "Gemt"}
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="mb-2 text-sm font-semibold text-foreground">Kommende samlede fakturaer</h4>
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen endnu. Når et besøg udføres hos en kunde med samlet fakturering, vises det her.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {batches.map((b) => {
              const items = b.invoice_batch_items ?? [];
              const total = items.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{b.customer_name || b.customer_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} {items.length === 1 ? "besøg" : "besøg"} · {formatPrice(total)} uden moms · {describeInvoiceInterval({ interval: b.invoice_interval, count: b.interval_count, unit: b.interval_unit })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.status === "open" ? `Faktureres efter ${fmtDate(b.period_end)}` : "Bliver lavet nu…"}
                    </p>
                  </div>
                  {b.status === "open" && (
                    <Button variant="outline" className="h-11" onClick={() => invoiceNow(b.id)} disabled={closing === b.id}>
                      {closing === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fakturér nu"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
