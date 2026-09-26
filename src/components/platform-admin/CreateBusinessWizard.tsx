// CreateBusinessWizard — flerstegs flow til admin der opretter en virksomhed
// manuelt. Spejler "Bliv udbyder"-siden, men med admin-specifikke felter
// (force-active, custom trial-længde, admin-note) og uden at admin selv
// behøver oprette ejer-bruger først.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Building2, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_INDUSTRIES } from "@/lib/service-taxonomy";
import Step1Cvr from "./create-business/Step1Cvr";
import Step2Plan from "./create-business/Step2Plan";
import Step3Owner from "./create-business/Step3Owner";
import Step4Review from "./create-business/Step4Review";
import SuccessView from "./create-business/SuccessView";
import type { Pricing, BillingPeriod, FeatureKey } from "./create-business/shared";

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
      <SheetContent className="planner-overlay flex w-full flex-col overflow-hidden p-0 sm:max-w-3xl">
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
