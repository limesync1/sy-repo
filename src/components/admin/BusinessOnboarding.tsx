import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2, Loader2, Check, Sparkles, Route, Users, Calculator,
  UploadCloud, ShieldCheck, ArrowRight, Mail, Lock, Search,
  Inbox, MessageCircle, Minus, Plus, Star, Zap, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SiteNav from "@/components/SiteNav";
import Footer from "@/components/landing/Footer";
import SEO from "@/components/SEO";
import PageHero from "@/components/landing/PageHero";
import { translateAuthError } from "@/lib/auth-errors";
import AnimatedNumber from "@/components/admin/AnimatedNumber";

/* ──────────────────────────────────────────────────────────────────────────
 * BusinessOnboarding — én side, ingen trin.
 *
 * Brugeren:
 *   1) Indtaster CVR — vi henter automatisk virksomhedens stamdata fra cvrapi.dk
 *   2) Vælger funktioner (route planlægning, regnskab, dataimport)
 *   3) Vælger antal ekstra medarbejderlogins
 *   4) Vælger faktureringsperiode (månedlig / kvartal -10% / årlig -20%)
 *   5) Ser pris LIVE i en sticky sidebar
 *   6) Opretter konto (email + adgangskode) og kommer ind med 14 dages prøve.
 *
 * Stripe-betalingskortet tilføjes senere under Indstillinger → Fakturering.
 * Selve beløbene styres af platform_settings (administreres i platform-admin).
 * ────────────────────────────────────────────────────────────────────────── */

type Pricing = {
  base_price_dkk: number;
  price_route_planning_dkk: number;
  price_accounting_integration_dkk: number;
  price_data_import_dkk: number;
  price_per_employee_login_dkk: number;
  startup_fee_dkk: number;
  discount_quarterly_pct: number;
  discount_yearly_pct: number;
  trial_days: number;
};

type FeatureKey = "accounting_integration" | "leads" | "livechat";
type BillingPeriod = "monthly" | "quarterly" | "yearly";

const FEATURES: { key: FeatureKey; icon: typeof Route; title: string; description: string }[] = [
  {
    key: "accounting_integration",
    icon: Calculator,
    title: "Regnskabsintegration",
    description: "Send automatisk fakturaer til e-conomic eller Dinero, så du slipper for dobbelt indtastning. Kan slås til/fra når som helst.",
  },
  {
    key: "leads",
    icon: Inbox,
    title: "Leads (Indhent 3 tilbud)",
    description: "Modtag relevante kundehenvendelser direkte i dashboardet, når kunder beder om tilbud i dit område og din kategori.",
  },
  {
    key: "livechat",
    icon: MessageCircle,
    title: "Livechat på din virksomhedsside",
    description: "Lad besøgende skrive direkte til dig på din virksomhedsside. Du svarer fra virksomhedspanelet eller fra mobilen.",
  },
];

const BILLING_OPTIONS: { value: BillingPeriod; label: string; sub: string; months: number }[] = [
  { value: "monthly",   label: "Månedlig",   sub: "Ingen rabat",          months: 1 },
  { value: "quarterly", label: "Kvartal",    sub: "Spar med rabat",       months: 3 },
  { value: "yearly",    label: "Årlig",      sub: "Bedste pris",          months: 12 },
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9æøå]+/g, "-").replace(/^-|-$/g, "");

const formatDkk = (n: number) =>
  new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(n));

/**
 * `variant` styrer kun ramme og tekst — selve flowet (CVR, funktioner,
 * medarbejderlogins, betalingsperiode, live pris, kontooprettelse) er
 * identisk. "pricing" bruges af den offentlige prisside /software/priser,
 * så priser og tilvalg aldrig kan afvige mellem de to sider.
 */
export type OnboardingVariant = "signup" | "pricing";

type BusinessOnboardingProps = {
  variant?: OnboardingVariant;
  /** Ekstra indhold (fx FAQ) der vises under formularen på prissiden. */
  belowContent?: React.ReactNode;
  /** Brødkrumme vist over formularen. */
  breadcrumb?: React.ReactNode;
  seo?: { title: string; description: string; canonicalPath: string; keywords?: string; jsonLd?: unknown };
};

