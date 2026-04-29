// SettingsTab — virksomhedens indstillinger, opbygget med samme designsprog
// som Overblik / Aftaler / Kunder / Medarbejdere / Anmeldelser:
// PageHeader, surface-admin cards, sub-nav chips og konsistent spacing.
import { useState, useMemo, useEffect, useRef, useCallback, forwardRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles, Settings, Bell, Route, Contact, Image as ImageIcon, Clock,
  CheckCircle2, AlertCircle, ArrowRight, Building2, Search, Calculator,
  CreditCard, XCircle, MessageCircle, Globe, ExternalLink, Link2, Loader2, Copy,
  UploadCloud,
} from "lucide-react";
import ImageUpload from "@/components/business/ImageUpload";
import { PageHeader, SectionCard, FieldLabel } from "@/components/admin/shared/AdminUI";
import { useUpdateBusiness } from "@/hooks/useDatabase";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useBusinessPlan, useReactivateBusinessPlan,
  usePlatformPricing, useUpdateBusinessPlan, useRemovePaymentMethod,
} from "@/hooks/useBusinessPlan";
import { StripeCheckoutDialog } from "@/components/billing/StripeCheckoutDialog";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  INDUSTRY_GROUPS,
  ALL_INDUSTRIES,
  customIndustryKeys,
  findIndustry,
} from "@/lib/service-taxonomy";

const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"] as const;
const WEEKDAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"] as const;

// Header offset i topbaren (h-14 = 56px) + lille luft, bruges både til sticky
// sidebar og smooth-scroll så ankret lander præcist under headeren.
const HEADER_OFFSET = 72;

/* ─── Time helpers — håndterer "08:00 - 16:00" strenge ───
 * Bruges af HoursEditor til at parse eksisterende åbningstider og bygge
 * normaliserede strenge tilbage. Tilgivende: accepterer "8", "8:0", "08.00". */
const parseHours = (raw: string): { open: string; close: string } | null => {
  if (!raw) return null;
  const m = raw.match(/(\d{1,2}[:.]?\d{0,2})\s*[-–]\s*(\d{1,2}[:.]?\d{0,2})/);
  if (!m) return null;
  const norm = (s: string) => {
    const cleaned = s.replace(".", ":");
    if (/^\d{1,2}$/.test(cleaned)) return `${cleaned.padStart(2, "0")}:00`;
    const [h, mm] = cleaned.split(":");
    return `${(h || "0").padStart(2, "0")}:${(mm || "00").padStart(2, "0")}`;
  };
  return { open: norm(m[1]), close: norm(m[2]) };
};
const formatHours = (open: string, close: string) => `${open} - ${close}`;

// ─── Sub-nav sektioner ───
// Vises som sticky sidebar (lg+) eller chip-rækken (mobil).
const SECTIONS = [
  { id: "general",       label: "Om virksomheden",    icon: Building2, hint: "Navn og kort beskrivelse" },
  { id: "industries",    label: "Hvad I tilbyder",    icon: Sparkles,  hint: "Brancher og kategorier" },
  { id: "contact",       label: "Kontakt og adresse", icon: Contact,   hint: "Telefon, e-mail, adresse" },
  { id: "branding",      label: "Profil og webadresse", icon: ImageIcon, hint: "Logo, billede og link" },
  { id: "hours",         label: "Åbningstider",       icon: Clock,     hint: "Hvornår I tager telefonen" },
  { id: "notifications", label: "E-mail-beskeder",    icon: Bell,      hint: "Hvad I vil have besked om" },
  { id: "billing",       label: "Pris og betaling",   icon: CreditCard, hint: "Pakke og betalingskort" },
  { id: "advanced",      label: "Ekstra funktioner",  icon: Route,     hint: "Tilvalg som ruteplan m.m." },
] as const;

/* ─── Toggle-switch (delt mellem notifikations- og rute-felter) ─── */
const ToggleSwitch = forwardRef<
  HTMLButtonElement,
  { checked: boolean; onChange: () => void }
