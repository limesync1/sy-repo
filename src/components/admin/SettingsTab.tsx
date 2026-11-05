import { MultiIndustryHelp } from "@/components/admin/MultiIndustryHelp";
import PlanKindSection from "@/components/admin/settings/PlanKindSection";
import { isListingOnly, isSettingsSectionVisible, type PlanKind } from "@/lib/business-capabilities";
// SettingsTab — virksomhedens indstillinger, opbygget med samme designsprog
// som Overblik / Aftaler / Kunder / Medarbejdere / Anmeldelser:
// PageHeader, surface-admin cards, sub-nav chips og konsistent spacing.
import { lookupCvr as fetchCvr } from "@/lib/cvr-lookup";
import { useState, useMemo, useEffect, useRef, useCallback, forwardRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { IndustryIcon } from "@/components/IndustryIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Sparkles, Settings, Bell, Route, Contact, Image as ImageIcon, Clock,
  CheckCircle2, AlertCircle, ArrowRight, Building2, Search, Calculator,
  CreditCard, XCircle, MessageCircle, Globe, ExternalLink, Link2, Loader2, Copy,
  UploadCloud, ShoppingCart, CalendarClock, RefreshCcw, Star, Inbox, Mail, Phone, MapPin,
  Unlock,
} from "lucide-react";
import ImageUpload from "@/components/business/ImageUpload";
import { PageHeader, SectionCard, FieldLabel } from "@/components/admin/shared/AdminUI";
import AddressAutocomplete from "@/components/admin/AddressAutocomplete";
import { useUpdateBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import { OwnerAlertsEditor } from "@/components/admin/OwnerAlertsEditor";
import { CustomerNotificationsSettings } from "@/components/admin/CustomerNotificationsSettings";
import SmsSetupCard from "@/components/admin/SmsSetupCard";
import { DangerZoneCard } from "@/components/admin/DangerZoneCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";
import { isCraftBusiness, readTradeModules, type TradeModules } from "@/lib/trade-modules";
import { MaterialCatalogDialog } from "@/components/trade/MaterialCatalogDialog";
import { QualityTemplatesDialog } from "@/components/trade/QualityTemplatesDialog";
import { Hammer, ChevronRight } from "lucide-react";
import { TradeIcon } from "@/components/trade/TradeIcon";

/**
 * Lille selvopdaterende komponent — tikker hvert minut og holder
 * "X dage, Y timer, Z min tilbage"-tællingen frisk uden at re-rendere
 * hele SettingsTab (2300 linjer).
 */
function TrialCountdownText({ trialEndsAt, daysLeft }: { trialEndsAt: string | null; daysLeft: number | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(i);
  }, []);
  const ms = trialEndsAt ? new Date(trialEndsAt).getTime() - Date.now() : null;
  if (ms !== null && ms > 0) {
    const tot = Math.max(1, Math.floor(ms / 60_000));
    const d = Math.floor(tot / (60 * 24));
    const h = Math.floor((tot % (60 * 24)) / 60);
    const m = tot % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} ${d === 1 ? "dag" : "dage"}`);
    if (h > 0) parts.push(`${h} ${h === 1 ? "time" : "timer"}`);
    if (m > 0 && d === 0) parts.push(`${m} min`);
    if (parts.length === 0) parts.push(`${m} min`);
    const joined = parts.length > 1
      ? `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`
      : parts[0];
    return <>{`${joined} tilbage af din prøveperiode`}</>;
  }
  if (daysLeft === null) return <>Din prøveperiode er aktiv</>;
  return <>{`${daysLeft} dage tilbage af din prøveperiode`}</>;
}
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
  MULTI_INDUSTRY_KEY,
  findIndustry,
} from "@/lib/service-taxonomy";

const DAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"] as const;
const WEEKDAYS = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag"] as const;

/* Genererer 15-min slots til klokkeslæt-vælgeren — pænt scroll-bart i popover. */
const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

/** TimePicker — en lille pop-over med 15-min slots der matcher resten af UI'et.
 *  Erstatter native <input type="time"> som ser anderledes ud i hver browser. */
const TimePicker = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline"
          type="button"
          aria-label={label}
          className="h-11 w-24 shrink-0 gap-1.5 px-2 text-sm tabular-nums"
        >
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className="w-32 max-w-[calc(100vw-1.5rem)] p-1">
        <div className="max-h-[min(16rem,var(--radix-popover-content-available-height))] overflow-y-auto" role="group" aria-label={label || "Klokkeslæt"}>
          {TIME_SLOTS.map((t) => (
            <Button variant={t === value ? "default" : "ghost"}
              key={t}
              type="button"
              aria-pressed={t === value}
              onClick={() => { onChange(t); setOpen(false); }}
              className="h-11 w-full rounded-md px-2 text-center text-sm tabular-nums"
            >
              {t}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Topbaren i AdminShell er h-14 = 56px. Vi lægger 8px luft til, så ankret
// lander pænt UNDER headeren (ikke skjult bag den). På mobil/tablet kommer
// der en sticky chip-nav under headeren — så den måler vi op dynamisk så
// ankret rammer præcis under begge stickies, uafhængigt af zoom/skala.
const HEADER_HEIGHT = 56;
const SCROLL_PADDING = 12;
const getScrollOffset = () => {
  if (typeof window === "undefined") return HEADER_HEIGHT + SCROLL_PADDING;
  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  let extra = 0;
  if (!isDesktop) {
    const chipNav = document.querySelector<HTMLElement>("[data-settings-chipnav]");
    extra = chipNav?.offsetHeight ?? 52;
  }
  return HEADER_HEIGHT + SCROLL_PADDING + extra;
};

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
  { id: "general",       label: "Virksomhed og kontakt", icon: Building2, hint: "Navn, beskrivelse, telefon og adresse" },
  { id: "industries",    label: "Hvad I tilbyder",    icon: Sparkles,  hint: "Brancher og kategorier" },
  { id: "contact",       label: "Kontakt og adresse", icon: Contact,   hint: "Telefon, e-mail, adresse" },
  { id: "branding",      label: "Profil og webadresse", icon: ImageIcon, hint: "Logo, billede og link" },
  { id: "hours",         label: "Åbningstider",       icon: Clock,     hint: "Hvornår I tager telefonen" },
  { id: "notifications", label: "Beskeder til jer",   icon: Bell,      hint: "Hvad I får e-mail om" },
  { id: "customer-notifications", label: "Beskeder til kunder", icon: MessageCircle, hint: "Påmindelser og kvitteringer" },
  { id: "billing",       label: "Pris og betaling",   icon: CreditCard, hint: "Pakke og betalingskort" },
  { id: "trade",         label: "Håndværk",           icon: Hammer,    hint: "Materialer, grossister og KS" },
  { id: "advanced",      label: "Tilvalg og konto",   icon: Settings,  hint: "Leads, livechat, slet konto" },
] as const;

const settingsSectionsFor = (plan: PlanKind) =>
  SECTIONS.filter((sec) => isSettingsSectionVisible(sec.id, plan));

/* ─── Toggle-switch (delt mellem notifikations- og rute-felter) ─── */
const ToggleSwitch = forwardRef<
  HTMLButtonElement,
  { checked: boolean; onChange: () => void; label?: string }
>(({ checked, onChange, label }, ref) => (
  <Button variant="ghost"
    ref={ref}
    type="button"
    onClick={onChange}
    role="switch"
    aria-checked={checked}
    aria-label={label}
    // Ren switch: kun farve + thumb-position. Ingen overshoot/glow-ring som
    // ellers konkurrerede med StatusPill om opmærksomhed.
    className="relative h-11 w-11 shrink-0 rounded-md p-0 hover:bg-secondary"
  >
    <span aria-hidden="true" className={`inline-flex h-5 w-9 items-center rounded-full ${checked ? "bg-accent" : "bg-border"}`}>
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform duration-150 ease-out ${
        checked ? "translate-x-4 ml-0.5" : "translate-x-0.5"
      }`}
    />
    </span>
  </Button>
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

/* ─── FeatureRow — ensartet rækkelayout til "Tilvalg og ekstra funktioner".
 * Ikon, titel, prismærke, beskrivelse, status og toggle — alt på en linje
 * der opfører sig konsistent på tværs af alle moduler. */