const BusinessOnboarding = ({ variant = "signup", belowContent, breadcrumb, seo }: BusinessOnboardingProps = {}) => {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();

  // ─── Pris-tabel fra platform_settings ───
  const [pricing, setPricing] = useState<Pricing | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_platform_pricing");
      if (data && data[0]) setPricing(data[0] as Pricing);
    })();
  }, []);

  // ─── CVR-opslag ───
  const [cvr, setCvr] = useState("");
  const [cvrLoading, setCvrLoading] = useState(false);
  const [cvrData, setCvrData] = useState<{
    name: string; address: string | null; zip_code: string | null;
    city: string | null; phone: string | null; email: string | null;
    industry: string | null;
  } | null>(null);
  const [cvrError, setCvrError] = useState("");

  const lookupCvr = async () => {
    const cleaned = cvr.replace(/\D/g, "");
    if (cleaned.length !== 8) {
      setCvrError("CVR skal være 8 cifre");
      return;
    }
    setCvrLoading(true); setCvrError(""); setCvrData(null);
    try {
      const { data, error } = await supabase.functions.invoke("cvr-lookup", { body: { cvr: cleaned } });
      if (error) throw error;
      if (!data?.found) {
        setCvrError("Vi kunne ikke finde dette CVR-nummer");
      } else {
        setCvrData(data);
      }
    } catch {
      setCvrError("Kunne ikke slå op — prøv igen");
    } finally {
      setCvrLoading(false);
    }
  };

  // ─── Form state ───
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    accounting_integration: false,
    leads: true,
    livechat: true,
  });
  const [extraLogins, setExtraLogins] = useState(0);
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleFeature = (k: FeatureKey) =>
    setFeatures((p) => ({ ...p, [k]: !p[k] }));

  // ─── Live prisberegning ───
  const breakdown = useMemo(() => {
    if (!pricing) return null;
    const lines: { label: string; amount: number }[] = [
      { label: "Basis (panel + ruteplanlægning + bestillinger)", amount: pricing.base_price_dkk },
    ];
    if (features.accounting_integration)
      lines.push({ label: "Regnskabsintegration", amount: pricing.price_accounting_integration_dkk });
    if (extraLogins > 0)
      lines.push({
        label: `${extraLogins} ekstra medarbejderlogin${extraLogins === 1 ? "" : "s"}`,
        amount: extraLogins * pricing.price_per_employee_login_dkk,
      });

    const monthlySubtotal = lines.reduce((s, l) => s + l.amount, 0);
    const discountPct =
      billing === "yearly" ? pricing.discount_yearly_pct
      : billing === "quarterly" ? pricing.discount_quarterly_pct
      : 0;
    const monthlyAfterDiscount = monthlySubtotal * (1 - discountPct / 100);
    const months = BILLING_OPTIONS.find((o) => o.value === billing)!.months;
    const periodTotal = monthlyAfterDiscount * months;
    const startupFee = pricing.startup_fee_dkk || 0;
    const firstInvoiceTotal = periodTotal + startupFee;

    return {
      lines,
      monthlySubtotal,
      discountPct,
      monthlyAfterDiscount,
      periodTotal,
      months,
      startupFee,
      firstInvoiceTotal,
    };
  }, [pricing, features, extraLogins, billing]);

  // ─── Validering ───
  const canSubmit =
    !!cvrData &&
    !!cvrData.name &&
    (user || (email.trim().length > 3 && password.length >= 6));

  // ─── Submit ───
  const handleSubmit = async () => {
    if (!cvrData || !pricing || !breakdown) {
      toast.error("Indtast dit CVR-nummer øverst og vent på vi har hentet virksomhedens oplysninger.");
      return;
    }
    if (!user && (!email.trim() || password.length < 6)) {
      toast.error("Udfyld en gyldig e-mail og vælg en adgangskode på mindst 6 tegn.");
      return;
    }

    setSubmitting(true);
    try {
      let activeUserId = user?.id;

      if (!activeUserId) {
        const { error: signUpError } = await signUp(email.trim(), password);
        if (signUpError) throw signUpError;
        // Auto-confirm er aktiveret, så vi kan logge ind med det samme
        const { data: sessionData } = await supabase.auth.getSession();
        activeUserId = sessionData.session?.user.id;
        if (!activeUserId) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(), password,
          });
          if (signInError) throw signInError;
          activeUserId = signInData.session?.user.id;
        }
        if (!activeUserId) {
          throw new Error("Vi oprettede din konto, men kunne ikke logge dig automatisk ind. Prøv at logge ind manuelt.");
        }
      }

      // Opret virksomheden
      const cleanCvr = cvr.replace(/\D/g, "");
      const { data: bizData, error: bizError } = await supabase
        .from("businesses")
        .insert({
          name: cvrData.name,
          slug: slugify(cvrData.name) + "-" + cleanCvr.slice(-4),
          owner_id: activeUserId,
          phone: cvrData.phone || null,
          email: cvrData.email || null,
          address: cvrData.address || null,
          zip_code: cvrData.zip_code || null,
          city: cvrData.city || null,
          settings: {
            cvr: cleanCvr,
            industry_text: cvrData.industry,
            route_planning_enabled: true,
            accounting_integration_enabled: features.accounting_integration,
            leads_enabled: features.leads,
            livechat_enabled: features.livechat,
            onboarding: {
              completed_at: new Date().toISOString(),
            },
          },
        })
        .select("id")
        .single();
      if (bizError) throw bizError;

      // Opret abonnement-pakken
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + pricing.trial_days);
      await supabase.from("business_plans").insert({
        business_id: bizData.id,
        route_planning_enabled: true,
        accounting_integration_enabled: features.accounting_integration,
        extra_employee_logins: extraLogins,
        billing_period: billing,
        monthly_price_dkk: breakdown.monthlyAfterDiscount,
        status: "trialing",
        trial_ends_at: trialEnd.toISOString(),
      });

      toast.success(`Velkommen ombord! Du har ${pricing.trial_days} dages gratis prøve.`);
      // Hård navigation så AuthProvider, useMyBusiness osv. henter friske data
      window.location.href = "/virksomhed";
    } catch (e: any) {
      toast.error(translateAuthError(e, "Vi kunne ikke oprette din virksomhed lige nu. Tjek dine oplysninger og prøv igen."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {seo ? (
        <SEO
          title={seo.title}
          description={seo.description}
          canonicalPath={seo.canonicalPath}
          keywords={seo.keywords}
          jsonLd={seo.jsonLd as any}
        />
      ) : (
        <SEO
          title="Opret din virksomhed på Serviceydere"
          description="Opret din virksomhedsprofil på Serviceydere og få adgang til bestillinger, ruteplanlægning og medarbejderlogins."
          canonicalPath="/opret-virksomhed"
          noIndex
        />
      )}

      {/* Samme topnav som resten af sitet — ingen wrapper, så headeren
          ser 100% identisk ud og ikke "hopper" når man navigerer hertil. */}
      <SiteNav />

      <PageHero
        eyebrow={`${pricing?.trial_days ?? 14} dages gratis prøve · Intet kort kræves`}
        title={variant === "pricing" ? "Priser — sammensæt jeres abonnement" : "Bliv udbyder på Serviceydere"}
        subtitle={
          variant === "pricing"
            ? `Basis koster ${formatDkk(pricing?.base_price_dkk ?? 289)} kr./md. ekskl. moms med ruteplanlægningen inkluderet. Indtast CVR, vælg tilvalg og medarbejderlogins — så ser I præcis jeres egen pris, før I opretter noget.`
            : "Få din virksomhed online på under 2 minutter. Indtast dit CVR — vi henter automatisk dine oplysninger. Vælg dine funktioner og se prisen med det samme."
        }
      >
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-background/85">
          <li className="flex items-center gap-1.5"><Check className="h-4 w-4" style={{ color: "hsl(var(--hero-cyan-bright))" }} /> Ingen binding</li>
          <li className="flex items-center gap-1.5"><Check className="h-4 w-4" style={{ color: "hsl(var(--hero-cyan-bright))" }} /> Opsig når som helst</li>
          <li className="flex items-center gap-1.5"><Check className="h-4 w-4" style={{ color: "hsl(var(--hero-cyan-bright))" }} /> Dansk support</li>
        </ul>
      </PageHero>

      {/* Trust-stribe — kvalitative signaler, ingen fabrikerede tal */}
      <div className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-accent" /> CVR-verificeret onboarding
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-accent" /> Ingen binding · opsig når som helst
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-accent" /> Dansk support på hverdage
          </span>
        </div>
      </div>

      <main id="main" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {breadcrumb}
        {/* Layout: form til venstre, sticky pris-summary til højre */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* ─── VENSTRE: form-sektioner ─── */}
          <div className="space-y-6">
            {/* 1. CVR */}
            <Section number={1} title="Find din virksomhed" subtitle="Indtast CVR — vi udfylder resten" done={!!cvrData}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={cvr}
                    onChange={(e) => { setCvr(e.target.value); setCvrError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupCvr(); } }}
                    placeholder="CVR-nummer (8 cifre)"
                    inputMode="numeric"
                    maxLength={11}
                    className="h-12 pl-10 text-base"
                  />
                </div>
                <Button
                  onClick={lookupCvr}
                  disabled={cvrLoading || cvr.replace(/\D/g, "").length !== 8}
                  className="h-12 gap-2 bg-foreground px-6 text-background hover:bg-foreground/90"
                >
                  {cvrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Slå op
                </Button>
              </div>

              {cvrError && (
                <p className="mt-3 text-sm text-destructive">{cvrError}</p>
              )}

              {cvrData && (
                <div className="mt-4 rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-4 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <Check className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-foreground">{cvrData.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {[cvrData.address, cvrData.zip_code, cvrData.city].filter(Boolean).join(", ")}
                      </p>
                      {cvrData.industry && (
                        <p className="mt-2 inline-flex rounded-md bg-card px-2 py-0.5 text-xs text-muted-foreground">
                          {cvrData.industry}
                        </p>
                      )}
                      <p className="mt-3 text-xs text-muted-foreground">
                        Du kan altid redigere disse oplysninger senere under{" "}
                        <span className="font-medium text-foreground">Indstillinger</span>.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* 2. Funktioner */}
            <Section number={2} title="Vælg dine funktioner" subtitle="Ruteplanlægning er altid med. Vælg om du vil tilkøbe regnskabsintegration eller slå de gratis funktioner til.">
              <div className="mb-4 rounded-2xl border border-accent/25 bg-accent-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Inkluderet i basis
                </p>
                <ul className="mt-2 grid gap-1.5 text-sm text-foreground sm:grid-cols-2">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-accent" /> Virksomhedsprofil med søgesynlighed</li>
                  <li className="flex items-center gap-2"><Route className="h-4 w-4 shrink-0 text-accent" /> Ruteplanlægning til medarbejdere</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-accent" /> Bestillinger, kalender, fakturering</li>
                  <li className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0 text-accent" /> 1 ejer-login</li>
                </ul>
              </div>
              <div className="grid gap-3">
                {FEATURES.map(({ key, icon: Icon, title, description }) => {
                  const active = features[key];
                  const isFree = key === "leads" || key === "livechat";
                  const price = isFree
                    ? 0
                    : pricing?.price_accounting_integration_dkk;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleFeature(key)}
                       className={`group flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                         active
                           ? "border-accent bg-gradient-to-br from-accent/10 to-accent/0 shadow-sm ring-1 ring-accent/30"
                           : "border-border bg-card hover:border-foreground/20"
                       }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        active ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">{title}</p>
                          {price !== undefined && price > 0 && (
                            <span className="shrink-0 text-xs font-semibold text-foreground tabular-nums">
                              +{formatDkk(price)} kr/md
                            </span>
                          )}
                          {price === 0 && (
                            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                              Gratis
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                      </div>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
                      }`} aria-hidden>
                        {active && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* 3. Medarbejderlogins */}
            <Section number={3} title="Antal ekstra medarbejderlogins" subtitle="Hver medarbejder kan logge ind på mobilen og se sine ruter">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <button
                    type="button"
                    onClick={() => setExtraLogins((n) => Math.max(0, n - 1))}
                    className="flex h-12 w-12 items-center justify-center text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                    aria-label="Færre"
                    disabled={extraLogins === 0}
                  ><Minus className="h-4 w-4" /></button>
                  <span className="min-w-[3.5rem] border-x border-border bg-secondary/40 py-2.5 text-center text-lg font-semibold tabular-nums text-foreground">
                    {extraLogins}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraLogins((n) => Math.min(99, n + 1))}
                    className="flex h-12 w-12 items-center justify-center text-foreground transition-colors hover:bg-secondary"
                    aria-label="Flere"
                  ><Plus className="h-4 w-4" /></button>
                </div>
                {pricing && (
                  <p className="text-sm text-muted-foreground">
                    {formatDkk(pricing.price_per_employee_login_dkk)} kr/md per medarbejder
                  </p>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Du tæller selv som ejerlogin og er allerede inkluderet.
              </p>
            </Section>

            {/* 4. Faktureringsperiode */}
            <Section number={4} title="Vælg faktureringsperiode" subtitle="Spar mere ved at betale forud">
              <div className="grid gap-3 sm:grid-cols-3">
                {BILLING_OPTIONS.map((opt) => {
                  const active = billing === opt.value;
                  const discount = pricing
                    ? (opt.value === "yearly" ? pricing.discount_yearly_pct
                    : opt.value === "quarterly" ? pricing.discount_quarterly_pct
                    : 0)
                    : 0;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBilling(opt.value)}
                       className={`relative rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm ${
                         active
                           ? "border-foreground bg-gradient-to-br from-foreground/5 to-transparent shadow-sm ring-1 ring-foreground/20"
                           : "border-border bg-card hover:border-foreground/20"
                       }`}
                    >
                      <div className="absolute -top-2 right-3 flex gap-1.5">
                        {opt.value === "yearly" && (
                          <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background shadow-sm">
                            Anbefalet
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground shadow-sm">
                            −{discount}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{opt.sub}</p>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* 5. Konto (kun hvis ikke logget ind) */}
            {!user && (
              <Section number={5} title="Opret din konto" subtitle="Vi sender ordrebekræftelser og notifikationer hertil">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="navn@virksomhed.dk"
                      className="h-11 pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Adgangskode (min. 6 tegn)"
                      className="h-11 pl-10"
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Har du allerede en konto?{" "}
                  <Link to="/log-ind?mode=business" className="font-medium text-foreground underline-offset-2 hover:underline">
                    Log ind
                  </Link>
                </p>
              </Section>
            )}
          </div>

          {/* ─── HØJRE: Sticky pris-summary ─── */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]">
              {/* Accentstribe i toppen — gør kortet til "the main event" på siden */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-foreground to-accent"
              />
              {/* Dekorativ baggrundsglow — gør kortet mere levende uden at forstyrre */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-foreground/5 blur-3xl"
              />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Din pakke
                  </p>
                </div>
                <h3 className="mt-1 text-lg font-semibold text-foreground">Oversigt</h3>
              </div>

              {!pricing ? (
                <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Indlæser priser…
                </div>
              ) : breakdown && (
                <div className="relative">
                  <ul className="mt-5 space-y-2 border-b border-border pb-4">
                    {breakdown.lines.map((l) => (
                      <li key={l.label} className="flex items-baseline justify-between gap-3 text-sm animate-fade-in">
                        <span className="text-muted-foreground">{l.label}</span>
                        <span className="shrink-0 font-medium text-foreground tabular-nums">
                          <AnimatedNumber value={l.amount} /> kr
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-baseline justify-between text-muted-foreground">
                      <span>Pris per måned</span>
                      <span className="tabular-nums">
                        <AnimatedNumber value={breakdown.monthlySubtotal} /> kr
                      </span>
                    </div>
                    {breakdown.discountPct > 0 && (
                      <div className="flex items-baseline justify-between text-accent animate-fade-in">
                        <span>Rabat ({breakdown.discountPct}%)</span>
                        <span className="tabular-nums">
                          −<AnimatedNumber value={breakdown.monthlySubtotal - breakdown.monthlyAfterDiscount} /> kr/md
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl bg-gradient-to-br from-foreground to-foreground/90 p-4 text-background shadow-md ring-1 ring-foreground/10">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-background/70">
                        Total pr. måned
                      </span>
                      <span className="text-2xl font-semibold text-background tabular-nums">
                        <AnimatedNumber value={breakdown.monthlyAfterDiscount} /> kr
                      </span>
                    </div>
                    {breakdown.months > 1 && (
                      <p className="mt-1 text-right text-xs text-background/70 tabular-nums">
                        Faktureres <AnimatedNumber value={breakdown.periodTotal} /> kr hver{" "}
                        {breakdown.months === 3 ? "kvartal" : "år"}
                      </p>
                    )}
                  </div>

                  {breakdown.startupFee > 0 && (
                    <div className="mt-3 rounded-xl border border-border bg-secondary/60 p-3">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold text-foreground">Opstartspris (engangsbeløb)</span>
                        <span className="tabular-nums font-semibold text-foreground">
                          {formatDkk(breakdown.startupFee)} kr
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                        Tilføjes til <span className="font-semibold text-foreground">første faktura</span> efter prøveperiodens udløb. Dækker oprettelse,
                        opsætning og 1-til-1 onboarding. Betales kun én gang.
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex items-start gap-2 rounded-lg bg-accent/10 p-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <p className="text-xs leading-5 text-foreground">
                      <span className="font-semibold">{pricing.trial_days} dages gratis prøve.</span>{" "}
                      I dag betaler du <span className="font-semibold">0 kr</span>. Du tilføjer betalingskort senere under indstillinger.
                      Ingen binding — opsig når som helst.
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="relative mt-5 h-12 w-full gap-2 rounded-xl bg-foreground text-base font-semibold text-background shadow-sm transition-all hover:bg-foreground/90 hover:shadow-md hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Opretter…</>
                ) : (
                  <>Start gratis prøve <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>

              {!canSubmit && cvrData === null && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Indtast og bekræft CVR for at fortsætte
                </p>
              )}
            </div>
          </aside>
        </div>

        {belowContent}
      </main>

      {/* ── Mobile sticky CTA ──
          På mobil/tablet er sidebaren nede under formularen — så brugeren kan
          ikke se prisen mens de scroller. Denne bar viser totalen og en
          shortcut til "Start gratis prøve" eller scroll-til-konto. */}
      {pricing && breakdown && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-12px_30px_-18px_rgba(0,0,0,0.25)] backdrop-blur lg:hidden">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent via-foreground to-accent"
          />
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total pr. måned
              </p>
              <p className="text-lg font-bold text-foreground tabular-nums">
                <AnimatedNumber value={breakdown.monthlyAfterDiscount} /> kr
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">/md</span>
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="h-11 shrink-0 gap-2 rounded-full bg-gradient-to-r from-foreground to-foreground/85 px-5 text-sm font-semibold text-background shadow-md transition-all hover:from-foreground hover:to-foreground hover:shadow-lg active:scale-[0.98]"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Opretter…</>
              ) : (
                <>Start gratis prøve <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      )}
      {/* Spacer så sticky-bar ikke dækker footer-indhold på mobil */}
      <div className="h-20 lg:hidden" aria-hidden />

      <Footer />
    </div>
  );
};

/* ─────────── Sub-component: nummereret sektionscard ─────────── */
const Section = ({
  number, title, subtitle, children, done,
}: {
  number: number; title: string; subtitle?: string; children: React.ReactNode; done?: boolean;
}) => (
  <section
    className={`group relative rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md sm:p-6 ${
      done ? "border-accent/40" : "border-border"
    }`}
  >
    <div className="flex items-baseline gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ring-2 ring-background transition-all ${
          done
            ? "bg-gradient-to-br from-accent to-accent/80 text-accent-foreground"
            : "bg-gradient-to-br from-foreground to-foreground/80 text-background"
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : number}
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

export default BusinessOnboarding;
