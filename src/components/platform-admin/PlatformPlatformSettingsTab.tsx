import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, Loader2, KeyRound, Tag, CheckCircle2, AlertCircle, Calculator } from "lucide-react";
import { PageHeader, SectionCard, PrimaryButton, FieldLabel } from "@/components/admin/shared/AdminUI";

/**
 * PlatformSettingsTab — global konfiguration for Serviceydere.
 * Kun synlig for platform-admins. Indeholder Stripe-nøgler og pris-tabel,
 * der bruges af onboarding-flowet til at beregne abonnementspriser.
 */
const PlatformSettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle();
      setS(data || {});
      setLoading(false);
    })();
  }, []);

  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }));
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("platform_settings").update({
      stripe_publishable_key: s.stripe_publishable_key || null,
      stripe_secret_key: s.stripe_secret_key || null,
      stripe_webhook_secret: s.stripe_webhook_secret || null,
      base_price_dkk: Number(s.base_price_dkk) || 0,
      price_route_planning_dkk: Number(s.price_route_planning_dkk) || 0,
      price_accounting_integration_dkk: Number(s.price_accounting_integration_dkk) || 0,
      price_data_import_dkk: Number(s.price_data_import_dkk) || 0,
      price_per_employee_login_dkk: Number(s.price_per_employee_login_dkk) || 0,
      discount_quarterly_pct: Number(s.discount_quarterly_pct) || 0,
      discount_yearly_pct: Number(s.discount_yearly_pct) || 0,
      trial_days: Number(s.trial_days) || 0,
    }).eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Indstillinger gemt");
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Indlæser…</div>;

  // Validerer Stripe-nøgleformat — viser test/live badge så admin er i tvivl.
  const detectStripeMode = (key: string, expectedPrefix: string) => {
    if (!key) return null;
    if (key.startsWith(`${expectedPrefix}_live_`)) return { mode: "Live", tone: "bg-emerald-500/10 text-emerald-700" };
    if (key.startsWith(`${expectedPrefix}_test_`)) return { mode: "Test", tone: "bg-amber-500/10 text-amber-700" };
    return { mode: "Ugyldig", tone: "bg-destructive/10 text-destructive" };
  };
  const pubMode = detectStripeMode(s.stripe_publishable_key || "", "pk");
  const secMode = detectStripeMode(s.stripe_secret_key || "", "sk");
  const whMode = (s.stripe_webhook_secret || "").startsWith("whsec_")
    ? { mode: "Gyldig", tone: "bg-emerald-500/10 text-emerald-700" }
    : (s.stripe_webhook_secret ? { mode: "Ugyldig", tone: "bg-destructive/10 text-destructive" } : null);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform-indstillinger"
        description="Stripe-nøgler, prismodel og prøveperiode for hele platformen."
      />

      <SectionCard
        title="Stripe API-nøgler"
        icon={<KeyRound />}
        description="Bruges til at opkræve betaling for virksomhedsabonnementer. Secret key er kun tilgængelig server-side."
      >
        <Field label="Publishable key (pk_live_… / pk_test_…)" v={s.stripe_publishable_key || ""} on={(v) => set("stripe_publishable_key", v)} badge={pubMode} />
        <Field label="Secret key (sk_live_… / sk_test_…)" v={s.stripe_secret_key || ""} on={(v) => set("stripe_secret_key", v)} type="password" badge={secMode} />
        <Field label="Webhook signing secret (whsec_…)" v={s.stripe_webhook_secret || ""} on={(v) => set("stripe_webhook_secret", v)} type="password" badge={whMode} />
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

      <SectionCard
        title="Pris-tabel (DKK pr. måned)"
        icon={<Tag />}
        description="Tallene her bruges direkte i onboarding når en virksomhed vælger pakke og add-ons."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField label="Basispris" v={s.base_price_dkk} on={(v) => set("base_price_dkk", v)} hint="Inkluderet i alle abonnementer" />
          <NumField label="Ruteplanlægning" v={s.price_route_planning_dkk} on={(v) => set("price_route_planning_dkk", v)} hint="Add-on" />
          <NumField label="Regnskabsintegration" v={s.price_accounting_integration_dkk} on={(v) => set("price_accounting_integration_dkk", v)} hint="Gratis (sat til 0)" />
          <NumField label="Dataimport" v={s.price_data_import_dkk} on={(v) => set("price_data_import_dkk", v)} hint="Engangs / add-on" />
          <NumField label="Per ekstra medarbejderlogin" v={s.price_per_employee_login_dkk} on={(v) => set("price_per_employee_login_dkk", v)} hint="Pris pr. ekstra login" />
          <NumField label="Prøveperiode (dage)" v={s.trial_days} on={(v) => set("trial_days", v)} hint="Gratis dage før første betaling" />
          <NumField label="Kvartalsrabat (%)" v={s.discount_quarterly_pct} on={(v) => set("discount_quarterly_pct", v)} hint="Ved kvartalsbetaling" />
          <NumField label="Årsrabat (%)" v={s.discount_yearly_pct} on={(v) => set("discount_yearly_pct", v)} hint="Ved årlig betaling" />
        </div>
      </SectionCard>

      <SectionCard
        title="Live pris-eksempel"
        icon={<Calculator />}
        description="Sådan ser virksomheden prisen baseret på dine indstillinger ovenfor."
      >
        <PriceExample s={s} />
      </SectionCard>

      <div className="flex justify-end">
        <PrimaryButton onClick={save} disabled={saving} icon={saving ? <Loader2 className="animate-spin" /> : <CreditCard />}>
          Gem indstillinger
        </PrimaryButton>
      </div>
    </div>
  );
};

