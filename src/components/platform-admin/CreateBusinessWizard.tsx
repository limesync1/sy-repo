// CreateBusinessWizard — flerstegs flow til admin der opretter en virksomhed
// manuelt. Spejler "Bliv udbyder"-siden, men med admin-specifikke felter
// (force-active, custom trial-længde, admin-note) og uden at admin selv
// behøver oprette ejer-bruger først.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2, Building2, Search, Check, ArrowRight, ArrowLeft, Copy,
  Calculator, Inbox, MessageCircle, Users, Sparkles, Zap, ShieldCheck,
  Mail, KeyRound, AlertCircle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_INDUSTRIES, INDUSTRY_GROUPS } from "@/lib/service-taxonomy";

type Pricing = {
  base_price_dkk: number;
  price_accounting_integration_dkk: number;
  price_per_employee_login_dkk: number;
  startup_fee_dkk: number;
  discount_quarterly_pct: number;
  discount_yearly_pct: number;
  trial_days: number;
};

type BillingPeriod = "monthly" | "quarterly" | "yearly";
type FeatureKey = "accounting_integration" | "leads" | "livechat";

const BILLING_OPTIONS: { value: BillingPeriod; label: string; months: number }[] = [
  { value: "monthly", label: "Månedlig", months: 1 },
  { value: "quarterly", label: "Kvartal (rabat)", months: 3 },
  { value: "yearly", label: "Årlig (bedste pris)", months: 12 },
];

const FEATURES: { key: FeatureKey; icon: typeof Calculator; title: string; free: boolean; description: string }[] = [
  { key: "accounting_integration", icon: Calculator, free: false, title: "Regnskabsintegration", description: "e-conomic / Dinero — auto-fakturering." },
  { key: "leads", icon: Inbox, free: true, title: "Leads (Indhent 3 tilbud)", description: "Modtag kundehenvendelser." },
  { key: "livechat", icon: MessageCircle, free: true, title: "Livechat på virksomhedssiden", description: "Lad besøgende skrive direkte." },
];

const formatDkk = (n: number) =>
  new Intl.NumberFormat("da-DK", { maximumFractionDigits: 0 }).format(Math.round(n));