const FeatureRow = ({
  icon,
  title,
  priceLabel,
  badge,
  description,
  active,
  activeLabel,
  inactiveLabel,
  onToggle,
  toggle,
}: {
  icon: ReactNode;
  title: string;
  priceLabel?: string;
  badge?: ReactNode;
  description: string;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onToggle?: () => void;
  toggle?: ReactNode;
}) => (
  <div
    className={`group relative flex min-h-12 items-center justify-between gap-3 px-3 py-2.5 transition-colors sm:px-4 ${
      active ? "bg-accent/[0.03]" : "bg-card"
    }`}
  >
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {priceLabel && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground tabular-nums">
              {priceLabel}
            </span>
          )}
          {badge}
        </div>
        <p className="text-[13px] leading-snug text-muted-foreground">{description}</p>
        {!active && inactiveLabel.startsWith("Kræver") && <p className="mt-0.5 text-xs text-warning">{inactiveLabel}</p>}
        {false && activeLabel}
      </div>
    </div>
    <div className="shrink-0">
      {toggle ?? (onToggle ? <ToggleSwitch checked={active} onChange={onToggle} label={title} /> : null)}
    </div>
  </div>
);

/* ─── Reveal — collapser børn ind/ud (height + fade). Holdt minimal: ingen
 * blur, slide eller overshoot — det sender altid samme rolige signal. */
