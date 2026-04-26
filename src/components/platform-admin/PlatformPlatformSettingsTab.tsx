import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CreditCard, Loader2, KeyRound, Tag } from "lucide-react";

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

  return (
    <div className="space-y-5">
      <Card><CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold text-foreground">Stripe API-nøgler</h3></div>
        <p className="text-xs text-muted-foreground">Bruges til at opkræve betaling for virksomhedsabonnementer. Secret key er kun tilgængelig server-side.</p>
        <Field label="Publishable key (pk_live_… / pk_test_…)" v={s.stripe_publishable_key || ""} on={(v) => set("stripe_publishable_key", v)} />
        <Field label="Secret key (sk_live_… / sk_test_…)" v={s.stripe_secret_key || ""} on={(v) => set("stripe_secret_key", v)} type="password" />
        <Field label="Webhook signing secret (whsec_…)" v={s.stripe_webhook_secret || ""} on={(v) => set("stripe_webhook_secret", v)} type="password" />
      </CardContent></Card>

      <Card><CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold text-foreground">Pris-tabel (DKK pr. måned)</h3></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField label="Basispris" v={s.base_price_dkk} on={(v) => set("base_price_dkk", v)} />
          <NumField label="Ruteplanlægning" v={s.price_route_planning_dkk} on={(v) => set("price_route_planning_dkk", v)} />
          <NumField label="Regnskabsintegration" v={s.price_accounting_integration_dkk} on={(v) => set("price_accounting_integration_dkk", v)} />
          <NumField label="Dataimport" v={s.price_data_import_dkk} on={(v) => set("price_data_import_dkk", v)} />
          <NumField label="Per ekstra medarbejderlogin" v={s.price_per_employee_login_dkk} on={(v) => set("price_per_employee_login_dkk", v)} />
          <NumField label="Prøveperiode (dage)" v={s.trial_days} on={(v) => set("trial_days", v)} />
          <NumField label="Kvartalsrabat (%)" v={s.discount_quarterly_pct} on={(v) => set("discount_quarterly_pct", v)} />
          <NumField label="Årsrabat (%)" v={s.discount_yearly_pct} on={(v) => set("discount_yearly_pct", v)} />
        </div>
      </CardContent></Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2 bg-foreground text-background hover:bg-foreground/90">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Gem indstillinger
        </Button>
      </div>
    </div>
  );
};

const Field = ({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
    <Input type={type} value={v} onChange={(e) => on(e.target.value)} className="h-10 font-mono text-xs" />
  </div>
);
const NumField = ({ label, v, on }: { label: string; v: any; on: (v: number) => void }) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
    <Input type="number" value={v ?? 0} onChange={(e) => on(Number(e.target.value))} className="h-10" />
  </div>
);

export default PlatformSettingsTab;