/* PriceExample — hjælper admin med at se konsekvensen af pris-ændringer
   uden at skulle åbne onboarding-flowet i en ny fane. */
const PriceExample = ({ s }: { s: any }) => {
  const base = Number(s.base_price_dkk) || 0;
  const route = Number(s.price_route_planning_dkk) || 0;
  const acc = Number(s.price_accounting_integration_dkk) || 0;
  const emp = Number(s.price_per_employee_login_dkk) || 0;
  const qDisc = Number(s.discount_quarterly_pct) || 0;
  const yDisc = Number(s.discount_yearly_pct) || 0;
  const monthly = base + route + acc + 2 * emp;
  const fmt = (n: number) => `${Math.round(n).toLocaleString("da-DK")} kr`;
  const rows = [
    { label: "Månedligt", price: monthly, suffix: "/md", note: "Basis + ruteplan + regnskab + 2 ekstra logins" },
    { label: "Kvartalsvist", price: monthly * (1 - qDisc / 100), suffix: "/md", note: `${qDisc}% rabat` },
    { label: "Årligt", price: monthly * (1 - yDisc / 100), suffix: "/md", note: `${yDisc}% rabat` },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{r.label}</p>
            <p className="text-[11px] text-muted-foreground">{r.note}</p>
          </div>
          <p className="text-sm font-bold tabular-nums text-foreground">{fmt(r.price)}<span className="text-xs font-normal text-muted-foreground">{r.suffix}</span></p>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">Eksemplet er beregnet ud fra din nuværende pris-tabel. Prøveperiode på {Number(s.trial_days) || 0} dage før første opkrævning.</p>
    </div>
  );
};

const Field = ({ label, v, on, type = "text", badge }: { label: string; v: string; on: (v: string) => void; type?: string; badge?: { mode: string; tone: string } | null }) => (
  <div>
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <FieldLabel className="mb-0">{label}</FieldLabel>
      {badge && (
        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badge.tone}`}>
          {badge.mode}
        </span>
      )}
    </div>
    <Input type={type} value={v} onChange={(e) => on(e.target.value)} className="h-10 font-mono text-xs" />
  </div>
);
const NumField = ({ label, v, on, hint }: { label: string; v: any; on: (v: number) => void; hint?: string }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <Input type="number" value={v ?? 0} onChange={(e) => on(Number(e.target.value))} className="h-10" />
    {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

export default PlatformSettingsTab;
