// SettingsTab — virksomhedens indstillinger, opbygget med samme designsprog
// som Overblik / Aftaler / Kunder / Medarbejdere / Anmeldelser:
// PageHeader, surface-admin cards, sub-nav chips og konsistent spacing.
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles, Settings, Bell, Route, Contact, Image as ImageIcon, Clock,
  CheckCircle2, AlertCircle, ArrowRight, Building2, Search, Calculator,
  CreditCard,
} from "lucide-react";
import ImageUpload from "@/components/business/ImageUpload";
import { PageHeader, SectionCard, FieldLabel } from "@/components/admin/shared/AdminUI";
import { useUpdateBusiness } from "@/hooks/useDatabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  useBusinessPlan, useReactivateBusinessPlan,
  usePlatformPricing, useUpdateBusinessPlan, useRemovePaymentMethod,
} from "@/hooks/useBusinessPlan";
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
  { id: "general",       label: "Virksomhed",     icon: Building2, hint: "Navn og beskrivelse" },
  { id: "industries",    label: "Brancher",       icon: Sparkles,  hint: "Hvad I tilbyder" },
  { id: "contact",       label: "Kontakt",        icon: Contact,   hint: "Adresse og kontakt" },
  { id: "branding",      label: "Branding",       icon: ImageIcon, hint: "Logo og cover" },
  { id: "hours",         label: "Åbningstider",   icon: Clock,     hint: "Hverdage og weekend" },
  { id: "notifications", label: "Notifikationer", icon: Bell,      hint: "Email-varsler" },
  { id: "billing",       label: "Priser og betaling", icon: CreditCard, hint: "Pakke og betalingskort" },
  { id: "advanced",      label: "Avanceret",      icon: Route,     hint: "Ekstra funktioner" },
] as const;

