import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { KeyRound, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { Field, detectStripeMode } from "./shared";

interface Props {
  s: any;
  set: (k: string, v: any) => void;
  errors: Record<string, string>;
}

export default function PaymentTab({ s, set, errors }: Props) {
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const pubMode = detectStripeMode(s.stripe_publishable_key || "", "pk");
  const secMode = detectStripeMode(s.stripe_secret_key || "", "sk");
  const whMode = (s.stripe_webhook_secret || "").startsWith("whsec_")
    ? { mode: "Gyldig", tone: "bg-emerald-500/10 text-emerald-700" }
    : (s.stripe_webhook_secret ? { mode: "Ugyldig", tone: "bg-destructive/10 text-destructive" } : null);

  const verifyStripe = async () => {
    if (!s.stripe_secret_key) { toast.error("Indtast en secret key først"); return; }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-stripe-key", {
        body: { secret_key: s.stripe_secret_key },
      });
      if (error) throw error;
      setVerifyResult(data);
      if (data?.ok) toast.success(`Stripe-konto bekræftet: ${data.business_name || data.account_id}`);
      else toast.error(data?.error || "Nøglen kunne ikke bekræftes");
    } catch (e: any) {
      toast.error("Kunne ikke kontakte verifikations-tjenesten", { description: e.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SectionCard
      title="Stripe API-nøgler"
      icon={<KeyRound />}
      description="Bruges til at opkræve betaling for virksomhedsabonnementer. Secret og webhook gemmes krypteret og vises maskeret."
    >
      <Field label="Publishable key (pk_live_… / pk_test_…)" v={s.stripe_publishable_key || ""} on={(v) => set("stripe_publishable_key", v)} badge={pubMode} error={errors.stripe_publishable_key} />
      <Field
        label="Secret key (sk_live_… / sk_test_…)"
        v={s.stripe_secret_key || ""} on={(v) => set("stripe_secret_key", v)}
        type={showSecret ? "text" : "password"} badge={secMode} error={errors.stripe_secret_key}
        rightAction={
          <button type="button" onClick={() => setShowSecret((v) => !v)} className="text-muted-foreground hover:text-foreground" aria-label={showSecret ? "Skjul" : "Vis"}>
            {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        }
      />
      <Field
        label="Webhook signing secret (whsec_…)"
        v={s.stripe_webhook_secret || ""} on={(v) => set("stripe_webhook_secret", v)}
        type={showWebhook ? "text" : "password"} badge={whMode} error={errors.stripe_webhook_secret}
        rightAction={
          <button type="button" onClick={() => setShowWebhook((v) => !v)} className="text-muted-foreground hover:text-foreground" aria-label={showWebhook ? "Skjul" : "Vis"}>
            {showWebhook ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        }
      />

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-muted-foreground">
          Ændringer logges automatisk i Aktivitetsloggen — uden at gemme selve nøgleværdien.
        </p>
        <Button variant="outline" size="sm" onClick={verifyStripe} disabled={verifying || !s.stripe_secret_key}>
          {verifying ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
          Verificér nøgle
        </Button>
      </div>

      {verifyResult?.ok && (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <p className="font-semibold">Bekræftet · {verifyResult.mode === "live" ? "Live" : "Test"}-konto</p>
          <p>{verifyResult.business_name || verifyResult.account_id} · {verifyResult.country}</p>
          <p className="opacity-70">charges: {String(verifyResult.charges_enabled)} · payouts: {String(verifyResult.payouts_enabled)}</p>
        </div>
      )}
      {verifyResult && !verifyResult.ok && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Nøglen blev afvist: {verifyResult.error}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-2.5 text-[12px] text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Andre integrationer</p>
        <p>Lovable AI Gateway, Resend (mails), Google Maps, Mapbox og CVR-opslag administreres via <strong>Connectors</strong> i sidemenuen — nøglerne ligger sikkert på serveren og behøver ikke indtastes her. Stripe-nøglerne ovenfor er kun for kundernes abonnements­betalinger.</p>
      </div>

      {pubMode?.mode === "Test" || secMode?.mode === "Test" ? (
        <p className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Test-nøgler aktive — rigtige kort kan ikke opkræves. Skift til <span className="font-mono">live_</span>-nøgler før lancering.
        </p>
      ) : pubMode?.mode === "Live" && secMode?.mode === "Live" ? (
        <p className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Live-nøgler aktive — rigtige betalinger gennemføres.
        </p>
      ) : null}
    </SectionCard>
  );
}