/** Foreslå kategorier ud fra branche-tekst fra CVR. */
const suggestCategories = (industryText: string | null | undefined): string[] => {
  if (!industryText) return [];
  const txt = industryText.toLowerCase();
  const hits: string[] = [];
  for (const ind of ALL_INDUSTRIES) {
    if (txt.includes(ind.label.toLowerCase()) || txt.includes(ind.key.toLowerCase())) {
      hits.push(ind.key);
    }
  }
  return hits.slice(0, 3);
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateBusinessWizard({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);

  // ── Pricing fra platform_settings ──
  const [pricing, setPricing] = useState<Pricing | null>(null);
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.rpc("get_platform_pricing");
      if (data && data[0]) setPricing(data[0] as Pricing);
    })();
  }, [open]);

  // ── Trin 1: CVR ──
  const [cvr, setCvr] = useState("");
  const [cvrLoading, setCvrLoading] = useState(false);
  const [cvrError, setCvrError] = useState("");
  const [skipCvr, setSkipCvr] = useState(false);

  // ── Virksomheds-data (auto-udfyldes fra CVR, kan overskrives) ──
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [industryText, setIndustryText] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const lookupCvr = async () => {
    const cleaned = cvr.replace(/\D/g, "");
    if (cleaned.length !== 8) { setCvrError("CVR skal være 8 cifre"); return; }
    setCvrLoading(true); setCvrError("");
    try {
      const { data, error } = await supabase.functions.invoke("cvr-lookup", { body: { cvr: cleaned } });
      if (error) throw error;
      if (!data?.found) { setCvrError("Vi kunne ikke finde dette CVR-nummer"); return; }
      setName(data.name || "");
      setAddress(data.address || "");
      setZipCode(data.zip_code || "");
      setCity(data.city || "");
      setPhone(data.phone || "");
      setBusinessEmail(data.email || "");
      setIndustryText(data.industry || "");
      const suggested = suggestCategories(data.industry);
      if (suggested.length) setCategories(suggested);
    } catch {
      setCvrError("Kunne ikke slå op — prøv igen");
    } finally {
      setCvrLoading(false);
    }
  };

  // ── Trin 2: Funktioner & plan ──
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    accounting_integration: false, leads: true, livechat: true,
  });
  const [extraLogins, setExtraLogins] = useState(0);
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [trialDays, setTrialDays] = useState(14);

  useEffect(() => { if (pricing) setTrialDays(pricing.trial_days); }, [pricing]);

  // ── Trin 3: Ejer-bruger ──
  const [ownerEmail, setOwnerEmail] = useState("");
  const [passwordMode, setPasswordMode] = useState<"auto" | "manual">("auto");
  const [customPassword, setCustomPassword] = useState("");
  const [sendWelcome, setSendWelcome] = useState(true);

  // ── Trin 4: Admin-options ──
  const [forceActive, setForceActive] = useState(false);
  const [adminNote, setAdminNote] = useState("");

  // ── Result ──
  const [result, setResult] = useState<{
    businessId: string; slug: string; loginUrl: string;
    temporaryPassword: string | null; userExisted: boolean;
  } | null>(null);

  const breakdown = useMemo(() => {
    if (!pricing) return null;
    const lines: { label: string; amount: number }[] = [
      { label: "Basis", amount: pricing.base_price_dkk },
    ];
    if (features.accounting_integration)
      lines.push({ label: "Regnskab", amount: pricing.price_accounting_integration_dkk });
    if (extraLogins > 0)
      lines.push({ label: `${extraLogins} ekstra logins`, amount: extraLogins * pricing.price_per_employee_login_dkk });
    const monthlySubtotal = lines.reduce((s, l) => s + l.amount, 0);
    const discountPct =
      billing === "yearly" ? pricing.discount_yearly_pct
      : billing === "quarterly" ? pricing.discount_quarterly_pct : 0;
    const monthlyAfterDiscount = monthlySubtotal * (1 - discountPct / 100);
    return { lines, monthlySubtotal, discountPct, monthlyAfterDiscount };
  }, [pricing, features, extraLogins, billing]);

  const toggleCategory = (key: string) =>
    setCategories((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const reset = () => {
    setStep(0); setCvr(""); setCvrError(""); setSkipCvr(false);
    setName(""); setAddress(""); setZipCode(""); setCity(""); setPhone("");
    setBusinessEmail(""); setIndustryText(""); setCategories([]); setDescription("");
    setFeatures({ accounting_integration: false, leads: true, livechat: true });
    setExtraLogins(0); setBilling("monthly");
    setOwnerEmail(""); setPasswordMode("auto"); setCustomPassword("");
    setSendWelcome(true); setForceActive(false); setAdminNote("");
    setResult(null);
  };

  const handleClose = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-create-business", {
        body: {
          name: name.trim(),
          ownerEmail: ownerEmail.trim().toLowerCase(),
          cvr: cvr.replace(/\D/g, "") || null,
          industryText: industryText || null,
          categories,
          city: city || null,
          address: address || null,
          zipCode: zipCode || null,
          phone: phone || null,
          businessEmail: businessEmail || null,
          description: description || null,
          features,
          extraLogins,
          billingPeriod: billing,
          monthlyPriceDkk: breakdown?.monthlyAfterDiscount ?? 0,
          trialDays,
          forceActive,
          adminNote: adminNote || null,
          sendWelcome,
          customPassword: passwordMode === "manual" ? customPassword : null,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as any;
    },
    onSuccess: (data) => {
      toast.success("Virksomhed oprettet");
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      qc.invalidateQueries({ queryKey: ["admin-business-plans"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-log-all"] });
      setResult({
        businessId: data.businessId, slug: data.slug, loginUrl: data.loginUrl,
        temporaryPassword: data.temporaryPassword, userExisted: data.userExisted,
      });
    },
    onError: (e: any) => toast.error(e.message || "Oprettelse fejlede"),
  });

  // ── Step gating ──
  const canStep1Next = (skipCvr || !!industryText || !!name) && name.trim().length >= 2;
  const canStep2Next = !!breakdown && trialDays >= 0;
  const canStep3Next = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())
    && (passwordMode === "auto" || customPassword.length >= 8);

  const STEPS = ["Virksomhed", "Plan & funktioner", "Ejer-bruger", "Gennemse"];

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col">
        {/* Header med progress */}
        <div className="border-b border-border px-5 py-4 sm:px-6">
          {/* Lukkeknap leveres af SheetContent — undgå dobbelt X. */}
          <div className="flex items-center gap-2 pr-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Opret virksomhed</h2>
              <p className="text-xs text-muted-foreground">
                {result ? "Færdig" : `Trin ${step + 1} af ${STEPS.length} · ${STEPS[step]}`}
              </p>
            </div>
          </div>
          {!result && (
            <div className="mt-4 flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-foreground" : "bg-secondary"
                )} />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {result ? (
            <SuccessView result={result} onCreateAnother={reset} onClose={() => handleClose(false)} />
          ) : (
            <>
              {step === 0 && (
                <Step1Cvr
                  {...{ cvr, setCvr, cvrLoading, cvrError, lookupCvr, skipCvr, setSkipCvr,
                    name, setName, address, setAddress, zipCode, setZipCode, city, setCity,
                    phone, setPhone, businessEmail, setBusinessEmail, industryText, setIndustryText,
                    categories, toggleCategory, description, setDescription }}
                />
              )}
              {step === 1 && (
                <Step2Plan
                  {...{ features, setFeatures, extraLogins, setExtraLogins, billing, setBilling,
                    trialDays, setTrialDays, breakdown, pricing }}
                />
              )}
              {step === 2 && (
                <Step3Owner
                  {...{ ownerEmail, setOwnerEmail, passwordMode, setPasswordMode,
                    customPassword, setCustomPassword, sendWelcome, setSendWelcome,
                    suggestedFromBusiness: businessEmail }}
                />
              )}
              {step === 3 && (
                <Step4Review
                  {...{ name, cvr, categories, ownerEmail, trialDays, forceActive, setForceActive,
                    adminNote, setAdminNote, breakdown, billing, extraLogins, features, sendWelcome,
                    passwordMode }}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="border-t border-border bg-secondary/30 px-5 py-3 sm:px-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => step === 0 ? handleClose(false) : setStep(step - 1)}>
              {step === 0 ? "Annullér" : <><ArrowLeft className="mr-1.5 h-4 w-4" /> Tilbage</>}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={(step === 0 && !canStep1Next) || (step === 1 && !canStep2Next) || (step === 2 && !canStep3Next)}
              >
                Næste <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opretter…</> : <><Sparkles className="mr-2 h-4 w-4" />Opret virksomhed</>}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ─────────────────────────  STEP 1  ───────────────────────── */
function Step1Cvr(p: any) {
  return (
    <div className="space-y-5">
      {!p.skipCvr && (
        <div className="rounded-xl border border-border bg-card p-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">CVR-opslag</Label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={p.cvr}
                onChange={(e: any) => p.setCvr(e.target.value)}
                onKeyDown={(e: any) => { if (e.key === "Enter") { e.preventDefault(); p.lookupCvr(); } }}
                placeholder="8 cifre"
                inputMode="numeric"
                className="pl-10"
              />
            </div>
            <Button onClick={p.lookupCvr} disabled={p.cvrLoading || p.cvr.replace(/\D/g, "").length !== 8}>
              {p.cvrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1.5">Slå op</span>
            </Button>
          </div>
          {p.cvrError && <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="h-3.5 w-3.5" />{p.cvrError}</p>}
          <button onClick={() => p.setSkipCvr(true)} className="mt-3 text-xs text-muted-foreground hover:text-foreground underline">
            Spring CVR over (manuel indtastning)
          </button>
        </div>
      )}
      {p.skipCvr && (
        <button onClick={() => p.setSkipCvr(false)} className="text-xs text-muted-foreground hover:text-foreground underline">
          ← Tilbage til CVR-opslag
        </button>
      )}

      <div className="space-y-3">
        <Field label="Virksomhedsnavn *"><Input value={p.name} onChange={(e: any) => p.setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Adresse"><Input value={p.address} onChange={(e: any) => p.setAddress(e.target.value)} /></Field>
          <Field label="Telefon"><Input value={p.phone} onChange={(e: any) => p.setPhone(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Postnr."><Input value={p.zipCode} onChange={(e: any) => p.setZipCode(e.target.value)} /></Field>
          <div className="col-span-2"><Field label="By"><Input value={p.city} onChange={(e: any) => p.setCity(e.target.value)} /></Field></div>
        </div>
        <Field label="Virksomheds-email (vises offentligt)">
          <Input type="email" value={p.businessEmail} onChange={(e: any) => p.setBusinessEmail(e.target.value)} />
        </Field>
        {p.industryText && (
          <div className="rounded-md bg-secondary/60 px-3 py-1.5 text-xs text-muted-foreground">
            Branche fra CVR: <span className="text-foreground">{p.industryText}</span>
          </div>
        )}
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kategorier på Serviceydere *</Label>
        <p className="mt-1 text-xs text-muted-foreground">Vælg de kategorier virksomheden tilbydes under.</p>
        <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-3 space-y-3">
          {INDUSTRY_GROUPS.map((g) => (
            <div key={g.label}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {g.industries.map((ind) => {
                  const active = p.categories.includes(ind.key);
                  return (
                    <button
                      key={ind.key}
                      type="button"
                      onClick={() => p.toggleCategory(ind.key)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-foreground hover:border-foreground/40"
                      )}
                    >
                      <span>{ind.icon}</span>
                      <span>{ind.label}</span>
                      {active && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Field label="Kort beskrivelse (valgfri)">
        <Textarea rows={3} value={p.description} onChange={(e: any) => p.setDescription(e.target.value)} />
      </Field>
    </div>
  );
}

/* ─────────────────────────  STEP 2  ───────────────────────── */
function Step2Plan(p: any) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Funktioner</Label>
          <div className="mt-2 grid gap-2">
            {FEATURES.map(({ key, icon: Icon, title, free, description }) => {
              const active = p.features[key];
              return (
                <button key={key} type="button"
                  onClick={() => p.setFeatures({ ...p.features, [key]: !active })}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    active ? "border-foreground bg-secondary" : "border-border bg-card hover:border-foreground/30"
                  )}>
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    active ? "bg-foreground text-background" : "bg-secondary text-foreground")}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold">{title}</p>
                      {free
                        ? <span className="text-xs text-emerald-700 font-medium">Gratis</span>
                        : <span className="text-xs font-semibold tabular-nums">+{p.pricing ? formatDkk(p.pricing.price_accounting_integration_dkk) : "—"} kr/md</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ekstra medarbejderlogins">
            <Input type="number" min={0} max={50} value={p.extraLogins}
              onChange={(e: any) => p.setExtraLogins(Math.max(0, Math.min(50, Number(e.target.value) || 0)))} />
          </Field>
          <Field label="Prøveperiode (dage)">
            <Input type="number" min={0} max={365} value={p.trialDays}
              onChange={(e: any) => p.setTrialDays(Math.max(0, Math.min(365, Number(e.target.value) || 0)))} />
          </Field>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Faktureringsperiode</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {BILLING_OPTIONS.map((o) => (
              <button key={o.value} type="button" onClick={() => p.setBilling(o.value)}
                className={cn(
                  "rounded-lg border p-2.5 text-xs font-medium transition-colors",
                  p.billing === o.value ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/30"
                )}>{o.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar: live pris */}
      <div className="rounded-xl border border-border bg-secondary/40 p-4 h-fit lg:sticky lg:top-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Live pris</p>
        {p.breakdown ? (
          <>
            <div className="mt-3 space-y-1.5 text-sm">
              {p.breakdown.lines.map((l: any, i: number) => (
                <div key={i} className="flex justify-between gap-2 text-muted-foreground">
                  <span className="truncate">{l.label}</span>
                  <span className="tabular-nums shrink-0">{formatDkk(l.amount)} kr</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pr. måned (før rabat)</span>
                <span className="tabular-nums">{formatDkk(p.breakdown.monthlySubtotal)} kr</span>
              </div>
              {p.breakdown.discountPct > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 mt-0.5">
                  <span>Rabat ({p.breakdown.discountPct}%)</span>
                  <span>−{formatDkk(p.breakdown.monthlySubtotal - p.breakdown.monthlyAfterDiscount)} kr</span>
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm font-semibold">Pr. måned</span>
                <span className="text-lg font-bold tabular-nums">{formatDkk(p.breakdown.monthlyAfterDiscount)} kr</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">Indlæser priser…</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────  STEP 3  ───────────────────────── */
function Step3Owner(p: any) {
  return (
    <div className="space-y-5">
      <div>
        <Field label="Ejer-e-mail *">
          <Input type="email" value={p.ownerEmail} onChange={(e: any) => p.setOwnerEmail(e.target.value)}
            placeholder={p.suggestedFromBusiness || "ejer@eksempel.dk"} autoFocus />
        </Field>
        {p.suggestedFromBusiness && p.suggestedFromBusiness !== p.ownerEmail && (
          <button onClick={() => p.setOwnerEmail(p.suggestedFromBusiness)}
            className="mt-1.5 text-xs text-muted-foreground hover:text-foreground underline">
            Brug virksomheds-email ({p.suggestedFromBusiness})
          </button>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Hvis brugeren allerede findes, tildeles den som ejer. Ellers oprettes en ny bruger.
        </p>
      </div>

      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Adgangskode (kun ved ny bruger)</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["auto", "manual"] as const).map((m) => (
            <button key={m} type="button" onClick={() => p.setPasswordMode(m)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                p.passwordMode === m ? "border-foreground bg-secondary" : "border-border bg-card hover:border-foreground/30"
              )}>
              <p className="text-sm font-medium">{m === "auto" ? "Generér automatisk" : "Sæt selv"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {m === "auto" ? "Vi laver et sikkert engangskodeord" : "Indtast en specifik adgangskode"}
              </p>
            </button>
          ))}
        </div>
        {p.passwordMode === "manual" && (
          <Input className="mt-2" type="text" placeholder="Min. 8 tegn"
            value={p.customPassword} onChange={(e: any) => p.setCustomPassword(e.target.value)} />
        )}
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border border-border bg-card p-3">
        <Checkbox checked={p.sendWelcome} onCheckedChange={(c: any) => p.setSendWelcome(!!c)} className="mt-0.5" />
        <div>
          <p className="text-sm font-medium">Send velkomstmail</p>
          <p className="text-xs text-muted-foreground mt-0.5">Indeholder login-link og adgangskode.</p>
        </div>
      </label>
    </div>
  );
}

/* ─────────────────────────  STEP 4  ───────────────────────── */
function Step4Review(p: any) {
  const Row = ({ label, value }: any) => (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
  const enabledFeatures = Object.entries(p.features).filter(([, v]) => v).map(([k]) => k);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Resumé</p>
        <Row label="Virksomhed" value={p.name} />
        {p.cvr && <Row label="CVR" value={p.cvr.replace(/\D/g, "")} />}
        <Row label="Kategorier" value={p.categories.length ? p.categories.join(", ") : "—"} />
        <Row label="Ejer" value={p.ownerEmail} />
        <Row label="Prøveperiode" value={p.forceActive ? "(springes over)" : `${p.trialDays} dage`} />
        <Row label="Plan" value={`${p.billing} · ${formatDkk(p.breakdown?.monthlyAfterDiscount ?? 0)} kr/md`} />
        <Row label="Ekstra logins" value={p.extraLogins} />
        <Row label="Funktioner" value={enabledFeatures.join(", ") || "ingen"} />
        <Row label="Velkomstmail" value={p.sendWelcome ? "Ja" : "Nej"} />
        <Row label="Adgangskode" value={p.passwordMode === "auto" ? "Auto-genereret" : "Manuelt sat"} />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-amber-900 font-semibold flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Admin-options
        </p>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <Checkbox checked={p.forceActive} onCheckedChange={(c: any) => p.setForceActive(!!c)} className="mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">Marker som betalende med det samme</p>
            <p className="text-xs text-amber-800 mt-0.5">Springer prøveperioden over. Brug kun hvis virksomheden allerede har betalt eller har en aftale.</p>
          </div>
        </label>
        <div>
          <Label className="text-xs text-amber-900">Note til audit log (valgfri)</Label>
          <Textarea rows={2} value={p.adminNote} onChange={(e: any) => p.setAdminNote(e.target.value)}
            className="mt-1 bg-white" placeholder="Fx 'Migreret fra gammelt system' eller 'Manuelt opsat efter samtale med ejer'" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  SUCCESS  ───────────────────────── */
function SuccessView({ result, onCreateAnother, onClose }: any) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="mt-3 text-base font-semibold text-emerald-900">Virksomhed oprettet</p>
        <p className="text-xs text-emerald-800 mt-1">
          {result.userExisted ? "Eksisterende bruger tildelt som ejer" : "Ny bruger oprettet"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <CopyRow label="Slug" value={result.slug} />
        <CopyRow label="Login-URL" value={result.loginUrl} />
        {result.temporaryPassword && (
          <CopyRow label="Engangskodeord" value={result.temporaryPassword} mono highlight />
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onCreateAnother} className="flex-1">
          <Sparkles className="mr-2 h-4 w-4" /> Opret en til
        </Button>
        <Button onClick={onClose} className="flex-1">Luk</Button>
      </div>
    </div>
  );
}

function CopyRow({ label, value, mono, highlight }: any) {
  return (
    <div className={cn("flex items-center gap-2 rounded-md px-2 py-1.5", highlight && "bg-amber-50")}>
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <code className={cn("flex-1 truncate text-xs", mono && "font-mono")}>{value}</code>
      <Button size="sm" variant="ghost" className="h-7 px-2"
        onClick={() => { navigator.clipboard.writeText(value); toast.success("Kopieret"); }}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}