/* ─── Toggle-switch (delt mellem notifikations- og rute-felter) ─── */
const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    aria-pressed={checked}
    className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
      checked ? "bg-accent" : "bg-border"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform mt-0.5 ${
        checked ? "translate-x-4 ml-0.5" : "translate-x-0.5"
      }`}
    />
  </button>
);

const SettingsTab = ({ business }: { business: any }) => {
  const updateBiz = useUpdateBusiness();
  const { user } = useAuth();
  const { data: plan } = useBusinessPlan(business.id);
  const reactivate = useReactivateBusinessPlan();
  const removeCard = useRemovePaymentMethod();
  const updatePlan = useUpdateBusinessPlan();
  const { data: pricing } = usePlatformPricing();

  // Lokal state for kortform — bruges kun til at fange last4 + brand så
  // banneret forsvinder. Den rigtige Stripe-tokenisering sker senere.
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [showCardForm, setShowCardForm] = useState(false);

  const handleSaveCard = async () => {
    const digits = cardNumber.replace(/\s+/g, "");
    if (digits.length < 13 || digits.length > 19 || !/^\d+$/.test(digits)) {
      toast.error("Indtast et gyldigt kortnummer"); return;
    }
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(cardExpiry)) {
      toast.error("Udløbsdato skal være MM/ÅÅ"); return;
    }
    if (!/^\d{3,4}$/.test(cardCvc)) {
      toast.error("CVC skal være 3-4 cifre"); return;
    }
    try {
      const last4 = digits.slice(-4);
      const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : "Kort";
      await reactivate.mutateAsync({ businessId: business.id, last4, brand });
      setCardNumber(""); setCardExpiry(""); setCardCvc("");
      setShowCardForm(false);
      toast.success("Betalingskort gemt");
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke gemme kort");
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
      selected_subcategories: selectedSubcategories,
    },
  }), [
    business.id, business.name, business.settings,
    name, description, phone, email, address, city, zipCode,
    logoUrl, coverUrl, selectedCategories, selectedSubcategories,
    openHours, notifSettings, routePlanningEnabled, accountingIntegrationEnabled,
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
          href={business.slug ? `/biz/${business.slug}` : "#"}
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
          <SectionCard title="Virksomhed" icon={<Building2 />} description="Virksomhedsnavn og beskrivelse.">
            <div className="space-y-4">
              <div>
                <FieldLabel>Virksomhedsnavn</FieldLabel>
                <Input placeholder="Virksomhedsnavn" value={name} onChange={(e) => setName(e.target.value)} className="bg-card h-10 rounded-lg" />
              </div>
              <div>
                <FieldLabel>Beskrivelse</FieldLabel>
                <Textarea placeholder="Hvad gør din virksomhed? Hvad er jeres speciale?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} className="bg-card rounded-lg" />
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
            description="Vælg jeres brancher og hvilke konkrete kategorier I tilbyder. Det styrer alt — services, søgning og forslag."
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
          <SectionCard title="Kontakt & adresse" icon={<Contact />} description="Sådan kan kunder få fat i dig.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Telefon</FieldLabel>
                  <Input placeholder="12 34 56 78" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} className="bg-card h-10 rounded-lg" type="tel" />
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <Input placeholder="kontakt@virksomhed.dk" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-card h-10 rounded-lg" type="email" />
                </div>
              </div>
              <div>
                <FieldLabel>Adresse</FieldLabel>
                <Input placeholder="Vejnavn 123" value={address} onChange={(e) => setAddress(e.target.value)} className="bg-card h-10 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
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
                <div>
                  <FieldLabel>By</FieldLabel>
                  <Input placeholder="København" value={city} onChange={(e) => setCity(e.target.value)} className="bg-card h-10 rounded-lg" />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Branding */}
        <div id="settings-branding" className="scroll-mt-6">
          <SectionCard title="Branding" icon={<ImageIcon />} description="Logo og coverbillede vises på din virksomhedsside.">
            {/* Side-om-side så cover ikke fylder hele bredden — kun en kompakt
                preview, da fuld bannervisning ikke er nødvendig her. */}
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="shrink-0">
                <FieldLabel>Logo</FieldLabel>
                <ImageUpload folder={`${user!.id}/logo`} currentUrl={logoUrl || null} onUploaded={setLogoUrl} label="" aspectRatio="aspect-square" className="w-24" objectFit="contain" />
                <p className="mt-2 text-xs text-muted-foreground">Kvadrat (fx 512×512)</p>
              </div>
              <div className="min-w-0 flex-1 sm:max-w-xs">
                <FieldLabel>Coverbillede</FieldLabel>
                <ImageUpload folder={`${user!.id}/cover`} currentUrl={coverUrl || null} onUploaded={setCoverUrl} label="" aspectRatio="aspect-video" className="w-full max-w-[260px]" />
                <p className="mt-2 text-xs text-muted-foreground">Bredt 16:9 — vises som banner på din side</p>
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
            title="Fakturering & abonnement"
            icon={<CreditCard />}
            description="Administrér din pakke og tilføj betalingskort. Vi bruger Stripe til sikker betalingshåndtering."
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
                          Kort på fil: {plan.has_payment_method ? "•••• •••• •••• ••••" : "Ingen"} · {plan.monthly_price_dkk.toLocaleString("da-DK")} kr./md.
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
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Kortform — vises kun hvis der ikke er noget kort på fil. */}
            {(!plan || !plan.has_payment_method) && (
              <div className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Tilføj betalingskort</p>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sikret af Stripe</span>
                </div>
                <div>
                  <FieldLabel>Kortnummer</FieldLabel>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    inputMode="numeric"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Udløb (MM/ÅÅ)</FieldLabel>
                    <Input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="12/27" />
                  </div>
                  <div>
                    <FieldLabel>CVC</FieldLabel>
                    <Input value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder="123" inputMode="numeric" />
                  </div>
                </div>
                <Button
                  onClick={handleSaveCard}
                  disabled={reactivate.isPending}
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                >
                  {reactivate.isPending ? "Gemmer..." : plan?.status === "expired" ? "Genaktivér virksomhed" : "Gem betalingskort"}
                </Button>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Avanceret */}
        <div id="settings-advanced" className="scroll-mt-6">
          <SectionCard title="Avanceret" icon={<Settings />} description="Aktivér ekstra funktioner til din virksomhed.">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Route className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Ruteplanlægning</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tilføjer "Medarbejdere"-fanen og giver adgang til ruteplanlæggeren — opret medarbejder-konti og planlæg daglige ruter med stop hos kunder. Kan optimeres med AI baseret på afstand, tidsvinduer og prioriteter.
                    </p>
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
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Kommer snart
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Forbind din konto med dit regnskabsprogram (fx e-conomic, Dinero eller Billy), så fakturaer og betalinger automatisk synkroniseres. Når funktionen er klar, aktiveres den automatisk for dig — du kan altid slå den fra igen her.
                    </p>
                  </div>
                </div>
                <ToggleSwitch checked={accountingIntegrationEnabled} onChange={() => setAccountingIntegrationEnabled((v) => !v)} />
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
      <div className="flex flex-wrap gap-1.5">
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
        {DAYS.map((day) => {
          const parsed = parseHours(value[day] || "");
          const isOpen = !!parsed;
          const open = parsed?.open || "08:00";
          const close = parsed?.close || "16:00";
          return (
            <div
              key={day}
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