>(({ checked, onChange }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onChange}
    aria-pressed={checked}
    // Ren switch: kun farve + thumb-position. Ingen overshoot/glow-ring som
    // ellers konkurrerede med StatusPill om opmærksomhed.
    className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150 ease-out ${
      checked ? "bg-accent" : "bg-border"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm mt-0.5 transition-transform duration-150 ease-out ${
        checked ? "translate-x-4 ml-0.5" : "translate-x-0.5"
      }`}
    />
  </button>
));
ToggleSwitch.displayName = "ToggleSwitch";

/* ─── StatusPill — viser "Aktiveret" (grøn) eller "Deaktiveret" (rød).
 * Kort, rolig farve-overgang når toggle skifter. Ingen overshoot eller
 * roterende ikoner — det er en status, ikke en notifikation. */
const StatusPill = ({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) => {
  return (
    <div
      className={`mt-2 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors duration-200 ease-out ${
        active
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="font-medium">{active ? activeLabel : inactiveLabel}</span>
    </div>
  );
};

/* ─── Reveal — collapser børn ind/ud (height + fade). Holdt minimal: ingen
 * blur, slide eller overshoot — det sender altid samme rolige signal. */
const Reveal = ({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    style={{
      transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
      transitionDuration: "200ms",
      transitionProperty: "grid-template-rows, opacity, margin",
    }}
    className={`grid ${
      open
        ? "grid-rows-[1fr] opacity-100 mt-2"
        : "grid-rows-[0fr] opacity-0 mt-0"
    } ${className ?? ""}`}
  >
    <div className="overflow-hidden">{children}</div>
  </div>
);

const SettingsTab = ({ business }: { business: any }) => {
  const updateBiz = useUpdateBusiness();
  const { user } = useAuth();
  const { data: plan } = useBusinessPlan(business.id);
  const reactivate = useReactivateBusinessPlan();
  const removeCard = useRemovePaymentMethod();
  const updatePlan = useUpdateBusinessPlan();
  const { data: pricing } = usePlatformPricing();

  // Stripe Embedded Checkout-dialog samt loading-state for "Administrér kort".
  const [showCheckout, setShowCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const location = useLocation();

  // Hvis brugeren ankommer fra prøveperiode-banneret med ?openCheckout=1,
  // åbner vi automatisk Stripe Embedded Checkout — men kun hvis virksomheden
  // ikke allerede har et betalingskort registreret.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("openCheckout") === "1" && plan && !plan.has_payment_method) {
      setShowCheckout(true);
      // Fjern parameteren igen så dialogen ikke åbner ved hver re-render.
      params.delete("openCheckout");
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", next);
    }
  }, [plan, location.search]);

  const openCustomerPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: {
          businessId: business.id,
          returnUrl: `${window.location.origin}/virksomhed?tab=settings`,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.url) throw new Error((error as any)?.message || data?.error || "Kunne ikke åbne portal");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke åbne kort-administrationen");
    } finally {
      setOpeningPortal(false);
    }
  };

  // Faktureringsinterval — månedlig / kvartalsvis / årlig (samme som ved
  // "bliv udbyder"). Skifter rabatten i prisberegningen.
  const handleBillingPeriodChange = async (period: "monthly" | "quarterly" | "yearly") => {
    if (!plan?.id || period === planBilling) return;
    try {
      await updatePlan.mutateAsync({ businessId: business.id, patch: { billing_period: period } });
      toast.success(
        period === "yearly" ? "Skiftet til årlig fakturering" :
        period === "quarterly" ? "Skiftet til kvartalsvis fakturering" :
        "Skiftet til månedlig fakturering"
      );
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke skifte interval");
    }
  };

  const handleRemoveCard = async () => {
    if (!confirm("Er du sikker på at du vil fjerne dit betalingskort? Hvis prøveperioden er udløbet bliver din virksomhed deaktiveret.")) return;
    try {
      await removeCard.mutateAsync(business.id);
      toast.success("Betalingskort fjernet");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke fjerne kort");
    }
  };

  // ─── Form state ───
  const [name, setName] = useState(business.name);
  const [description, setDescription] = useState(business.description || "");
  const [phone, setPhone] = useState(business.phone || "");
  const [email, setEmail] = useState(business.email || "");
  const [address, setAddress] = useState(business.address || "");
  const [city, setCity] = useState(business.city || "");
  const [zipCode, setZipCode] = useState(business.zip_code || "");
  const [logoUrl, setLogoUrl] = useState(business.logo_url || "");
  const [coverUrl, setCoverUrl] = useState(business.cover_image_url || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    (business.categories as string[]) || (business.category ? [business.category] : [])
  );
  // selected_subcategories: { [industryKey]: string[] }
  // Bestemmer hvilke underkategorier virksomheden vil tilbyde og dermed hvilke
  // der bliver foreslået ved oprettelse af services.
  const [selectedSubcategories, setSelectedSubcategories] = useState<Record<string, string[]>>(
    ((business.settings as any)?.selected_subcategories as Record<string, string[]>) || {}
  );
  const [openHours, setOpenHours] = useState<Record<string, string>>(business.opening_hours || {});
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({
    new_order: true,
    upcoming_service: true,
    subscription_change: true,
    new_review: false,
    lead_emails: true,
    ...((business.notification_settings as Record<string, boolean>) || {}),
  });
  const [routePlanningEnabled, setRoutePlanningEnabled] = useState<boolean>(
    !!(business.settings as any)?.route_planning_enabled
  );
  // Regnskabsprogram-integration — feature-flag som virksomheden selv kan slå
  // til/fra. Selve integrationen bygges senere; vi gemmer kun præferencen.
  const [accountingIntegrationEnabled, setAccountingIntegrationEnabled] = useState<boolean>(
    !!(business.settings as any)?.accounting_integration_enabled
  );
  // Leads-fanen er en gratis valgfri funktion. Skjult som standard så ikke
  // alle virksomheder får en ekstra fane i navigationen — kan slås til her
  // under Avanceret når man vil modtage lead-anmodninger fra "Indhent 3 tilbud".
  const [leadsEnabled, setLeadsEnabled] = useState<boolean>(
    !!(business.settings as any)?.leads_enabled
  );
  // Live chat — gratis valgfri funktion. Når slået til vises en chat-widget
  // på virksomhedens offentlige side, og en "Live chat"-fane tilføjes til
  // admin-panelet hvor virksomheden kan svare på henvendelser.
  const [livechatEnabled, setLivechatEnabled] = useState<boolean>(
    !!(business.settings as any)?.livechat_enabled
  );
  // Custom domæne — virksomhedens eget domæne (fx "ready2clean.dk") som
  // bruges som kanonisk URL på den offentlige virksomhedsside, så Google
  // indekserer deres eget domæne fremfor serviceydere.dk/v/slug. Selve
  // DNS/hosting-koblingen håndteres separat — her gemmer vi blot
  // præferencen så SEO-tags peger det rigtige sted hen.
  const [customDomain, setCustomDomain] = useState<string>(
    ((business.settings as any)?.custom_domain as string) || ""
  );
  const queryClient = useQueryClient();
  // Custom permalink (slug) — virksomhedens egen URL-stump efter
  // /v/. Skal være unik på tværs af platformen, så vi kontrollerer
  // serverside via en separat select før gem; UI viser også en hurtig
  // tilgængeligheds-indikator.
  const [slug, setSlug] = useState<string>(business.slug || "");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid" | "current">("current");
  const slugCheckTimer = useRef<number | null>(null);
  // Domæne-verifikation
  const domainStatus = ((business.settings as any)?.custom_domain_status as string) || "";
  const domainVerifiedAt = ((business.settings as any)?.custom_domain_verified_at as string) || null;
  const [domainVerifying, setDomainVerifying] = useState(false);
  const [domainResult, setDomainResult] = useState<any>(null);

  // CVR lookup
  const [cvrQuery, setCvrQuery] = useState("");
  const [cvrLoading, setCvrLoading] = useState(false);
  const [cvrResult, setCvrResult] = useState<any>(null);
  const [cvrError, setCvrError] = useState("");

  // Postnummer auto-udfyld by
  const [zipLoading, setZipLoading] = useState(false);

  // Aktivt sub-nav — opdateres både ved klik og automatisk via scroll-observer.
  const [activeSection, setActiveSection] = useState<string>("general");
  const isProgrammaticScroll = useRef(false);

  const toggleSettingsCategory = (c: string) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      // Når man fravælger en branche, ryd dens underkategori-valg
      if (prev.includes(c)) {
        setSelectedSubcategories((s) => { const n = { ...s }; delete n[c]; return n; });
      } else {
        // Default: vælg ALLE underkategorier i den nyvalgte branche
        const ind = findIndustry(c);
        if (ind) {
          setSelectedSubcategories((s) => ({ ...s, [c]: ind.subcategories.map((x) => x.label) }));
        }
      }
      return next;
    });
  };

  const toggleSubcategory = (industryKey: string, sub: string) => {
    setSelectedSubcategories((prev) => {
      const cur = prev[industryKey] || [];
      const next = cur.includes(sub) ? cur.filter((x) => x !== sub) : [...cur, sub];
      return { ...prev, [industryKey]: next };
    });
  };

  // Smooth, accurate anchor-scroll. Bruger window.scrollTo med eksplicit offset
  // (header-højde) i stedet for scrollIntoView, så ankret lander præcist under
  // den sticky topbaren — uafhængigt af scroll-mt værdier.
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(`settings-${id}`);
    if (!el) return;
    setActiveSection(id);
    isProgrammaticScroll.current = true;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    // Slip observerens "lock" igen efter animationen er færdig.
    window.setTimeout(() => { isProgrammaticScroll.current = false; }, 700);
  }, []);

  // Auto-detect aktiv sektion via IntersectionObserver — så sidebar fremhæver
  // den sektion der er i viewporten mens man scroller manuelt.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScroll.current) return;
        // Vælg den øverste synlige sektion.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.id.replace("settings-", "");
          setActiveSection(id);
        }
      },
      {
        // Top-margin matcher header-offset så vi skifter aktivt punkt præcist
        // når sektionen krydser under headeren.
        rootMargin: `-${HEADER_OFFSET + 8}px 0px -60% 0px`,
        threshold: 0,
      },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(`settings-${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const lookupCvr = async () => {
    const q = cvrQuery.trim();
    if (!q) return;
    setCvrLoading(true); setCvrError(""); setCvrResult(null);
    try {
      const isNumber = /^\d+$/.test(q);
      const url = isNumber
        ? `https://cvrapi.dk/api?vat=${q}&country=dk`
        : `https://cvrapi.dk/api?name=${encodeURIComponent(q)}&country=dk`;
      const res = await fetch(url, { headers: { "User-Agent": "Serviceydere/1.0" } });
      if (!res.ok) throw new Error("Ikke fundet");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCvrResult(data);
    } catch (e: any) {
      setCvrError(e.message || "Kunne ikke finde virksomheden");
    }
    setCvrLoading(false);
  };

  // ─── Auto-fill fra gemt CVR ───
  // Når en virksomhed er oprettet via "bliv udbyder" gemmer vi CVR-nummeret i
  // settings.cvr. Hvis der er felter der mangler ved første load, slår vi op
  // i CVR-registret automatisk og udfylder dem stille — uden at overskrive
  // noget brugeren allerede selv har skrevet.
  const cvrAutoFillTried = useRef(false);
  useEffect(() => {
    if (cvrAutoFillTried.current) return;
    const savedCvr = (business.settings as any)?.cvr as string | undefined;
    if (!savedCvr || savedCvr.length !== 8) return;
    const missingAny = !address || !zipCode || !city || !phone;
    if (!missingAny) return;
    cvrAutoFillTried.current = true;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("cvr-lookup", { body: { cvr: savedCvr } });
        if (!data?.found) return;
        if (!address && data.address) setAddress(data.address);
        if (!zipCode && data.zip_code) setZipCode(data.zip_code);
        if (!city && data.city) setCity(data.city);
        if (!phone && data.phone) setPhone(data.phone.toString().replace(/\s/g, ""));
        if (!email && data.email) setEmail(data.email);
      } catch { /* stille — feltet kan altid udfyldes manuelt */ }
    })();
    // Vi vil kun køre denne effekt én gang, og kun når business.id ændrer sig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  const applyCvrData = () => {
    if (!cvrResult) return;
    if (cvrResult.name) setName(cvrResult.name);
    if (cvrResult.phone) setPhone(cvrResult.phone.replace(/\s/g, ""));
    if (cvrResult.email) setEmail(cvrResult.email);
    if (cvrResult.address) setAddress(cvrResult.address);
    if (cvrResult.city) setCity(cvrResult.city);
    if (cvrResult.zipcode) setZipCode(cvrResult.zipcode.toString());
    toast.success("Oplysninger udfyldt fra CVR");
    setCvrResult(null); setCvrQuery("");
  };

  const handleZipChange = async (val: string) => {
    setZipCode(val);
    if (val.length === 4 && /^\d{4}$/.test(val)) {
      setZipLoading(true);
      try {
        const res = await fetch(`https://api.dataforsyningen.dk/postnumre/${val}`);
        if (res.ok) {
          const data = await res.json();
          if (data.navn) setCity(data.navn);
        }
      } catch {}
      setZipLoading(false);
    }
  };

  const handlePhoneChange = (val: string) => setPhone(val.replace(/[^\d+]/g, ""));

  // ─── Profil-completeness ───
  // Bruges i toplinje-bannret (ligesom Overblik viser pending-bestillinger).
  const completeness = useMemo(() => {
    const checks = [
      { key: "logo",        done: !!logoUrl,                    label: "Logo" },
      { key: "cover",       done: !!coverUrl,                   label: "Coverbillede" },
      { key: "description", done: description.trim().length > 20, label: "Beskrivelse" },
      { key: "phone",       done: !!phone,                      label: "Telefon" },
      { key: "email",       done: !!email,                      label: "Email" },
      { key: "address",     done: !!address && !!zipCode,       label: "Adresse" },
      { key: "categories",  done: selectedCategories.length > 0, label: "Branche" },
      { key: "hours",       done: Object.keys(openHours).length > 0, label: "Åbningstider" },
    ];
    const done = checks.filter((c) => c.done).length;
    return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
  }, [logoUrl, coverUrl, description, phone, email, address, zipCode, selectedCategories, openHours]);

  const origCategories = (business.categories as string[]) || (business.category ? [business.category] : []);
  const origNotif = business.notification_settings as Record<string, boolean> || {};
  const origRoutePlanning = !!(business.settings as any)?.route_planning_enabled;
  const origAccountingIntegration = !!(business.settings as any)?.accounting_integration_enabled;
  const origLeadsEnabled = !!(business.settings as any)?.leads_enabled;
  const origLivechatEnabled = !!(business.settings as any)?.livechat_enabled;
  const origCustomDomain = ((business.settings as any)?.custom_domain as string) || "";
  const origSubcats = ((business.settings as any)?.selected_subcategories as Record<string, string[]>) || {};
  const hasChanges = name !== business.name || description !== (business.description || "") ||
    phone !== (business.phone || "") || email !== (business.email || "") ||
    address !== (business.address || "") || city !== (business.city || "") ||
    zipCode !== (business.zip_code || "") || logoUrl !== (business.logo_url || "") ||
    coverUrl !== (business.cover_image_url || "") ||
    JSON.stringify([...selectedCategories].sort()) !== JSON.stringify([...origCategories].sort()) ||
    JSON.stringify(selectedSubcategories) !== JSON.stringify(origSubcats) ||
    JSON.stringify(openHours) !== JSON.stringify(business.opening_hours || {}) ||
    routePlanningEnabled !== origRoutePlanning ||
    accountingIntegrationEnabled !== origAccountingIntegration ||
    leadsEnabled !== origLeadsEnabled ||
    livechatEnabled !== origLivechatEnabled ||
    customDomain.trim() !== origCustomDomain ||
    JSON.stringify(notifSettings) !== JSON.stringify({ new_order: true, upcoming_service: true, subscription_change: true, new_review: false, ...origNotif });

  // ─── Auto-save ───
  // Ingen "Gem"-knap, ingen toasts. Vi debouncer ændringer og fyrer en mutation
  // af når brugeren har holdt pause. Errors vises stadig (ellers ved man ikke
  // hvorfor noget gik galt) — succes er stille.
  const saveTimer = useRef<number | null>(null);
  const lastSaved = useRef<string>("");

  // Stabil signature af alt det vi vil persistere — bruges til at undgå
  // duplicerede gem ved re-renders med samme data.
  const buildPayload = useCallback(() => ({
    id: business.id,
    name: name.trim() || business.name,
    description: description.trim() || null,
    phone: phone.trim() || null,
    email: email.trim() || null,
    address: address.trim() || null,
    city: city.trim() || null,
    zip_code: zipCode.trim() || null,
    logo_url: logoUrl || null,
    cover_image_url: coverUrl || null,
    category: selectedCategories[0] || null,
    categories: selectedCategories,
    opening_hours: openHours,
    notification_settings: notifSettings,
    settings: {
      ...((business.settings as any) || {}),
      route_planning_enabled: routePlanningEnabled,
      accounting_integration_enabled: accountingIntegrationEnabled,
      leads_enabled: leadsEnabled,
      livechat_enabled: livechatEnabled,
      // Domæne gemmes normaliseret. Når brugeren ændrer domænet,
      // nulstiller vi verifikations-status så vi ikke fejlagtigt påstår
      // det stadig er aktivt — det skal verificeres igen.
      custom_domain: customDomain.trim()
        ? customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0]
        : null,
      custom_domain_status: customDomain.trim() === origCustomDomain
        ? ((business.settings as any)?.custom_domain_status ?? null)
        : (customDomain.trim() ? "pending_ownership" : null),
      custom_domain_verified_at: customDomain.trim() === origCustomDomain
        ? ((business.settings as any)?.custom_domain_verified_at ?? null)
        : null,
      selected_subcategories: selectedSubcategories,
    },
  }), [
    business.id, business.name, business.settings, origCustomDomain,
    name, description, phone, email, address, city, zipCode,
    logoUrl, coverUrl, selectedCategories, selectedSubcategories,
    openHours, notifSettings, routePlanningEnabled, accountingIntegrationEnabled, leadsEnabled, livechatEnabled, customDomain,
  ]);

  useEffect(() => {
    if (!hasChanges) return;
    const sig = JSON.stringify(buildPayload());
    if (sig === lastSaved.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      lastSaved.current = sig;
      updateBiz.mutate(buildPayload() as any, {
        onError: (e: any) => toast.error(e?.message || "Kunne ikke gemme"),
      });
    }, 700);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [hasChanges, buildPayload, updateBiz]);

  // Diskret status til header (gemmer / gemt / ændringer).
  const saveStatus: "saving" | "saved" | "idle" =
    updateBiz.isPending ? "saving" : (hasChanges ? "saving" : "saved");

  // ─── Custom permalink (slug) ───
  // Vi auto-tjekker tilgængelighed mens brugeren skriver, men gemmer KUN
  // ved klik på "Gem permalink" — slug-skift påvirker URL'er, så vi
  // undgår utilsigtede ændringer via auto-save.
  const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;
  const slugChanged = slug !== business.slug;
  useEffect(() => {
    const next = slug.trim().toLowerCase();
    if (next === business.slug) { setSlugStatus("current"); return; }
    if (!SLUG_REGEX.test(next)) { setSlugStatus("invalid"); return; }
    setSlugStatus("checking");
    if (slugCheckTimer.current) window.clearTimeout(slugCheckTimer.current);
    slugCheckTimer.current = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("businesses").select("id").eq("slug", next).maybeSingle();
      if (error) { setSlugStatus("invalid"); return; }
      setSlugStatus(data && data.id !== business.id ? "taken" : "available");
    }, 400);
    return () => { if (slugCheckTimer.current) window.clearTimeout(slugCheckTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, business.slug, business.id]);

  const handleSaveSlug = async () => {
    const next = slug.trim().toLowerCase();
    if (next === business.slug) return;
    if (!SLUG_REGEX.test(next)) {
      toast.error("Permalink må kun indeholde små bogstaver, tal og bindestreg (3-60 tegn).");
      return;
    }
    if (slugStatus === "taken") {
      toast.error("Det permalink er optaget. Prøv et andet.");
      return;
    }
    const { error } = await supabase.from("businesses").update({ slug: next }).eq("id", business.id);
    if (error) {
      toast.error(error.message?.includes("duplicate") ? "Det permalink er optaget." : "Kunne ikke gemme permalink.");
      return;
    }
    toast.success("Permalink opdateret. Din offentlige adresse er nu /v/" + next);
    queryClient.invalidateQueries({ queryKey: ["my-business"] });
    queryClient.invalidateQueries({ queryKey: ["business"] });
  };

  // ─── Custom domæne — verificer ───
  const handleVerifyDomain = async () => {
    const cleaned = customDomain.trim().toLowerCase()
      .replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0];
    if (!cleaned) { toast.error("Skriv et domæne først."); return; }
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(cleaned)) {
      toast.error("Domænet ser ikke gyldigt ud. Brug fx mitfirma.dk uden https:// eller stier.");
      return;
    }
    setDomainVerifying(true);
    setDomainResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-custom-domain", {
        body: { business_id: business.id, domain: cleaned },
      });
      if (error) throw error;
      setDomainResult(data);
      if (data?.status === "verified") toast.success("Domænet er verificeret 🎉");
      else toast.error(data?.message || "Domænet er ikke klar endnu — tjek dine DNS-records.");
      queryClient.invalidateQueries({ queryKey: ["my-business"] });
      queryClient.invalidateQueries({ queryKey: ["business"] });
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke verificere domænet lige nu. Prøv igen.");
    } finally {
      setDomainVerifying(false);
    }
  };

  // Verifikations-token = de første 16 tegn af business.id (uden bindestreger)
  const domainToken = (business.id || "").replace(/-/g, "").slice(0, 16);

  // ─── Live prisberegning ───
  // Bygger samme breakdown som "bliv udbyder", men ud fra brugerens nuværende
  // toggles. Bruges både til at vise oversigten og til at gemme den korrekte
  // månedspris i business_plans når en feature slås til/fra.
  const planExtraLogins = plan?.extra_employee_logins ?? 0;
  const planBilling = plan?.billing_period ?? "monthly";
  const priceBreakdown = useMemo(() => {
    if (!pricing) return null;
    const lines: { key: string; label: string; amount: number }[] = [
      { key: "base", label: "Basis (virksomhedsprofil + bestillinger)", amount: pricing.base_price_dkk },
    ];
    if (routePlanningEnabled)
      lines.push({ key: "route", label: "Ruteplanlægning", amount: pricing.price_route_planning_dkk });
    if (accountingIntegrationEnabled)
      lines.push({ key: "acc", label: "Regnskabsintegration", amount: pricing.price_accounting_integration_dkk });
    if (planExtraLogins > 0)
      lines.push({
        key: "logins",
        label: `${planExtraLogins} ekstra medarbejderlogin${planExtraLogins === 1 ? "" : "s"}`,
        amount: planExtraLogins * pricing.price_per_employee_login_dkk,
      });
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const discountPct =
      planBilling === "yearly" ? pricing.discount_yearly_pct
      : planBilling === "quarterly" ? pricing.discount_quarterly_pct
      : 0;
    const monthlyAfterDiscount = subtotal * (1 - discountPct / 100);
    return { lines, subtotal, discountPct, monthlyAfterDiscount };
  }, [pricing, routePlanningEnabled, accountingIntegrationEnabled, planExtraLogins, planBilling]);

  // Hold business_plans.monthly_price_dkk synkroniseret med valgte features
  // — så platform-admin altid kan se den faktiske månedspris og korrekt
  // varsler brugeren ved næste fakturering.
  const lastSavedPrice = useRef<number | null>(null);
  useEffect(() => {
    if (!plan?.id || !priceBreakdown) return;
    const target = Math.round(priceBreakdown.monthlyAfterDiscount);
    const current = Math.round(plan.monthly_price_dkk);
    const planFeaturesMatch =
      plan.route_planning_enabled === routePlanningEnabled &&
      plan.accounting_integration_enabled === accountingIntegrationEnabled;
    if (planFeaturesMatch && current === target) return;
    if (lastSavedPrice.current === target && planFeaturesMatch) return;
    lastSavedPrice.current = target;
    updatePlan.mutate({
      businessId: business.id,
      patch: {
        monthly_price_dkk: target,
        route_planning_enabled: routePlanningEnabled,
        accounting_integration_enabled: accountingIntegrationEnabled,
      },
    });
    // Vis kun en toast hvis prøveperioden er overstået — under prøven er
    // ændringerne gratis og kræver ingen forklaring.
    const trialOver = plan.status === "active" || plan.status === "expired";
    if (trialOver && current !== target) {
      const diff = target - current;
      if (diff > 0) {
        toast.success(`Abonnementspris opdateret — ${diff.toLocaleString("da-DK")} kr/md tillægges fra næste fakturering.`);
      } else if (diff < 0) {
        toast.success(`Abonnementspris opdateret — du sparer ${Math.abs(diff).toLocaleString("da-DK")} kr/md fra næste fakturering.`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePlanningEnabled, accountingIntegrationEnabled, priceBreakdown?.monthlyAfterDiscount, plan?.id]);

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="Indstillinger"
        description="Administrer din virksomheds profil, kontakt, branding og notifikationer."
        action={
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
            {saveStatus === "saving" ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Gemmer…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Alt gemt automatisk
              </>
            )}
          </div>
        }
      />

      {/* ─── Status-bar: profil-completeness + sub-nav chips ─── */}
      {/* Følger samme mønster som Overblik (status-banner) + Medarbejdere (filter-chips). */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-stretch">
        <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {completeness.pct === 100 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Profil-fuldstændighed
                </p>
              </div>
              <p className="mt-1 text-base font-semibold text-foreground tabular-nums">
                {completeness.done} af {completeness.total} felter udfyldt · {completeness.pct}%
              </p>
              {completeness.pct < 100 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Mangler: {completeness.checks.filter((c) => !c.done).map((c) => c.label).join(", ")}
                </p>
              )}
            </div>
            <div className="flex w-full max-w-[260px] sm:shrink-0">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all ${
                    completeness.pct === 100 ? "bg-emerald-500" : "bg-accent"
                  }`}
                  style={{ width: `${completeness.pct}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <a
          href={business.slug ? `/v/${business.slug}` : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`hidden sm:flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/30 ${
            !business.slug ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Se din side <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {/* ─── Sub-nav chips (mobil/tablet) — sticky sidebar bruges på lg ─── */}
      {/* Bliver sticky lige under topbaren (h-14) så den følger med ned. */}
      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border px-4 sm:px-6 py-2">
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToSection(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5 ${
              activeSection === id
                ? "border-border bg-secondary text-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon />
            {label}
          </button>
          ))}
        </div>
      </div>

      {/* ─── To-kolonne på lg+: sticky sidebar + indhold ─── */}
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        {/* Sticky sidebar nav (kun lg+) — top-offset matcher den sticky topbar
            (h-14 = 56px) + lille luft, så den klistrer fast lige under headeren
            mens man scroller. */}
        <aside className="hidden lg:block lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto">
          <nav className="flex flex-col gap-1 rounded-xl border border-border/80 bg-card p-2 shadow-sm">
            {SECTIONS.map(({ id, label, icon: Icon, hint }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors w-full ${
                  activeSection === id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{label}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="space-y-4">
      {/* ─── CVR Lookup — fuld bredde, øverst ─── */}
      <SectionCard
        title="Automatisk udfyldning fra CVR"
        icon={<Sparkles />}
        description="Indtast CVR-nummer eller virksomhedsnavn for at hente og udfylde alle felter automatisk."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="CVR-nummer eller virksomhedsnavn..."
            value={cvrQuery}
            onChange={(e) => setCvrQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupCvr()}
            className="bg-card h-10 flex-1 rounded-lg"
          />
          <Button
            onClick={lookupCvr}
            disabled={cvrLoading || !cvrQuery.trim()}
            className="h-10 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-medium px-4 shrink-0"
          >
            {cvrLoading ? "Søger..." : "Søg i CVR"}
          </Button>
        </div>
        {cvrError && <p className="text-xs text-destructive">{cvrError}</p>}
        {cvrResult && (
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{cvrResult.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  CVR: {cvrResult.vat} · {cvrResult.address}, {cvrResult.zipcode} {cvrResult.city}
                </p>
                {cvrResult.phone && <p className="text-xs text-muted-foreground">Tlf: {cvrResult.phone}</p>}
                {cvrResult.email && <p className="text-xs text-muted-foreground">Email: {cvrResult.email}</p>}
              </div>
              <Button size="sm" onClick={applyCvrData} className="shrink-0 h-8 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-medium">
                Anvend
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ─── Hovedindhold: 1-kolonne (sidebar håndterer navigation) ─── */}
      <div className="grid gap-4">
        {/* Generelt — kun navn + beskrivelse */}
        <div id="settings-general" className="scroll-mt-6">
          <SectionCard title="Om virksomheden" icon={<Building2 />} description="Det navn og den korte beskrivelse kunderne ser øverst på jeres side.">
            <div className="space-y-4">
              <div data-tour="field-company-name">
                <FieldLabel>Virksomhedsnavn</FieldLabel>
                <Input placeholder="Virksomhedsnavn" value={name} onChange={(e) => setName(e.target.value)} className="bg-card h-10 rounded-lg" />
              </div>
              <div data-tour="field-company-description">
                <FieldLabel>Beskrivelse</FieldLabel>
                <Textarea placeholder="Skriv 2-4 sætninger om hvad I laver, hvor I gør det, og hvad der gør jer gode. Det her er det første kunderne læser." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} className="bg-card rounded-lg" />
                <p className="mt-1 text-xs text-muted-foreground">{description.length}/500 tegn</p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Brancher — egen sektion med kategorier underneden */}
        <div id="settings-industries" className="scroll-mt-6">
          <SectionCard
            title="Brancher & kategorier"
            icon={<Sparkles />}
            description="Vælg de brancher I arbejder i, og kryds de konkrete typer opgaver af, I tager. Det er det her, der bestemmer hvilke kunder der finder jer."
          >
            <div className="space-y-5">
              <div>
                <FieldLabel>Hvilke brancher tilhører I?</FieldLabel>
                <p className="-mt-1 mb-2.5 text-xs text-muted-foreground">
                  Vælg én eller flere. Default vælges alle underkategorier — du kan justere længere nede.
                </p>
                <IndustryPicker
                  selected={selectedCategories}
                  onToggle={toggleSettingsCategory}
                />
              </div>

              {selectedCategories.length > 0 && (
                <div className="border-t border-border pt-4">
                  <FieldLabel>Hvilke kategorier vil I tilbyde?</FieldLabel>
                  <p className="-mt-1 mb-3 text-xs text-muted-foreground">
                    Underkategorier I IKKE vælger her bliver heller ikke foreslået, når I opretter services.
                  </p>
                  <SubcategoryPicker
                    selectedIndustries={selectedCategories}
                    selectedSubcategories={selectedSubcategories}
                    onToggle={toggleSubcategory}
                  />
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Kontakt */}
        <div id="settings-contact" className="scroll-mt-6">
          <SectionCard title="Kontakt og adresse" icon={<Contact />} description="Sådan kan kunderne ringe, skrive eller finde vej til jer. Bruges også på fakturaer.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div data-tour="field-phone">
                  <FieldLabel>Telefon</FieldLabel>
                  <Input placeholder="12 34 56 78" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} className="bg-card h-10 rounded-lg" type="tel" />
                </div>
                <div data-tour="field-email">
                  <FieldLabel>Email</FieldLabel>
                  <Input placeholder="kontakt@virksomhed.dk" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-card h-10 rounded-lg" type="email" />
                </div>
              </div>
              <div data-tour="field-address">
                <FieldLabel>Adresse</FieldLabel>
                <Input placeholder="Vejnavn 123" value={address} onChange={(e) => setAddress(e.target.value)} className="bg-card h-10 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div data-tour="field-zip">
                  <FieldLabel>Postnummer</FieldLabel>
                  <div className="relative">
                    <Input placeholder="2100" value={zipCode} onChange={(e) => handleZipChange(e.target.value)} className="bg-card h-10 rounded-lg" maxLength={4} />
                    {zipLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-accent" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">By udfyldes automatisk</p>
                </div>
                <div data-tour="field-city">
                  <FieldLabel>By</FieldLabel>
                  <Input placeholder="København" value={city} onChange={(e) => setCity(e.target.value)} className="bg-card h-10 rounded-lg" />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Branding */}
        <div id="settings-branding" className="scroll-mt-6">
          <SectionCard title="Profil og webadresse" icon={<ImageIcon />} description="Logoet, det store forsidebillede og linket kunderne får, når I deler jeres profil.">
            {/* Side-om-side så cover ikke fylder hele bredden — kun en kompakt
                preview, da fuld bannervisning ikke er nødvendig her. */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="shrink-0" data-tour="field-logo">
                <FieldLabel>Logo</FieldLabel>
                <ImageUpload folder={`${user!.id}/logo`} currentUrl={logoUrl || null} onUploaded={setLogoUrl} label="" aspectRatio="aspect-square" className="w-24" objectFit="contain" />
                <p className="mt-2 text-xs text-muted-foreground">Kvadrat (fx 512×512)</p>
              </div>
              <div className="min-w-0 flex-1 sm:max-w-xs" data-tour="field-cover">
                <FieldLabel>Coverbillede</FieldLabel>
                <ImageUpload folder={`${user!.id}/cover`} currentUrl={coverUrl || null} onUploaded={setCoverUrl} label="" aspectRatio="aspect-video" className="w-full max-w-[260px]" />
                <p className="mt-2 text-xs text-muted-foreground">Bredt 16:9 — vises som banner på din side</p>
              </div>
            </div>

            {/* Permalink (slug) */}
            <div className="mt-6 rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
                  <Link2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Jeres link på Serviceydere</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Det her er det link kunderne åbner, når de finder jer. Skriv jeres firmanavn med små bogstaver og bindestreger i stedet for mellemrum (fx <span className="font-mono">nord-rengoering</span>). Pas på med at ændre det, når I først har delt det — gamle links holder op med at virke.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <div className="flex h-10 items-center rounded-l-lg border border-r-0 border-border bg-muted px-3 text-xs text-muted-foreground">
                      serviceydere.dk/v/
                    </div>
                    <Input
                      placeholder="min-virksomhed"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      className="h-10 flex-1 rounded-l-none rounded-r-lg bg-card font-mono text-sm sm:-ml-2"
                      maxLength={60}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Button
                      type="button"
                      onClick={handleSaveSlug}
                      disabled={!slugChanged || slugStatus === "checking" || slugStatus === "taken" || slugStatus === "invalid"}
                      className="h-10 rounded-lg"
                    >
                      Gem link
                    </Button>
                  </div>
                  <p className="mt-2 text-xs">
                    {slugStatus === "current" && <span className="text-muted-foreground">Aktuel adresse: <span className="font-mono text-foreground">/v/{business.slug}</span></span>}
                    {slugStatus === "checking" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Tjekker om navnet er ledigt…</span>}
                    {slugStatus === "available" && <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Ledigt — du kan trygt gemme</span>}
                    {slugStatus === "taken" && <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> En anden virksomhed bruger allerede dette — prøv noget andet</span>}
                    {slugStatus === "invalid" && <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> Brug 3-60 tegn — kun små bogstaver, tal og bindestreger (ingen æ, ø, å eller mellemrum)</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Custom domæne */}
            <div className="mt-4 rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Eget domæne (valgfrit)</p>
                    {customDomain.trim() && (
                      domainStatus === "active" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          <CheckCircle2 className="h-3 w-3" /> Live
                        </span>
                      ) : domainStatus === "pending_activation" || domainStatus === "verified" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                          <Loader2 className="h-3 w-3 animate-spin" /> Afventer aktivering
                        </span>
                      ) : domainStatus === "pending_dns" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                          <AlertCircle className="h-3 w-3" /> Ejerskab OK · DNS mangler
                        </span>
                      ) : domainStatus === "pending_ownership" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          <AlertCircle className="h-3 w-3" /> Afventer ejerskab (TXT)
                        </span>
                      ) : domainStatus === "failed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                          <XCircle className="h-3 w-3" /> Verifikation fejlede
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          <AlertCircle className="h-3 w-3" /> Ikke verificeret endnu
                        </span>
                      )
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Brug dit eget domæne som hovedadresse. Når verificeret, viser Google og delinger dit domæne fremfor{" "}
                    <span className="font-mono">serviceydere.dk/v/{business.slug}</span>.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <div className="flex h-10 items-center rounded-l-lg border border-r-0 border-border bg-muted px-3 text-xs text-muted-foreground">
                      https://
                    </div>
                    <Input
                      placeholder="mitfirma.dk"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="h-10 flex-1 rounded-l-none rounded-r-lg bg-card font-mono text-sm sm:-ml-2"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <Button type="button" onClick={handleVerifyDomain} disabled={domainVerifying || !customDomain.trim()} className="h-10 rounded-lg">
                      {domainVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificer"}
                    </Button>
                  </div>

                  {customDomain.trim() && (
                    <div className="mt-4 space-y-3 rounded-lg border border-border bg-background/60 p-3">
                      <p className="text-xs font-semibold text-foreground">Sådan opsætter du dit domæne:</p>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">1) Ejerskab — TXT-record</p>
                          <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                            <span className="text-muted-foreground">Type:</span><span>TXT</span>
                            <span className="text-muted-foreground">Navn:</span><span>_serviceydere</span>
                            <span className="text-muted-foreground">Alternativt:</span><span className="break-all">_serviceydere.{customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0]}</span>
                            <span className="text-muted-foreground">Værdi:</span><span className="break-all">serviceydere-verify={domainToken}</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">2) Pegning — CNAME-record</p>
                          <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                            <span className="text-muted-foreground">Type:</span><span>CNAME</span>
                            <span className="text-muted-foreground">Navn:</span><span>{customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0] || "@"}</span>
                            <span className="text-muted-foreground">Værdi:</span><span>serviceydere.dk</span>
                          </div>
                        </div>
                        <p>DNS-ændringer kan tage op til 24 timer at slå igennem. Klik <strong className="text-foreground">Verificer</strong> når du har tilføjet records.</p>
                      </div>
                      {domainResult?.message && (
                        <p className={`text-xs ${domainResult.status === "verified" ? "text-success" : "text-destructive"}`}>
                          {domainResult.message}
                        </p>
                      )}
                      {domainResult?.checks && domainResult?.status !== "verified" && (
                        <div className="space-y-1.5 rounded-md border border-border bg-card/60 p-2.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hvad mangler?</p>
                          <ul className="space-y-1 text-[11px]">
                            <li className="flex items-start gap-1.5">
                              {domainResult.checks.ownership_ok ? (
                                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                              ) : (
                                <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                              )}
                              <span className={domainResult.checks.ownership_ok ? "text-muted-foreground" : "text-foreground"}>
                                TXT-record på <span className="font-mono">_serviceydere</span> med værdi{" "}
                                <span className="font-mono">serviceydere-verify={domainToken}</span>
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              {domainResult.checks.pointing_ok ? (
                                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                              ) : (
                                <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                              )}
                              <span className={domainResult.checks.pointing_ok ? "text-muted-foreground" : "text-foreground"}>
                                CNAME (eller A-record) der peger på <span className="font-mono">serviceydere.dk</span>
                              </span>
                            </li>
                          </ul>
                          <p className="pt-1 text-[10px] text-muted-foreground">
                            DNS-ændringer kan tage op til 24 timer. Klik <strong>Verificer</strong> igen efter ventetiden.
                          </p>
                        </div>
                      )}
                      {domainStatus === "active" && domainVerifiedAt && (
                        <p className="text-[11px] text-muted-foreground">Aktiveret: {new Date(domainVerifiedAt).toLocaleString("da-DK")}</p>
                      )}
                      {(domainStatus === "pending_activation" || domainStatus === "verified") && (
                        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2.5 text-[11px] leading-relaxed text-blue-900 dark:text-blue-200">
                          <p className="font-semibold">✓ DNS er korrekt opsat — vi aktiverer domænet for dig</p>
                          <p className="mt-1">
                            Vi har automatisk modtaget din anmodning. Domænet bliver aktiveret med SSL-certifikat hurtigst muligt — typisk inden for 1 hverdag.
                            Du kan godt lukke siden imens; status opdateres automatisk her, og du får besked på{" "}
                            <span className="font-mono">{(business as any).email || "din kontakt-email"}</span> når{" "}
                            <span className="font-mono">{customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0]}</span>{" "}
                            er live.
                          </p>
                          <p className="mt-1">
                            Indtil da kan du dele linket{" "}
                            <span className="font-mono">serviceydere.dk/v/{business.slug}</span>.
                          </p>
                        </div>
                      )}
                      {domainStatus === "active" && (
                        <div className="rounded-md border border-success/30 bg-success/10 p-2.5 text-[11px] leading-relaxed text-success">
                          <p className="font-semibold">🎉 Dit domæne er live!</p>
                          <p className="mt-1">
                            <span className="font-mono">{customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0]}</span>{" "}
                            viser nu din virksomhedsside.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Åbningstider */}
        <div id="settings-hours" className="scroll-mt-6">
          <SectionCard
            title="Åbningstider"
            icon={<Clock />}
            description="Slå dage til/fra og vælg fra-/til-tid. Brug ”Anvend på alle” for at kopiere én dags tider til de andre åbne dage."
          >
            <HoursEditor value={openHours} onChange={setOpenHours} />
          </SectionCard>
        </div>

        {/* Notifikationer */}
        <div id="settings-notifications" className="scroll-mt-6">
          <SectionCard
            title="Notifikationer"
            icon={<Bell />}
            description="Vælg hvilke hændelser du vil modtage email-varsler om."
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([
                { key: "new_order",           label: "Nye bestillinger",       desc: "Besked når en kunde opretter en ny bestilling." },
                { key: "upcoming_service",    label: "Kommende services",      desc: "Påmindelse når en abonnements-service skal udføres snart." },
                { key: "subscription_change", label: "Abonnementsændringer",   desc: "Besked når en kunde pauser eller annullerer et abonnement." },
                { key: "new_review",          label: "Nye anmeldelser",        desc: "Besked når en kunde skriver en anmeldelse." },
                ...(leadsEnabled ? [{ key: "lead_emails", label: "Nye leads", desc: "Besked når et nyt lead matcher jer fra ‘Indhent 3 tilbud’. Slå fra hvis I kun vil se leads i dashboardet." } as const] : []),
              ] as const).map(({ key, label, desc }) => (
                <div key={key} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <ToggleSwitch
                    checked={!!notifSettings[key]}
                    onChange={() => setNotifSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Fakturering */}
        <div id="settings-billing" className="scroll-mt-6">
          <SectionCard
            title="Priser og betaling"
            icon={<CreditCard />}
            description="Se din pris-oversigt og administrér betalingskort. Vi bruger Stripe til sikker betalingshåndtering."
          >
            {/* Status-banner med dage tilbage */}
            {plan && plan.status !== "unknown" && (
              <div
                className={`rounded-lg border p-4 ${
                  plan.status === "expired"
                    ? "border-destructive/30 bg-destructive/5"
                    : plan.status === "trial_ending"
                      ? "border-destructive/30 bg-destructive/5"
                      : plan.status === "active"
                        ? "border-accent/30 bg-accent/5"
                        : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    plan.status === "expired" || plan.status === "trial_ending"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-accent/10 text-accent"
                  }`}>
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {plan.status === "active" ? (
                      <>
                        <p className="text-sm font-semibold text-foreground">Aktivt abonnement</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {plan.has_payment_method
                            ? `${plan.payment_brand || "Kort"} •••• ${plan.payment_last4}`
                            : "Ingen kort tilknyttet"}
                          {" · "}
                          {Math.round(plan.monthly_price_dkk).toLocaleString("da-DK")} kr/md
                        </p>
                      </>
                    ) : plan.status === "expired" ? (
                      <>
                        <p className="text-sm font-semibold text-foreground">Prøveperioden er udløbet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tilføj et betalingskort herunder for at genaktivere din virksomhed på Serviceydere.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground">
                          {plan.days_left === 1
                            ? "Sidste dag af din prøveperiode"
                            : `${plan.days_left} dage tilbage af din prøveperiode`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Husk at tilføje et betalingskort inden 3 dage — ellers bliver din virksomhed deaktiveret fra Serviceydere.
                          {" "}Efter prøveperioden koster din pakke {Math.round(plan.monthly_price_dkk).toLocaleString("da-DK")} kr/md.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pris-oversigt — viser hvad brugeren betaler ud fra valgte funktioner */}
            {priceBreakdown && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Din pakke</p>
                    <p className="text-[11px] text-muted-foreground">Vælg hvordan du vil faktureres</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pris pr. md</p>
                    <p className="text-lg font-semibold text-foreground tabular-nums leading-tight">
                      {Math.round(priceBreakdown.monthlyAfterDiscount).toLocaleString("da-DK")} kr
                    </p>
                  </div>
                </div>
                <div className="p-4">
                {/* Faktureringsinterval — samme tre valg som ved "bliv udbyder".
                    Skifter rabatten i prisberegningen og opdateres straks i db. */}
                <div>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-secondary/40 p-1">
                    {([
                      { key: "monthly", label: "Månedlig", hint: "" },
                      { key: "quarterly", label: "Kvartalsvis", hint: pricing ? `−${pricing.discount_quarterly_pct}%` : "" },
                      { key: "yearly", label: "Årlig", hint: pricing ? `−${pricing.discount_yearly_pct}%` : "" },
                    ] as const).map((opt) => {
                      const isOn = planBilling === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleBillingPeriodChange(opt.key)}
                          disabled={updatePlan.isPending}
                          className={`flex flex-col items-center justify-center rounded-md px-2 py-2.5 text-xs font-medium transition-colors ${
                            isOn
                              ? "bg-foreground text-background shadow-sm"
                              : "text-muted-foreground hover:bg-background hover:text-foreground"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {opt.hint && (
                            <span className={`mt-0.5 text-[10px] font-semibold ${isOn ? "opacity-80" : "text-accent"}`}>
                              {opt.hint}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ul className="mt-4 space-y-2 border-t border-border pt-3">
                  {priceBreakdown.lines.map((l) => (
                    <li key={l.key} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{l.label}</span>
                      <span className="shrink-0 font-medium text-foreground tabular-nums">
                        {Math.round(l.amount).toLocaleString("da-DK")} kr
                      </span>
                    </li>
                  ))}
                </ul>
                {priceBreakdown.discountPct > 0 && (
                  <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3 text-sm">
                    <div className="flex items-baseline justify-between gap-3 text-muted-foreground w-full">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{Math.round(priceBreakdown.subtotal).toLocaleString("da-DK")} kr/md</span>
                    </div>
                  </div>
                )}
                {priceBreakdown.discountPct > 0 && (
                  <div className="mt-1.5 flex items-baseline justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-accent">
                      <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold">RABAT</span>
                      <span>{priceBreakdown.discountPct}%</span>
                    </span>
                    <span className="font-medium text-accent tabular-nums">
                        −{Math.round(priceBreakdown.subtotal - priceBreakdown.monthlyAfterDiscount).toLocaleString("da-DK")} kr/md
                      </span>
                    </div>
                  )}
                <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  {plan?.status === "trialing" || plan?.status === "trial_ending"
                    ? "Prisen opkræves først efter din prøveperiode er slut. "
                    : ""}
                  Slå funktioner til/fra under <span className="font-medium text-foreground">Avanceret</span> — prisen opdateres automatisk.
                </p>
                </div>
              </div>
            )}

            {/* Aktivt kort — vis brand + last4, og lad brugeren fjerne det */}
            {plan?.has_payment_method && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-foreground to-foreground/80 text-background text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      {plan.payment_brand || "Kort"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground tabular-nums">•••• {plan.payment_last4}</p>
                      <p className="text-xs text-muted-foreground">Aktivt betalingskort</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={openCustomerPortal} disabled={openingPortal}>
                    {openingPortal ? "Åbner..." : "Administrér"}
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border bg-secondary/20 px-4 py-2.5">
                  <p className="text-[11px] text-muted-foreground">
                    Skift kort, se fakturaer eller opsig dit abonnement
                  </p>
                  <button
                    type="button"
                    onClick={handleRemoveCard}
                    disabled={removeCard.isPending}
                    className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Fjern kort
                  </button>
                </div>
              </div>
            )}

            {/* Tilføj kort — åbner Stripe Embedded Checkout */}
            {(!plan || !plan.has_payment_method) && (
              <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-border bg-gradient-to-br from-card to-secondary/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">Tilføj betalingskort</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        🔒 Sikret af Stripe
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Du opkræves ikke før din prøveperiode er slut. Du kan opsige når som helst, og dine betalinger håndteres sikkert af Stripe.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowCheckout(true)}
                  className="mt-4 w-full bg-foreground text-background hover:bg-foreground/90"
                  size="lg"
                >
                  {plan?.status === "expired" ? "Genaktivér virksomhed med betalingskort" : "Tilføj betalingskort"}
                </Button>
              </div>
            )}

            <StripeCheckoutDialog
              open={showCheckout}
              onClose={() => setShowCheckout(false)}
              businessId={business.id}
              billingPeriod={(planBilling as "monthly" | "quarterly" | "yearly") || "monthly"}
              routePlanning={routePlanningEnabled}
              accounting={accountingIntegrationEnabled}
              extraEmployeeLogins={planExtraLogins}
            />
          </SectionCard>
        </div>

        {/* Avanceret */}
        <div id="settings-advanced" className="scroll-mt-6">
          <SectionCard title="Avanceret" icon={<Settings />} description="Aktivér ekstra funktioner. Pris opdateres automatisk i 'Priser og betaling' ovenfor.">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Route className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-sm font-semibold text-foreground">Ruteplanlægning</p>
                      {pricing && (
                        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                          +{Math.round(pricing.price_route_planning_dkk).toLocaleString("da-DK")} kr/md
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tilføjer "Medarbejdere"-fanen og giver adgang til ruteplanlæggeren — opret medarbejder-konti og planlæg daglige ruter med stop hos kunder. Kan optimeres med AI baseret på afstand, tidsvinduer og prioriteter.
                    </p>
                    <StatusPill
                      active={routePlanningEnabled}
                      activeLabel="Aktiveret — “Medarbejdere” og “Ruter” er tilføjet til menuen"
                      inactiveLabel="Deaktiveret — slå til for at få adgang til ruteplanlæggeren"
                    />
                  </div>
                </div>
                <ToggleSwitch checked={routePlanningEnabled} onChange={() => setRoutePlanningEnabled((v) => !v)} />
              </div>

              {/* Regnskabsprogram-integration — feature lanceres senere, men kan
                  slås til/fra her, så virksomheder selv styrer adgangen. */}
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Integration med regnskabsprogram</p>
                      {pricing && (
                        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                          +{Math.round(pricing.price_accounting_integration_dkk).toLocaleString("da-DK")} kr/md
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Kommer snart
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Forbind din konto med dit regnskabsprogram (fx e-conomic, Dinero eller Billy), så fakturaer og betalinger automatisk synkroniseres. Når funktionen er klar, aktiveres den automatisk for dig — du kan altid slå den fra igen her.
                    </p>
                    <StatusPill
                      active={accountingIntegrationEnabled}
                      activeLabel="Aktiveret — vi giver dig besked så snart integrationen er klar"
                      inactiveLabel="Deaktiveret — slå til for at reservere integrationen"
                    />
                  </div>
                </div>
                <ToggleSwitch checked={accountingIntegrationEnabled} onChange={() => setAccountingIntegrationEnabled((v) => !v)} />
              </div>

              {/* Leads — gratis valgfri funktion. Når slået til vises Leads-fanen
                  i sidebar og virksomheden modtager match fra "Indhent 3 tilbud". */}
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Leads fra "Indhent 3 tilbud"</p>
                      <span className="text-[11px] font-semibold text-muted-foreground">Gratis</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Når slået til vises Leads-fanen i din navigation, og du modtager automatisk relevante kundeforespørgsler fra "Indhent 3 tilbud" der matcher dine brancher og dit område. Du kan altid slå funktionen fra igen.
                    </p>
                    <StatusPill
                      active={leadsEnabled}
                      activeLabel="Aktiveret — “Leads” er tilføjet til menuen, og I modtager nye matches"
                      inactiveLabel="Deaktiveret — slå til for at modtage lead-matches"
                    />
                  </div>
                </div>
                <ToggleSwitch checked={leadsEnabled} onChange={() => setLeadsEnabled((v) => !v)} />
              </div>

              {/* Dataimport — gratis. Når slået til markerer vi
                  business_plans.data_import_requested så vores team kan
                  tage fat i flytning af kunder, services og abonnementer
                  fra virksomhedens nuværende system. */}
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Dataimport fra dit nuværende system</p>
                      <span className="text-[11px] font-semibold text-muted-foreground">Gratis</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Vi flytter eksisterende kunder, services og abonnementer fra dit gamle system, så du slipper for manuelt arbejde. Slå til, og vores team tager kontakt for at aftale flytningen.
                    </p>
                    <StatusPill
                      active={!!plan?.data_import_requested}
                      activeLabel="Anmodet — vores team tager kontakt for at aftale flytningen"
                      inactiveLabel="Ikke anmodet — slå til for at få hjælp til at flytte dine data"
                    />
                  </div>
                </div>
                <ToggleSwitch
                  checked={!!plan?.data_import_requested}
                  onChange={() => {
                    if (!plan?.id) return;
                    const next = !plan.data_import_requested;
                    updatePlan.mutate(
                      { businessId: business.id, patch: { data_import_requested: next } },
                      {
                        onSuccess: () => {
                          toast.success(next
                            ? "Dataimport anmodet — vi tager kontakt snarest."
                            : "Anmodning om dataimport fjernet.");
                        },
                      },
                    );
                  }}
                />
              </div>

              {/* Live chat — gratis chat-widget på virksomhedssiden. Når slået
                  til vises en chat-knap nederst i hjørnet på din offentlige
                  side, og en "Live chat"-fane tilføjes til menuen her i panelet. */}
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Live chat på virksomhedssiden</p>
                      <span className="text-[11px] font-semibold text-muted-foreground">Gratis</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Når slået til vises en chat-knap nederst i hjørnet på din offentlige side, så besøgende kan skrive direkte til jer. Du modtager en email ved nye samtaler og svarer fra "Live chat"-fanen i menuen.
                    </p>
                    <StatusPill
                      active={livechatEnabled}
                      activeLabel="Aktiveret — chat-knappen vises på din virksomhedsside"
                      inactiveLabel="Deaktiveret — slå til for at lade besøgende skrive direkte til jer"
                    />
                  </div>
                </div>
                <ToggleSwitch checked={livechatEnabled} onChange={() => setLivechatEnabled((v) => !v)} />
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;

/* ─── IndustryPicker — grupperet, søgbar branche-vælger ───
 * Vises i Settings → Generelt → Brancher.
 * Brugeren kan filtrere via søgefelt og vælge frit fra alle grupper.
 * Custom/gamle branche-værdier (der ikke findes i kataloget) vises som en
 * separat sektion så de ikke forsvinder. */
const IndustryPicker = ({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const groupsFiltered = useMemo(() => {
    if (!q) return INDUSTRY_GROUPS;
    return INDUSTRY_GROUPS
      .map((g) => ({
        ...g,
        industries: g.industries.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.subcategories.some(
              (s) =>
                s.label.toLowerCase().includes(q) ||
                s.services.some((sv) => sv.toLowerCase().includes(q))
            )
        ),
      }))
      .filter((g) => g.industries.length > 0);
  }, [q]);

  // Custom-værdier der ikke længere findes i kataloget — vis dem så brugeren
  // ikke mister dem ved opdatering, men gør det nemt at fravælge.
  const customValues = customIndustryKeys(selected);

  // Selected-summary øverst
  const knownSelected = selected.filter((k) =>
    ALL_INDUSTRIES.some((i) => i.key === k)
  );

  return (
    <div className="space-y-3">
      {/* Søgefelt + valgte counter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg branche, fx vinduespudser, alge, tømrer…"
            className="bg-card h-9 rounded-lg pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground sm:shrink-0">
          {selected.length} valgt
        </div>
      </div>

      {/* Aktive valg som chips — hurtig oversigt + fravalg */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-secondary/40 p-2">
          {knownSelected.map((k) => {
            const ind = ALL_INDUSTRIES.find((i) => i.key === k)!;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onToggle(k)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <span>{ind.icon}</span>
                <span>{ind.label}</span>
                <span aria-hidden className="text-muted-foreground">×</span>
              </button>
            );
          })}
          {customValues.map((k) => (
            <button
              key={`custom-${k}`}
              type="button"
              onClick={() => onToggle(k)}
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-card px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              title="Tidligere valg (ikke i nyt katalog)"
            >
              <span>🧰</span>
              <span>{k}</span>
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      {/* Grupperet liste */}
      <div className="space-y-3">
        {groupsFiltered.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {g.industries.map((i) => {
                const isOn = selected.includes(i.key);
                return (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => onToggle(i.key)}
                    className={`group flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                      isOn
                        ? "border-foreground bg-foreground/5 shadow-sm"
                        : "border-border bg-card hover:border-foreground/30"
                    }`}
                  >
                    <span className="text-base leading-none">{i.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {i.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {groupsFiltered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Ingen brancher matcher "{query}".
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── SubcategoryPicker — fingranuleret kategori-valg pr. valgt branche ───
 * Viser ét kort pr. valgt branche, med toggle-chips for alle underkategorier.
 * Bestemmer præcist hvilke kategorier der bliver foreslået ved oprettelse af
 * services i Servicekataloget. */
const SubcategoryPicker = ({
  selectedIndustries,
  selectedSubcategories,
  onToggle,
}: {
  selectedIndustries: string[];
  selectedSubcategories: Record<string, string[]>;
  onToggle: (industryKey: string, sub: string) => void;
}) => {
  const industries = selectedIndustries
    .map((k) => ALL_INDUSTRIES.find((i) => i.key === k))
    .filter((i): i is NonNullable<typeof i> => !!i);

  if (industries.length === 0) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {industries.map((ind) => {
        const picked = selectedSubcategories[ind.key] || [];
        return (
          <div
            key={ind.key}
            className="rounded-xl border border-border bg-card p-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{ind.icon}</span>
              <span className="text-sm font-semibold text-foreground">{ind.label}</span>
              <span className="ml-auto text-[11px] font-medium text-muted-foreground tabular-nums">
                {picked.length}/{ind.subcategories.length}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {ind.subcategories.map((sc) => {
                const isOn = picked.includes(sc.label);
                return (
                  <button
                    key={sc.label}
                    type="button"
                    onClick={() => onToggle(ind.key, sc.label)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                      isOn
                        ? "border-foreground bg-foreground/5 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {isOn && <span aria-hidden>✓</span>}
                    <span>{sc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── HoursEditor — brugervenlig åbningstider-editor ───
 * Erstatter den tidligere fri-tekst Input med:
 *  - Toggle pr. dag (åben / lukket)
 *  - Time-pickers for fra/til (native <input type="time">)
 *  - "Anvend på alle åbne dage" knap der kopierer en dags tider
 *  - Hurtige preset-knapper (Hverdage 8-16, Hver dag 8-18, Lukket weekend)
 * Gemmer stadig i samme format ("08:00 - 16:00") så resten af systemet er uberørt. */
const HoursEditor = ({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) => {
  const setDay = (day: string, open: string | null, close: string | null) => {
    const next = { ...value };
    if (open && close) next[day] = formatHours(open, close);
    else delete next[day];
    onChange(next);
  };

  const applyToAll = (sourceDay: string) => {
    const src = parseHours(value[sourceDay] || "");
    if (!src) return;
    const next: Record<string, string> = {};
    DAYS.forEach((d) => {
      // Bevar lukkede dage som lukkede; sæt åbne dage til samme tider
      if (value[d] || d === sourceDay) next[d] = formatHours(src.open, src.close);
    });
    onChange(next);
  };

  const applyPreset = (preset: "weekdays" | "everyday" | "clear") => {
    if (preset === "clear") return onChange({});
    const open = "08:00";
    const close = preset === "weekdays" ? "16:00" : "18:00";
    const days = preset === "weekdays" ? WEEKDAYS : DAYS;
    const next: Record<string, string> = {};
    days.forEach((d) => { next[d] = formatHours(open, close); });
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {/* Hurtige presets — sætter typiske åbningstider med ét klik */}
      <div className="flex flex-wrap gap-1.5" data-tour="hours-presets">
        <button
          type="button"
          onClick={() => applyPreset("weekdays")}
          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Hverdage 08–16
        </button>
        <button
          type="button"
          onClick={() => applyPreset("everyday")}
          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Alle dage 08–18
        </button>
        <button
          type="button"
          onClick={() => applyPreset("clear")}
          className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
        >
          Nulstil alle
        </button>
      </div>

      <div className="space-y-1.5">
        {DAYS.map((day, dayIdx) => {
          const parsed = parseHours(value[day] || "");
          const isOpen = !!parsed;
          const open = parsed?.open || "08:00";
          const close = parsed?.close || "16:00";
          return (
            <div
              key={day}
              data-tour={dayIdx === 0 ? "hours-day-row" : undefined}
              className={`flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                isOpen ? "border-border bg-secondary/40" : "border-border bg-card"
              }`}
            >
              {/* Dag + toggle */}
              <button
                type="button"
                onClick={() => isOpen ? setDay(day, null, null) : setDay(day, open, close)}
                className="flex items-center gap-2 min-w-[140px] sm:min-w-[160px]"
              >
                <span
                  aria-pressed={isOpen}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                    isOpen ? "bg-accent" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform mt-0.5 ${
                      isOpen ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
                <span className="text-sm font-medium text-foreground">{day}</span>
                {!isOpen && <span className="text-xs text-muted-foreground">Lukket</span>}
              </button>

              {isOpen && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={open}
                      onChange={(e) => setDay(day, e.target.value || "08:00", close)}
                      className="h-9 w-[110px] bg-background rounded-lg text-sm tabular-nums"
                    />
                    <span className="text-xs text-muted-foreground">til</span>
                    <Input
                      type="time"
                      value={close}
                      onChange={(e) => setDay(day, open, e.target.value || "16:00")}
                      className="h-9 w-[110px] bg-background rounded-lg text-sm tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => applyToAll(day)}
                    className="ml-auto text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    title="Kopiér disse tider til alle åbne dage"
                  >
                    Anvend på alle
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};