const Reveal = ({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
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
  const { data: employees = [] } = useEmployees(business.id);
  const activeEmployeesCount = employees.filter((e: any) => e.is_active !== false).length;

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

  // Antal ekstra medarbejderlogins — gemmes på business_plans og bruges af
  // databasen til at blokere oprettelse af flere medarbejdere end betalt for.
  const handleEmployeeLoginsChange = async (next: number) => {
    if (!plan?.id) return;
    const clamped = Math.max(0, Math.min(99, next));
    if (clamped === planExtraLogins) return;
    try {
      await updatePlan.mutateAsync({
        businessId: business.id,
        patch: { extra_employee_logins: clamped },
      });
      const diff = clamped - planExtraLogins;
      if (diff > 0) toast.success(`Tilføjet ${diff} medarbejderlogin${diff === 1 ? "" : "s"}`);
      else if (diff < 0) toast.success(`Fjernet ${Math.abs(diff)} medarbejderlogin${Math.abs(diff) === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke opdatere antal medarbejderlogins");
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
  const [notifSettings, setNotifSettings] = useState<Record<string, any>>({
    new_order: true,
    upcoming_service: true,
    subscription_change: true,
    new_review: false,
    lead_emails: true,
    ...((business.notification_settings as Record<string, boolean>) || {}),
  });
  // Ruteplanlægning er nu altid aktiveret for alle virksomheder — toggle vises ikke længere.
  const routePlanningEnabled = true;
  // Regnskabsprogram-integration kan IKKE deaktiveres eller slås til fra
  // virksomhedsindstillingerne. Den styres udelukkende fra checkout/opstart
  // (og låses 3 dage før fakturering af `lock-business-plans`-cron'en), så
  // virksomheder ikke kan skrue ned dagen før betaling. Vi læser den
  // effektive værdi fra abonnementet — locked_* vinder hvis sat.
  // Værdien er afledt af abonnementet — locked_* vinder hvis sat.
  const accountingIntegrationEnabled =
    plan?.locked_accounting_integration ?? plan?.accounting_integration_enabled ?? false;
  // Leads-fanen er en gratis valgfri funktion. Skjult som standard så ikke
  // alle virksomheder får en ekstra fane i navigationen — kan slås til her
  // under Avanceret når man vil modtage lead-anmodninger fra "Indhent 3 tilbud".
  const [leadsEnabled, setLeadsEnabled] = useState<boolean>(
    !!(business.settings as any)?.leads_enabled
  );
  // Livechat — gratis valgfri funktion. Når slået til vises en chat-widget
  // på virksomhedens offentlige side, og en "Livechat"-fane tilføjes til
  // admin-panelet hvor virksomheden kan svare på henvendelser.
  const [livechatEnabled, setLivechatEnabled] = useState<boolean>(
    !!(business.settings as any)?.livechat_enabled
  );
  // Håndværksmodul (materialer, grossistprisfiler, kvalitetssikring).
  const origTradeModules = readTradeModules(business.settings);
  const [tradeModules, setTradeModules] = useState<TradeModules>(origTradeModules);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [customerNotifUpcomingMinutes, setCustomerNotifUpcomingMinutes] = useState<number>(() => {
    const s = (business.settings as any) || {};
    if (typeof s.customer_notif_upcoming_minutes === "number") return Number(s.customer_notif_upcoming_minutes);
    if (typeof s.customer_notif_upcoming_hours === "number") return Number(s.customer_notif_upcoming_hours) * 60;
    return 24 * 60;
  });
  const [smsEnabled, setSmsEnabled] = useState<boolean>(
    !!(business.settings as any)?.sms_enabled
  );
  // "Tidlig udførelse" — global default for hele virksomheden. Slår
  // medarbejderens evne til at starte/afslutte ruter UDEN at dagen er
  // aktuel TIL eller FRA. Kan stadig override'es per medarbejder
  // (EmployeesTab) eller per rute (RouteEditSheet → "Tillad tidlig
  // udførelse"). Resolver: src/lib/early-completion.ts.
  const [allowEarlyCompletionDefault, setAllowEarlyCompletionDefault] = useState<boolean>(
    !!(business as any).allow_early_completion_default
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
  const [cvrQuery, setCvrQuery] = useState(((business.settings as any)?.cvr as string) || "");
  const [cvrLoading, setCvrLoading] = useState(false);
  const [cvrResult, setCvrResult] = useState<any>(null);
  const [cvrError, setCvrError] = useState("");

  // Postnummer auto-udfyld by
  const [zipLoading, setZipLoading] = useState(false);

  // Aktivt sub-nav — opdateres både ved klik og automatisk via scroll-observer.
  const [activeSection, setActiveSectionRaw] = useState<string>(() => {
    try { return localStorage.getItem("sy.settings.section") || "general"; } catch { return "general"; }
  });
  // "Kontakt og adresse" er lagt sammen med "Om virksomheden".
  const setActiveSection = useCallback((raw: string) => {
    const id = raw === "contact" ? "general" : raw;
    setActiveSectionRaw(id);
    try { localStorage.setItem("sy.settings.section", id); } catch { /* blokeret storage */ }
  }, []);
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
  const [navQuery, setNavQuery] = useState("");
  const SECTION_KEYWORDS: Record<string, string> = {
    billing: "moms pris betaling kort abonnement faktura stripe",
    hours: "åbningstider tider",
    "customer-notifications": "sms påmindelse kunder",
    notifications: "mail e-mail besked",
    advanced: "leads livechat tilbud",
    branding: "logo billede webadresse link",
    general: "navn beskrivelse telefon adresse cvr e-mail kontakt",
  };
  const matchesNav = (sec: { id: string; label: string; hint: string }) => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return true;
    return `${sec.label} ${sec.hint} ${SECTION_KEYWORDS[sec.id] ?? ""}`.toLowerCase().includes(q);
  };
  const visibleSections = useMemo(
    () => settingsSectionsFor(isListingOnly(business) ? "listing" : "full").filter(
      // Håndværk vises kun for håndværksbrancher (eller hvis modulerne allerede er slået til).
      (sec) => sec.id !== "contact" && (sec.id !== "trade" || isCraftBusiness(selectedCategories) || tradeModules.materials || tradeModules.quality),
    ),
    [business, selectedCategories, tradeModules.materials, tradeModules.quality],
  );

  // Én emne-side ad gangen: i stedet for én lang side med alle felter vises
  // kun det valgte emne. Abonnementstype hører til "Pris og betaling" (eller
  // "Ekstra funktioner" for Kun profil); "Slet virksomhed" til Ekstra funktioner.
  const hasBilling = visibleSections.some((s) => s.id === "billing");
  const planKindPage = hasBilling ? "billing" : "advanced";
  const hiddenSectionSelector = useMemo(() => {
    const ids: string[] = SECTIONS.map((s) => s.id as string).filter((id) => {
      // "contact" er lagt sammen med "general" og vises på den side.
      if (id === "contact") return activeSection !== "general";
      return id !== activeSection || !visibleSections.some((v) => v.id === id);
    });
    if (activeSection !== "general") ids.push("contact");
    if (activeSection !== planKindPage) ids.push("plan-kind");
    if (activeSection !== "advanced") ids.push("danger");
    return ids.map((id) => `[data-settings-pages] #settings-${id}`).join(",");
  }, [visibleSections, activeSection, planKindPage]);

  const scrollToSection = useCallback((rawId: string) => {
    const id = rawId === "plan-kind" ? planKindPage : rawId === "danger" ? "advanced" : rawId === "contact" ? "general" : rawId;
    setActiveSection(id);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `#settings-${id}`);
    // Vent til siden er skiftet, så rul til toppen af emnet.
    window.requestAnimationFrame(() => {
      const target = document.getElementById(`settings-${rawId}`) ?? document.querySelector("[data-settings-pages]");
      if (!target) return;
      const top = Math.max(0, (target as HTMLElement).getBoundingClientRect().top + window.scrollY - getScrollOffset());
      if (window.scrollY > top || rawId === "plan-kind" || rawId === "danger") window.scrollTo({ top, behavior: "auto" });
    });
  }, [planKindPage, setActiveSection]);

  // Søgning: efter emneskiftet findes feltet, hvis navn matcher søgeordet,
  // så siden ruller helt ned til det og sætter markøren i det.
  const focusMatchingField = useCallback((rawQuery: string) => {
    const q = rawQuery.trim().toLowerCase();
    if (q.length < 2) return;
    window.setTimeout(() => {
      const root = document.querySelector("[data-settings-pages]");
      if (!root) return;
      const candidates = Array.from(root.querySelectorAll<HTMLElement>("label, h3, h4, legend, [data-field-label]"))
        .filter((el) => el.offsetParent !== null && (el.textContent ?? "").toLowerCase().includes(q));
      const hit = candidates[0];
      if (!hit) return;
      const top = Math.max(0, hit.getBoundingClientRect().top + window.scrollY - getScrollOffset() - 16);
      window.scrollTo({ top, behavior: "smooth" });
      const forId = hit.getAttribute("for");
      const field = (forId && document.getElementById(forId)) || hit.querySelector("input, textarea, select")
        || hit.parentElement?.querySelector("input, textarea, select, button[role=switch]");
      if (field instanceof HTMLElement) {
        field.focus({ preventScroll: true });
        field.classList.add("ring-2", "ring-accent", "ring-offset-2");
        window.setTimeout(() => field.classList.remove("ring-2", "ring-accent", "ring-offset-2"), 1800);
      }
    }, 120);
  }, []);


  // Når brugeren lander på Indstillinger fra et deep-link (fx onboarding-knap
  // "Aktivér livechat" → #settings-advanced), så scroll automatisk ned til
  // den ønskede sektion. Vi venter et øjeblik, så DOM'et er fuldt monteret.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#settings-")) return;
    const id = hash.replace("#settings-", "");
    const t = window.setTimeout(() => scrollToSection(id), 120);
    return () => window.clearTimeout(t);
  }, [scrollToSection]);

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
        // når sektionen krydser under headeren (inkl. mobil chip-nav).
        rootMargin: `-${getScrollOffset() + 8}px 0px -60% 0px`,
        threshold: 0,
      },
    );
    visibleSections.forEach(({ id }) => {
      const el = document.getElementById(`settings-${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [visibleSections]);

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
        const { data } = await fetchCvr(savedCvr);
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
    if (cvrResult.vat) setCvrQuery(String(cvrResult.vat));
    setCvrResult(null);
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
      { key: "logo",        section: "branding", done: !!logoUrl,                       label: "Logo" },
      { key: "cover",       section: "branding", done: !!coverUrl,                      label: "Coverbillede" },
      { key: "description", section: "general",  done: description.trim().length > 20,  label: "Beskrivelse" },
      { key: "phone",       section: "contact",  done: !!phone,                         label: "Telefon" },
      { key: "email",       section: "contact",  done: !!email,                         label: "E-mail" },
      { key: "address",     section: "contact",  done: !!address && !!zipCode,          label: "Adresse" },
      { key: "categories",  section: "industries", done: selectedCategories.length > 0, label: "Branche" },
      { key: "hours",       section: "hours",    done: Object.keys(openHours).length > 0, label: "Åbningstider" },
    ];
    const done = checks.filter((c) => c.done).length;
    return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
  }, [logoUrl, coverUrl, description, phone, email, address, zipCode, selectedCategories, openHours]);

  const origCategories = (business.categories as string[]) || (business.category ? [business.category] : []);
  const origNotif = business.notification_settings as Record<string, any> || {};
  const origRoutePlanning = !!(business.settings as any)?.route_planning_enabled;
  // Behold for kompatibilitet — bruges ikke længere som "ændret"-signal da
  // accounting-toggle er fjernet fra UI'et.
  const origAccountingIntegration = !!(business.settings as any)?.accounting_integration_enabled;
  const origLeadsEnabled = !!(business.settings as any)?.leads_enabled;
  const origLivechatEnabled = !!(business.settings as any)?.livechat_enabled;
  const origCustomDomain = ((business.settings as any)?.custom_domain as string) || "";
  const origSubcats = ((business.settings as any)?.selected_subcategories as Record<string, string[]>) || {};
  const hasChanges = name !== business.name || description !== (business.description || "") ||
    phone !== (business.phone || "") || email !== (business.email || "") ||
    (/^\d{8}$/.test(cvrQuery.trim()) ? cvrQuery.trim() : ((business.settings as any)?.cvr || "")) !== ((business.settings as any)?.cvr || "") ||
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
    JSON.stringify(tradeModules) !== JSON.stringify(origTradeModules) ||
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
    allow_early_completion_default: allowEarlyCompletionDefault,
    settings: {
      ...((business.settings as any) || {}),
      route_planning_enabled: routePlanningEnabled,
      accounting_integration_enabled: accountingIntegrationEnabled,
      leads_enabled: leadsEnabled,
      livechat_enabled: livechatEnabled,
      trade_modules: tradeModules,
      customer_notif_upcoming_minutes: customerNotifUpcomingMinutes,
      customer_notif_upcoming_hours: Math.max(1, Math.round(customerNotifUpcomingMinutes / 60)),
      sms_enabled: smsEnabled,
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
      cvr: /^\d{8}$/.test(cvrQuery.trim()) ? cvrQuery.trim() : ((business.settings as any)?.cvr ?? null),
    },
  }), [ cvrQuery,
    business.id, business.name, business.settings, origCustomDomain,
    name, description, phone, email, address, city, zipCode,
    logoUrl, coverUrl, selectedCategories, selectedSubcategories,
    openHours, notifSettings, routePlanningEnabled, accountingIntegrationEnabled, leadsEnabled, livechatEnabled, tradeModules, customDomain, customerNotifUpcomingMinutes,
    allowEarlyCompletionDefault,
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
      toast.error("Det link er allerede taget af en anden virksomhed. Prøv et andet.");
      return;
    }
    const { error } = await supabase.from("businesses").update({ slug: next }).eq("id", business.id);
    if (error) {
      toast.error(error.message?.includes("duplicate") ? "Det link er allerede taget af en anden virksomhed." : "Vi kunne ikke gemme dit link. Prøv igen om lidt.");
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
      else toast.error(data?.message || "Webnavnet er ikke klar endnu — tjek at I har tilføjet de to linjer korrekt hos jeres webudbyder.");
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
    <div className="space-y-4 pb-28 lg:pb-24">
      {/* ─── Header — titel, virksomhedsikon og hurtige handlinger ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BrandedIllustration name="settings" className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">Indstillinger</h1>
              <button
                type="button"
                onClick={() => scrollToSection("plan-kind")}
                className="inline-flex min-h-8 items-center rounded-full border border-border bg-secondary px-2.5 text-xs font-semibold text-foreground hover:bg-secondary/70"
                title="Se abonnementstype"
              >
                {isListingOnly(business) ? "Kun profil" : "Fuldt system"}
              </button>
            </div>

          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              saveStatus === "saving"
                ? "border-warning/30 bg-warning/10 text-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Gemmer…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Alt er gemt
              </>
            )}
          </span>
          {business.slug && (
            <a
              href={`/v/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Se din side
            </a>
          )}
        </div>
      </div>


      {/* ─── Mobil: emnevælger + kompakt "mangler"-linje (sidebar bruges på lg) ─── */}
      <div data-settings-chipnav className="sticky top-14 z-20 -mx-3 min-[360px]:-mx-4 sm:-mx-6 lg:hidden border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
        <label className="flex items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-muted-foreground">Emne</span>
          <select
            value={activeSection}
            onChange={(e) => { scrollToSection(e.target.value); window.scrollTo({ top: 0 }); }}
            className="h-11 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-base font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {[
              { title: "Profil", ids: ["general", "industries", "branding", "hours"] },
              { title: "Beskeder", ids: ["notifications", "customer-notifications"] },
              { title: "Konto", ids: ["billing", "trade", "advanced"] },
            ].map((g) => {
              const secs = visibleSections.filter((sec) => g.ids.includes(sec.id));
              if (!secs.length) return null;
              return (
                <optgroup key={g.title} label={g.title}>
                  {secs.map((sec) => {
                    const left = completeness.checks.filter((c) => c.section === sec.id && !c.done).length;
                    return <option key={sec.id} value={sec.id}>{sec.label}{left ? ` (${left} mangler)` : ""}</option>;
                  })}
                </optgroup>
              );
            })}
          </select>
        </label>
        {completeness.checks.some((c) => !c.done) && (() => {
          const missing = completeness.checks.filter((c) => !c.done);
          return (
            <button
              type="button"
              onClick={() => { scrollToSection(missing[0].section); window.scrollTo({ top: 0 }); }}
              className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-md px-1 text-left text-sm"
            >
              <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-border">
                <span className="brand-blue-action block h-full rounded-full" style={{ width: `${completeness.pct}%` }} />
              </span>
              <span className="min-w-0 flex-1 font-medium text-foreground">{missing.length} ting mangler på profilen</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">Vis <ArrowRight className="h-3.5 w-3.5" /></span>
            </button>
          );
        })()}
      </div>

      {/* ─── To-kolonne på lg+: sticky sidebar + indhold ─── */}
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        {/* Sticky sidebar nav (kun lg+) — top-offset matcher den sticky topbar
            (h-14 = 56px) + lille luft, så den klistrer fast lige under headeren
            mens man scroller. */}
        <aside className="hidden lg:sticky lg:top-[68px] lg:block lg:max-h-[calc(100vh-80px)] lg:overflow-y-auto lg:pb-2 pr-1">
          <nav className="rounded-md border border-border bg-card p-2.5 shadow-sm">
            <label className="relative mb-3 block">
              <span className="sr-only">Søg i indstillinger</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const first = visibleSections.find(matchesNav);
                  if (first) { scrollToSection(first.id); focusMatchingField(navQuery); }
                }}
                placeholder="Søg, fx moms"
                className="h-11 pl-9 text-sm"
              />
            </label>
            {(() => {
              const missing = completeness.checks.filter((c) => !c.done);
              return (
                <button
                  type="button"
                  disabled={missing.length === 0}
                  onClick={() => missing[0] && scrollToSection(missing[0].section)}
                  className="mb-3 block w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-secondary/70 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="flex items-center justify-between text-sm">
                    <span className={missing.length ? "font-medium text-foreground" : "text-muted-foreground"}>
                      {missing.length === 0 ? "Profilen er komplet" : `${missing.length} ting mangler`}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{completeness.pct}%</span>
                  </span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-border">
                    <span className="brand-blue-action block h-full rounded-full transition-all" style={{ width: `${completeness.pct}%` }} />
                  </span>
                </button>
              );
            })()}
            {(() => {
              const groups: { title: string; ids: string[] }[] = [
                { title: "Profil",      ids: ["general", "industries", "branding", "hours"] },
                { title: "Beskeder",    ids: ["notifications", "customer-notifications"] },
                { title: "Konto",       ids: ["billing", "trade", "advanced"] },
              ];
              const shown = groups.filter((g) => g.ids.some((id) => visibleSections.some((s) => s.id === id && matchesNav(s))));
              if (shown.length === 0) return <p className="px-3 py-2 text-sm text-muted-foreground">Ingen indstillinger matcher.</p>;
              return shown.map((g, gi) => (
                <div key={g.title} className={gi > 0 ? "mt-4 border-t border-border/50 pt-3" : ""}>
                  <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                    {g.title}
                  </p>
                  <div className="flex flex-col gap-1">
                    {g.ids.map((id) => {
                      const sec = visibleSections.find((s) => s.id === id);
                      if (!sec || !matchesNav(sec)) return null;
                      const Icon = sec.icon;
                      const sectionChecks = completeness.checks.filter((c) => c.section === id);
                      const sectionDone = sectionChecks.length > 0 && sectionChecks.every((c) => c.done);
                      const isActive = activeSection === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => scrollToSection(id)}
                          aria-current={isActive ? "location" : undefined}
                          title={sec.hint}
                          className={`group relative flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2 text-left transition-all ${
                            isActive
                              ? "brand-blue-action text-background shadow-sm"
                              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm font-medium leading-tight ${isActive ? "text-background" : ""}`}>
                              {sec.label}
                            </span>
                          </span>
                          {sectionDone ? (
                            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-background" : "text-success"}`} />
                          ) : sectionChecks.some((c) => !c.done) ? (
                            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${isActive ? "bg-background/20 text-background" : "bg-warning/15 text-warning"}`}>
                              {sectionChecks.filter((c) => !c.done).length}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </nav>
        </aside>

        <div className="space-y-4" data-settings-pages>
          {hiddenSectionSelector && <style>{`${hiddenSectionSelector}{display:none}`}</style>}
      {/* ─── Hovedindhold: 1-kolonne (sidebar håndterer navigation) ─── */}
      <div className="grid gap-4">
        {/* ── Gruppe: Profil ── */}

        {/* Generelt — kun navn + beskrivelse */}
        <div id="settings-general" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard title="Firma" icon={<Building2 />} description="Navn, CVR og den korte tekst øverst på jeres profil.">
            <div className="space-y-4">
              <div data-tour="field-company-name">
                <FieldLabel required>Virksomhedsnavn</FieldLabel>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Fx Ready2Clean ApS" value={name} onChange={(e) => setName(e.target.value)} className="bg-card h-11 rounded-lg pl-9 text-[15px]" />
                </div>
              </div>
              <div data-tour="field-cvr">
                <FieldLabel optional>CVR-nummer</FieldLabel>
                <p className="-mt-1 mb-2 text-xs text-muted-foreground">Tryk "Hent fra CVR" for at udfylde navn, telefon og adresse automatisk.</p>
                <div className="space-y-2">
<div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="12345678"
            inputMode="numeric"
            aria-label="CVR-nummer"
            value={cvrQuery}
            onChange={(e) => setCvrQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupCvr()}
            className="bg-card h-11 flex-1 rounded-lg text-[15px] tabular-nums"
          />
          <Button
            onClick={lookupCvr}
            disabled={cvrLoading || !cvrQuery.trim()}
            className="h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-medium px-4 shrink-0"
          >
            {cvrLoading ? "Henter..." : "Hent fra CVR"}
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
                {cvrResult.email && <p className="text-xs text-muted-foreground">E-mail: {cvrResult.email}</p>}
              </div>
              <Button size="sm" onClick={applyCvrData} className="shrink-0 min-h-11 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 text-sm font-medium">
                Anvend
              </Button>
            </div>
          </div>
        )}
                      </div>
              </div>
              <div data-tour="field-company-description">
                <div className="flex items-center justify-between">
                  <FieldLabel required className="mb-0">Beskrivelse</FieldLabel>
                  <span className={`text-[11px] tabular-nums ${description.length > 450 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {description.length}/500
                  </span>
                </div>
                <Textarea
                  placeholder="Skriv 2-4 sætninger om hvad I laver, hvor I gør det, og hvad der gør jer gode. Det her er det første kunderne læser."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="mt-1.5 bg-card rounded-lg text-[14px] leading-relaxed resize-none"
                />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Brancher — egen sektion med kategorier underneden */}
        <div id="settings-industries" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard
            title="Brancher & kategorier"
            icon={<Sparkles />}
            description="Vælg brancher og de aftaler, I tager. Så finder de rigtige kunder jer."
          >
            <div className="space-y-5">
              <div>
                <FieldLabel required>Hvilke brancher arbejder I med?</FieldLabel>
                <p className="-mt-1 mb-2.5 text-xs text-muted-foreground">
                  Vælg én eller flere. Når I vælger en branche, slår vi automatisk alle dens kategorier til — I kan finjustere længere nede.
                </p>
                <IndustryPicker
                  selected={selectedCategories}
                  onToggle={toggleSettingsCategory}
                />
              </div>

              {selectedCategories.length > 0 && (
                <div className="border-t border-border pt-4">
                  <FieldLabel required>Hvilke konkrete aftaler tager I?</FieldLabel>
                  <p className="-mt-1 mb-3 text-xs text-muted-foreground">
                    Markér de aftaletyper, I rent faktisk udfører. Dem I fjerner her, vises hverken til kunder eller foreslås, når I opretter nye services.
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
        <div id="settings-contact" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard title="Kontakt og adresse" icon={<Contact />} description="Sådan får kunderne fat i jer. Adressen bruges også på fakturaer.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div data-tour="field-phone">
                  <FieldLabel required>Telefon</FieldLabel>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="12 34 56 78" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} className="bg-card h-11 rounded-lg pl-9 text-[15px]" type="tel" />
                  </div>
                </div>
                <div data-tour="field-email">
                  <FieldLabel required>E-mail</FieldLabel>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="kontakt@virksomhed.dk" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-card h-11 rounded-lg pl-9 text-[15px]" type="email" />
                  </div>
                </div>
              </div>
              <div data-tour="field-address">
                <FieldLabel required>Adresse</FieldLabel>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={(r) => {
                    setAddress(r.address);
                    if (r.zipCode) setZipCode(r.zipCode);
                    if (r.city) setCity(r.city);
                  }}
                />
                {(zipCode || city) && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground tabular-nums">
                      {zipCode || "—"}
                    </span>
                    <span>·</span>
                    <span className="text-foreground">{city || "—"}</span>
                    <button
                      type="button"
                      onClick={() => { setZipCode(""); setCity(""); }}
                      className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      Ryd
                    </button>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Branding */}
        <div id="settings-branding" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard title="Profil og webadresse" icon={<ImageIcon />} description="Logo, forsidebillede og linket til jeres profil.">
            {/* ── Visuelle elementer: logo + cover side om side i én visuel ramme ── */}
            <div>
              <p className="mb-2 px-1 text-sm font-semibold text-foreground">Visuelle elementer</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
                <div className="rounded-xl border border-border bg-card/50 p-4" data-tour="field-logo">
                  <FieldLabel optional>Logo</FieldLabel>
                  <div className="mt-1 flex items-start gap-3">
                    {user && <ImageUpload folder={`${user.id}/logo`} currentUrl={logoUrl || null} onUploaded={setLogoUrl} label="" aspectRatio="aspect-square" className="w-24" objectFit="contain" />}
                  </div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                    Vises lille i toppen af profilen, i søgeresultater og i e-mails.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card/50 p-4" data-tour="field-cover">
                  <FieldLabel optional>Coverbillede</FieldLabel>
                  <div className="mt-1">
                    {user && <ImageUpload folder={`${user.id}/cover`} currentUrl={coverUrl || null} onUploaded={setCoverUrl} label="" aspectRatio="aspect-[3/1]" className="w-full max-w-[420px]" />}
                  </div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                    Vises som bredt banner øverst på jeres profilside i formatet 3:1.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Webadresse ── */}
            <p className="mt-6 mb-2 px-1 text-sm font-semibold text-foreground">Webadresse</p>
            {/* Permalink (slug) */}
            <div className="rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
                  <Link2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Jeres link på Serviceydere</p>
                    <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                      Vigtigt
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Adressen kunderne åbner, når de besøger jeres profil. Skriv firmanavnet med små bogstaver og bindestreger i stedet for mellemrum (fx <span className="font-mono">nord-rengoering</span>). <strong className="text-foreground">Vær varsom med at ændre det senere</strong> — har I delt linket, holder det gamle op med at virke.
                  </p>
                  {/* Mobile: stilfuld stak med inline-prefix indeni en
                      delt ramme. sm+: joined pill med prefix + input + knap. */}
                  <div className="mt-3 space-y-2 sm:flex sm:space-y-0 sm:gap-0">
                    <div className="flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-card sm:flex-1">
                      <div className="flex shrink-0 items-center bg-muted px-3 text-xs font-medium text-muted-foreground">
                        serviceydere.dk/v/
                      </div>
                      <Input
                        placeholder="min-virksomhed"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="h-10 flex-1 rounded-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                        maxLength={60}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleSaveSlug}
                      disabled={!slugChanged || slugStatus === "checking" || slugStatus === "taken" || slugStatus === "invalid"}
                      className="h-10 w-full rounded-lg sm:ml-2 sm:w-auto"
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

            {/* Custom domæne — klappet sammen indtil det er i brug */}
            <details className="group mt-4" open={!!customDomain.trim()}>
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md px-1 text-sm font-medium text-foreground hover:text-accent [&::-webkit-details-marker]:hidden">
                <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden />
                Har I jeres eget webnavn (fx mitfirma.dk)?
              </summary>
              <div className="mt-2 rounded-xl border border-border bg-card/50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
                  <Globe className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">Brug jeres eget webnavn</p>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-sm font-semibold text-foreground">
                      Behøves ikke
                    </span>
                    {customDomain.trim() && (
                      domainStatus === "active" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          <CheckCircle2 className="h-3 w-3" /> Live
                        </span>
                      ) : domainStatus === "pending_activation" || domainStatus === "verified" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                          <Loader2 className="h-3 w-3 animate-spin" /> Afventer aktivering
                        </span>
                      ) : domainStatus === "pending_dns" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground dark:text-warning">
                          <AlertCircle className="h-3 w-3" /> Ejerskab er OK · venter på pegningen (CNAME)
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
                    Har I allerede købt et webnavn (fx <span className="font-mono">mitfirma.dk</span>)? Så kan I bruge det i stedet for{" "}
                    <span className="font-mono">serviceydere.dk/v/{business.slug}</span>. Det ser mere professionelt ud i Google og når I deler links. Det kræver lidt teknisk opsætning hos den, hvor I har købt webnavnet — vi guider jer trin for trin.
                  </p>
                  <div className="mt-3 space-y-2 sm:flex sm:space-y-0 sm:gap-0">
                    <div className="flex w-full items-stretch overflow-hidden rounded-lg border border-border bg-card sm:flex-1">
                      <div className="flex shrink-0 items-center bg-muted px-3 text-xs font-medium text-muted-foreground">
                        https://
                      </div>
                      <Input
                        placeholder="mitfirma.dk"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        className="h-10 flex-1 rounded-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <Button type="button" onClick={handleVerifyDomain} disabled={domainVerifying || !customDomain.trim()} className="h-10 w-full rounded-lg sm:ml-2 sm:w-auto">
                      {domainVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tjek nu"}
                    </Button>
                  </div>

                  {customDomain.trim() && (
                    <div className="mt-4 space-y-3 rounded-lg border border-border bg-background/60 p-3">
                      <p className="text-xs font-semibold text-foreground">Sådan kobler I jeres webnavn til Serviceydere:</p>
                      <p className="text-[11px] text-muted-foreground">
                        Log ind hos den, hvor I har købt webnavnet (fx One.com, Simply.com, GoDaddy) og find punktet "DNS" eller "DNS-indstillinger". Tilføj de to linjer nedenfor. Det lyder teknisk, men det tager kun 2-3 minutter — kontakt jeres webudbyder, hvis I er i tvivl.
                      </p>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">1) Bevis at det er jeres webnavn</p>
                          <p className="text-[11px]">Tilføj en linje af typen <span className="font-mono">TXT</span>:</p>
                          <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                            <span className="text-muted-foreground">Type:</span><span>TXT</span>
                            <span className="text-muted-foreground">Navn:</span><span>_serviceydere</span>
                            <span className="text-muted-foreground">Alternativt:</span><span className="break-all">_serviceydere.{customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0]}</span>
                            <span className="text-muted-foreground">Værdi:</span><span className="break-all">serviceydere-verify={domainToken}</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">2) Send besøgende til jeres side hos os</p>
                          <p className="text-[11px]">Tilføj en linje af typen <span className="font-mono">CNAME</span>:</p>
                          <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
                            <span className="text-muted-foreground">Type:</span><span>CNAME</span>
                            <span className="text-muted-foreground">Navn:</span><span>{customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0] || "@"}</span>
                            <span className="text-muted-foreground">Værdi:</span><span>serviceydere.dk</span>
                          </div>
                        </div>
                        <p>Når I har gemt linjerne hos jeres webudbyder, klik <strong className="text-foreground">Tjek nu</strong>. Det kan tage alt fra et par minutter op til et døgn, før det virker — så bare klik igen, hvis det ikke virker første gang.</p>
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
                                Linjen af typen <span className="font-mono">TXT</span> med navnet <span className="font-mono">_serviceydere</span> og værdien{" "}
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
                                Linjen af typen <span className="font-mono">CNAME</span> der peger på <span className="font-mono">serviceydere.dk</span>
                              </span>
                            </li>
                          </ul>
                          <p className="pt-1 text-[10px] text-muted-foreground">
                            Når I gemmer ændringerne hos jeres webudbyder, kan det tage fra et par minutter op til et døgn før det slår igennem. Klik <strong>Tjek nu</strong> igen efter et stykke tid.
                          </p>
                        </div>
                      )}
                      {domainStatus === "active" && domainVerifiedAt && (
                        <p className="text-[11px] text-muted-foreground">Aktiveret: {new Date(domainVerifiedAt).toLocaleString("da-DK")}</p>
                      )}
                      {(domainStatus === "pending_activation" || domainStatus === "verified") && (
                        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2.5 text-[11px] leading-relaxed text-blue-900 dark:text-blue-200">
                          <p className="font-semibold">✓ Alt er sat op korrekt — vi gør jeres webnavn klar</p>
                          <p className="mt-1">
                            Vi har modtaget jeres anmodning. Vi sætter et sikkert {"\""}https{"\""}-certifikat op for jer hurtigst muligt — typisk inden for 1 hverdag.
                            I kan godt lukke siden imens; status opdateres automatisk her, og I får besked på{" "}
                            <span className="font-mono">{(business as any).email || "jeres kontakt-e-mail"}</span> når{" "}
                            <span className="font-mono">{customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0]}</span>{" "}
                            er klar at bruge.
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
            </details>
          </SectionCard>
        </div>

        {/* Åbningstider */}
        <div id="settings-hours" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard
            title="Åbningstider"
            icon={<Clock />}
            description="Hvornår kunderne kan få fat i jer."
          >
            <HoursEditor value={openHours} onChange={setOpenHours} />
          </SectionCard>
        </div>

        {/* ── Gruppe: Beskeder ── */}

        {/* Notifikationer */}
        <div id="settings-notifications" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard
            title="E-mail-beskeder til jer"
            icon={<Bell />}
            description="Hvad I selv får e-mail om, og hvornår."
          >
            <OwnerAlertsEditor
              value={notifSettings}
              onChange={setNotifSettings}
              leadsEnabled={leadsEnabled}
              fallbackEmail={email}
              businessId={business.id}
            />
          </SectionCard>
        </div>

        {/* Kunde-notifikationer — kun fuldt system (Kun profil har ingen aftaler) */}
        {!isListingOnly(business) && (
        <div id="settings-customer-notifications" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard
            title="Beskeder til jeres kunder"
            icon={<MessageCircle />}
            description="Påmindelser og kvitteringer til jeres kunder på e-mail og SMS."
          >
            <div className="mb-3">
              <SmsSetupCard
                businessId={business.id}
                businessName={business.name ?? ""}
                smsEnabled={smsEnabled}
                onSmsEnabledChange={setSmsEnabled}
              />
            </div>
            <CustomerNotificationsSettings
              businessId={business.id}
              upcomingMinutesBefore={customerNotifUpcomingMinutes}
              onUpcomingMinutesChange={setCustomerNotifUpcomingMinutes}
              smsEnabled={smsEnabled}
              onSmsEnabledChange={setSmsEnabled}
            />
          </SectionCard>
        </div>
        )}

        {/* ── Gruppe: Konto ── */}

        <PlanKindSection business={business} />

        {!isListingOnly(business) && (<>
        {/* Fakturering */}
        <div id="settings-billing" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard
            title="Pris og betaling"
            icon={<CreditCard />}
            description="Pakke, betalingsinterval og betalingskort."
          >
            {/* Status-banner med dage tilbage */}
            {plan && plan.status !== "unknown" && (
              <div
                className={`rounded-xl border p-4 ${
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
                        <p className="text-sm font-semibold text-foreground">{plan.has_payment_method ? "Dit abonnement er aktivt" : "Tilføj et betalingskort"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Du betaler <span className="font-medium text-foreground tabular-nums">{Math.round(plan.monthly_price_dkk).toLocaleString("da-DK")} kr/md</span>
                          {plan.has_payment_method
                            ? ` med ${plan.payment_brand || "kort"} der ender på ${plan.payment_last4}.`
                            : ". Tilføj et betalingskort herunder, så abonnementet fortsætter uden afbrydelse."}
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
                          <TrialCountdownText
                            trialEndsAt={plan.trial_ends_at}
                            daysLeft={plan.days_left}
                          />
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
              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                {/* Hovedkort: faktureringsinterval + linje-specifikation */}
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/30 px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Faktureringsinterval</p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">Spar penge ved at betale forud — du kan altid skifte igen.</p>
                    </div>
                    {pricing && (
                      <span className="hidden sm:inline-flex rounded-full bg-accent/10 px-2.5 py-1 text-[10.5px] font-semibold text-accent">
                        Spar op til {pricing.discount_yearly_pct}%
                      </span>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {([
                        { key: "monthly", label: "Hver måned", desc: "Mest fleksibelt", hint: "" },
                        { key: "quarterly", label: "Hvert kvartal", desc: "Lidt billigere", hint: pricing ? `Spar ${pricing.discount_quarterly_pct}%` : "" },
                        { key: "yearly", label: "Hvert år", desc: "Bedste pris", hint: pricing ? `Spar ${pricing.discount_yearly_pct}%` : "" },
                      ] as const).map((opt) => {
                        const isOn = planBilling === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleBillingPeriodChange(opt.key)}
                            disabled={updatePlan.isPending}
                            className={`relative flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                              isOn
                                ? "border-foreground bg-foreground/[0.04] shadow-sm ring-1 ring-foreground/10"
                                : "border-border bg-card hover:border-foreground/30 hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex w-full items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isOn ? "border-foreground bg-foreground" : "border-border"}`}>
                                {isOn && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{opt.desc}</p>
                            {opt.hint && (
                              <span className="mt-2 inline-flex items-center rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                {opt.hint}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Antal ekstra medarbejderlogins — styrer hvor mange medarbejdere
                        virksomheden kan oprette. Ejer-loginnet er altid inkluderet. */}
                    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">Medarbejderlogins</p>
                          <p className="mt-1 text-sm text-foreground">
                            Hvor mange medarbejdere skal kunne logge ind på mobilen?
                          </p>
                          <p className="mt-1 text-[11.5px] text-muted-foreground">
                            Ejer-loginnet er allerede inkluderet gratis.{" "}
                            {pricing && (
                              <span>
                                Hvert ekstra login koster{" "}
                                <span className="font-medium text-foreground">
                                  {Math.round(pricing.price_per_employee_login_dkk).toLocaleString("da-DK")} kr/md
                                </span>
                                .
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center rounded-xl border border-border bg-background">
                          <button
                            type="button"
                            onClick={() => handleEmployeeLoginsChange(planExtraLogins - 1)}
                            disabled={updatePlan.isPending || (planExtraLogins + 1) <= activeEmployeesCount}
                            className="flex h-11 w-11 items-center justify-center text-lg font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
                            aria-label="Færre medarbejderlogins"
                          >
                            −
                          </button>
                          <span className="min-w-[2.75rem] text-center text-sm font-semibold tabular-nums text-foreground">
                            {planExtraLogins}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleEmployeeLoginsChange(planExtraLogins + 1)}
                            disabled={updatePlan.isPending || planExtraLogins >= 99}
                            className="flex h-11 w-11 items-center justify-center text-lg font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
                            aria-label="Flere medarbejderlogins"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {(planExtraLogins + 1) <= activeEmployeesCount && (
                        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-secondary/40 px-2.5 py-2 text-[11.5px] text-muted-foreground">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            I bruger lige nu {activeEmployeesCount} af {planExtraLogins + 1} medarbejderlogins (inkl. ejer-login).
                            Deaktivér en medarbejder under <span className="font-medium text-foreground">Medarbejdere</span>, før I kan reducere antallet.
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/20 p-3 sm:p-4">
                      <p className="text-sm font-semibold text-foreground">Hvad du betaler for</p>
                      <ul className="mt-2.5 divide-y divide-border/60">
                        {priceBreakdown.lines.map((l) => (
                          <li key={l.key} className="flex items-baseline justify-between gap-3 py-1.5 text-sm first:pt-0">
                            <span className="text-foreground">{l.label}</span>
                            <span className="shrink-0 font-medium text-foreground tabular-nums">
                              {Math.round(l.amount).toLocaleString("da-DK")} kr/md
                            </span>
                          </li>
                        ))}
                      </ul>
                      {priceBreakdown.discountPct > 0 && (
                        <div className="mt-3 border-t border-border/60 pt-2.5 space-y-1.5">
                          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                            <span>Subtotal</span>
                            <span className="tabular-nums">{Math.round(priceBreakdown.subtotal).toLocaleString("da-DK")} kr/md</span>
                          </div>
                          <div className="flex items-baseline justify-between text-xs">
                            <span className="inline-flex items-center gap-1 text-accent">
                              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold">RABAT {priceBreakdown.discountPct}%</span>
                            </span>
                            <span className="font-medium text-accent tabular-nums">
                              −{Math.round(priceBreakdown.subtotal - priceBreakdown.monthlyAfterDiscount).toLocaleString("da-DK")} kr/md
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="flex items-start gap-1.5 text-[11.5px] text-muted-foreground">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span>Slå tilvalg til eller fra under <span className="font-medium text-foreground">Tilvalg og konto</span> — prisen opdateres automatisk her.</span>
                    </p>
                  </div>
                </div>

                {/* Sidekort: stor pris-fremhævning (sticky på desktop) */}
                <div className="lg:sticky lg:top-4 lg:self-start">
                  <div className="overflow-hidden rounded-xl border border-foreground bg-foreground text-background shadow-md">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider opacity-70">Du betaler</p>
                        <p className="mt-2 flex items-baseline gap-1.5">
                          <span className="text-4xl font-bold tabular-nums leading-none">
                            {Math.round(priceBreakdown.monthlyAfterDiscount).toLocaleString("da-DK")}
                          </span>
                          <span className="text-sm font-medium opacity-80">kr/md</span>
                        </p>
                        <p className="mt-2 text-[11.5px] opacity-70">
                          {planBilling === "yearly" ? "Faktureres én gang om året."
                            : planBilling === "quarterly" ? "Faktureres hvert kvartal."
                            : "Faktureres hver måned."}
                        </p>
                        {priceBreakdown.discountPct > 0 && (
                          <p className="mt-2 text-[11px] opacity-70">
                            <span className="line-through opacity-70">{Math.round(priceBreakdown.subtotal).toLocaleString("da-DK")} kr/md</span>
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-background/15 px-1.5 py-0.5 text-[10px] font-semibold">−{priceBreakdown.discountPct}%</span>
                          </p>
                        )}
                      </div>
                      {(plan?.status === "trialing" || plan?.status === "trial_ending") && (
                        <p className="mt-4 rounded-md bg-background/10 px-2.5 py-1.5 text-[11px] opacity-90">
                          Prisen opkræves først når din prøveperiode er slut.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aktivt kort — vis brand + last4, og lad brugeren fjerne det */}
            {plan?.has_payment_method && (
              <div className="mt-5">
                <p className="mb-2 px-1 text-sm font-semibold text-foreground">Betalingsmetode</p>
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-foreground to-foreground/80 text-background text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        {plan.payment_brand || "Kort"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground tabular-nums">•••• {plan.payment_last4}</p>
                        <p className="inline-flex items-center gap-1 text-[11px] text-success">
                          <CheckCircle2 className="h-3 w-3" /> Aktivt — næste opkrævning sker automatisk
                        </p>
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

        {/* Håndværk — materialer, grossister og kvalitetssikring */}
        <div id="settings-trade" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard title="Håndværk" icon={<Hammer />} description="Til el, VVS, tømrer, maler og murer.">
            {!isCraftBusiness(selectedCategories) && !tradeModules.materials && !tradeModules.quality ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Disse funktioner er lavet til håndværksbrancher. Vælg fx Elektriker, VVS, Tømrer og snedker, Maler eller Murer under Brancher, så kan I slå dem til her.
              </p>
            ) : (
              <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
                <FeatureRow
                  icon={<TradeIcon name="materialsOnJobs" className="h-9 w-9" />}
                  title="Materialer på opgaver"
                  description="Brugte materialer kommer automatisk med på fakturaen."
                  active={tradeModules.materials}
                  activeLabel="Aktivt — ”Materialer” vises på opgaver og i medarbejder-appen"
                  inactiveLabel="Ikke aktivt"
                  onToggle={() => setTradeModules((t) => ({ ...t, materials: !t.materials, wholesaler: t.materials ? false : t.wholesaler }))}
                />
                <FeatureRow
                  icon={<TradeIcon name="wholesaler" className="h-9 w-9" />}
                  title="Grossistpriser"
                  description="Upload prisfilen fra jeres grossist med jeres egne priser."
                  active={tradeModules.wholesaler}
                  activeLabel="Aktivt — upload prisfiler under Materialeliste"
                  inactiveLabel={tradeModules.materials ? "Ikke aktivt" : "Kræver at ”Materialer på opgaver” er slået til"}
                  onToggle={() => tradeModules.materials && setTradeModules((t) => ({ ...t, wholesaler: !t.wholesaler }))}
                />
                <FeatureRow
                  icon={<TradeIcon name="quality" className="h-9 w-9" />}
                  title="Kvalitetssikring (KS)"
                  description="Målinger, afvigelser og kundens underskrift – kan printes som PDF."
                  active={tradeModules.quality}
                  activeLabel="Aktivt — ”Kvalitetssikring” vises på opgaver og i medarbejder-appen"
                  inactiveLabel="Ikke aktivt"
                  onToggle={() => setTradeModules((t) => ({ ...t, quality: !t.quality }))}
                />
              </div>
                {(tradeModules.materials || tradeModules.quality) && (
                  <TradeManageCards
                    businessId={business.id}
                    materials={tradeModules.materials}
                    quality={tradeModules.quality}
                    onMaterials={() => setCatalogOpen(true)}
                    onQuality={() => setTemplatesOpen(true)}
                  />
                )}
              </div>
            )}
          </SectionCard>
          <MaterialCatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} businessId={business.id} wholesaler={tradeModules.wholesaler} />
          <QualityTemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} businessId={business.id} categories={selectedCategories} />
        </div>

        </>)}

        {/* Avanceret */}
        <div id="settings-advanced" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <SectionCard title="Gratis tilvalg" icon={<Settings />} description="Gratis funktioner, I kan slå til og fra.">
            <div>
              <div>
                <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
                  <FeatureRow
                    icon={<BrandedIllustration name="signupLeads" className="h-full w-full" alt="" />}
                    title="Leads fra ”Indhent 3 tilbud”"
                    description="Forespørgsler fra «Indhent 3 tilbud» i jeres område – gratis og uforpligtende."
                    active={leadsEnabled}
                    activeLabel="Aktivt — ”Leads”-fanen er i menuen, og I modtager matches"
                    inactiveLabel="Ikke aktivt — slå til for at begynde at modtage leads"
                    onToggle={() => setLeadsEnabled((v) => !v)}
                  />
                  <FeatureRow
                    icon={<BrandedIllustration name="signupLivechat" className="h-full w-full" alt="" />}
                    title="Livechat på virksomhedssiden"
                    description="En chat-knap på jeres profilside."
                    active={livechatEnabled}
                    activeLabel="Aktivt — chat-knappen er synlig på jeres profilside"
                    inactiveLabel="Ikke aktivt — slå til for at lade besøgende skrive til jer"
                    onToggle={() => setLivechatEnabled((v) => !v)}
                  />
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Farezone — opsig og slet virksomheden */}
        <div id="settings-danger" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
          <details className="group rounded-lg border border-border bg-card">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              Opsig eller slet virksomheden
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="border-t border-border p-2">
          <DangerZoneCard
            businessId={business.id}
            businessName={business.name}
            ownerEmail={user?.email || business.email || null}
          />
            </div>
          </details>
        </div>
        {(() => {
          const idx = visibleSections.findIndex((s) => s.id === activeSection);
          const prev = idx > 0 ? visibleSections[idx - 1] : null;
          const next = idx >= 0 && idx < visibleSections.length - 1 ? visibleSections[idx + 1] : null;
          if (!prev && !next) return null;
          return (
            <nav aria-label="Skift emne" className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-background/95 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:z-auto lg:justify-between lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-4 lg:backdrop-blur-none">
              {prev ? (
                <Button type="button" variant="outline" size="lg" aria-label={`Forrige: ${prev.label}`} className="min-h-12 shrink-0 justify-start text-base" onClick={() => { scrollToSection(prev.id); window.scrollTo({ top: 0 }); }}>
                  <span aria-hidden className="lg:hidden">←</span><span className="hidden lg:inline">← {prev.label}</span>
                </Button>
              ) : <span className="hidden lg:block" />}
              {next && (
                <Button type="button" size="lg" className="min-h-12 min-w-0 flex-1 justify-center truncate text-base lg:flex-none" onClick={() => { scrollToSection(next.id); window.scrollTo({ top: 0 }); }}>
                  Næste: {next.label} →
                </Button>
              )}
            </nav>
          );
        })()}
      </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;

/* Genveje til materialeliste og tjeklister med antal, så man kan se om de er sat op. */
function TradeManageCards({ businessId, materials, quality, onMaterials, onQuality }: {
  businessId: string; materials: boolean; quality: boolean; onMaterials: () => void; onQuality: () => void;
}) {
  const { data } = useQuery({
    queryKey: ["trade-counts", businessId],
    queryFn: async () => {
      const [m, t] = await Promise.all([
        supabase.from("material_catalog").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("is_active", true),
        supabase.from("quality_templates").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("is_active", true),
      ]);
      return { materials: m.count ?? 0, templates: t.count ?? 0 };
    },
  });
  const card = (icon: ReactNode, title: string, sub: string, empty: boolean, onClick: () => void) => (
    <button type="button" onClick={onClick}
      className="flex min-h-16 flex-1 items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className={`block text-xs ${empty ? "font-medium text-destructive" : "text-muted-foreground"}`}>{sub}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
  const mc = data?.materials, tc = data?.templates;
  return (
    <div className="flex flex-col gap-2 pt-1 sm:flex-row">
      {materials && card(<TradeIcon name="materialList" className="h-6 w-6" />, "Materialeliste",
        mc == null ? "Henter …" : mc === 0 ? "Tom – tilføj materialer, før medarbejderne kan bruge dem" : `${mc.toLocaleString("da-DK")} materialer · ret priser og upload prisfiler`, mc === 0, onMaterials)}
      {quality && card(<TradeIcon name="checklists" className="h-6 w-6" />, "Tjeklister",
        tc == null ? "Henter …" : tc === 0 ? "Ingen endnu – vælg en standard eller lav jeres egen" : `${tc} ${tc === 1 ? "tjekliste" : "tjeklister"} · ret punkter og målinger`, tc === 0, onQuality)}
    </div>
  );
}

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
  const [showAll, setShowAll] = useState(false);
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
      <MultiIndustryHelp />
      {/* Søgefelt + valgte counter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg branche, fx vinduespudser, alge, tømrer…"
            aria-label="Søg branche"
            className="bg-card h-11 rounded-md pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground sm:shrink-0">
          {selected.length} valgt
        </div>
      </div>

      {/* Aktive valg som chips — hurtig oversigt + fravalg */}
      {selected.length > 0 && (
        <div className="rounded-xl border border-border bg-secondary/40 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Valgte brancher ({knownSelected.length + customValues.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
          {knownSelected.map((k) => {
            const ind = ALL_INDUSTRIES.find((i) => i.key === k)!;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onToggle(k)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/5 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                <IndustryIcon category={ind.key} className="h-6 w-6 shrink-0" alt={ind.label} />
                <span>{ind.label}</span>
                <span aria-hidden className="text-muted-foreground transition-colors group-hover:text-destructive">×</span>
              </button>
            );
          })}
          {customValues.map((k) => (
            <button
              key={`custom-${k}`}
              type="button"
              onClick={() => onToggle(k)}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              title="Tidligere valg (ikke i nyt katalog)"
            >
              <span>🧰</span>
              <span>{k}</span>
              <span aria-hidden>×</span>
            </button>
          ))}
          </div>
        </div>
      )}

      {/* Grupperet liste — skjult når der allerede er valgt, indtil man søger eller beder om det */}
      {!q && !showAll && selected.length > 0 ? (
        <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => setShowAll(true)}>
          Tilføj eller skift brancher
        </Button>
      ) : (
      <div className="space-y-3">
        {groupsFiltered.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </p>
            <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {g.industries.map((i) => {
                const isOn = selected.includes(i.key);
                return (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => onToggle(i.key)}
                    className={`group relative flex min-h-[52px] items-center gap-2 rounded-xl border px-3 py-3 text-left transition-all active:scale-[0.98] ${
                      isOn
                        ? "border-foreground bg-foreground/5 shadow-sm ring-1 ring-foreground/10"
                        : "border-border bg-card hover:border-foreground/40 hover:bg-secondary/40"
                    }`}
                  >
                    <IndustryIcon category={i.key} className="h-9 w-9 shrink-0" alt={i.label} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium leading-tight text-foreground break-words">
                        {i.label}
                      </span>
                    </span>
                    {isOn && (
                      <span className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 011.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clipRule="evenodd"/></svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {groupsFiltered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            <p>Ingen brancher matcher "{query}".</p>
            {!selected.includes(MULTI_INDUSTRY_KEY) && (
              <button
                type="button"
                onClick={() => { onToggle(MULTI_INDUSTRY_KEY); setQuery(""); }}
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background"
              >
                Vælg «Andet / Multi-service»
              </button>
            )}
          </div>
        )}
      </div>
      )}
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
    <div className="grid gap-3 md:grid-cols-2">
      {industries.map((ind) => {
        const picked = selectedSubcategories[ind.key] || [];
        const total = ind.subcategories.length;
        const pct = total > 0 ? (picked.length / total) * 100 : 0;
        return (
          <div
            key={ind.key}
            className="rounded-xl border border-border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <IndustryIcon category={ind.key} className="h-8 w-8 shrink-0" alt={ind.label} />
              <span className="text-sm font-semibold text-foreground">{ind.label}</span>
              <span className="ml-auto inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground tabular-nums">
                {picked.length}/{total}
              </span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/60">
              <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ind.subcategories.map((sc) => {
                const isOn = picked.includes(sc.label);
                return (
                  <button
                    key={sc.label}
                    type="button"
                    onClick={() => onToggle(ind.key, sc.label)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      isOn
                        ? "border-foreground bg-foreground text-background shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:bg-secondary hover:text-foreground"
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
        <Button variant="outline"
          type="button"
          onClick={() => applyPreset("weekdays")}
          className="min-h-11 rounded-md px-3 text-sm text-muted-foreground"
        >
          Hverdage 08–16
        </Button>
        <Button variant="outline"
          type="button"
          onClick={() => applyPreset("everyday")}
          className="min-h-11 rounded-md px-3 text-sm text-muted-foreground"
        >
          Alle dage 08–18
        </Button>
        <Button variant="outline"
          type="button"
          onClick={() => applyPreset("clear")}
          className="min-h-11 rounded-md px-3 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
        >
          Nulstil alle
        </Button>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {DAYS.map((day, dayIdx) => {
          const parsed = parseHours(value[day] || "");
          const isOpen = !!parsed;
          const open = parsed?.open || "08:00";
          const close = parsed?.close || "16:00";
                    return (
            <div
              key={day}
              data-tour={dayIdx === 0 ? "hours-day-row" : undefined}
              className={`flex min-h-[52px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-4 transition-colors ${
                isOpen ? "bg-secondary/30" : "bg-card"
              }`}
            >
              {/* Dag + toggle */}
              <Button variant="ghost"
                type="button"
                role="switch"
                aria-checked={isOpen}
                aria-label={`Åben ${day}`}
                onClick={() => isOpen ? setDay(day, null, null) : setDay(day, open, close)}
                className="min-h-11 justify-start gap-2 px-0 min-w-[120px] sm:min-w-[130px]"
              >
                <span
                  aria-hidden="true"
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
              </Button>

              {isOpen && (
                <>
                  <div className="flex items-center gap-2">
                    <TimePicker value={open} onChange={(v) => setDay(day, v || "08:00", close)} label={`Åbner ${day}`} />
                    <span className="text-xs text-muted-foreground">til</span>
                    <TimePicker value={close} onChange={(v) => setDay(day, open, v || "16:00")} label={`Lukker ${day}`} />
                  </div>

                </>
              )}
            </div>
          );
        })}
      </div>
      {DAYS.some((d) => !!parseHours(value[d] || "")) && (
        <Button variant="outline" type="button"
          onClick={() => { const d = DAYS.find((x) => !!parseHours(value[x] || "")); if (d) applyToAll(d); }}
          className="min-h-11 rounded-md px-3 text-sm">
          Brug første åbne dags tider på alle åbne dage
        </Button>
      )}
    </div>
  );
};