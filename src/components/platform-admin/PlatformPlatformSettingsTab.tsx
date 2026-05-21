import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, Loader2, KeyRound, Tag, CheckCircle2, AlertCircle, Calculator, Sparkles, X, Search, GripVertical, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { PageHeader, SectionCard, PrimaryButton, FieldLabel } from "@/components/admin/shared/AdminUI";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { z } from "zod";

// Zod-skema: per-felt validering så vi kan vise konkret fejlbesked under inputtet.
const SettingsSchema = z.object({
  stripe_publishable_key: z.string().trim().regex(/^(pk_(test|live)_[A-Za-z0-9_]+)?$/, "Skal starte med pk_test_ eller pk_live_").nullable(),
  stripe_secret_key: z.string().trim().regex(/^(sk_(test|live)_[A-Za-z0-9_]+)?$/, "Skal starte med sk_test_ eller sk_live_").nullable(),
  stripe_webhook_secret: z.string().trim().regex(/^(whsec_[A-Za-z0-9_]+)?$/, "Skal starte med whsec_").nullable(),
  base_price_dkk: z.number().min(0).max(100000),
  price_route_planning_dkk: z.number().min(0).max(100000),
  price_accounting_integration_dkk: z.number().min(0).max(100000),
  price_data_import_dkk: z.number().min(0).max(100000),
  price_per_employee_login_dkk: z.number().min(0).max(100000),
  startup_fee_dkk: z.number().min(0).max(100000),
  discount_quarterly_pct: z.number().min(0).max(100),
  discount_yearly_pct: z.number().min(0).max(100),
  trial_days: z.number().int().min(0).max(365),
});

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
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);

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
      stripe_secret_key: s.stripe_secret_key || null,
      stripe_webhook_secret: s.stripe_webhook_secret || null,
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
          <SectionCard
            title="Stripe API-nøgler"
            icon={<KeyRound />}
            description="Bruges til at opkræve betaling for virksomhedsabonnementer. Secret og webhook gemmes krypteret og vises maskeret."
          >
            <Field label="Publishable key (pk_live_… / pk_test_…)" v={s.stripe_publishable_key || ""} on={(v) => set("stripe_publishable_key", v)} badge={pubMode} error={errors.stripe_publishable_key} />
            <Field
              label="Secret key (sk_live_… / sk_test_…)"
              v={s.stripe_secret_key || ""}
              on={(v) => set("stripe_secret_key", v)}
              type={showSecret ? "text" : "password"}
              badge={secMode}
              error={errors.stripe_secret_key}
              rightAction={
                <button type="button" onClick={() => setShowSecret((v) => !v)} className="text-muted-foreground hover:text-foreground" aria-label={showSecret ? "Skjul" : "Vis"}>
                  {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              }
            />
            <Field
              label="Webhook signing secret (whsec_…)"
              v={s.stripe_webhook_secret || ""}
              on={(v) => set("stripe_webhook_secret", v)}
              type={showWebhook ? "text" : "password"}
              badge={whMode}
              error={errors.stripe_webhook_secret}
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
        </TabsContent>

        <TabsContent value="pricing" className="space-y-5 m-0">
          <SectionCard
        title="Pris-tabel (DKK pr. måned)"
        icon={<Tag />}
        description="Tallene her bruges direkte i onboarding når en virksomhed vælger pakke og add-ons."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <NumField label="Basispris" v={s.base_price_dkk} on={(v) => set("base_price_dkk", v)} hint="Inkluderet i alle abonnementer" error={errors.base_price_dkk} />
          <NumField label="Ruteplanlægning" v={s.price_route_planning_dkk} on={(v) => set("price_route_planning_dkk", v)} hint="Add-on" error={errors.price_route_planning_dkk} />
          <NumField label="Regnskabsintegration" v={s.price_accounting_integration_dkk} on={(v) => set("price_accounting_integration_dkk", v)} hint="Gratis (sat til 0)" error={errors.price_accounting_integration_dkk} />
          <NumField label="Dataimport" v={s.price_data_import_dkk} on={(v) => set("price_data_import_dkk", v)} hint="Engangs / add-on" error={errors.price_data_import_dkk} />
          <NumField label="Per ekstra medarbejderlogin" v={s.price_per_employee_login_dkk} on={(v) => set("price_per_employee_login_dkk", v)} hint="Pris pr. ekstra login" error={errors.price_per_employee_login_dkk} />
          <NumField label="Opstartspris (engangsbeløb)" v={s.startup_fee_dkk} on={(v) => set("startup_fee_dkk", v)} hint="Tillægges 1. faktura efter prøve (standard 2.269 kr)" error={errors.startup_fee_dkk} />
          <NumField label="Prøveperiode (dage)" v={s.trial_days} on={(v) => set("trial_days", v)} hint="Gratis dage før første betaling" error={errors.trial_days} />
          <NumField label="Kvartalsrabat (%)" v={s.discount_quarterly_pct} on={(v) => set("discount_quarterly_pct", v)} hint="Ved kvartalsbetaling" error={errors.discount_quarterly_pct} />
          <NumField label="Årsrabat (%)" v={s.discount_yearly_pct} on={(v) => set("discount_yearly_pct", v)} hint="Ved årlig betaling" error={errors.discount_yearly_pct} />
        </div>
          </SectionCard>

          <SectionCard
        title="Live pris-eksempel"
        icon={<Calculator />}
        description="Sådan ser virksomheden prisen baseret på dine indstillinger ovenfor."
      >
        <PriceExample s={s} />
          </SectionCard>
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

/* FeaturedPicker — søger blandt aktive virksomheder og lader admin vælge op
   til 3 stk. Rækkefølgen i listen er den rækkefølge de vises på forsiden. */
const FeaturedPicker = ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);

  // Hent de allerede valgte for at vise navne/logo selv hvis de ikke matcher søgning.
  useEffect(() => {
    if (!value.length) { setSelected([]); return; }
    supabase.from("businesses").select("id, name, slug, logo_url, city, is_verified").in("id", value).then(({ data }) => {
      const ordered = value.map((id) => (data ?? []).find((b) => b.id === id)).filter(Boolean) as any[];
      setSelected(ordered);
    });
  }, [value]);

  useEffect(() => {
    const t = setTimeout(async () => {
      let req = supabase.from("businesses").select("id, name, slug, logo_url, city, is_verified").eq("is_active", true).limit(20);
      if (q.trim()) req = req.ilike("name", `%${q.trim()}%`);
      else req = req.order("is_verified", { ascending: false }).order("created_at", { ascending: false });
      const { data } = await req;
      setOptions(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const add = (id: string) => {
    if (value.includes(id)) return;
    if (value.length >= 3) { toast.error("Du kan højst vælge 3 virksomheder"); return; }
    onChange([...value, id]);
  };
  const remove = (id: string) => onChange(value.filter((x) => x !== id));
  const move = (id: string, dir: -1 | 1) => {
    const i = value.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Valgte ({value.length}/3)</FieldLabel>
        {selected.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card px-3 py-3 text-xs text-muted-foreground">
            Ingen valgt — forsiden viser automatisk de senest oprettede verificerede virksomheder.
          </p>
        ) : (
          <ul className="space-y-2">
            {selected.map((b, i) => (
              <li key={b.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <span className="flex flex-col">
                  <button type="button" onClick={() => move(b.id, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                  <button type="button" onClick={() => move(b.id, 1)} disabled={i === selected.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                  {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-contain p-0.5" /> : <span className="text-[10px] font-bold">{b.name?.[0]}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{b.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{b.city || "—"}</span>
                </span>
                <button type="button" onClick={() => remove(b.id)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Fjern">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <FieldLabel>Tilføj virksomhed</FieldLabel>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg efter navn…" className="h-10 pl-9" />
        </div>
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-card p-1">
          {options.length === 0 && <li className="px-2 py-3 text-xs text-muted-foreground">Ingen resultater.</li>}
          {options.map((b) => {
            const picked = value.includes(b.id);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => add(b.id)}
                  disabled={picked}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-secondary disabled:opacity-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                    {b.logo_url ? <img src={b.logo_url} alt="" className="h-full w-full object-contain p-0.5" /> : <span className="text-[10px] font-bold">{b.name?.[0]}</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{b.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{b.city || "—"}{b.is_verified ? " · Verificeret" : ""}</span>
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">{picked ? "Valgt" : "Tilføj"}</span>
                </button>
              </li>
            );
          })}
        </ul>
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

const Field = ({ label, v, on, type = "text", badge, error, rightAction }: { label: string; v: string; on: (v: string) => void; type?: string; badge?: { mode: string; tone: string } | null; error?: string; rightAction?: React.ReactNode }) => (
  <div>
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <FieldLabel className="mb-0">{label}</FieldLabel>
      <span className="flex items-center gap-2">
        {badge && (
          <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badge.tone}`}>
            {badge.mode}
          </span>
        )}
        {rightAction}
      </span>
    </div>
    <Input type={type} value={v} onChange={(e) => on(e.target.value)} className={`h-10 font-mono text-xs ${error ? "border-destructive focus-visible:ring-destructive" : ""}`} />
    {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
  </div>
);
const NumField = ({ label, v, on, hint, error }: { label: string; v: any; on: (v: number) => void; hint?: string; error?: string }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <Input type="number" value={v ?? 0} onChange={(e) => on(Number(e.target.value))} className={`h-10 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`} />
    {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

export default PlatformSettingsTab;
