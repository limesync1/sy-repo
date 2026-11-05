import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MessageSquare, Plus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/billing/PaymentTestModeBanner";
import { SMS_FREE_PER_MONTH, SMS_PACKS, type SmsPackId } from "@/lib/sms-packs";

export function defaultSender(name: string): string {
  const map: Record<string, string> = { æ: "ae", ø: "oe", å: "aa", Æ: "Ae", Ø: "Oe", Å: "Aa" };
  const s = name.replace(/[æøåÆØÅ]/g, (c) => map[c]).replace(/\b(ApS|A\/S|IVS|I\/S)\b/gi, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 11);
  return s.length >= 3 ? s : "Serviceyder";
}

async function readFnError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try { return (await error.context.json()).error ?? error.message; } catch { /* ignore */ }
  }
  return error instanceof Error ? error.message : String(error);
}

interface Props {
  businessId: string;
  businessName: string;
  smsEnabled: boolean;
  onSmsEnabledChange: (v: boolean) => void;
}

export default function SmsSetupCard({ businessId, businessName, smsEnabled, onSmsEnabledChange }: Props) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["sms-setup", businessId],
    queryFn: async () => {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [cfg, log] = await Promise.all([
        supabase.from("business_sms_settings").select("sender_name, credits").eq("business_id", businessId).maybeSingle(),
        supabase.from("sms_messages").select("status, segments, kind").eq("business_id", businessId).gte("created_at", monthStart.toISOString()),
      ]);
      const used = (log.data ?? []).filter((r) => r.status !== "failed" && r.kind !== "test").reduce((s, r) => s + (r.segments ?? 1), 0);
      return {
        sender: cfg.data?.sender_name ?? "",
        credits: cfg.data?.credits ?? 0,
        freeLeft: Math.max(0, SMS_FREE_PER_MONTH - used),
        failed: (log.data ?? []).filter((r) => r.status === "failed").length,
      };
    },
  });

  const [sender, setSender] = useState("");
  const [testing, setTesting] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  useEffect(() => {
    if (data) setSender(data.sender || defaultSender(businessName));
  }, [data, businessName]);

  // Vender tilbage fra betaling: vis bekræftelse og opdatér saldo.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sms_paid") !== "1") return;
    toast.success("Tak! SMS'erne bliver lagt på jeres konto om et øjeblik.");
    params.delete("sms_paid");
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
    const t = window.setTimeout(() => qc.invalidateQueries({ queryKey: ["sms-setup", businessId] }), 2500);
    return () => window.clearTimeout(t);
  }, [businessId, qc]);

  const senderValid = /^[A-Za-z0-9]{3,11}$/.test(sender);
  const saveSender = async () => {
    if (!senderValid || sender === data?.sender) return;
    const { error } = await supabase.from("business_sms_settings").upsert({ business_id: businessId, sender_name: sender });
    if (error) return toast.error(error.message);
    toast.success("Afsendernavn gemt");
    qc.invalidateQueries({ queryKey: ["sms-setup", businessId] });
  };

  const test = async () => {
    setTesting(true);
    await saveSender();
    const { data: res, error } = await supabase.functions.invoke("send-sms", { body: { businessId } });
    setTesting(false);
    if (error) return toast.error(`Test-SMS fejlede: ${await readFnError(error)}`);
    if (res?.ok) toast.success("Test-SMS sendt til virksomhedens telefon");
    qc.invalidateQueries({ queryKey: ["sms-setup", businessId] });
  };

  const total = (data?.freeLeft ?? 0) + (data?.credits ?? 0);

  return (
    <section className="rounded-xl border border-border bg-card">
      <label className="flex cursor-pointer items-center gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <MessageSquare className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">SMS til kunder</span>
          <span className="block text-sm text-muted-foreground">Vi sender for jer. I skal ikke oprette noget.</span>
        </span>
        <Switch checked={smsEnabled} onCheckedChange={onSmsEnabledChange} aria-label="SMS til kunder" />
      </label>

      {smsEnabled && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{total} <span className="text-base font-medium">SMS tilbage</span></p>
              <p className="text-sm text-muted-foreground">
                {data?.freeLeft ?? 0} gratis denne måned{data?.credits ? ` + ${data.credits} købte` : ""}. Købte SMS udløber aldrig.
              </p>
              {!!data?.failed && <p className="text-sm text-destructive">{data.failed} SMS fejlede denne måned – tjek telefonnumrene.</p>}
            </div>
            <Button onClick={() => setBuyOpen(true)} className="min-h-11 shrink-0">
              <Plus className="h-4 w-4" /> Køb flere SMS
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label htmlFor="sms-sender" className="mb-1.5 block text-sm font-medium text-foreground">Afsender på kundens telefon</label>
              <Input id="sms-sender" value={sender} maxLength={11} className="h-11"
                onChange={(e) => setSender(e.target.value.replace(/[^A-Za-z0-9]/g, ""))} onBlur={saveSender} />
              <p className={cn("mt-1 text-xs", senderValid ? "text-muted-foreground" : "text-destructive")}>
                3–11 bogstaver eller tal, uden mellemrum og æ/ø/å.
              </p>
            </div>
            <Button variant="outline" onClick={test} disabled={testing || !senderValid} className="min-h-11 sm:mb-5">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send test til os selv
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Når SMS'erne er brugt, får kunderne stadig e-mail. Kun danske og nordiske numre. Højst 5 SMS pr. kunde pr. døgn.
          </p>
        </div>
      )}

      <BuySmsDialog open={buyOpen} onClose={() => setBuyOpen(false)} businessId={businessId} />
    </section>
  );
}

