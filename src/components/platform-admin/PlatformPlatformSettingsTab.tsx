import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, Loader2, KeyRound, Tag, Sparkles } from "lucide-react";
import { PageHeader, SectionCard, PrimaryButton } from "@/components/admin/shared/AdminUI";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SettingsSchema } from "./settings/shared";
import PaymentTab from "./settings/PaymentTab";
import PricingTab from "./settings/PricingTab";
import FeaturedPicker from "./settings/FeaturedPicker";

/**
 * PlatformSettingsTab — global konfiguration for Serviceydere.
 * Kun synlig for platform-admins. Indeholder Stripe-nøgler og pris-tabel,
 * der bruges af onboarding-flowet til at beregne abonnementspriser.
 */
const PlatformSettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle();
      setS(data || {});
      setLoading(false);
    })();
  }, []);

  const set = (k: string, v: any) => {
    setS((p: any) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const save = async () => {
    const payload = {
      stripe_publishable_key: s.stripe_publishable_key || null,
      base_price_dkk: Number(s.base_price_dkk) || 0,
      price_route_planning_dkk: Number(s.price_route_planning_dkk) || 0,
      price_accounting_integration_dkk: Number(s.price_accounting_integration_dkk) || 0,
      price_data_import_dkk: Number(s.price_data_import_dkk) || 0,
      price_per_employee_login_dkk: Number(s.price_per_employee_login_dkk) || 0,
      startup_fee_dkk: Number(s.startup_fee_dkk) || 0,
      discount_quarterly_pct: Number(s.discount_quarterly_pct) || 0,
      discount_yearly_pct: Number(s.discount_yearly_pct) || 0,
      trial_days: Number(s.trial_days) || 0,
      featured_business_ids: Array.isArray(s.featured_business_ids) ? s.featured_business_ids : [],
    };
    const check = SettingsSchema.safeParse(payload);
    if (!check.success) {
      const fieldErrors: Record<string, string> = {};
      check.error.issues.forEach((issue) => {
        const k = issue.path[0]?.toString();
        if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
      });
      setErrors(fieldErrors);
      toast.error("Tjek de markerede felter");
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase.from("platform_settings").update(payload).eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Indstillinger gemt");
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Indlæser…</div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform-indstillinger"
        description="Stripe-nøgler, prismodel og prøveperiode for hele platformen."
      />

      <Tabs defaultValue="payment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payment"><KeyRound className="h-3.5 w-3.5 mr-1.5" />Betaling</TabsTrigger>
          <TabsTrigger value="pricing"><Tag className="h-3.5 w-3.5 mr-1.5" />Priser</TabsTrigger>
          <TabsTrigger value="frontpage"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Forside</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-5 m-0">
          <PaymentTab s={s} set={set} errors={errors} />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-5 m-0">
          <PricingTab s={s} set={set} errors={errors} />
        </TabsContent>

        <TabsContent value="frontpage" className="space-y-5 m-0">
          <SectionCard
            title="Anbefalede virksomheder på forsiden"
            icon={<Sparkles />}
            description="Vælg op til 3 virksomheder som fremhæves i sektionen 'Anbefalede virksomheder' på forsiden. Hvis du ikke vælger nogen, viser vi automatisk de senest oprettede verificerede virksomheder."
          >
            <FeaturedPicker
              value={(s.featured_business_ids as string[]) || []}
              onChange={(v) => set("featured_business_ids", v)}
            />
          </SectionCard>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <PrimaryButton onClick={save} disabled={saving} icon={saving ? <Loader2 className="animate-spin" /> : <CreditCard />}>
          Gem indstillinger
        </PrimaryButton>
      </div>
    </div>
  );
};

export default PlatformSettingsTab;