function BuySmsDialog({ open, onClose, businessId }: { open: boolean; onClose: () => void; businessId: string }) {
  const [pack, setPack] = useState<SmsPackId>("sms_500");
  const [checkout, setCheckout] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!open) { setCheckout(false); setError(null); } }, [open]);

  const fetchClientSecret = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("sms_paid", "1");
    const { data, error: err } = await supabase.functions.invoke("buy-sms-credits", {
      body: { businessId, packId: pack, environment: getStripeEnvironment(), returnUrl: url.toString() },
    });
    if (err || !data?.clientSecret) {
      const msg = err ? await readFnError(err) : "Betalingen kunne ikke startes";
      setError(msg);
      throw new Error(msg);
    }
    return data.clientSecret as string;
  }, [businessId, pack]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Køb flere SMS</DialogTitle>
          <DialogDescription>Betal én gang. SMS'erne udløber aldrig. Priser uden moms.</DialogDescription>
        </DialogHeader>
        <PaymentTestModeBanner />
        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {!checkout ? (
          <div className="space-y-3">
            <div role="radiogroup" aria-label="Vælg pakke" className="grid gap-2">
              {SMS_PACKS.map((p) => {
                const active = p.id === pack;
                return (
                  <button key={p.id} type="button" role="radio" aria-checked={active} onClick={() => setPack(p.id)}
                    className={cn("flex min-h-14 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                      active ? "border-foreground bg-foreground/[0.04]" : "border-border hover:border-foreground/40")}>
                    <span className="flex items-center gap-2">
                      {active ? <CheckCircle2 className="h-5 w-5 text-foreground" /> : <span className="h-5 w-5 rounded-full border border-border" />}
                      <span className="font-semibold text-foreground">{p.credits} SMS</span>
                      {"popular" in p && p.popular && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">Mest valgt</span>}
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular-nums text-foreground">{p.priceDkk} kr.</span>
                      <span className="block text-xs text-muted-foreground">{(p.priceDkk / p.credits).toFixed(2).replace(".", ",")} kr./SMS</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Button className="min-h-11 w-full" onClick={() => { setError(null); setCheckout(true); }}>Gå til betaling</Button>
          </div>
        ) : !error && (
          <div className="min-h-[400px]">
            <EmbeddedCheckoutProvider key={pack} stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
